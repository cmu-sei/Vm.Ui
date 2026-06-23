// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
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
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

// A single ISO row plus whether the current user may delete it and how to scope the delete.
interface IsoRow {
  filename: string;
  canDelete: boolean;
  scope: 'view' | 'team';
  teamId?: string;
}

// One group of ISOs in the list: the view-wide (public) group or a single team's group.
interface IsoGroup {
  title: string;
  isTeam: boolean;
  rows: IsoRow[];
}

@Component({
  selector: 'app-iso-list',
  templateUrl: './iso-list.component.html',
  styleUrls: ['./iso-list.component.scss'],
  imports: [MatIconButton, MatIcon, MatTooltip, MatProgressSpinner],
})
export class IsoListComponent implements OnInit, OnDestroy {
  @Input() viewId: string;

  groups: IsoGroup[] = [];
  loading = false;

  private refresh$ = new BehaviorSubject<boolean>(true);
  private unsubscribe$ = new Subject<null>();

  // DeleteViewIsos granted anywhere in this View => can delete the view-wide ISOs and any team's ISOs.
  private canDeleteViewIsos$: Observable<boolean>;

  constructor(
    private fileService: FileService,
    private dialogService: DialogService,
    private userPermissionsService: UserPermissionsService,
  ) {}

  ngOnInit() {
    this.canDeleteViewIsos$ = this.userPermissionsService.can(
      null,
      null,
      false,
      null,
      AppViewPermission.DeleteViewIsos,
    );

    this.refresh$
      .pipe(
        switchMap(() => {
          this.loading = true;
          return this.fileService.getViewIsos(this.viewId);
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe({
        next: (result) => this.buildGroups(result),
        error: (err: HttpErrorResponse) => {
          this.loading = false;
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

        // View-wide (public) ISOs.
        groups.push({
          title: 'Public (entire View)',
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

        this.groups = groups;
        this.loading = false;
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

  deleteIso(row: IsoRow) {
    this.dialogService
      .confirm(
        'Delete ISO',
        `Are you sure you want to delete "${row.filename}"? This cannot be undone.`,
        { buttonTrueText: 'Delete', buttonFalseText: 'Cancel' },
      )
      .pipe(take(1))
      .subscribe((result) => {
        if (result['confirm'] === true) {
          this.fileService
            .deleteIso(this.viewId, row.scope, row.filename, row.teamId)
            .pipe(take(1))
            .subscribe({
              next: (res: IsoUploadResult) => {
                if (res?.message) {
                  this.dialogService.message('Delete ISO', res.message);
                }
                this.refresh();
              },
              error: (err: HttpErrorResponse) => {
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

  refresh() {
    this.refresh$.next(true);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
