// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { createVmTeam } from './vm-team.model';

describe('createVmTeam', () => {
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
   * Verifies: a hub team with no name and no users still becomes a store team with its id and view id.
   * Interacts with: createVmTeam only.
   * Data: a VmUserTeam with name null and users null, view-2.
   */
  it('createVmTeam keeps a null team name', () => {
    const team = createVmTeam(
      { id: 'team-2', name: null, users: null },
      'view-2',
    );

    expect(team).toEqual({ id: 'team-2', name: null, viewId: 'view-2' });
  });
});
