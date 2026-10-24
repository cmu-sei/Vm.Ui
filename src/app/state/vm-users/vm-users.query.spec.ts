// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VmUser } from '../../generated/vm-api';
import { recordEmissions } from '../../test-utils/record-emissions';
import { VmUsersQuery } from './vm-users.query';
import { VmUsersService } from './vm-users.service';
import { VmUsersStore } from './vm-users.store';

function createState() {
  const store = new VmUsersStore();
  const injector = Injector.create({
    providers: [{ provide: VmUsersStore, useValue: store }],
  });
  return {
    store,
    query: runInInjectionContext(injector, () => new VmUsersQuery()),
    service: runInInjectionContext(injector, () => new VmUsersService()),
  };
}

function user(userId: string, teamId: string, username: string): VmUser {
  return { userId, teamId, username, activeVmId: null };
}

describe('VmUsersQuery', () => {
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
   * Verifies: the username sort ignores case, so a capitalized name is not put ahead of lower-case ones.
   * Interacts with: real VmUsersQuery (Akita compareValues upper-cases strings).
   * Data: bob, Carol and alice on team-1, stored in that order.
   */
  it('selectByTeam sorts usernames case-insensitively', async () => {
    const { service, query } = createState();
    service.set([
      user('u2', 'team-1', 'bob'),
      user('u3', 'team-1', 'Carol'),
      user('u1', 'team-1', 'alice'),
    ]);

    const names = (await firstValueFrom(query.selectByTeam('team-1'))).map(
      (u) => u.username,
    );

    expect(names).toEqual(['alice', 'bob', 'Carol']);
  });

  /**
   * Verifies: selectByTeam for a team with no stored users emits an empty list.
   * Interacts with: real VmUsersQuery.selectByTeam.
   * Data: alice on team-1; select team-2.
   */
  it('selectByTeam emits an empty list for a team with no users', async () => {
    const { service, query } = createState();
    service.set([user('u1', 'team-1', 'alice')]);

    expect(await firstValueFrom(query.selectByTeam('team-2'))).toEqual([]);
  });

  /**
   * Verifies: selectByTeam is live: a user added to the team later appears in sorted position, and a removed one disappears.
   * Interacts with: real VmUsersStore via VmUsersService.add/remove; VmUsersQuery.selectByTeam stream.
   * Data: carol on team-1; add bob on team-1 and dave on team-2; remove carol.
   */
  it('selectByTeam follows adds and removes on that team', () => {
    const { service, query } = createState();
    service.set([user('u3', 'team-1', 'carol')]);
    const team1 = recordEmissions(query.selectByTeam('team-1'));

    service.add(user('u2', 'team-1', 'bob'));
    service.add(user('u4', 'team-2', 'dave'));
    service.remove('u3:team-1');

    expect(team1.map((list) => list.map((u) => u.username))).toEqual([
      ['carol'],
      ['bob', 'carol'],
      ['bob', 'carol'],
      ['bob'],
    ]);
  });
});
