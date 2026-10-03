// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { TeamPermissionsClaim } from '../../../generated/player-api';
import {
  AppSystemPermission,
  VmMap,
  VmsService,
} from '../../../generated/vm-api';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { activatedRouteStub } from '../../../test-utils/activated-route';
import { ApiStub } from '../../../test-utils/api-stub';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { permissionDataProviders } from '../../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../../test-utils/render-component';
import { MapTeamDisplayComponent } from '../map-team-display/map-team-display.component';
import { MapComponent } from '../map.component';
import { NewMapComponent } from '../new-map/new-map.component';
import { PageNotFoundComponent } from '../../page-not-found/page-not-found.component';
import { TopbarComponent } from '../../topbar/topbar.component';
import { MapMainComponent } from './map-main.component';

const VIEW = 'view-1';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {}

@Component({ selector: 'app-page-not-found', template: '' })
class PageNotFoundStubComponent {
  @Input() heading: string;
  @Input() message: string;
}

@Component({ selector: 'app-map-team-display', template: '' })
class MapTeamDisplayStubComponent {
  @Input() imageUrlInput: string;
  @Input() mapIdInput: string;
  @Output() mapSwitched = new EventEmitter<string>();
}

@Component({ selector: 'app-map', template: '' })
class MapStubComponent {
  @Input() mapIdInput: string;
  @Output() mapSaved = new EventEmitter<void>();
  @Output() initEmitter = new EventEmitter<boolean>();
}

@Component({ selector: 'app-new-map', template: '' })
class NewMapStubComponent {
  @Input() viewId: string;
  @Input() creating: boolean;
  @Input() name: string;
  @Input() url: string;
  @Input() teamsInput: string[];
  @Output() mapCreated = new EventEmitter<string>();
  @Output() propertiesChanged = new EventEmitter<[string, string, string[]]>();
}

function makeMap(id: string, teamIds: string[] | null): VmMap {
  return {
    id,
    viewId: VIEW,
    name: `Map ${id}`,
    imageUrl: 'http://img.test/map.png',
    coordinates: [],
    teamIds,
  };
}

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

async function renderMapMain(
  overrides: {
    system?: AppSystemPermission[];
    claims?: TeamPermissionsClaim[];
    maps?: VmMap[];
    confirmDelete?: boolean;
  } = {},
) {
  const {
    system = [],
    claims = [primary('team-1')],
    maps = [makeMap('m1', ['team-1'])],
    confirmDelete = true,
  } = overrides;

  const vmsApi = {
    getViewMaps: vi.fn(() => of(structuredClone(maps))),
    deleteMap: vi.fn(() => of(null)),
  } satisfies ApiStub<VmsService>;
  // The confirm dialog closes with the user's answer.
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(confirmDelete).dialogRef,
  );
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const { route } = activatedRouteStub({}, { viewId: VIEW });
  const open = vi.fn(() => dialogRefStub<NewMapComponent>().dialogRef);
  const dialog: Pick<MatDialog, 'open'> = { open };

  const rendered = await renderComponent(MapMainComponent, {
    childStubs: [
      { replace: TopbarComponent, with: TopbarStubComponent },
      { replace: PageNotFoundComponent, with: PageNotFoundStubComponent },
      { replace: MapTeamDisplayComponent, with: MapTeamDisplayStubComponent },
      { replace: MapComponent, with: MapStubComponent },
      { replace: NewMapComponent, with: NewMapStubComponent },
    ],
    providers: [
      { provide: VmsService, useValue: vmsApi },
      ...permissionDataProviders({ system, teams: claims }),
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: ActivatedRoute, useValue: route },
      { provide: MatDialog, useValue: dialog },
    ],
  });

  const selectMap = async (name: string) => {
    const loader = TestbedHarnessEnvironment.loader(rendered.fixture);
    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({ text: name });
  };

  return {
    ...rendered,
    vmsApi,
    confirm,
    open,
    selectMap,
    query: TestBed.inject(VmMapsQuery),
  };
}

const button = (name: string) => screen.queryByRole('button', { name });

