/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { VmTeam } from './vm-team.model';

export interface VmTeamsState extends EntityState<VmTeam, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vm-teams' })
export class VmTeamsStore extends EntityStore<VmTeamsState> {

  constructor() {
    super();
  }

}
