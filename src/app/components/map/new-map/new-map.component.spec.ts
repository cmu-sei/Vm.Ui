// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import {
  FileService as PlayerFileService,
  TeamPermissionsClaim,
} from '../../../generated/player-api';
import {
  AppSystemPermission,
  SimpleTeam,
  VmMap,
  VmsService,
} from '../../../generated/vm-api';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { ApiStub } from '../../../test-utils/api-stub';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { NewMapComponent } from './new-map.component';

const VIEW = 'view-1';
const TEAMS: SimpleTeam[] = [
  { id: 'team-1', name: 'Blue' },
  { id: 'team-2', name: 'Red' },
];

function primary(
  teamId: string,
  extra: Partial<TeamPermissionsClaim> = {},
): TeamPermissionsClaim {
  return {
    viewId: VIEW,
    teamId,
    isPrimary: true,
    permissionValues: [],
    directPermissionValues: [],
    sourceTeamIds: [],
    ...extra,
  };
}

async function renderNewMap(
  overrides: {
    system?: AppSystemPermission[];
    claims?: TeamPermissionsClaim[];
    teams?: SimpleTeam[];
    inputs?: Partial<
      Pick<NewMapComponent, 'creating' | 'name' | 'url' | 'teamsInput'>
    >;
  } = {},
) {
  const {
    system = [],
    claims = [primary('team-1')],
    teams = TEAMS,
    inputs = { creating: true },
  } = overrides;

  const vmsApi = {
    getTeams: vi.fn(() => of(teams)),
    createMap: vi.fn((_viewId: string, map: VmMap) => of(map)),
  } satisfies ApiStub<VmsService>;
  // No view files, so the "Select Image" list stays empty and no blobs are downloaded.
  const filesApi = {
    getViewFiles: vi.fn(() => of([])),
  } satisfies ApiStub<PlayerFileService>;
  const mapCreated = vi.fn();
  const propertiesChanged = vi.fn();

  const rendered = await renderComponent(NewMapComponent, {
    inputs: { viewId: VIEW, ...inputs },
    on: { mapCreated, propertiesChanged },
    providers: [
      { provide: VmsService, useValue: vmsApi },
      { provide: PlayerFileService, useValue: filesApi },
      ...permissionDataProviders({ system, teams: claims }),
    ],
  });

  const teamSelect = () =>
    TestbedHarnessEnvironment.loader(rendered.fixture).getHarness(
      MatSelectHarness.with({ selector: '[formControlName="teamIDs"]' }),
    );
  const teamOptions = async () => {
    const select = await teamSelect();
    await select.open();
    const options = await select.getOptions();
    return Promise.all(options.map((o) => o.getText()));
  };

  return {
    ...rendered,
    vmsApi,
    mapCreated,
    propertiesChanged,
    teamSelect,
    teamOptions,
  };
}

