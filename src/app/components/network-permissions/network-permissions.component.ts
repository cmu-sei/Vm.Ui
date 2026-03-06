// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import {
  NetworksService,
  ViewNetworkDto,
  CreateViewNetworkForm,
  UpdateViewNetworkTeamsForm,
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

  dataSource = new MatTableDataSource<ViewNetworkDto>([]);
  teams: Team[] = [];
  unsubscribe$ = new Subject<null>();
  refresh$ = new BehaviorSubject<boolean>(true);

  providerTypeControl = new UntypedFormControl('', [Validators.required]);
  providerInstanceIdControl = new UntypedFormControl('', [
    Validators.required,
  ]);
  networkIdControl = new UntypedFormControl('', [Validators.required]);

  providerTypes = [VmType.Vsphere, VmType.Proxmox, VmType.Azure];

  displayedColumns: string[] = [
    'providerType',
    'providerInstanceId',
    'networkId',
    'teamIds',
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
        switchMap(() => this.networksService.getViewNetworks(this.viewId)),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((networks) => {
        this.dataSource.data = networks;
      });
  }

  createNetwork() {
    if (
      this.providerTypeControl.valid &&
      this.providerInstanceIdControl.valid &&
      this.networkIdControl.valid
    ) {
      const form: CreateViewNetworkForm = {
        providerType: this.providerTypeControl.value,
        providerInstanceId: this.providerInstanceIdControl.value,
        networkId: this.networkIdControl.value,
      };
      this.networksService
        .createViewNetwork(this.viewId, form)
        .pipe(take(1))
        .subscribe(() => {
          this.refresh();
          this.providerTypeControl.reset();
          this.providerInstanceIdControl.reset();
          this.networkIdControl.reset();
        });
    }
  }

  deleteNetwork(row: ViewNetworkDto) {
    this.dialogService
      .confirm(
        'Delete Network',
        `Are you sure you want to delete network "${row.networkId}"?`,
        { buttonTrueText: 'Delete' },
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.networksService
            .deleteViewNetwork(this.viewId, row.id)
            .pipe(take(1))
            .subscribe(() => {
              this.refresh();
            });
        }
      });
  }

  onTeamSelectionChange(row: ViewNetworkDto, selectedTeamIds: string[]) {
    const form: UpdateViewNetworkTeamsForm = {
      teamIds: selectedTeamIds,
    };
    this.networksService
      .updateViewNetworkTeams(this.viewId, row.id, form)
      .pipe(take(1))
      .subscribe((updated) => {
        row.teamIds = updated.teamIds;
      });
  }

  getTeamName(teamId: string): string {
    const team = this.teams.find((t) => t.id === teamId);
    return team ? team.name : teamId;
  }

  refresh() {
    this.refresh$.next(true);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
