// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { Team, TeamService } from '../../generated/player-api';
import { NetworksService, ViewNetwork, VmType } from '../../generated/vm-api';
import { ApiStub } from '../../test-utils/api-stub';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { renderComponent } from '../../test-utils/render-component';
import { NetworkPermissionsComponent } from './network-permissions.component';

const VIEW = 'view-1';

const NETWORK: ViewNetwork = {
  id: 'n1',
  viewId: VIEW,
  providerType: VmType.Vsphere,
  providerInstanceId: 'vcenter.test',
  networkId: 'network-42',
  name: 'Lab A',
  teamIds: ['team-1'],
};

const TEAMS: Team[] = [{ id: 'team-1', name: 'Blue' }];

async function renderNetworks(canManage: boolean) {
  const networksApi = {
    getViewNetworks: vi.fn(() => of([structuredClone(NETWORK)])),
    createViewNetwork: vi.fn(() => of(structuredClone(NETWORK))),
    updateViewNetwork: vi.fn(() => of(structuredClone(NETWORK))),
    deleteViewNetwork: vi.fn(() => of({})),
  } satisfies ApiStub<NetworksService>;
  const teamApi = {
    getViewTeams: vi.fn(() => of(structuredClone(TEAMS))),
  } satisfies ApiStub<TeamService>;
  // getParams is overloaded (one key or the whole map); the component reads 'viewId'.
  const routerQuery = {
    getParams: vi.fn(() => VIEW),
  } as unknown as Pick<RouterQuery, 'getParams'>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const rendered = await renderComponent(NetworkPermissionsComponent, {
    inputs: { canManage },
    providers: [
      { provide: NetworksService, useValue: networksApi },
      { provide: TeamService, useValue: teamApi },
      { provide: RouterQuery, useValue: routerQuery },
      { provide: CrucibleDialogService, useValue: dialogService },
    ],
  });
  // Scoped to the table element: a role lookup over the whole page is slow under coverage.
  const table = () =>
    within(
      rendered.container.querySelector('[role=table], table') as HTMLElement,
    );
  // The header row's sort headers are buttons too; row assertions use the data row.
  const dataRow = () => within(table().getAllByRole('row')[1]);
  const form = () =>
    rendered.container.querySelector('form.create-form') as HTMLElement | null;
  return { ...rendered, networksApi, confirm, table, dataRow, form };
}

describe('NetworkPermissionsComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: RouterQuery.getParams stub; stubbed NetworksService.getViewNetworks and TeamService.getViewTeams.
   * Data: one vSphere network Lab A on team Blue; canManage false.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderNetworks(false);

    expect(fixture.componentInstance).toBeInstanceOf(
      NetworkPermissionsComponent,
    );
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the routed view's networks are listed with their team names.
   * Interacts with: RouterQuery.getParams stub; stubbed NetworksService.getViewNetworks and TeamService.getViewTeams.
   * Data: one vSphere network Lab A on team Blue; canManage false.
   */
  it("lists the view's networks with their team names", async () => {
    const { networksApi, table } = await renderNetworks(false);

    expect(networksApi.getViewNetworks).toHaveBeenCalledWith(VIEW);
    expect(table().getByText('Lab A')).toBeInTheDocument();
    expect(table().getByText('Blue')).toBeInTheDocument();
  });

  /**
   * Verifies: without canManage the networks are read-only: no create form, plain-text cells, and no Save or Delete.
   * Interacts with: the canManage input (canManage: false); the rendered table.
   * Data: one network; canManage false.
   */
  it('shows the networks read-only without canManage', async () => {
    const { dataRow, form } = await renderNetworks(false);

    expect(form()).toBeNull();
    expect(dataRow().queryByRole('textbox')).not.toBeInTheDocument();
    expect(dataRow().queryByRole('button')).not.toBeInTheDocument();
    expect(dataRow().getByText('vcenter.test')).toBeInTheDocument();
  });

  /**
   * Verifies: with canManage the create form, editable cells and the row's Save and Delete buttons render.
   * Interacts with: the canManage input (canManage: true); the rendered form and table.
   * Data: one network; canManage true.
   */
  it('offers the create form and row editing with canManage', async () => {
    const { dataRow, form } = await renderNetworks(true);

    expect(form()).not.toBeNull();
    expect(dataRow().getByDisplayValue('vcenter.test')).toBeInTheDocument();
    expect(dataRow().getByDisplayValue('Lab A')).toBeInTheDocument();
    expect(dataRow().getAllByRole('button')).toHaveLength(2);
  });

  /**
   * Verifies: filling the create form and pressing Add creates the network in the routed view and reloads the list.
   * Interacts with: the form's fields and Add button (user-event); stubbed createViewNetwork and getViewNetworks.
   * Data: canManage true; provider instance pve.test, network id vmbr100, name Lab B, no teams.
   */
  it('creates a network from the form', async () => {
    const user = userEvent.setup();
    const { networksApi, form } = await renderNetworks(true);
    const create = within(form()!);
    networksApi.getViewNetworks.mockClear();

    for (const [label, value] of [
      ['Provider Instance ID', 'pve.test'],
      ['Network ID', 'vmbr100'],
      ['Network Name', 'Lab B'],
    ]) {
      const field = create.getByLabelText(label);
      field.focus();
      await user.type(field, value, { skipClick: true });
    }
    await user.click(create.getByRole('button', { name: 'Add' }));

    expect(networksApi.createViewNetwork).toHaveBeenCalledExactlyOnceWith(
      VIEW,
      {
        providerType: VmType.Vsphere,
        providerInstanceId: 'pve.test',
        networkId: 'vmbr100',
        name: 'Lab B',
        teamIds: [],
      },
    );
    expect(networksApi.getViewNetworks).toHaveBeenCalledExactlyOnceWith(VIEW);
  });

  /**
   * Verifies: editing a row enables its Save, which sends the edited network to the API.
   * Interacts with: the row's name field and Save button (user-event); stubbed updateViewNetwork.
   * Data: canManage true; Lab A renamed Lab C.
   */
  it('saves an edited row', async () => {
    const user = userEvent.setup();
    const { networksApi, dataRow } = await renderNetworks(true);
    const name = dataRow().getByDisplayValue('Lab A');
    const [save] = dataRow().getAllByRole('button');
    expect((save as HTMLButtonElement).disabled).toBe(true);

    await user.clear(name);
    await user.type(name, 'Lab C', { skipClick: true });
    await user.click(save);

    expect(networksApi.updateViewNetwork).toHaveBeenCalledExactlyOnceWith(
      VIEW,
      'n1',
      {
        providerType: VmType.Vsphere,
        providerInstanceId: 'vcenter.test',
        networkId: 'network-42',
        name: 'Lab C',
        teamIds: ['team-1'],
      },
    );
  });

  /**
   * Verifies: confirming a row's Delete deletes the network.
   * Interacts with: the row's Delete button (user-event); CrucibleDialogService.confirm stub (true); stubbed deleteViewNetwork.
   * Data: canManage true; network n1.
   */
  it('deletes a network after confirmation', async () => {
    const user = userEvent.setup();
    const { networksApi, confirm, dataRow } = await renderNetworks(true);
    const [, remove] = dataRow().getAllByRole('button');

    await user.click(remove);

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete Network' }),
    );
    expect(networksApi.deleteViewNetwork).toHaveBeenCalledExactlyOnceWith(
      VIEW,
      'n1',
    );
  });
});
