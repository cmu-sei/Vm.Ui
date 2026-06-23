// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { debounceTime, switchMap, take, takeUntil } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import {
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
import { VmTeamsQuery } from '../../state/vm-teams/vm-teams.query';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
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
interface IsoRow {
  filename: string;
  canDelete: boolean;
  scope: 'view' | 'team';
  teamId?: string;
}

// One group of ISOs in the list: the view-wide group or a single team's group.
interface IsoGroup {
  title: string;
  isTeam: boolean;
  rows: IsoRow[];
}

const VIEW_GROUP_TITLE = 'View (All Teams)';

@Component({
  selector: 'app-iso-list',
  templateUrl: './iso-list.component.html',
  styleUrls: ['./iso-list.component.scss'],
  imports: [
    MatIconButton,
    MatButton,
    MatIcon,
    MatTooltip,
    MatProgressSpinner,
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
export class IsoListComponent implements OnInit, OnDestroy {
  viewId = input.required<string>();

  @ViewChild(MatAccordion) accordion: MatAccordion;

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

  private refresh$ = new BehaviorSubject<boolean>(true);
  private unsubscribe$ = new Subject<null>();

  // DeleteViewIsos granted anywhere in this View => can delete the view-wide ISOs and any team's ISOs.
  private canDeleteViewIsos$: Observable<boolean>;

  private readonly fileService = inject(FileService);
  private readonly dialogService = inject(DialogService);
  private readonly userPermissionsService = inject(UserPermissionsService);
  private readonly vmTeamsQuery = inject(VmTeamsQuery);

  ngOnInit() {
    this.canDeleteViewIsos$ = this.userPermissionsService.can(
      null,
      null,
      false,
      null,
      AppViewPermission.DeleteViewIsos,
    );

    // Render placeholder panels immediately from whatever teams are in client state (the
    // User-Follow-populated set; possibly empty on a cold load). The always-present
    // "View (All Teams)" panel shows right away either way. getViewIsos then reconciles.
    this.groups.set(this.buildPlaceholderGroups());

    this.refresh$
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          return this.fileService.getViewIsos(this.viewId());
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (result) => this.buildGroups(result),
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

  // Placeholder groups (no ISO rows yet) so the basic UI appears without waiting on the listing.
  private buildPlaceholderGroups(): IsoGroup[] {
    const groups: IsoGroup[] = [
      { title: VIEW_GROUP_TITLE, isTeam: false, rows: [] },
    ];
    this.vmTeamsQuery
      .getAll()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((team) =>
        groups.push({ title: team.name, isTeam: true, rows: [] }),
      );
    return groups;
  }

  private buildGroups(result: IsoResult) {
    // Resolve all per-team delete permissions in one shot, then assemble the view model.
    const teamResults = result.teamIsoResults ?? [];

    const teamPermChecks = teamResults.map((t) =>
      combineLatest([
        this.canDeleteViewIsos$,
        this.userPermissionsService.can(
          null,
          t.teamId,
          false,
          AppTeamPermission.DeleteTeamIsos,
        ),
      ]),
    );

    combineLatest([this.canDeleteViewIsos$, ...teamPermChecks])
      .pipe(take(1))
      .subscribe((perms) => {
        const canDeleteView = perms[0] as boolean;
        const groups: IsoGroup[] = [];

        // View-wide ISOs.
        groups.push({
          title: VIEW_GROUP_TITLE,
          isTeam: false,
          rows: this.toRows(result.isos, 'view', undefined, canDeleteView),
        });

        // One group per team.
        teamResults.forEach((team, i) => {
          const [canViewDelete, canTeamDelete] = perms[i + 1] as [
            boolean,
            boolean,
          ];
          groups.push({
            title: team.teamName ?? 'Team',
            isTeam: true,
            rows: this.toRows(
              team.isos,
              'team',
              team.teamId,
              canViewDelete || canTeamDelete,
            ),
          });
        });

        this.groups.set(groups);
        this.loading.set(false);
      });
  }

  private toRows(
    isos: IsoFile[] | null | undefined,
    scope: 'view' | 'team',
    teamId: string | undefined,
    canDelete: boolean,
  ): IsoRow[] {
    return (isos ?? [])
      .filter((iso) => !!iso.filename)
      .map((iso) => ({
        filename: iso.filename,
        canDelete,
        scope,
        teamId,
      }));
  }

  // Stable per-row identity so concurrent deletes across panels don't collide.
  rowKey(row: IsoRow): string {
    return `${row.scope}|${row.teamId ?? ''}|${row.filename}`;
  }

  isDeleting(row: IsoRow): boolean {
    return this.deleting().has(this.rowKey(row));
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
      .pipe(take(1))
      .subscribe((result) => {
        if (result['confirm'] === true) {
          this.setDeleting(key, true);
          this.fileService
            .deleteIso(this.viewId(), row.scope, row.filename, row.teamId)
            .pipe(take(1))
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

  refresh() {
    this.refresh$.next(true);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
