// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, inject } from '@angular/core';
import { QueryEntity, QueryConfig } from '@datorama/akita';
import { VmsStore, VmsState } from './vms.store';
import { Vm, VmsService } from '../../generated/vm-api';
import { Observable } from 'rxjs';
import stringNaturalCompare from 'string-natural-compare';

const sortByFn = (a: Vm, b: Vm, state: VmsState) => {
  return stringNaturalCompare(a.name, b.name, { caseInsensitive: true });
};

@QueryConfig({
  sortBy: sortByFn,
})
@Injectable({ providedIn: 'root' })
export class VmsQuery extends QueryEntity<VmsState> {
  protected store: VmsStore;
  private vmService = inject(VmsService);

  constructor() {
    const store = inject(VmsStore);

    super(store);

    this.store = store;
  }

  getAllWithName(param: string): Observable<Vm[]> {
    return this.selectAll({
      filterBy: ({ name }) =>
        name?.toLowerCase().includes(param.toLowerCase()) ?? false,
    });
  }
}
