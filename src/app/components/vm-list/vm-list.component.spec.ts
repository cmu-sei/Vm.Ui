// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import {
  DragToSelectModule,
  SelectContainerComponent,
} from 'ngx-drag-to-select';
import { of } from 'rxjs';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  BulkPowerOperationResponse,
  PowerState,
  SimpleTeam,
  Vm,
  VmsService,
} from '../../generated/vm-api';
import { VmService } from '../../state/vms/vms.service';
import { ApiStub } from '../../test-utils/api-stub';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { renderComponent } from '../../test-utils/render-component';
import { VmItemComponent } from './vm-item/vm-item.component';
import { VmListComponent } from './vm-list.component';

@Component({ selector: 'vm-item', template: '' })
class VmItemStubComponent {
  @Input() vm: Vm;
  @Input() ipv4Only: boolean;
  @Input() showIps: boolean;
  @Input() teamsList: SimpleTeam[];
  @Input() canManageTeam: boolean;
  @Output() openVmHere = new EventEmitter<{ [name: string]: string }>();
}

const BLUE: SimpleTeam = { id: 'team-1', name: 'Blue' };
const RED: SimpleTeam = { id: 'team-2', name: 'Red' };

function makeVm(id: string, name: string, teamIds: string[]): Vm {
  return {
    id,
    name,
    url: `http://console.test/${id}`,
    powerState: PowerState.On,
    ipAddresses: [],
    teamIds,
    embeddable: true,
  };
}

const VMS = [makeVm('a', 'kali', ['team-1']), makeVm('b', 'win10', ['team-2'])];

interface ListInputs {
  readOnly?: boolean;
  canRevertVms?: boolean;
  canManageView?: boolean;
  canViewView?: boolean | null;
}

async function renderVmList(
  inputs: ListInputs = {},
  teams: SimpleTeam[] = [BLUE, RED],
) {
  const vmService = {
    viewId: 'view-1',
    GetViewVms: vi.fn(() => of(structuredClone(VMS))),
    powerOn: vi.fn(() =>
      of<BulkPowerOperationResponse>({ accepted: ['a', 'b'], errors: {} }),
    ),
    revert: vi.fn(() =>
      of<BulkPowerOperationResponse>({ accepted: [], errors: { b: 'busy' } }),
    ),
  } satisfies Pick<VmService, 'viewId' | 'GetViewVms' | 'powerOn' | 'revert'>;
  const vmsApi = {
    getTeams: vi.fn(() => of(structuredClone(teams))),
  } satisfies ApiStub<VmsService>;
  const confirm = vi.fn(() => dialogRefStub<unknown, boolean>(true).dialogRef);
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const errors = vi.fn<(errors: { [key: string]: string }) => void>();
  const rendered = await renderComponent(VmListComponent, {
    imports: [DragToSelectModule.forRoot()],
    childStubs: [{ replace: VmItemComponent, with: VmItemStubComponent }],
    inputs: {
      vms: structuredClone(VMS),
      readOnly: false,
      canRevertVms: false,
      canManageView: false,
      canViewView: true,
      ...inputs,
    },
    on: { errors },
    providers: [
      { provide: VmService, useValue: vmService },
      { provide: VmsService, useValue: vmsApi },
      { provide: CrucibleDialogService, useValue: dialogService },
    ],
  });
  const items = () =>
    rendered.fixture.debugElement
      .queryAll(By.directive(VmItemStubComponent))
      .map((d) => d.componentInstance as VmItemStubComponent);
  // Drag selection needs real layout, which jsdom lacks; select through the
  // container's own API. The OnPush list re-renders on the next UI event.
  const selectAll = () =>
    rendered.fixture.debugElement
      .query(By.directive(SelectContainerComponent))
      .injector.get(SelectContainerComponent)
      .selectAll();
  // A text lookup: a role lookup over the whole list is slow under coverage.
  const actionsButton = () =>
    screen.queryByText(/\d+ selected/)?.closest('button') ?? null;
  const openActions = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(actionsButton()!);
    return within(screen.getByRole('menu'));
  };
  return {
    ...rendered,
    vmService,
    vmsApi,
    confirm,
    errors,
    items,
    selectAll,
    actionsButton,
    openActions,
  };
}

