/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { VmUser } from './vm-user.model';

export interface VmUsersState extends EntityState<VmUser, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vm-users', idKey: 'id' })
export class VmUsersStore extends EntityStore<VmUsersState> {
  constructor() {
    super();
  }

  akitaPreAddEntity(entity: VmUser) {
    return {
      ...entity,
      id: `${entity.userId}:${entity.teamId}`,
    };
  }
}
