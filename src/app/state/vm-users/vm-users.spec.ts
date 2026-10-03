// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { VmUser } from '../../generated/vm-api';
import { recordEmissions } from '../../test-utils/record-emissions';
import { VmUsersQuery } from './vm-users.query';
import { VmUsersService } from './vm-users.service';
import { VmUsersStore } from './vm-users.store';

function createState() {
  const store = new VmUsersStore();
  return {
    store,
    query: new VmUsersQuery(store),
    service: new VmUsersService(store),
  };
}

function user(userId: string, teamId: string, username: string): VmUser {
  return { userId, teamId, username, activeVmId: null };
}

describe('VmUsers state', () => {
  /**
   * Verifies: users are keyed by "userId:teamId", so one person on two teams is two entities.
   * Interacts with: real VmUsersStore.akitaPreAddEntity via VmUsersService.set.
   * Data: user u1 on team-1 and team-2.
   */
  it('keys each user by userId and teamId', () => {
    const { service, query } = createState();

    service.set([user('u1', 'team-1', 'alice'), user('u1', 'team-2', 'alice')]);

    expect(query.getValue().ids).toEqual(['u1:team-1', 'u1:team-2']);
  });

  /**
   * Verifies: selectByTeam returns only that team's users, sorted by username.
   * Interacts with: real VmUsersQuery (QueryConfig sortBy username).
   * Data: carol and alice on team-1, bob on team-2.
   */
  it('selectByTeam filters by team and sorts by username', async () => {
    const { service, query } = createState();
    service.set([
      user('u3', 'team-1', 'carol'),
      user('u2', 'team-2', 'bob'),
      user('u1', 'team-1', 'alice'),
    ]);

    const names = (await firstValueFrom(query.selectByTeam('team-1'))).map(
      (u) => u.username,
    );

    expect(names).toEqual(['alice', 'carol']);
  });

  /**
   * Verifies: updating one membership's active VM leaves the same user's other team untouched.
   * Interacts with: real store via VmUsersService.update; selectByTeam stream.
   * Data: u1 on team-1 and team-2; update u1:team-1 activeVmId to vm-9.
   */
  it('update targets one team membership', () => {
    const { service, query } = createState();
    service.set([user('u1', 'team-1', 'alice'), user('u1', 'team-2', 'alice')]);
    const team1 = recordEmissions(query.selectByTeam('team-1'));

    service.update('u1:team-1', { activeVmId: 'vm-9' });

    expect(team1.map((list) => list[0].activeVmId)).toEqual([null, 'vm-9']);
    expect(query.getEntity('u1:team-2').activeVmId).toBeNull();
  });

  /**
   * Verifies: add stores a new membership and remove deletes it by its composite id.
   * Interacts with: real store via VmUsersService.add/remove.
   * Data: add u5 on team-3, then remove 'u5:team-3'.
   */
  it('add and remove use the composite id', () => {
    const { service, query } = createState();

    service.add(user('u5', 'team-3', 'eve'));
    expect(query.hasEntity('u5:team-3')).toBe(true);

    service.remove('u5:team-3');
    expect(query.getCount()).toBe(0);
  });
});
