// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { EntityState, EntityStore, EntityUIStore, StoreConfig } from '@datorama/akita';
import { VmModel } from './vm.model';

export interface VmsState extends EntityState<VmModel> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vms' })
export class VmsStore extends EntityStore<VmsState> {
  constructor() {
    super();
  }
}
