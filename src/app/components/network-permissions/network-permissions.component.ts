// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import {
  NetworksService,
  ViewNetworkDto,
  CreateViewNetworkForm,
  UpdateViewNetworkForm,
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
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { TeamService, Team } from '../../generated/player-api';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { DialogService } from '../../services/dialog/dialog.service';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatTooltip } from '@angular/material/tooltip';

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
    MatIconButton,
    MatIcon,
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
    MatTooltip,
  ],
})
export class NetworkPermissionsComponent implements OnDestroy {
  @Input() canManage = false;

  dataSource = new MatTableDataSource<ViewNetworkDto>([]);
  teams: Team[] = [];
  unsubscribe$ = new Subject<null>();
  refresh$ = new BehaviorSubject<boolean>(true);

  providerTypeControl = new UntypedFormControl(VmType.Vsphere, [Validators.required]);
  providerInstanceIdControl = new UntypedFormControl('', [
    Validators.required,
  ]);
  networkIdControl = new UntypedFormControl('', [Validators.required]);
  nameControl = new UntypedFormControl('', [Validators.required]);
  teamIdsControl = new UntypedFormControl([]);

  providerTypes = [VmType.Vsphere];
  providerTypeLabels: Record<string, string> = { Vsphere: 'vSphere' };

  displayedColumns: string[] = [
    'providerType',
    'providerInstanceId',
    'networkId',
    'name',
    'teamIds',
    'actions',
  ];

  viewId: string;
  rowForms = new Map<string, UntypedFormGroup>();

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
        this.rowForms.clear();
      });
  }

  createNetwork() {
    if (
      this.providerTypeControl.valid &&
      this.providerInstanceIdControl.valid &&
      this.networkIdControl.valid &&
      this.nameControl.valid
    ) {
      const form: CreateViewNetworkForm = {
        providerType: this.providerTypeControl.value,
        providerInstanceId: this.providerInstanceIdControl.value,
        networkId: this.networkIdControl.value,
        name: this.nameControl.value,
        teamIds: this.teamIdsControl.value || [],
      };
      this.networksService
        .createViewNetwork(this.viewId, form)
        .pipe(take(1))
        .subscribe(() => {
          this.refresh();
          this.providerTypeControl.reset(VmType.Vsphere);
          this.providerInstanceIdControl.reset();
          this.networkIdControl.reset();
          this.nameControl.reset();
          this.teamIdsControl.reset([]);
        });
    }
  }

  getRowForm(row: ViewNetworkDto): UntypedFormGroup {
    if (!this.rowForms.has(row.id)) {
      this.rowForms.set(
        row.id,
        new UntypedFormGroup({
          providerType: new UntypedFormControl(row.providerType, [Validators.required]),
          providerInstanceId: new UntypedFormControl(row.providerInstanceId, [Validators.required]),
          networkId: new UntypedFormControl(row.networkId, [Validators.required]),
          name: new UntypedFormControl(row.name, [Validators.required]),
          teamIds: new UntypedFormControl(row.teamIds || []),
        }),
      );
    }
    return this.rowForms.get(row.id);
  }

  isRowDirty(row: ViewNetworkDto): boolean {
    return this.rowForms.has(row.id) && this.rowForms.get(row.id).dirty;
  }

  saveRow(row: ViewNetworkDto) {
    const form = this.getRowForm(row);
    if (form.valid) {
      const updateForm: UpdateViewNetworkForm = {
        providerType: form.value.providerType,
        providerInstanceId: form.value.providerInstanceId,
        networkId: form.value.networkId,
        name: form.value.name,
        teamIds: form.value.teamIds || [],
      };
      this.networksService
        .updateViewNetwork(this.viewId, row.id, updateForm)
        .pipe(take(1))
        .subscribe(() => {
          this.refresh();
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

  getProviderTypeLabel(value: string): string {
    return this.providerTypeLabels[value] || value;
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
