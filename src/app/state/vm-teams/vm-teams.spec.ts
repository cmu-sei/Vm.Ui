// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { createVmTeam } from './vm-team.model';
import { VmTeamsQuery } from './vm-teams.query';
import { VmTeamsService } from './vm-teams.service';
import { VmTeamsStore } from './vm-teams.store';

function createState() {
  const store = new VmTeamsStore();
  return {
    store,
    query: new VmTeamsQuery(store),
    service: new VmTeamsService(store),
  };
}

describe('VmTeams state', () => {
  /**
   * Verifies: createVmTeam keeps the team id and name, attaches the view id, and drops the users.
   * Interacts with: createVmTeam only.
   * Data: a VmUserTeam with one user, view-1.
   */
  it('createVmTeam maps a hub team onto the store model', () => {
    const team = createVmTeam(
      { id: 'team-1', name: 'Blue', users: [{ userId: 'u1' }] },
      'view-1',
    );

    expect(team).toEqual({ id: 'team-1', name: 'Blue', viewId: 'view-1' });
  });

  /**
   * Verifies: set/add/update/remove on the service are reflected by the query.
   * Interacts with: real VmTeamsStore and VmTeamsQuery via VmTeamsService.
   * Data: set Blue, add Red, rename Blue, remove Red.
   */
  it('service writes are visible through the query', () => {
    const { service, query } = createState();

    service.set([{ id: 'team-1', name: 'Blue', viewId: 'view-1' }]);
    service.add({ id: 'team-2', name: 'Red', viewId: 'view-1' });
    service.update('team-1', { name: 'Navy' });
    service.remove('team-2');

    expect(query.getAll()).toEqual([
      { id: 'team-1', name: 'Navy', viewId: 'view-1' },
    ]);
  });
});
