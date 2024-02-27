// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { filterNil, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Coordinate, VmMap } from '../../generated/vm-api';
import { VmMapsStore, VmMapsState } from './vm-maps.store';

@Injectable({ providedIn: 'root' })
export class VmMapsQuery extends QueryEntity<VmMapsState> {
  constructor(protected store: VmMapsStore) {
    super(store);
  }

  getById(id: string): Observable<VmMap> {
    return this.selectEntity(id).pipe(filterNil);
  }

  getByViewId(id: string): Observable<VmMap[]> {
    return this.selectAll({
      filterBy: ({ viewId }) => viewId === id,
    });
  }

  getAllWithName(param: string): Observable<VmMap[]> {
    return this.selectAll({
      filterBy: ({ name }) => name.toLowerCase().includes(param.toLowerCase()),
    });
  }

  getMapCoordinates(mapId: string): Observable<Coordinate[]> {
    return this.selectEntity(mapId).pipe(
      filterNil,
      map((m) => m.coordinates),
    );
  }
}
