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
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import {
  catchError,
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
  VmType,
} from '../../generated/vm-api';
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
  // Hypervisors that store ISOs for this install but do not have this file. An upload fans out to
  // every one of them and tolerates a partial failure, so a non-empty list means the file only
  // partly landed; re-uploading the same name heals it. Left undefined when the file is everywhere.
  missingProviders?: VmType[];
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
  // Initial loads replace the empty list with a centered spinner. Once data has loaded, refreshes
  // leave the accordion mounted and use a small toolbar spinner so panel expansion is preserved.
  readonly loading = signal(false);
  readonly hasLoaded = signal(false);
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
  private readonly afterSuccessfulRefresh: Array<() => void> = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly fileService = inject(FileService);
  private readonly dialogService = inject(CrucibleDialogService);
  private readonly userPermissionsService = inject(UserPermissionsService);
  private readonly dialog = inject(MatDialog);

  // Getters, not field initializers: every primary-context check must be scoped to this component's
  // `viewId` input, and inputs are not set until ngOnInit. Read lazily so this.viewId() is available.
  // Passing undefined would resolve the primary claim across every View's claims, not this one's.
  private get canUploadViewIsos$(): Observable<boolean> {
    return this.userPermissionsService.hasEffectivePermissionsForPrimaryContext(
      this.viewId(),
      { viewPermissions: [AppViewPermission.UploadViewIsos] },
    );
  }

  private get canDeleteViewIsos$(): Observable<boolean> {
    return this.userPermissionsService.hasEffectivePermissionsForPrimaryContext(
      this.viewId(),
      { viewPermissions: [AppViewPermission.DeleteViewIsos] },
    );
  }

  // Assigned in ngOnInit rather than via toSignal at field-init time, which would subscribe (and so
  // read viewId) before the input exists.
  readonly canUpload = signal(false);

  readonly canViewAllViews = toSignal(
    combineLatest([
      this.userPermissionsService.hasSystemPermission(
        AppSystemPermission.ViewViews,
      ),
      this.userPermissionsService.hasSystemPermission(
        AppSystemPermission.ManageViews,
      ),
    ]).pipe(map(([view, manage]) => view || manage)),
    { initialValue: false },
  );

  readonly canDeleteAnyIso = toSignal(
    this.userPermissionsService.hasSystemPermission(
      AppSystemPermission.DeleteIsos,
    ),
    { initialValue: false },
  );

  ngOnInit() {
    this.userPermissionsService
      .hasEffectivePermissionsForPrimaryContext(this.viewId(), {
        teamPermissions: [AppTeamPermission.UploadTeamIsos],
        viewPermissions: [AppViewPermission.UploadViewIsos],
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((canUpload) => this.canUpload.set(canUpload));

    // The load reads the required `viewId` input, so it lives here (inputs are set by ngOnInit) and
    // is torn down via takeUntilDestroyed. Each refresh switches to the active endpoint; the
    // single-view path resolves per-team delete permissions before assembling its groups.
    this.refresh$
      .pipe(
        switchMap((): Observable<IsoLoadResult | null> => {
          this.loading.set(true);
          const load: Observable<IsoLoadResult> = this.showAllViews()
            ? this.fileService
                .getAllIsos()
                .pipe(map((results) => ({ allViews: true as const, results })))
            : this.fileService
                .getViewIsos(this.viewId())
                .pipe(
                  switchMap((result) =>
                    this.buildSingleViewGroups(result).pipe(
                      map((groups) => ({ allViews: false as const, groups })),
                    ),
                  ),
                );

          // Handle the error INSIDE the switchMap: an error reaching the outer subscription would
          // tear down refresh$ for good, silently killing Refresh and the all-views toggle. Emitting
          // null instead keeps the pipeline subscribed so the next refresh can succeed.
          return load.pipe(
            catchError((err: HttpErrorResponse) => {
              this.showMessage(
                'Failed to Load ISOs',
                ErrorMessageService.getApiErrorMessage(
                  err,
                  'An unexpected error occurred while loading ISOs.',
                ),
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res: IsoLoadResult | null) => {
        this.loading.set(false);
        // A failed load leaves the last successfully-loaded groups on screen rather than blanking
        // the list - the error is already surfaced in a dialog, and stale-but-real data is more
        // useful than an empty accordion that reads as "this View has no ISOs".
        if (res == null) {
          return;
        }
        if ('results' in res) {
          this.buildViewGroups(res.results);
        } else {
          this.groups.set(res.groups);
        }
        this.hasLoaded.set(true);
        this.afterSuccessfulRefresh.splice(0).forEach((callback) => callback());
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
  private totalIsoCount(
    viewWideGroup: IsoGroup,
    teamGroups: IsoGroup[],
  ): number {
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
      this.userPermissionsService.hasEffectivePermissionsForPrimaryContext(
        this.viewId(),
        { teamPermissions: [AppTeamPermission.DeleteTeamIsos] },
        [teamId],
      ),
    ]).pipe(map(([canView, canTeam]) => canView || canTeam));
  }

  // A team is an upload target with UploadViewIsos anywhere in the View or UploadTeamIsos on it.
  private canUploadTeamIsos$(teamId: string): Observable<boolean> {
    return combineLatest([
      this.canUploadViewIsos$,
      this.userPermissionsService.hasEffectivePermissionsForPrimaryContext(
        this.viewId(),
        { teamPermissions: [AppTeamPermission.UploadTeamIsos] },
        [teamId],
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
        // Normalized to undefined when empty so the template can test it with a single truthiness
        // check, and so a row from an older API (no such field) behaves the same as a complete one.
        missingProviders: iso.missingProviders?.length
          ? iso.missingProviders
          : undefined,
      }));
  }

  // Stable per-row identity so concurrent deletes across panels don't collide. Includes viewId so
  // rows from different Views in all-views mode never collide.
  rowKey(row: IsoRow): string {
    return isoRowKey(row);
  }

  private removeRow(row: IsoRow) {
    const removeFromGroup = (group: IsoGroup): IsoGroup => {
      const isTargetGroup =
        row.scope === 'view'
          ? !group.isTeam
          : group.isTeam && group.teamId === row.teamId;

      return isTargetGroup
        ? {
            ...group,
            rows: group.rows.filter(
              (candidate) => this.rowKey(candidate) !== this.rowKey(row),
            ),
          }
        : group;
    };

    if (this.showAllViews()) {
      this.viewGroups.update((viewGroups) =>
        viewGroups.map((viewGroup) => {
          if (viewGroup.viewId !== (row.viewId ?? '')) {
            return viewGroup;
          }

          const viewWideGroup = removeFromGroup(viewGroup.viewWideGroup);
          const teamGroups = viewGroup.teamGroups.map(removeFromGroup);
          return {
            ...viewGroup,
            viewWideGroup,
            teamGroups,
            isoCount: this.totalIsoCount(viewWideGroup, teamGroups),
          };
        }),
      );
    } else {
      this.groups.update((groups) => groups.map(removeFromGroup));
    }
  }

  deleteIso(row: IsoRow) {
    const key = this.rowKey(row);
    if (this.deleting().has(key)) {
      return; // ignore repeat clicks while a delete is in flight
    }

    this.dialogService
      .confirm({
        title: 'Delete ISO',
        message: `Are you sure you want to delete "${row.filename}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      })
      .afterClosed()
      .pipe(
        take(1),
        filter((result) => result === true),
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
          if ((res?.failedHostCount ?? 0) === 0) {
            this.removeRow(row);
          }
          this.setDeleting(key, false);
          this.refresh(
            res?.message
              ? () => this.showMessage('Delete ISO', res.message)
              : undefined,
          );
        },
        error: (err: HttpErrorResponse) => {
          this.setDeleting(key, false);
          this.showMessage(
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
          this.refresh(
            result.message
              ? () =>
                  this.showMessage(
                    result.partialFailure
                      ? 'Upload Completed with Errors'
                      : 'Upload Completed',
                    result.message,
                  )
              : undefined,
          );
        }
      });
  }

  refresh(afterSuccessfulRefresh?: () => void) {
    if (afterSuccessfulRefresh) {
      this.afterSuccessfulRefresh.push(afterSuccessfulRefresh);
    }
    this.refresh$.next(true);
  }

  private showMessage(title: string, message: string) {
    this.dialogService.confirm({
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
    });
  }
}
