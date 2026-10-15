// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import {
  PermissionService,
  TeamPermissionsClaim,
  TeamPermissionService,
} from '../../generated/player-api';
import {
  AppSystemPermission,
  AppTeamPermission,
  AppViewPermission,
} from '../../generated/vm-api';
import { MANAGE_MAPS } from '../../components/map/map-permissions';
import { ApiStub } from '../../test-utils/api-stub';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  EffectivePermissionRequirements,
  UserPermissionsService,
} from './user-permissions.service';

const VIEW = 'view-1';
const OTHER_VIEW = 'view-2';

// The requirement sets the components pass, so each gate is exercised exactly as wired.
const CONTROL_VMS: EffectivePermissionRequirements = {
  systemPermissions: [AppSystemPermission.ControlVms],
  teamPermissions: [AppTeamPermission.ControlTeamVms],
  viewPermissions: [AppViewPermission.ControlViewVms],
};

function claim(
  teamId: string,
  extra: Partial<TeamPermissionsClaim> = {},
): TeamPermissionsClaim {
  return {
    viewId: VIEW,
    teamId,
    isPrimary: false,
    permissionValues: [],
    directPermissionValues: [],
    sourceTeamIds: [],
    ...extra,
  };
}

function setup(
  system: string[] = [],
  claims: TeamPermissionsClaim[] = [],
  options: { load?: boolean } = {},
) {
  const getMyPermissions = vi.fn(() => of(system));
  const getMyTeamPermissions = vi.fn(
    (_viewId?: string, _teamId?: string, _all?: boolean) => of(claims),
  );
  TestBed.configureTestingModule({
    providers: [
      {
        provide: PermissionService,
        useValue: { getMyPermissions } satisfies ApiStub<PermissionService>,
      },
      {
        provide: TeamPermissionService,
        useValue: {
          getMyTeamPermissions,
        } satisfies ApiStub<TeamPermissionService>,
      },
    ],
  });
  const service = TestBed.inject(UserPermissionsService);
  if (options.load !== false) {
    service.load().subscribe();
    service.loadTeamPermissions(VIEW, undefined, true).subscribe();
  }
  return { service, getMyPermissions, getMyTeamPermissions };
}

const value = (source: Observable<boolean>) => firstValueFrom(source);

