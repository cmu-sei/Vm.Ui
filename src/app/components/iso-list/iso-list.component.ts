// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import {
  AppSystemPermission,
  AppTeamPermission,
  AppViewPermission,
  FileService,
  IsoFile,
  IsoResult,
  IsoUploadResult,
} from '../../generated/vm-api';
import { DialogService } from '../../services/dialog/dialog.service';
import { UserPermissionsService } from '../../services/permissions/user-permissions.service';
import { ErrorMessageService } from '../../services/error-message/error-message.service';
import {
  IsoUploadDialogComponent,
  IsoUploadDialogData,
} from '../iso-upload-dialog/iso-upload-dialog.component';
import { IsoViewGroupComponent } from './iso-view-group/iso-view-group.component';
import { IsoGroupComponent } from './iso-group/iso-group.component';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';
import { MatFormField, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

// A single ISO row plus whether the current user may delete it and how to scope the delete.
// `viewId` is only set in all-views mode (rows can come from any View); single-view mode leaves it
// undefined and the delete falls back to the component's bound viewId.
export interface IsoRow {
  filename: string;
  canDelete: boolean;
  scope: 'view' | 'team';
  teamId?: string;
  viewId?: string;
}

// One group of ISOs in the list: the view-wide group or a single team's group.
export interface IsoGroup {
  title: string;
  isTeam: boolean;
  teamId?: string;
  rows: IsoRow[];
}

// All-views mode: one View, with its view-wide group plus a group per team.
export interface IsoViewGroup {
  viewId: string;
  viewName: string;
  viewWideGroup: IsoGroup;
  teamGroups: IsoGroup[];
  // Total ISOs in the View (view-wide + all teams); reflects the active search filter.
  isoCount: number;
}

// Discriminated result of a single load: all-views mode carries the raw per-View listing; single-
// view mode carries the already-assembled (permission-resolved) groups.
type IsoLoadResult =
  | { allViews: true; results: IsoResult[] }
  | { allViews: false; groups: IsoGroup[] };

const VIEW_GROUP_TITLE = 'View (All Teams)';

// Stable per-row identity so concurrent deletes across panels (and Views, in all-views mode) don't
// collide. Exported so the nested all-views child can key its rows identically.
export function isoRowKey(row: IsoRow): string {
  return `${row.viewId ?? ''}|${row.scope}|${row.teamId ?? ''}|${row.filename}`;
}

@Component({
  selector: 'app-iso-list',
  templateUrl: './iso-list.component.html',
  styleUrls: ['./iso-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconButton,
    MatButton,
    MatIcon,
    MatTooltip,
    MatProgressSpinner,
    MatSlideToggle,
    IsoViewGroupComponent,
    IsoGroupComponent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatFormField,
    MatSuffix,
    MatInput,
    FormsModule,
  ],
})
export class IsoListComponent implements OnInit {
  viewId = input.required<string>();

  @ViewChild(MatAccordion) accordion: MatAccordion;
  // All nested View accordions (all-views mode only) so Expand/Collapse-All reaches the whole tree.
  @ViewChildren(IsoViewGroupComponent)
  viewGroupComponents: QueryList<IsoViewGroupComponent>;

  // Authoritative groups, rebuilt from the getViewIsos response.
  readonly groups = signal<IsoGroup[]>([]);
  // Non-blocking: the accordion renders regardless; this only drives a small toolbar spinner.
  readonly loading = signal(false);
  // Per-row delete in-flight tracking, keyed by rowKey(...).
  readonly deleting = signal<ReadonlySet<string>>(new Set());

  searchTerm = '';
  private readonly searchTerm$ = new BehaviorSubject<string>('');
  private readonly searchSignal = toSignal(
    this.searchTerm$.pipe(debounceTime(100)),
    { initialValue: '' },
  );

  // Groups with the search term applied to filenames. Empty search shows everything.
  readonly filteredGroups = computed<IsoGroup[]>(() => {
    const term = this.searchSignal().toLowerCase();
    const groups = this.groups();
    if (!term) {
      return groups;
    }
    return groups.map((g) => ({
      ...g,
      rows: g.rows.filter((r) => r.filename.toLowerCase().includes(term)),
    }));
  });

  // All-views mode: show every ISO in the system, grouped View -> teams -> ISOs.
  readonly showAllViews = signal(false);
  // Authoritative nested groups, rebuilt from the getAllIsos response.
  readonly viewGroups = signal<IsoViewGroup[]>([]);

  // Nested groups with the search term applied to filenames across the whole tree.
  readonly filteredViewGroups = computed<IsoViewGroup[]>(() => {
    const term = this.searchSignal().toLowerCase();
    const viewGroups = this.viewGroups();
    if (!term) {
      return viewGroups;
    }
    const filterGroup = (g: IsoGroup): IsoGroup => ({
      ...g,
      rows: g.rows.filter((r) => r.filename.toLowerCase().includes(term)),
    });
    return viewGroups.map((v) => {
      const viewWideGroup = filterGroup(v.viewWideGroup);
      const teamGroups = v.teamGroups.map(filterGroup);
      return {
        ...v,
        viewWideGroup,
        teamGroups,
        isoCount: this.totalIsoCount(viewWideGroup, teamGroups),
      };
    });
  });

  private refresh$ = new BehaviorSubject<boolean>(true);

  private readonly destroyRef = inject(DestroyRef);
  private readonly fileService = inject(FileService);
  private readonly dialogService = inject(DialogService);
  private readonly userPermissionsService = inject(UserPermissionsService);
  private readonly dialog = inject(MatDialog);

  // UploadViewIsos on the active (primary) team => can upload to the whole View and to any team.
  // Scoped to the primary team so it follows the active team, matching the ISO listing.
  private readonly canUploadViewIsos$ = this.userPermissionsService.can(
    null,
    null,
    true,
    null,
    AppViewPermission.UploadViewIsos,
  );

  // DeleteViewIsos on the active (primary) team => can delete the view-wide ISOs and any team's ISOs.
  private readonly canDeleteViewIsos$ = this.userPermissionsService.can(
    null,
    null,
    true,
    null,
    AppViewPermission.DeleteViewIsos,
  );

  // Upload button is shown if the active (primary) team can upload view-wide OR to a team.
  readonly canUpload = toSignal(
    combineLatest([
      this.canUploadViewIsos$,
      this.userPermissionsService.can(
        null,
        null,
        true,
        AppTeamPermission.UploadTeamIsos,
      ),
    ]).pipe(map(([view, team]) => view || team)),
    { initialValue: false },
  );

  // The "all views" toggle is shown only to system operators (ViewViews or ManageViews). These are
  // system-level claims, so the team/primaryTeam/perm args are unused.
  readonly canViewAllViews = toSignal(
    combineLatest([
      this.userPermissionsService.can(AppSystemPermission.ViewViews),
      this.userPermissionsService.can(AppSystemPermission.ManageViews),
    ]).pipe(map(([view, manage]) => view || manage)),
    { initialValue: false },
  );

  // In all-views mode, delete is gated solely by the system DeleteIsos permission - it authorizes
  // removing an ISO in any View/team, including ones the user is not a member of.
  readonly canDeleteAnyIso = toSignal(
    this.userPermissionsService.can(AppSystemPermission.DeleteIsos),
    { initialValue: false },
  );

  ngOnInit() {
    // The load reads the required `viewId` input, so it lives here (inputs are set by ngOnInit) and
    // is torn down via takeUntilDestroyed. Each refresh switches to the active endpoint; the
    // single-view path resolves per-team delete permissions before assembling its groups.
    this.refresh$
      .pipe(
        switchMap((): Observable<IsoLoadResult> => {
          this.loading.set(true);
          if (this.showAllViews()) {
            return this.fileService
              .getAllIsos()
              .pipe(map((results) => ({ allViews: true as const, results })));
          }
          return this.fileService.getViewIsos(this.viewId()).pipe(
            switchMap((result) =>
              this.buildSingleViewGroups(result).pipe(
                map((groups) => ({ allViews: false as const, groups })),
              ),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res: IsoLoadResult) => {
          if ('results' in res) {
            this.buildViewGroups(res.results);
          } else {
            this.groups.set(res.groups);
          }
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.dialogService.message(
            'Failed to Load ISOs',
            ErrorMessageService.getApiErrorMessage(
              err,
              'An unexpected error occurred while loading ISOs.',
            ),
          );
        },
      });
  }

  // Expand every panel. In all-views mode this means the outer View panels plus each View's nested
  // team accordion; in single-view mode it's just the one accordion.
  expandAll() {
    this.accordion?.openAll();
    this.viewGroupComponents?.forEach((c) => c.openAll());
  }

  collapseAll() {
    this.accordion?.closeAll();
    this.viewGroupComponents?.forEach((c) => c.closeAll());
  }

  // Toggle between single-view and all-views mode, then reload from the appropriate endpoint.
  onToggleAllViews(checked: boolean) {
    this.showAllViews.set(checked);
    this.refresh();
  }

  // All-views mode: build the nested View -> teams -> ISOs structure from the system-wide listing.
  // Delete is offered iff the user has the system DeleteIsos permission (see canDeleteAnyIso).
  private buildViewGroups(results: IsoResult[]) {
    const canDelete = this.canDeleteAnyIso();

    const viewGroups: IsoViewGroup[] = (results ?? [])
      .map((result) => {
        const viewWideGroup: IsoGroup = {
          title: VIEW_GROUP_TITLE,
          isTeam: false,
          rows: this.toRows(
            result.isos,
            'view',
            undefined,
            canDelete,
            result.viewId,
          ),
        };
        const teamGroups: IsoGroup[] = (result.teamIsoResults ?? [])
          .map((team) => ({
            title: team.teamName ?? 'Team',
            isTeam: true,
            teamId: team.teamId,
            rows: this.toRows(
              team.isos,
              'team',
              team.teamId,
              canDelete,
              result.viewId,
            ),
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
        return {
          viewId: result.viewId ?? '',
          viewName: result.viewName ?? 'View',
          viewWideGroup,
          teamGroups,
          isoCount: this.totalIsoCount(viewWideGroup, teamGroups),
        };
      })
      .sort((a, b) => a.viewName.localeCompare(b.viewName));

    this.viewGroups.set(viewGroups);
  }

  // Total ISOs in a View = the view-wide group plus every team group.
  private totalIsoCount(viewWideGroup: IsoGroup, teamGroups: IsoGroup[]): number {
    return (
      viewWideGroup.rows.length +
      teamGroups.reduce((sum, g) => sum + g.rows.length, 0)
    );
  }


  // Resolve each team's delete permission (once), then assemble the single-view group model. Teams
  // are sorted up front and each carries its own resolved permission, so there is no index-aligned
  // positional coupling between the teams and their permission results.
  private buildSingleViewGroups(result: IsoResult): Observable<IsoGroup[]> {
    const teamResults = (result.teamIsoResults ?? [])
      .slice()
      .sort((a, b) => (a.teamName ?? '').localeCompare(b.teamName ?? ''));

    const teamChecks = teamResults.map((team) =>
      this.canDeleteTeamIsos$(team.teamId).pipe(
        map((canDelete) => ({ team, canDelete })),
      ),
    );

    return combineLatest([
      this.canDeleteViewIsos$,
      teamChecks.length ? combineLatest(teamChecks) : of([]),
    ]).pipe(
      take(1),
      map(([canDeleteView, teamPerms]) => {
        const groups: IsoGroup[] = [
          {
            title: VIEW_GROUP_TITLE,
            isTeam: false,
            rows: this.toRows(result.isos, 'view', undefined, canDeleteView),
          },
        ];

        teamPerms.forEach(({ team, canDelete }) => {
          groups.push({
            title: team.teamName ?? 'Team',
            isTeam: true,
            teamId: team.teamId,
            rows: this.toRows(team.isos, 'team', team.teamId, canDelete),
          });
        });

        return groups;
      }),
    );
  }

  // A team's ISOs are deletable with DeleteViewIsos anywhere in the View or DeleteTeamIsos on it.
  private canDeleteTeamIsos$(teamId: string): Observable<boolean> {
    return combineLatest([
      this.canDeleteViewIsos$,
      this.userPermissionsService.can(
        null,
        teamId,
        false,
        AppTeamPermission.DeleteTeamIsos,
      ),
    ]).pipe(map(([canView, canTeam]) => canView || canTeam));
  }

  // A team is an upload target with UploadViewIsos anywhere in the View or UploadTeamIsos on it.
  private canUploadTeamIsos$(teamId: string): Observable<boolean> {
    return combineLatest([
      this.canUploadViewIsos$,
      this.userPermissionsService.can(
        null,
        teamId,
        false,
        AppTeamPermission.UploadTeamIsos,
      ),
    ]).pipe(map(([canView, canTeam]) => canView || canTeam));
  }

  private toRows(
    isos: IsoFile[] | null | undefined,
    scope: 'view' | 'team',
    teamId: string | undefined,
    canDelete: boolean,
    viewId?: string,
  ): IsoRow[] {
    return (isos ?? [])
      .filter((iso) => !!iso.filename)
      .map((iso) => ({
        filename: iso.filename,
        canDelete,
        scope,
        teamId,
        viewId,
      }));
  }

  // Stable per-row identity so concurrent deletes across panels don't collide. Includes viewId so
  // rows from different Views in all-views mode never collide.
  rowKey(row: IsoRow): string {
    return isoRowKey(row);
  }

  deleteIso(row: IsoRow) {
    const key = this.rowKey(row);
    if (this.deleting().has(key)) {
      return; // ignore repeat clicks while a delete is in flight
    }

    this.dialogService
      .confirm(
        'Delete ISO',
        `Are you sure you want to delete "${row.filename}"? This cannot be undone.`,
        { buttonTrueText: 'Delete', buttonFalseText: 'Cancel' },
      )
      .pipe(
        take(1),
        filter((result) => result?.['confirm'] === true),
        tap(() => this.setDeleting(key, true)),
        switchMap(() =>
          this.fileService
            .deleteIso(
              row.viewId ?? this.viewId(),
              row.scope,
              row.filename,
              row.teamId,
            )
            .pipe(take(1)),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res: IsoUploadResult) => {
          this.setDeleting(key, false);
          if (res?.message) {
            this.dialogService.message('Delete ISO', res.message);
          }
          this.refresh();
        },
        error: (err: HttpErrorResponse) => {
          this.setDeleting(key, false);
          this.dialogService.message(
            'Delete Failed',
            ErrorMessageService.getApiErrorMessage(
              err,
              'An unexpected error occurred while deleting the ISO.',
            ),
          );
        },
      });
  }

  private setDeleting(key: string, value: boolean) {
    this.deleting.update((set) => {
      const next = new Set(set);
      if (value) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  applyFilter(value: string) {
    this.searchTerm = value;
    this.searchTerm$.next(value);
  }

  clearFilter() {
    this.applyFilter('');
  }

  openUploadDialog() {
    // Candidate teams are the team groups currently shown. Each is offered as an upload target only
    // if the user can upload to it (UploadViewIsos anywhere, or UploadTeamIsos on that team).
    const teams = this.groups()
      .filter((g) => g.isTeam && g.teamId)
      .map((g) => ({ id: g.teamId, name: g.title }));

    const teamChecks = teams.map((team) =>
      this.canUploadTeamIsos$(team.id).pipe(
        map((canUpload) => ({ team, canUpload })),
      ),
    );

    combineLatest([
      this.canUploadViewIsos$,
      teamChecks.length ? combineLatest(teamChecks) : of([]),
    ])
      .pipe(
        take(1),
        map(([canUploadView, teamPerms]) => ({
          canUploadView,
          uploadableTeams: teamPerms
            .filter((t) => t.canUpload)
            .map((t) => t.team),
        })),
        switchMap(({ canUploadView, uploadableTeams }) => {
          const data: IsoUploadDialogData = {
            viewId: this.viewId(),
            canUploadView,
            uploadableTeams,
          };
          return this.dialog
            .open(IsoUploadDialogComponent, { data, width: '480px' })
            .afterClosed();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result?.success) {
          if (result.message) {
            this.dialogService.message(
              result.partialFailure
                ? 'Upload Completed with Errors'
                : 'Upload Completed',
              result.message,
            );
          }
          this.refresh();
        }
      });
  }

  refresh() {
    this.refresh$.next(true);
  }
}