describe('MapMainComponent', () => {
  /**
   * Verifies: when the caller has no primary team in the view, the page shows View Not Found.
   * Interacts with: real UserPermissionsService (getPrimaryTeamId) over stubbed player APIs; PageNotFound stub.
   * Data: a non-primary team-1 claim with ManageTeamMaps in view-1 and a primary claim in view-2 (near misses of a primary team in view-1); one map in the view.
   */
  it('shows View Not Found when the caller has no primary team in the view', async () => {
    const { fixture, vmsApi } = await renderMapMain({
      claims: [
        primary('team-1', {
          isPrimary: false,
          permissionValues: ['ManageTeamMaps'],
        }),
        primary('team-9', { viewId: 'view-2' }),
      ],
    });

    expect(vmsApi.getViewMaps).toHaveBeenCalledWith(VIEW);
    expect(
      fixture.debugElement.query(By.directive(PageNotFoundStubComponent)),
    ).not.toBeNull();
    expect(button('New Map')).not.toBeInTheDocument();
  });

  /**
   * Verifies: the ManageMaps system permission shows New Map plus Edit and Delete Map for the selected map.
   * Interacts with: real UserPermissionsService gates (canCreateMaps$, canManageSelectedMap$); real VmMapsStore/Query.
   * Data: system [ManageMaps]; primary team-1 with no team grants; map m1 on team-1.
   */
  it('shows every map action with the ManageMaps system permission', async () => {
    await renderMapMain({ system: [AppSystemPermission.ManageMaps] });

    expect(button('New Map')).toBeInTheDocument();
    expect(button('Edit')).toBeInTheDocument();
    expect(button('Delete Map')).toBeInTheDocument();
  });

  /**
   * Verifies: with no Map permission the actions are hidden and a single map shows no selector.
   * Interacts with: real UserPermissionsService gates; MapTeamDisplay stub.
   * Data: primary team-1 with only ViewTeamMaps; one map m1.
   */
  it('hides map actions and the selector without a Map management permission', async () => {
    const { fixture } = await renderMapMain({
      claims: [primary('team-1', { permissionValues: ['ViewTeamMaps'] })],
    });

    expect(button('New Map')).not.toBeInTheDocument();
    expect(button('Edit')).not.toBeInTheDocument();
    expect(button('Delete Map')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const display = fixture.debugElement.query(
      By.directive(MapTeamDisplayStubComponent),
    ).componentInstance as MapTeamDisplayStubComponent;
    expect(display.mapIdInput).toBe('m1');
  });

  /**
   * Verifies: a read-only caller still gets the map selector when the view has several maps.
   * Interacts with: template condition maps.length > 1 || canCreateMaps$.
   * Data: primary team-1 with only ViewTeamMaps; maps m1 and m2.
   */
  it('shows the selector to a read-only caller when there are several maps', async () => {
    await renderMapMain({
      claims: [primary('team-1', { permissionValues: ['ViewTeamMaps'] })],
      maps: [makeMap('m1', ['team-1']), makeMap('m2', ['team-1'])],
    });

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(button('New Map')).not.toBeInTheDocument();
  });

  /**
   * Verifies: ManageTeamMaps lets the caller create maps and edit a map on their team, but not one also on another team.
   * Interacts with: MatSelectHarness; real hasEffectivePermissionsForPrimaryContext / ForEveryTeam.
   * Data: primary team-1 with ManageTeamMaps; m1 on [team-1], m2 on [team-1, team-2].
   */
  it('requires ManageTeamMaps on every team of the selected map to edit it', async () => {
    const { selectMap } = await renderMapMain({
      claims: [primary('team-1', { permissionValues: ['ManageTeamMaps'] })],
      maps: [makeMap('m1', ['team-1']), makeMap('m2', ['team-1', 'team-2'])],
    });
    expect(button('New Map')).toBeInTheDocument();
    expect(button('Edit')).toBeInTheDocument();

    await selectMap('Map m2');

    expect(button('New Map')).toBeInTheDocument();
    expect(button('Edit')).not.toBeInTheDocument();
    expect(button('Delete Map')).not.toBeInTheDocument();
  });

  /**
   * Verifies: a map on no teams can only be managed with a View-level grant, not ManageTeamMaps.
   * Interacts with: real hasEffectivePermissionsForEveryTeam (no-teams fallback).
   * Data: primary team-1 with ManageTeamMaps; map m1 with teamIds null.
   */
  it('does not let ManageTeamMaps edit a map that is on no teams', async () => {
    await renderMapMain({
      claims: [primary('team-1', { permissionValues: ['ManageTeamMaps'] })],
      maps: [makeMap('m1', null)],
    });

    expect(button('New Map')).toBeInTheDocument();
    expect(button('Edit')).not.toBeInTheDocument();
  });

  /**
   * Verifies: switching from a map being edited to one the caller cannot manage drops edit mode.
   * Interacts with: Edit button (user-event), MatSelectHarness, Map and MapTeamDisplay stubs.
   * Data: primary team-1 with ManageTeamMaps; m1 on [team-1], m2 on [team-2].
   */
  it('leaves edit mode when switching to a map the caller cannot manage', async () => {
    const user = userEvent.setup();
    const { fixture, selectMap } = await renderMapMain({
      claims: [primary('team-1', { permissionValues: ['ManageTeamMaps'] })],
      maps: [makeMap('m1', ['team-1']), makeMap('m2', ['team-2'])],
    });

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(button('Discard Changes')).toBeInTheDocument();
    expect(
      fixture.debugElement.query(By.directive(MapStubComponent)),
    ).not.toBeNull();

    await selectMap('Map m2');

    expect(button('Discard Changes')).not.toBeInTheDocument();
    expect(
      fixture.debugElement.query(By.directive(MapStubComponent)),
    ).toBeNull();
    expect(
      fixture.debugElement.query(By.directive(MapTeamDisplayStubComponent)),
    ).not.toBeNull();
  });

  /**
   * Verifies: New Map opens the new-map dialog from the component's template.
   * Interacts with: New Map button (user-event); MatDialog.open stub.
   * Data: system [ManageMaps]; single map m1.
   */
  it('opens the New Map dialog', async () => {
    const user = userEvent.setup();
    const { open } = await renderMapMain({
      system: [AppSystemPermission.ManageMaps],
    });

    await user.click(screen.getByRole('button', { name: 'New Map' }));

    expect(open).toHaveBeenCalledExactlyOnceWith(expect.any(TemplateRef), {
      width: '400px',
      maxWidth: '90vw',
    });
  });

  /**
   * Verifies: confirming Delete Map deletes it through the API and removes it from the store.
   * Interacts with: CrucibleDialogService.confirm stub (afterClosed true); real VmMapsService/Store; stubbed deleteMap.
   * Data: system [ManageMaps]; single map m1.
   */
  it('deletes the selected map after confirmation', async () => {
    const user = userEvent.setup();
    const { vmsApi, confirm, query } = await renderMapMain({
      system: [AppSystemPermission.ManageMaps],
    });

    await user.click(screen.getByRole('button', { name: 'Delete Map' }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete Map?' }),
    );
    expect(vmsApi.deleteMap).toHaveBeenCalledWith('m1');
    expect(query.getCount()).toBe(0);
    expect(
      screen.getByRole('heading', { name: 'No Map is assigned to this Team' }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: cancelling the Delete Map dialog keeps the map.
   * Interacts with: CrucibleDialogService.confirm stub (afterClosed false); stubbed deleteMap.
   * Data: system [ManageMaps]; single map m1.
   */
  it('keeps the map when the delete is cancelled', async () => {
    const user = userEvent.setup();
    const { vmsApi, query } = await renderMapMain({
      system: [AppSystemPermission.ManageMaps],
      confirmDelete: false,
    });

    await user.click(screen.getByRole('button', { name: 'Delete Map' }));

    expect(vmsApi.deleteMap).not.toHaveBeenCalled();
    expect(query.getCount()).toBe(1);
  });
});
