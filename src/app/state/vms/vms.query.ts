// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { QueryEntity, QueryConfig } from '@datorama/akita';
import { VmsStore, VmsState } from './vms.store';
import { Vm, VmsService } from '../../generated/vm-api';
import { Observable } from 'rxjs';

const naturalCompare = require('string-natural-compare');

const sortByFn = (a: Vm, b: Vm, state: VmsState) => {
  return naturalCompare(a.name, b.name, { caseInsensitive: true });
};

@QueryConfig({
  sortBy: sortByFn,
})
@Injectable({ providedIn: 'root' })
export class VmsQuery extends QueryEntity<VmsState> {
  constructor(protected store: VmsStore, private vmService: VmsService) {
    super(store);
  }

  getAllWithName(param: string): Observable<Vm[]> {
    return this.selectAll({
      filterBy: ({ name }) => name.toLowerCase().includes(param.toLowerCase()),
    });
  }
}