describe('UserPermissionsService', () => {
  describe('loading', () => {
    /**
     * Verifies: load() fetches system permissions and replays them on permissions$.
     * Interacts with: stubbed player PermissionService.getMyPermissions.
     * Data: system permissions [ViewViews, ControlVms].
     */
    it('load publishes the system permissions', async () => {
      const { service } = setup(['ViewViews', 'ControlVms'], [], {
        load: false,
      });

      await firstValueFrom(service.load());

      expect(await firstValueFrom(service.permissions$)).toEqual([
        'ViewViews',
        'ControlVms',
      ]);
    });

    /**
     * Verifies: loadTeamPermissions forwards its arguments and replays the claims on teamPermissions$.
     * Interacts with: stubbed player TeamPermissionService.getMyTeamPermissions.
     * Data: one claim; arguments (view-1, undefined, true).
     */
    it('loadTeamPermissions forwards the scope and publishes the claims', async () => {
      const claims = [claim('team-1', { isPrimary: true })];
      const { service, getMyTeamPermissions } = setup([], claims, {
        load: false,
      });

      await firstValueFrom(service.loadTeamPermissions(VIEW, undefined, true));

      expect(getMyTeamPermissions).toHaveBeenCalledWith(VIEW, undefined, true);
      expect(await firstValueFrom(service.teamPermissions$)).toEqual(claims);
    });

    /**
     * Verifies: gates stay silent until both permission sets are loaded, so templates render nothing yet.
     * Interacts with: hasEffectivePermissionsForPrimaryContext (combineLatest of both streams).
     * Data: system ControlVms; only load() is called, not loadTeamPermissions().
     */
    it('does not answer a gate until both permission sets are loaded', () => {
      const { service } = setup(['ControlVms'], [], { load: false });
      const answers = recordEmissions(
        service.hasEffectivePermissionsForPrimaryContext(VIEW, CONTROL_VMS),
      );

      service.load().subscribe();
      expect(answers).toEqual([]);

      service.loadTeamPermissions(VIEW).subscribe();
      expect(answers).toEqual([true]);
    });
  });

  describe('getPrimaryTeamId()', () => {
    /**
     * Verifies: the primary team is the primary claim within the requested view.
     * Interacts with: teamPermissions$.
     * Data: primary team-9 in view-2, primary team-1 and non-primary team-2 in view-1.
     */
    it('returns the primary team of the requested view', async () => {
      const { service } = setup(
        [],
        [
          claim('team-9', { viewId: OTHER_VIEW, isPrimary: true }),
          claim('team-2'),
          claim('team-1', { isPrimary: true }),
        ],
      );

      expect(await firstValueFrom(service.getPrimaryTeamId(VIEW))).toBe(
        'team-1',
      );
    });

    /**
     * Verifies: a view where the caller has no primary team yields undefined.
     * Interacts with: teamPermissions$.
     * Data: only a non-primary claim in view-1.
     */
    it('returns undefined when the view has no primary team', async () => {
      const { service } = setup([], [claim('team-2')]);

      expect(
        await firstValueFrom(service.getPrimaryTeamId(VIEW)),
      ).toBeUndefined();
    });
  });

  describe('hasSystemPermission()', () => {
    /**
     * Verifies: a system permission is granted only when it is in the caller's system list.
     * Interacts with: permissions$.
     * Data: system [ViewViews]; one row asks for ViewViews, one for ManageMaps.
     */
    it.each([
      { permission: AppSystemPermission.ViewViews, expected: true },
      { permission: AppSystemPermission.ManageMaps, expected: false },
    ])(
      'answers $expected for $permission with system [ViewViews]',
      async ({ permission, expected }) => {
        const { service } = setup(['ViewViews']);

        expect(await value(service.hasSystemPermission(permission))).toBe(
          expected,
        );
      },
    );
  });

  describe('can()', () => {
    const DIRECT_CLAIMS = [
      claim('team-1', {
        isPrimary: true,
        directPermissionValues: ['ManageView'],
      }),
      claim('team-2', { directPermissionValues: ['ViewView'] }),
    ];

    /**
     * Verifies: can() reads only the primary claim's direct permissions.
     * Interacts with: teamPermissions$.
     * Data: primary claim with direct ManageView; a non-primary claim with direct ViewView; one row per permission.
     */
    it.each([
      { permission: AppViewPermission.ManageView, expected: true },
      { permission: AppViewPermission.ViewView, expected: false },
    ])(
      'answers $expected for $permission from the primary claim only',
      async ({ permission, expected }) => {
        const { service } = setup([], DIRECT_CLAIMS);

        expect(await value(service.can(undefined, permission))).toBe(expected);
      },
    );

    /**
     * Verifies: effective (scoped) permissions on the primary claim do not count for can().
     * Interacts with: teamPermissions$.
     * Data: primary claim with ManageTeam only in permissionValues, not in directPermissionValues.
     */
    it('ignores effective permissions that are not direct', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ManageTeam'],
          }),
        ],
      );

      expect(await value(service.can(AppTeamPermission.ManageTeam))).toBe(
        false,
      );
    });

    /**
     * Verifies: a system-level grant does not satisfy can(), which only looks at team claims.
     * Interacts with: permissions$ and teamPermissions$.
     * Data: system [ManageViews]; primary claim with no permissions.
     */
    it('does not consider system permissions', async () => {
      const { service } = setup(
        ['ManageViews'],
        [claim('team-1', { isPrimary: true })],
      );

      expect(
        await value(service.can(undefined, AppViewPermission.ManageView)),
      ).toBe(false);
    });
  });

  describe('hasEffectivePermissionsForPrimaryContext()', () => {
    /**
     * Verifies: a matching system permission grants regardless of team claims.
     * Interacts with: permissions$ and teamPermissions$.
     * Data: system [ControlVms]; no claims at all.
     */
    it('grants on a system permission even with no team claims', async () => {
      const { service } = setup(['ControlVms'], []);

      expect(
        await value(
          service.hasEffectivePermissionsForPrimaryContext(VIEW, CONTROL_VMS),
        ),
      ).toBe(true);
    });

    /**
     * Verifies: without a primary team in the view, team and view grants are ignored.
     * Interacts with: teamPermissions$.
     * Data: non-primary claim with ControlTeamVms and ControlViewVms.
     */
    it('denies when the caller has no primary team in the view', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            permissionValues: ['ControlTeamVms', 'ControlViewVms'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForPrimaryContext(VIEW, CONTROL_VMS),
        ),
      ).toBe(false);
    });

    const SCOPED_CLAIMS = [
      claim('team-1', { isPrimary: true }),
      claim('team-2', {
        sourceTeamIds: ['team-1'],
        permissionValues: ['ManageTeamMaps'],
      }),
      claim('team-3', { permissionValues: ['ManageViewMaps'] }),
    ];

    /**
     * Verifies: a team scoped in from the primary team is part of the context; unrelated teams are not.
     * Interacts with: teamPermissions$ (sourceTeamIds).
     * Data: primary team-1; team-2 scoped from team-1 with ManageTeamMaps; team-3 unrelated with ManageViewMaps; one row per requirement.
     */
    it.each<[string, EffectivePermissionRequirements, boolean]>([
      [
        'ManageTeamMaps on the scoped-in team',
        { teamPermissions: [AppTeamPermission.ManageTeamMaps] },
        true,
      ],
      [
        'ManageViewMaps on an unrelated team',
        { viewPermissions: [AppViewPermission.ManageViewMaps] },
        false,
      ],
    ])('answers %s with %s', async (_label, requirements, expected) => {
      const { service } = setup([], SCOPED_CLAIMS);

      expect(
        await value(
          service.hasEffectivePermissionsForPrimaryContext(VIEW, requirements),
        ),
      ).toBe(expected);
    });

    const UPLOAD_CLAIMS = [
      claim('team-1', {
        isPrimary: true,
        permissionValues: ['UploadTeamIsos', 'UploadViewIsos'],
      }),
      claim('team-2', { sourceTeamIds: ['team-1'] }),
    ];

    /**
     * Verifies: with teamIds, team permissions must come from those teams, but view permissions still come from the whole context.
     * Interacts with: teamPermissions$.
     * Data: primary team-1 with UploadTeamIsos and UploadViewIsos; team-2 scoped from team-1; target teamIds [team-2]; one row per requirement.
     */
    it.each<[string, EffectivePermissionRequirements, boolean]>([
      [
        'the team permission (only on the primary team)',
        { teamPermissions: [AppTeamPermission.UploadTeamIsos] },
        false,
      ],
      [
        'the view permission (from the context)',
        { viewPermissions: [AppViewPermission.UploadViewIsos] },
        true,
      ],
    ])(
      'narrowed to team-2, answers %s with %s',
      async (_label, requirements, expected) => {
        const { service } = setup([], UPLOAD_CLAIMS);

        expect(
          await value(
            service.hasEffectivePermissionsForPrimaryContext(
              VIEW,
              requirements,
              ['team-2'],
            ),
          ),
        ).toBe(expected);
      },
    );

    /**
     * Verifies: claims from another view never contribute.
     * Interacts with: teamPermissions$.
     * Data: primary claim in view-2 with ControlViewVms; question asked for view-1.
     */
    it('ignores claims from other views', async () => {
      const { service } = setup(
        [],
        [
          claim('team-9', {
            viewId: OTHER_VIEW,
            isPrimary: true,
            permissionValues: ['ControlViewVms'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForPrimaryContext(VIEW, CONTROL_VMS),
        ),
      ).toBe(false);
    });
  });

  describe('hasEffectivePermissionsForTeams()', () => {
    /**
     * Verifies: no target teams always denies, even with the system permission.
     * Interacts with: permissions$ and teamPermissions$.
     * Data: system [ControlVms]; one row with teamIds [], one with [''].
     */
    it.each([{ teamIds: [] as string[] }, { teamIds: [''] }])(
      'denies teamIds $teamIds even for a system grant',
      async ({ teamIds }) => {
        const { service } = setup(['ControlVms'], []);

        expect(
          await value(
            service.hasEffectivePermissionsForTeams(VIEW, teamIds, CONTROL_VMS),
          ),
        ).toBe(false);
      },
    );

    /**
     * Verifies: the system permission grants on any target team.
     * Interacts with: permissions$.
     * Data: system [ControlVms]; teamIds [team-5] with no claims.
     */
    it('grants on a system permission', async () => {
      const { service } = setup(['ControlVms'], []);

      expect(
        await value(
          service.hasEffectivePermissionsForTeams(
            VIEW,
            ['team-5'],
            CONTROL_VMS,
          ),
        ),
      ).toBe(true);
    });

    const CONTROL_CLAIMS = [
      claim('team-1', {
        isPrimary: true,
        permissionValues: ['ControlTeamVms'],
      }),
      claim('team-2'),
    ];

    /**
     * Verifies: a team permission counts only when it is on one of the target teams.
     * Interacts with: teamPermissions$.
     * Data: ControlTeamVms on primary team-1, team-2 with no grant; one row per target team.
     */
    it.each([
      { target: 'team-1', expected: true },
      { target: 'team-2', expected: false },
    ])(
      'answers $expected for target $target with ControlTeamVms on team-1',
      async ({ target, expected }) => {
        const { service } = setup([], CONTROL_CLAIMS);

        expect(
          await value(
            service.hasEffectivePermissionsForTeams(
              VIEW,
              [target],
              CONTROL_VMS,
            ),
          ),
        ).toBe(expected);
      },
    );

    /**
     * Verifies: a direct view permission on the primary team grants on any team in the view.
     * Interacts with: teamPermissions$ (directPermissionValues on the primary claim).
     * Data: primary team-1 with direct ControlViewVms; target team-2 has no claims of its own.
     */
    it('grants a direct view permission from the primary context on other teams', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            isPrimary: true,
            directPermissionValues: ['ControlViewVms'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForTeams(
            VIEW,
            ['team-2'],
            CONTROL_VMS,
          ),
        ),
      ).toBe(true);
    });

    /**
     * Verifies: a direct view permission on a team outside the primary context does not grant.
     * Interacts with: teamPermissions$.
     * Data: primary team-1 (no perms); unrelated team-3 with direct ControlViewVms; target team-2.
     */
    it('ignores direct view permissions outside the primary context', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', { isPrimary: true }),
          claim('team-3', { directPermissionValues: ['ControlViewVms'] }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForTeams(
            VIEW,
            ['team-2'],
            CONTROL_VMS,
          ),
        ),
      ).toBe(false);
    });

    /**
     * Verifies: an effective view permission on the target team's own claim grants.
     * Interacts with: teamPermissions$ (permissionValues on the target claim).
     * Data: no primary team; target team-2 with ControlViewVms in permissionValues.
     */
    it("grants a view permission found on the target team's claim", async () => {
      const { service } = setup(
        [],
        [claim('team-2', { permissionValues: ['ControlViewVms'] })],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForTeams(
            VIEW,
            ['team-2'],
            CONTROL_VMS,
          ),
        ),
      ).toBe(true);
    });

    /**
     * Verifies: the removed EditView/EditTeam values no longer open the Vm gate.
     * Interacts with: teamPermissions$; toTeamPermissions/toViewPermissions filtering.
     * Data: primary team-1 with EditTeam and EditView in both value lists.
     */
    it('does not treat the removed Edit permissions as Vm control', async () => {
      const { service } = setup(
        ['EditViews'],
        [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['EditTeam', 'EditView'],
            directPermissionValues: ['EditTeam', 'EditView'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForTeams(
            VIEW,
            ['team-1'],
            CONTROL_VMS,
          ),
        ),
      ).toBe(false);
    });
  });

  describe('hasEffectivePermissionsForEveryTeam() - Map management', () => {
    /**
     * Verifies: ManageMaps (system) manages a Map on any teams.
     * Interacts with: permissions$.
     * Data: system [ManageMaps]; Map on team-1 and team-2 with no claims.
     */
    it('grants on the ManageMaps system permission', async () => {
      const { service } = setup(['ManageMaps'], []);

      expect(
        await value(
          service.hasEffectivePermissionsForEveryTeam(
            VIEW,
            ['team-1', 'team-2'],
            MANAGE_MAPS,
          ),
        ),
      ).toBe(true);
    });

    const TEAM_MAPS_CLAIMS = [
      claim('team-1', {
        isPrimary: true,
        permissionValues: ['ManageTeamMaps'],
      }),
      claim('team-2'),
    ];

    /**
     * Verifies: ManageTeamMaps must be held on every team the Map is on.
     * Interacts with: teamPermissions$.
     * Data: ManageTeamMaps on primary team-1 only, team-2 with no grant; one row per Map team list.
     */
    it.each([
      { mapTeams: ['team-1'], expected: true },
      { mapTeams: ['team-1', 'team-2'], expected: false },
    ])(
      'answers $expected for a Map on $mapTeams with ManageTeamMaps on team-1',
      async ({ mapTeams, expected }) => {
        const { service } = setup([], TEAM_MAPS_CLAIMS);

        expect(
          await value(
            service.hasEffectivePermissionsForEveryTeam(
              VIEW,
              mapTeams,
              MANAGE_MAPS,
            ),
          ),
        ).toBe(expected);
      },
    );

    /**
     * Verifies: ManageTeamMaps on each team (one direct, one scoped) passes the every-team check.
     * Interacts with: teamPermissions$.
     * Data: primary team-1 and scoped team-2 each with ManageTeamMaps; duplicate and empty ids in the list.
     */
    it('passes when each team grants ManageTeamMaps, ignoring duplicate and empty ids', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ManageTeamMaps'],
          }),
          claim('team-2', {
            sourceTeamIds: ['team-1'],
            permissionValues: ['ManageTeamMaps'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForEveryTeam(
            VIEW,
            ['team-1', 'team-2', 'team-1', ''],
            MANAGE_MAPS,
          ),
        ),
      ).toBe(true);
    });

    /**
     * Verifies: a direct ManageViewMaps on the primary team manages a Map on any teams.
     * Interacts with: teamPermissions$ (direct view fallback).
     * Data: primary team-1 with direct ManageViewMaps; Map on team-2 and team-3.
     */
    it('grants on ManageViewMaps held directly by the primary team', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            isPrimary: true,
            directPermissionValues: ['ManageViewMaps'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForEveryTeam(
            VIEW,
            ['team-2', 'team-3'],
            MANAGE_MAPS,
          ),
        ),
      ).toBe(true);
    });

    /**
     * Verifies: a Map on no teams belongs to the View, so ManageTeamMaps on the primary team does not manage it.
     * Interacts with: hasEffectivePermissionsForPrimaryContext fallback.
     * Data: Map teamIds null; primary team-1 with ManageTeamMaps.
     */
    it('does not manage a Map on no teams with ManageTeamMaps', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ManageTeamMaps'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForEveryTeam(VIEW, null, MANAGE_MAPS),
        ),
      ).toBe(false);
    });

    /**
     * Verifies: a Map on no teams belongs to the View, so ManageViewMaps on the primary team manages it.
     * Interacts with: hasEffectivePermissionsForPrimaryContext fallback.
     * Data: Map teamIds []; primary team-1 with ManageViewMaps.
     */
    it('manages a Map on no teams with ManageViewMaps', async () => {
      const { service } = setup(
        [],
        [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ManageViewMaps'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForEveryTeam(VIEW, [], MANAGE_MAPS),
        ),
      ).toBe(true);
    });

    /**
     * Verifies: without any Map grant the caller cannot manage the Map.
     * Interacts with: permissions$ and teamPermissions$.
     * Data: system [ViewMaps]; primary team-1 with ViewTeamMaps and ManageTeam.
     */
    it('denies View-only and unrelated grants', async () => {
      const { service } = setup(
        ['ViewMaps'],
        [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ViewTeamMaps', 'ManageTeam'],
            directPermissionValues: ['ViewTeamMaps', 'ManageTeam'],
          }),
        ],
      );

      expect(
        await value(
          service.hasEffectivePermissionsForEveryTeam(
            VIEW,
            ['team-1'],
            MANAGE_MAPS,
          ),
        ),
      ).toBe(false);
    });
  });
});
