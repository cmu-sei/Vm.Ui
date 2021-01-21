/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable } from '@angular/core';
import { VmUser } from './vm-user.model';
import { VmUsersStore } from './vm-users.store';

@Injectable({ providedIn: 'root' })
export class VmUsersService {
  constructor(private vmUsersStore: VmUsersStore) {}

  set(vmUsers: Array<VmUser>) {
    this.vmUsersStore.set(vmUsers);
  }

  get() {}

  add(vmUser: VmUser) {
    this.vmUsersStore.add(vmUser);
  }

  update(id, vmUser: Partial<VmUser>) {
    this.vmUsersStore.update(id, vmUser);
  }

  remove(id: string) {
    this.vmUsersStore.remove(id);
  }
}
