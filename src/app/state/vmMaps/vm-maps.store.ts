// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { VmMap } from '../../generated/vm-api';

export interface VmMapsState extends EntityState<VmMap> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vmMaps' })
export class VmMapsStore extends EntityStore<VmMapsState> {

  constructor() {
    super();
  }

}
