/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable } from '@angular/core';
import { VmTeam } from './vm-team.model';
import { VmTeamsStore } from './vm-teams.store';

@Injectable({ providedIn: 'root' })
export class VmTeamsService {
  constructor(private vmTeamsStore: VmTeamsStore) {}

  set(vmTeams: Array<VmTeam>) {
    this.vmTeamsStore.set(vmTeams);
  }

  add(vmTeam: VmTeam) {
    this.vmTeamsStore.add(vmTeam);
  }

  update(id, vmTeam: Partial<VmTeam>) {
    this.vmTeamsStore.update(id, vmTeam);
  }

  remove(id: string) {
    this.vmTeamsStore.remove(id);
  }
}
