// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import {
  NetworksService,
  TeamNetworkPermission,
  TeamNetworkPermissionForm,
  VmType,
} from '../../generated/vm-api';
import {
  MatTableDataSource,
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import {
  ReactiveFormsModule,
  UntypedFormControl,
  Validators,
} from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { TeamService, Team } from '../../generated/player-api';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { DialogService } from '../../services/dialog/dialog.service';
import { MatButton } from '@angular/material/button';
import { MatSelect } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';

interface PermissionRow extends TeamNetworkPermission {
  teamName: string;
}

@Component({
  selector: 'app-network-permissions',
  templateUrl: './network-permissions.component.html',
  styleUrls: ['./network-permissions.component.scss'],
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatButton,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
  ],
})
export class NetworkPermissionsComponent implements OnDestroy {
  @Input() canManage = false;

  dataSource = new MatTableDataSource<PermissionRow>([]);
  teams: Team[] = [];
  unsubscribe$ = new Subject<null>();
  refresh$ = new BehaviorSubject<boolean>(true);

  teamControl = new UntypedFormControl('', [Validators.required]);
  providerTypeControl = new UntypedFormControl('', [Validators.required]);
  providerInstanceIdControl = new UntypedFormControl('', [
    Validators.required,
  ]);
  networkIdControl = new UntypedFormControl('', [Validators.required]);

  providerTypes = [VmType.Vsphere, VmType.Proxmox, VmType.Azure];

  displayedColumns: string[] = [
    'teamName',
    'providerType',
    'providerInstanceId',
    'networkId',
    'actions',
  ];

  viewId: string;

  constructor(
    private networksService: NetworksService,
    private teamService: TeamService,
    private routerQuery: RouterQuery,
    private dialogService: DialogService,
  ) {
    this.viewId = this.routerQuery.getParams('viewId');

    this.teamService
      .getViewTeams(this.viewId)
      .pipe(take(1))
      .subscribe((teams) => {
        this.teams = teams;
      });

    this.refresh$
      .pipe(
        switchMap(() => this.loadPermissions()),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((rows) => {
        this.dataSource.data = rows;
      });
  }

  private loadPermissions() {
    return this.teamService.getViewTeams(this.viewId).pipe(
      switchMap((teams) => {
        this.teams = teams;
        if (teams.length === 0) {
          return [[]];
        }
        return forkJoin(
          teams.map((team) =>
            this.networksService.getTeamNetworkPermissions(team.id).pipe(
              take(1),
              switchMap((permissions) => {
                const rows: PermissionRow[] = permissions.map((p) => ({
                  ...p,
                  teamName: team.name,
                }));
                return [rows];
              }),
            ),
          ),
        ).pipe(
          switchMap((arrays) => {
            const flat: PermissionRow[] = [];
            for (const arr of arrays) {
              flat.push(...arr);
            }
            return [flat];
          }),
        );
      }),
    );
  }

  createPermission() {
    if (
      this.teamControl.valid &&
      this.providerTypeControl.valid &&
      this.providerInstanceIdControl.valid &&
      this.networkIdControl.valid
    ) {
      const teamId = this.teamControl.value;
      const form: TeamNetworkPermissionForm = {
        providerType: this.providerTypeControl.value,
        providerInstanceId: this.providerInstanceIdControl.value,
        networkId: this.networkIdControl.value,
      };
      this.networksService
        .createTeamNetworkPermission(teamId, form)
        .pipe(take(1))
        .subscribe(() => {
          this.refresh();
          this.teamControl.reset();
          this.providerTypeControl.reset();
          this.providerInstanceIdControl.reset();
          this.networkIdControl.reset();
        });
    }
  }

  deletePermission(row: PermissionRow) {
    this.dialogService
      .confirm(
        'Delete Network Permission',
        `Are you sure you want to delete the network permission for network "${row.networkId}" on team "${row.teamName}"?`,
        { buttonTrueText: 'Delete' },
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.networksService
            .deleteTeamNetworkPermission(row.teamId, row.id)
            .pipe(take(1))
            .subscribe(() => {
              this.refresh();
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
