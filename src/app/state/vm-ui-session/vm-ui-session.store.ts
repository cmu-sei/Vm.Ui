// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { EntityState, EntityStore, EntityUIStore, StoreConfig } from '@datorama/akita';
import { standardTabs, VmUISession } from './vm-ui-session.model';

export interface VmUISessionState extends EntityState<VmUISession> {}

export const initialVmUISession: VmUISession = {
  tabOpened: standardTabs.VMList,
  searchValue: '',
  isShowIPsSelected: false,
  isShowIPv4OnlySelected: true,
  itemsPerPage: 50,
  pageNumber: 1,
  openedVmIds: [],
};

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vmUISession' })
export class VmUISessionStore extends EntityStore<VmUISessionState> {
  constructor() {
    super();
  }
}