describe('NewMapComponent', () => {
  describe('team choices', () => {
    /**
     * Verifies: only teams the caller can manage maps on are offered.
     * Interacts with: stubbed VmsService.getTeams; real UserPermissionsService.hasEffectivePermissionsForTeams; MatSelectHarness.
     * Data: Blue (team-1, primary, ManageTeamMaps) and Red (team-2, no grant).
     */
    it('offers only the teams with ManageTeamMaps', async () => {
      const { vmsApi, teamOptions } = await renderNewMap({
        claims: [
          primary('team-1', { permissionValues: ['ManageTeamMaps'] }),
          { ...primary('team-2'), isPrimary: false },
        ],
      });

      expect(vmsApi.getTeams).toHaveBeenCalledWith(VIEW);
      expect(await teamOptions()).toEqual(['Blue']);
    });

    /**
     * Verifies: the ManageMaps system permission offers every team.
     * Interacts with: real UserPermissionsService; MatSelectHarness.
     * Data: system [ManageMaps]; primary team-1 with no team grants.
     */
    it('offers every team with the ManageMaps system permission', async () => {
      const { teamOptions } = await renderNewMap({
        system: [AppSystemPermission.ManageMaps],
      });

      expect(await teamOptions()).toEqual(['Blue', 'Red']);
    });

    /**
     * Verifies: a direct ManageViewMaps on the primary team offers every team in the view.
     * Interacts with: real UserPermissionsService (direct view fallback); MatSelectHarness.
     * Data: primary team-1 with direct ManageViewMaps.
     */
    it('offers every team with ManageViewMaps held directly', async () => {
      const { teamOptions } = await renderNewMap({
        claims: [
          primary('team-1', { directPermissionValues: ['ManageViewMaps'] }),
        ],
      });

      expect(await teamOptions()).toEqual(['Blue', 'Red']);
    });

    /**
     * Verifies: without a Map grant no team is offered.
     * Interacts with: real UserPermissionsService; MatSelectHarness.
     * Data: primary team-1 with ViewTeamMaps only.
     */
    it('offers no teams without a Map management permission', async () => {
      const { teamOptions } = await renderNewMap({
        claims: [primary('team-1', { permissionValues: ['ViewTeamMaps'] })],
      });

      expect(await teamOptions()).toEqual([]);
    });

    /**
     * Verifies: a view with no teams offers no team choices, even to a ManageMaps holder.
     * Interacts with: stubbed VmsService.getTeams (empty); MatSelectHarness.
     * Data: getTeams returns []; system [ManageMaps].
     */
    it('offers no teams for a view with no teams', async () => {
      const { teamOptions } = await renderNewMap({
        teams: [],
        system: [AppSystemPermission.ManageMaps],
      });

      expect(await teamOptions()).toEqual([]);
    });
  });

  describe('submit', () => {
    /**
     * Verifies: Save stays disabled until a name, a team and an image source are given.
     * Interacts with: the real crucible-dialog Save button; form validators; user-event typing.
     * Data: ManageMaps; name 'Ops Floor', URL http://img.test/floor.png, team Blue.
     */
    it('enables Save only once name, team and image are set', async () => {
      const user = userEvent.setup();
      const { teamSelect } = await renderNewMap({
        system: [AppSystemPermission.ManageMaps],
      });
      const save = screen.getByRole('button', { name: 'Save' });
      expect(save).toBeDisabled();

      await user.type(screen.getByLabelText('Name'), 'Ops Floor');
      await user.type(
        screen.getByLabelText('External Image URL'),
        'http://img.test/floor.png',
      );
      expect(save).toBeDisabled();

      await (await teamSelect()).clickOptions({ text: 'Blue' });

      expect(save).toBeEnabled();
    });

    /**
     * Verifies: creating saves an empty map through VmMapsService and emits mapCreated with its new id.
     * Interacts with: real VmMapsService/VmMapsStore, read back through VmMapsQuery; stubbed VmsService.createMap; mapCreated output.
     * Data: ManageMaps; name 'Ops Floor', URL http://img.test/floor.png, team Blue.
     */
    it('creates the map and emits its id', async () => {
      const user = userEvent.setup();
      const { teamSelect, vmsApi, mapCreated } = await renderNewMap({
        system: [AppSystemPermission.ManageMaps],
      });
      await user.type(screen.getByLabelText('Name'), 'Ops Floor');
      await user.type(
        screen.getByLabelText('External Image URL'),
        'http://img.test/floor.png',
      );
      await (await teamSelect()).clickOptions({ text: 'Blue' });

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(vmsApi.createMap).toHaveBeenCalledExactlyOnceWith(VIEW, {
        id: expect.any(String),
        name: 'Ops Floor',
        imageUrl: 'http://img.test/floor.png',
        teamIds: ['team-1'],
        coordinates: null,
      });
      const [, saved] = vmsApi.createMap.mock.calls[0];
      expect(mapCreated).toHaveBeenCalledExactlyOnceWith(saved.id);
      expect(TestBed.inject(VmMapsQuery).getEntity(saved.id)).toMatchObject({
        name: 'Ops Floor',
        teamIds: ['team-1'],
      });
    });

    /**
     * Verifies: editing emits the changed properties instead of creating a map.
     * Interacts with: propertiesChanged output; stubbed VmsService.createMap.
     * Data: creating false; prefilled name 'Old', URL http://img.test/old.png, teams [team-1]; name changed to 'New'.
     */
    it('emits propertiesChanged when editing', async () => {
      const user = userEvent.setup();
      const { vmsApi, propertiesChanged } = await renderNewMap({
        system: [AppSystemPermission.ManageMaps],
        inputs: {
          creating: false,
          name: 'Old',
          url: 'http://img.test/old.png',
          teamsInput: ['team-1'],
        },
      });
      expect(
        screen.getByRole('heading', { name: 'Edit Properties' }),
      ).toBeInTheDocument();

      const name = screen.getByLabelText('Name');
      await user.clear(name);
      await user.type(name, 'New');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(propertiesChanged).toHaveBeenCalledExactlyOnceWith([
        'New',
        'http://img.test/old.png',
        ['team-1'],
      ]);
      expect(vmsApi.createMap).not.toHaveBeenCalled();
    });
  });
});
