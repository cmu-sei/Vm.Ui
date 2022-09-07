// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ID } from '@datorama/akita';
import { VmUISession } from './vm-ui-session.model';
import { initialVmUISession, VmUISessionStore } from './vm-ui-session.store';
import { VmUISessionQuery } from './vm-ui-session.query';
import { VmModel } from '../vms/vm.model';
import { Team, TeamService } from '../../generated/player-api';
import { take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class VmUISessionService {
  public viewId: string;
  public teamId: string;

  constructor(
    private vmUISessionStore: VmUISessionStore,
    private vmUISessionQuery: VmUISessionQuery,
    private router: Router,
    private teamService: TeamService
  ) {
    this.viewId =
      this.router.routerState.snapshot.root.firstChild.params['viewId'];
    this.teamService
      .getMyViewTeams(this.viewId)
      .pipe(take(1))
      .subscribe((tms) => {
        const teams = tms as Array<Team>;
        const primaryTeam = teams.find((t) => t.isPrimary === true);
        this.teamId = primaryTeam.id;
      });
  }

  add(session: VmUISession) {
    this.vmUISessionStore.add(session);
  }

  update(id, session: Partial<VmUISession>) {
    this.vmUISessionStore.update(id, session);
  }

  remove(id: ID) {
    this.vmUISessionStore.remove(id);
  }

  loadCurrentView() {
    let session = this.vmUISessionQuery.getEntity((s) => s.id === this.teamId);
    // If the session doesn't exist in Akita, then add a default session for the current team
    if (!session) {
      session = {
        ...initialVmUISession,
        id: this.teamId,
        viewId: this.viewId,
      };
      this.add(session);
    }
  }

  setOpenedVm(vm: VmModel, isOpened: boolean) {
    const session = this.vmUISessionQuery.getEntity(this.teamId);
    if (isOpened) {
      if (!session.openedVmIds.find((v) => v === vm.id)) {
        const s = [...session.openedVmIds];
        s.push(vm.id);
        this.update(session.id, { openedVmIds: s });
      }
    } else {
      const index = session.openedVmIds.findIndex((v) => v === vm.id);
      if (index >= 0) {
        const s = [...session.openedVmIds];
        s.splice(index, 1);
        this.update(session.id, { openedVmIds: s });
      }
    }
  }

  getCurrentViewId(): string {
    return this.viewId;
  }

  getCurrentTeamId(): string {
    return this.teamId;
  }
}
