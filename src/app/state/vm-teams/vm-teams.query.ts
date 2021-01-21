/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { VmTeamsStore, VmTeamsState } from './vm-teams.store';

@Injectable({ providedIn: 'root' })
export class VmTeamsQuery extends QueryEntity<VmTeamsState> {

  constructor(protected store: VmTeamsStore) {
    super(store);
  }

}
