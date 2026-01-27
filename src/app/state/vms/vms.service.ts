// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { ID } from '@datorama/akita';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  BulkPowerOperation,
  BulkPowerOperationResponse,
  Vm,
  VmsService,
} from '../../generated/vm-api';
import { VmsStore } from './vms.store';

@Injectable({ providedIn: 'root' })
export class VmService {
  private vmUrl: string;
  private teamUrl: string;
  public viewId: string;
  public teamId: string;

  constructor(
    private vmsStore: VmsStore,
    private http: HttpClient,
    private settings: ComnSettingsService,
    private router: Router,
    private vmsService: VmsService,
  ) {
    this.viewId =
      this.router.routerState.snapshot.root.firstChild.params['viewId'];
    this.teamId =
      this.router.routerState.snapshot.root.firstChild.params['teamId'];

    this.vmUrl = `${settings.settings.ApiUrl}/views/${this.viewId}/vms`;
    this.teamUrl = `${settings.settings.ApiUrl}/teams/${this.teamId}/vms`;
  }

  add(vm: Vm) {
    this.vmsStore.add(vm);
  }

  update(id, vm: Partial<Vm>) {
    this.vmsStore.update(id, vm);
  }

  remove(id: ID) {
    this.vmsStore.remove(id);
  }

  public GetViewVms(
    includePersonal: boolean,
    onlyMine: boolean,
  ): Observable<Array<Vm>> {
    let params = new HttpParams();
    params = params.append('includePersonal', includePersonal.toString());
    params = params.append('onlyMine', onlyMine.toString());
    return this.http.get<Array<Vm>>(this.vmUrl, { params: params }).pipe(
      tap((entities) => {
        this.vmsStore.set(entities);
      }),
    );
  }

  public GetTeamVms(
    includePersonal: boolean,
    onlyMine: boolean,
    teamId: string,
  ): Observable<Array<Vm>>;

  public GetTeamVms(
    includePersonal: boolean,
    onlyMine: boolean,
  ): Observable<Array<Vm>>;

  public GetTeamVms(
    includePersonal: boolean,
    onlyMine: boolean,
    teamId?: string,
  ): Observable<Array<Vm>> {
    return this.vmsService
      .getTeamVms(teamId ?? this.teamId, null, includePersonal, onlyMine)
      .pipe(
        tap((entities) => {
          this.vmsStore.set(entities);
        }),
      );
  }

  public GetViewVmsByName(viewId: string, name: string): Observable<Array<Vm>> {
    const url = `${this.settings.settings.ApiUrl}/views/${viewId}/vms?name=${name}`;
    return this.http.get<Array<Vm>>(url);
  }

  public powerOn(ids: string[]): Observable<BulkPowerOperationResponse> {
    const operation: BulkPowerOperation = { ids: ids };
    return this.vmsService.bulkPowerOn(operation);
  }

  public powerOff(ids: string[]): Observable<BulkPowerOperationResponse> {
    const operation: BulkPowerOperation = { ids: ids };
    return this.vmsService.bulkPowerOff(operation);
  }

  public shutdown(ids: string[]): Observable<BulkPowerOperationResponse> {
    const args: BulkPowerOperation = { ids: ids };
    return this.vmsService.bulkShutdown(args);
  }

  public reboot(ids: string[]): Observable<BulkPowerOperationResponse> {
    const operation: BulkPowerOperation = { ids: ids };
    return this.vmsService.bulkReboot(operation);
  }

  public revert(ids: string[]): Observable<BulkPowerOperationResponse> {
    const operation: BulkPowerOperation = { ids: ids };
    return this.vmsService.bulkRevert(operation);
  }
}
