// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { ID } from '@datorama/akita';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  BulkPowerOperation,
  BulkPowerOperationResponse,
  Permissions,
  VmsService,
} from '../../generated/vm-api';
import { VmModel } from './vm.model';
import { VmsStore, } from './vms.store';
import { VmsQuery } from './vms.query';

@Injectable({ providedIn: 'root' })
export class VmService {
  private vmUrl: string;
  private teamUrl: string;
  public viewId: string;
  public teamId: string;

  constructor(
    private vmsStore: VmsStore,
    private vmsQuery: VmsQuery,
    private http: HttpClient,
    private settings: ComnSettingsService,
    private router: Router,
    private vmsService: VmsService
  ) {
    this.viewId =
      this.router.routerState.snapshot.root.firstChild.params['viewId'];
    this.teamId =
      this.router.routerState.snapshot.root.firstChild.params['teamId'];

    this.vmUrl = `${settings.settings.ApiUrl}/views/${this.viewId}/vms`;
    this.teamUrl = `${settings.settings.ApiUrl}/teams/${this.teamId}/vms`;
  }

  add(vm: VmModel) {
    this.vmsStore.add(vm);
  }

  update(id, vm: Partial<VmModel>) {
    this.vmsStore.update(id, vm);
  }

  remove(id: ID) {
    this.vmsStore.remove(id);
  }

  public GetViewVms(
    includePersonal: boolean,
    onlyMine: boolean
  ): Observable<Array<VmModel>> {
    this.vmsStore.setLoading(true);
    let params = new HttpParams();
    params = params.append('includePersonal', includePersonal.toString());
    params = params.append('onlyMine', onlyMine.toString());
    return this.http.get<Array<VmModel>>(this.vmUrl, { params: params }).pipe(
      tap((entities) => {
        this.vmsStore.upsertMany(entities);
        this.vmsStore.setLoading(false);
      })
    );
  }

  public GetTeamVms(
    includePersonal: boolean,
    onlyMine: boolean
  ): Observable<Array<VmModel>> {
    let params = new HttpParams();
    params = params.append('includePersonal', includePersonal.toString());
    params = params.append('onlyMine', onlyMine.toString());
    return this.http.get<Array<VmModel>>(this.teamUrl, { params: params });
  }

  public GetViewVmsByName(
    viewId: string,
    name: string
  ): Observable<Array<VmModel>> {
    const url = `${this.settings.settings.ApiUrl}/views/${viewId}/vms?name=${name}`;
    return this.http.get<Array<VmModel>>(url);
  }

  public GetReadOnly(viewId: string): Observable<boolean> {
    return this.vmsService.getViewPermissions(viewId).pipe(
      map((x) => {
        if (x.includes(Permissions.ReadOnly)) {
          return true;
        } else {
          return false;
        }
      })
    );
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
}

