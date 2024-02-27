// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { ID } from '@datorama/akita';
import { take } from 'rxjs/operators';
import { VmMap, VmsService } from '../../generated/vm-api';
import { VmMapsStore } from './vm-maps.store';

@Injectable({ providedIn: 'root' })
export class VmMapsService {
  constructor(
    private vmMapsStore: VmMapsStore,
    private vmService: VmsService,
  ) {}

  get() {
    this.vmMapsStore.setLoading(true);
    this.vmService
      .getAllMaps()
      .pipe(take(1))
      .subscribe((maps) => this.vmMapsStore.set(maps));
  }

  getViewMaps(viewId: string) {
    this.vmMapsStore.setLoading(true);
    this.vmService
      .getViewMaps(viewId)
      .pipe(take(1))
      .subscribe((maps) => this.vmMapsStore.set(maps));
  }

  getTeamMap(teamId: string) {
    this.vmMapsStore.setLoading(true);
    this.vmService
      .getTeamMap(teamId)
      .pipe(take(1))
      .subscribe((map) => this.vmMapsStore.add(map));
  }

  add(viewId: string, vmMap: VmMap) {
    this.vmService
      .createMap(viewId, vmMap)
      .pipe(take(1))
      .subscribe((m) => this.vmMapsStore.add(m));
  }

  update(id: string, vmMap: Partial<VmMap>) {
    this.vmService
      .updateMap(id, vmMap)
      .pipe(take(1))
      .subscribe((m) => this.vmMapsStore.update(id, m));
  }

  remove(id: ID) {
    this.vmService
      .deleteMap(id as string)
      .pipe(take(1))
      .subscribe(() => this.vmMapsStore.remove(id));
  }

  unload() {
    this.vmMapsStore.set([]);
  }
}
