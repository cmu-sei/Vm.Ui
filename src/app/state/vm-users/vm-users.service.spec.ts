// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
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

describe('VmUsersService', () => {
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
   * Verifies: the root-provided service and query share one store, so a set through the service reaches the query the user list injects.
   * Interacts with: TestBed root injector; real VmUsersService, VmUsersStore and VmUsersQuery.
   * Data: alice on team-1.
   */
  it('set through the injected service reaches the injected query', () => {
    const service = TestBed.inject(VmUsersService);
    const query = TestBed.inject(VmUsersQuery);

    service.set([user('u1', 'team-1', 'alice')]);

    expect(query.getAll()).toEqual([
      { ...user('u1', 'team-1', 'alice'), id: 'u1:team-1' },
    ]);
  });

  /**
   * Verifies: set replaces the stored memberships instead of merging them.
   * Interacts with: real VmUsersStore and VmUsersQuery via VmUsersService.set.
   * Data: alice and bob on team-1, then only carol on team-2, then an empty list.
   */
  it('set replaces every stored membership', () => {
    const { service, query } = createState();

    service.set([user('u1', 'team-1', 'alice'), user('u2', 'team-1', 'bob')]);
    service.set([user('u3', 'team-2', 'carol')]);
    expect(query.getValue().ids).toEqual(['u3:team-2']);

    service.set([]);
    expect(query.getCount()).toBe(0);
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
   * Verifies: update merges the active, last VM and last-seen fields and keeps the membership's id, team and name.
   * Interacts with: real VmUsersStore and VmUsersQuery via VmUsersService.update.
   * Data: alice on team-1; update with activeVmId, lastVmId vm-3 and lastSeen.
   */
  it('update merges the activity fields into the stored membership', () => {
    const { service, query } = createState();
    service.set([user('u1', 'team-1', 'alice')]);

    service.update('u1:team-1', {
      activeVmId: 'vm-3',
      lastVmId: 'vm-3',
      lastSeen: '2026-10-12T10:00:00Z',
    });

    expect(query.getEntity('u1:team-1')).toEqual({
      id: 'u1:team-1',
      userId: 'u1',
      teamId: 'team-1',
      username: 'alice',
      activeVmId: 'vm-3',
      lastVmId: 'vm-3',
      lastSeen: '2026-10-12T10:00:00Z',
    });
  });

  /**
   * Verifies: update of a membership that is not stored adds no user and changes none; selectAll emits the same list again (current behavior).
   * Interacts with: real VmUsersStore and VmUsersQuery.selectAll via VmUsersService.update.
   * Data: alice on team-1; update u1:team-2, a team the store has no membership for.
   */
  it('update of an unknown membership leaves the store unchanged', () => {
    const { service, query } = createState();
    service.set([user('u1', 'team-1', 'alice')]);
    const stored = [{ ...user('u1', 'team-1', 'alice'), id: 'u1:team-1' }];
    const emissions = recordEmissions(query.selectAll());

    service.update('u1:team-2', { activeVmId: 'vm-9' });

    expect(emissions).toEqual([stored, stored]);
    expect(query.getValue().ids).toEqual(['u1:team-1']);
    expect(query.getEntity('u1:team-1').activeVmId).toBeNull();
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

  /**
   * Verifies: add of a membership already stored keeps the newer fields and lists the membership twice (current behavior).
   * Interacts with: real VmUsersStore (Akita add checks the raw entity's id before akitaPreAddEntity sets it) via VmUsersService.add; VmUsersQuery.selectByTeam.
   * Data: add alice on team-1, then add the same user and team as alicia.
   */
  it('add of a membership already stored lists it twice', async () => {
    const { service, query } = createState();
    service.add(user('u1', 'team-1', 'alice'));

    service.add(user('u1', 'team-1', 'alicia'));

    // Current behavior; see agent-docs/ui-test-bugs/vm.ui.md.
    expect(query.getValue().ids).toEqual(['u1:team-1', 'u1:team-1']);
    const names = (await firstValueFrom(query.selectByTeam('team-1'))).map(
      (u) => u.username,
    );
    expect(names).toEqual(['alicia', 'alicia']);
  });

  /**
   * Verifies: remove of a membership that is not stored keeps every stored membership.
   * Interacts with: real VmUsersStore and VmUsersQuery via VmUsersService.remove.
   * Data: alice on team-1 and team-2; remove u1 (the bare user id) and u1:team-9.
   */
  it('remove of an unknown membership id keeps every membership', () => {
    const { service, query } = createState();
    service.set([user('u1', 'team-1', 'alice'), user('u1', 'team-2', 'alice')]);

    service.remove('u1');
    service.remove('u1:team-9');

    expect(query.getValue().ids).toEqual(['u1:team-1', 'u1:team-2']);
  });

  /**
   * Verifies: get reads nothing and leaves the stored memberships as they were.
   * Interacts with: real VmUsersStore and VmUsersQuery via VmUsersService.get.
   * Data: alice on team-1.
   */
  it('get returns nothing and leaves the store unchanged', () => {
    const { service, query } = createState();
    service.set([user('u1', 'team-1', 'alice')]);
    const emissions = recordEmissions(query.selectAll());

    expect(service.get()).toBeUndefined();
    expect(emissions).toHaveLength(1);
  });
});