describe('VmListComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: VmService stub (GetViewVms, viewId); stubbed VmsService.getTeams; VmItem stub.
   * Data: VMs kali and win10; teams Blue and Red; canViewView true.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderVmList();

    expect(fixture.componentInstance).toBeInstanceOf(VmListComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the list loads the view's VMs and teams and renders one item per VM.
   * Interacts with: VmService stub (GetViewVms, viewId); stubbed VmsService.getTeams; VmItem stub inputs.
   * Data: VMs kali and win10; teams Blue and Red; canViewView true.
   */
  it('loads the VMs and teams and renders an item per VM', async () => {
    const { vmService, vmsApi, items } = await renderVmList();

    expect(vmService.GetViewVms).toHaveBeenCalledExactlyOnceWith(true, false);
    expect(vmsApi.getTeams).toHaveBeenCalledWith('view-1');
    expect(items().map((i) => i.vm.name)).toEqual(['kali', 'win10']);
  });

  describe('read-only gate', () => {
    /**
     * Verifies: a list that is not read-only shows the actions menu with the power actions.
     * Interacts with: the readOnly input (false); the actions menu (user-event).
     * Data: readOnly false; canRevertVms false.
     */
    it('shows the VM actions menu when not read-only', async () => {
      const user = userEvent.setup();
      const { openActions } = await renderVmList({ readOnly: false });

      const menu = await openActions(user);

      expect(
        menu.getAllByRole('menuitem').map((i) => i.textContent?.trim()),
      ).toEqual([
        'Clear Selections',
        'Power On',
        'Power Off',
        'Reboot',
        'Shutdown',
        'Open in Player tab',
        'Open in browser tab',
      ]);
    });

    /**
     * Verifies: a read-only list hides the actions menu, so no power action is reachable.
     * Interacts with: the readOnly input (true).
     * Data: readOnly true; canRevertVms true (the near miss: revert held, control not).
     */
    it('hides the VM actions menu when read-only', async () => {
      const { actionsButton } = await renderVmList({
        readOnly: true,
        canRevertVms: true,
      });

      expect(actionsButton()).not.toBeInTheDocument();
    });
  });

  describe('revert gate', () => {
    /**
     * Verifies: with canRevertVms the actions menu offers Revert, which reverts the selected VMs after confirmation and reports their errors.
     * Interacts with: the actions menu (user-event); CrucibleDialogService.confirm stub (true); VmService.revert stub; errors output.
     * Data: canRevertVms true; both VMs selected; the API reports b as busy.
     */
    it('reverts the selected VMs with canRevertVms', async () => {
      const user = userEvent.setup();
      const { openActions, selectAll, vmService, confirm, errors } =
        await renderVmList({ canRevertVms: true });
      selectAll();

      const menu = await openActions(user);
      await user.click(menu.getByRole('menuitem', { name: 'Revert' }));

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Revert',
          message: 'Are you sure you want to revert 2 selected machines?',
        }),
      );
      expect(vmService.revert).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
      expect(errors.mock.calls).toEqual([[{}], [{ b: 'busy' }]]);
    });

    /**
     * Verifies: without canRevertVms the actions menu has no Revert item while the other power actions stay.
     * Interacts with: the actions menu (user-event); the canRevertVms input (canRevertVms: false).
     * Data: readOnly false; canRevertVms false.
     */
    it('hides Revert without canRevertVms', async () => {
      const user = userEvent.setup();
      const { openActions } = await renderVmList({ canRevertVms: false });

      const menu = await openActions(user);

      expect(
        menu.queryByRole('menuitem', { name: 'Revert' }),
      ).not.toBeInTheDocument();
      expect(
        menu.getByRole('menuitem', { name: 'Power On' }),
      ).toBeInTheDocument();
    });
  });

  /**
   * Verifies: with nothing selected the actions that need a selection are disabled.
   * Interacts with: the actions menu (user-event).
   * Data: readOnly false; no VM selected.
   */
  it('disables the selection actions with nothing selected', async () => {
    const user = userEvent.setup();
    const { openActions } = await renderVmList();

    const menu = await openActions(user);

    expect(
      menu
        .getAllByRole('menuitem')
        .filter((i) => (i as HTMLButtonElement).disabled)
        .map((i) => i.textContent?.trim()),
    ).toEqual([
      'Power On',
      'Power Off',
      'Reboot',
      'Shutdown',
      'Open in Player tab',
      'Open in browser tab',
    ]);
  });

  /**
   * Verifies: Power On powers on the selected VMs after confirmation.
   * Interacts with: the actions menu (user-event); CrucibleDialogService.confirm stub (true); VmService.powerOn stub.
   * Data: readOnly false; both VMs selected.
   */
  it('powers on the selected VMs', async () => {
    const user = userEvent.setup();
    const { openActions, selectAll, vmService, actionsButton } =
      await renderVmList();
    selectAll();

    const menu = await openActions(user);
    expect(actionsButton()).toHaveTextContent('2 selected');
    await user.click(menu.getByRole('menuitem', { name: 'Power On' }));

    expect(vmService.powerOn).toHaveBeenCalledExactlyOnceWith(['a', 'b']);
  });

  describe('team management gate', () => {
    /**
     * Verifies: canManageView reaches every VM item as canManageTeam, true and false.
     * Interacts with: the canManageView input; VmItem stub's canManageTeam input.
     * Data: one row per canManageView value; VMs kali and win10.
     */
    it.each([true, false])(
      'passes canManageView %s to each VM item as canManageTeam',
      async (canManageView) => {
        const { items } = await renderVmList({ canManageView });

        expect(items().map((i) => i.canManageTeam)).toEqual([
          canManageView,
          canManageView,
        ]);
      },
    );
  });

  describe('VM loading', () => {
    /**
     * Verifies: the VMs are not loaded until canViewView is known.
     * Interacts with: the canViewView input (null); VmService.GetViewVms stub.
     * Data: canViewView null.
     */
    it('does not load the VMs while canViewView is unknown', async () => {
      const { vmService } = await renderVmList({ canViewView: null });

      expect(vmService.GetViewVms).not.toHaveBeenCalled();
    });

    /**
     * Verifies: once canViewView is known the VMs load, whether it is true or false (the API filters what the caller may see).
     * Interacts with: the canViewView input (canViewView: false); VmService.GetViewVms stub.
     * Data: canViewView false.
     */
    it('loads the VMs once canViewView is known, even when false', async () => {
      const { vmService } = await renderVmList({ canViewView: false });

      expect(vmService.GetViewVms).toHaveBeenCalledExactlyOnceWith(true, false);
    });
  });

  describe('sort by team', () => {
    /**
     * Verifies: a view with several teams offers Sort by Team, which groups the VMs into one panel per team.
     * Interacts with: the Sort by Team checkbox (keyboard, user-event); stubbed VmsService.getTeams (canSortByTeams$).
     * Data: teams Blue and Red; kali on Blue, win10 on Red.
     */
    it('groups the VMs by team in a view with several teams', async () => {
      const user = userEvent.setup();
      const { container } = await renderVmList();
      const sort = screen.getByRole('checkbox', { name: 'Sort by Team' });

      sort.focus();
      await user.keyboard(' ');

      expect(
        Array.from(container.querySelectorAll('mat-panel-title')).map((t) =>
          t.textContent?.trim(),
        ),
      ).toEqual(['Blue', 'Red']);
    });

    /**
     * Verifies: a view with a single team has no Sort by Team option.
     * Interacts with: stubbed VmsService.getTeams (canSortByTeams$ false).
     * Data: only team Blue.
     */
    it('hides Sort by Team in a view with one team', async () => {
      await renderVmList({}, [BLUE]);

      expect(
        screen.queryByRole('checkbox', { name: 'Sort by Team' }),
      ).not.toBeInTheDocument();
    });
  });
});
