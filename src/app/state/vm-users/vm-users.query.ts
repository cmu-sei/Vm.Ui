/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable } from '@angular/core';
import { QueryConfig, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { VmUser } from './vm-user.model';
import { VmUsersStore, VmUsersState } from './vm-users.store';

@QueryConfig({
  sortBy: 'username',
})
@Injectable({ providedIn: 'root' })
export class VmUsersQuery extends QueryEntity<VmUsersState> {
  constructor(protected store: VmUsersStore) {
    super(store);
  }

  public selectByTeam(teamId: string): Observable<Array<VmUser>> {
    return this.selectAll({
      filterBy: (entity) => entity.teamIds.includes(teamId),
    });
  }
}
