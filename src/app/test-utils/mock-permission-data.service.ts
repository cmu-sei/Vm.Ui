// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

// vm.ui's permission rules (primary context, scoped teams, every-team checks)
// live in UserPermissionsService itself. These providers build the REAL service
// over stubbed player-api "my permissions" endpoints, so the gate logic under
// test is the production code, not a re-implementation that can drift from it.

import { inject, Provider } from '@angular/core';
import { vi } from 'vitest';
import { of } from 'rxjs';
import {
  PermissionService,
  TeamPermissionsClaim,
  TeamPermissionService,
} from '../generated/player-api';
import { AppSystemPermission } from '../generated/vm-api';
import { UserPermissionsService } from '../services/permissions/user-permissions.service';
import { ApiStub } from './api-stub';

export interface PermissionGrants {
  /** System permissions, as `GET /me/permissions` returns them. */
  system?: AppSystemPermission[];
  /** Team claims, as `GET /me/team-permissions` returns them. */
  teams?: TeamPermissionsClaim[];
}

export function permissionApiStubs(grants: PermissionGrants = {}) {
  return {
    permissions: {
      getMyPermissions: vi.fn(() => of<string[]>([...(grants.system ?? [])])),
    } satisfies ApiStub<PermissionService>,
    teamPermissions: {
      getMyTeamPermissions: vi.fn(() =>
        of(structuredClone(grants.teams ?? [])),
      ),
    } satisfies ApiStub<TeamPermissionService>,
  };
}

export function permissionDataProviders(
  grants: PermissionGrants = {},
): Provider[] {
  const stubs = permissionApiStubs(grants);
  return [
    { provide: PermissionService, useValue: stubs.permissions },
    { provide: TeamPermissionService, useValue: stubs.teamPermissions },
    {
      provide: UserPermissionsService,
      // inject() resolves the stubs above (or a test's own override) with the
      // real types, so the partial stubs need no casts.
      useFactory: () => {
        const service = new UserPermissionsService(
          inject(PermissionService),
          inject(TeamPermissionService),
        );
        // Seed both streams, so a component that only reads permissions (and
        // never calls load()) still sees the grants. Components that do call
        // load() or loadTeamPermissions() get the same values again.
        service.load().subscribe();
        service.loadTeamPermissions().subscribe();
        return service;
      },
    },
  ];
}
