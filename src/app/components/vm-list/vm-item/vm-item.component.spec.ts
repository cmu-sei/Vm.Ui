// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import {
  PowerState,
  SimpleTeam,
  Vm,
  VmsService,
} from '../../../generated/vm-api';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmService } from '../../../state/vms/vms.service';
import { ApiStub } from '../../../test-utils/api-stub';
import { renderComponent } from '../../../test-utils/render-component';
import { VmItemComponent } from './vm-item.component';

const TEAMS: SimpleTeam[] = [
  { id: 'team-1', name: 'Blue' },
  { id: 'team-2', name: 'Red' },
];

const VM: Vm = {
  id: 'vm-a',
  name: 'kali',
  url: 'http://console.test/vm-a',
  powerState: PowerState.On,
  ipAddresses: ['10.0.0.5', 'fe80::1'],
  teamIds: ['team-1'],
  embeddable: true,
};

async function renderVmItem(inputs: {
  canManageTeam: boolean;
  showIps?: boolean;
  ipv4Only?: boolean;
}) {
  const vmsApi = {
    addVmToTeam: vi.fn(() => of({})),
    removeVmFromTeam: vi.fn(() => of({})),
  } satisfies ApiStub<VmsService>;
  const vmService = {
    GetViewVms: vi.fn(() => of([])),
  } satisfies Pick<VmService, 'GetViewVms'>;
  const theme: Pick<ThemeService, 'addThemeQueryParam'> = {
    addThemeQueryParam: (url) => `${url}?theme=light-theme`,
  };
  const openVmHere = vi.fn<(vm: { [name: string]: string }) => void>();
  const rendered = await renderComponent(VmItemComponent, {
    inputs: {
      vm: structuredClone(VM),
      teamsList: TEAMS,
      showIps: false,
      ipv4Only: true,
      ...inputs,
    },
    on: { openVmHere },
    providers: [
      { provide: VmsService, useValue: vmsApi },
      { provide: VmService, useValue: vmService },
      { provide: ThemeService, useValue: theme },
    ],
  });
  // The power icon area opens the team-assignment menu.
  const menuButton = () =>
    rendered.container.querySelector('.vm-menu-button') as HTMLElement;
  return { ...rendered, vmsApi, vmService, openVmHere, menuButton };
}

describe('VmItemComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: ThemeService.addThemeQueryParam stub.
   * Data: VM kali; canManageTeam false.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderVmItem({ canManageTeam: false });

    expect(fixture.componentInstance).toBeInstanceOf(VmItemComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the VM's name links to its themed console URL.
   * Interacts with: ThemeService.addThemeQueryParam stub.
   * Data: VM kali.
   */
  it("links the VM's name to its themed console URL", async () => {
    await renderVmItem({ canManageTeam: false });

    expect(screen.getByRole('link', { name: 'kali' })).toHaveAttribute(
      'href',
      'http://console.test/vm-a?theme=light-theme',
    );
  });

  /**
   * Verifies: with canManageTeam the icon opens the team menu with the VM's current teams ticked, and ticking another team adds the VM to it and reloads the VMs.
   * Interacts with: the icon area and a team checkbox (user-event); stubbed VmsService.addVmToTeam; VmService.GetViewVms stub.
   * Data: canManageTeam true; kali on Blue; Red ticked.
   */
  it('assigns the VM to a team from its menu with canManageTeam', async () => {
    const user = userEvent.setup();
    const { vmsApi, vmService, menuButton } = await renderVmItem({
      canManageTeam: true,
    });

    await user.click(menuButton());
    const blue = screen.getByRole('checkbox', {
      name: 'Blue',
    }) as HTMLInputElement;
    const red = screen.getByRole('checkbox', {
      name: 'Red',
    }) as HTMLInputElement;
    expect([blue.checked, red.checked]).toEqual([true, false]);
    red.focus();
    await user.keyboard(' ');

    expect(vmsApi.addVmToTeam).toHaveBeenCalledExactlyOnceWith(
      'vm-a',
      'team-2',
    );
    expect(vmsApi.removeVmFromTeam).not.toHaveBeenCalled();
    expect(vmService.GetViewVms).toHaveBeenCalledExactlyOnceWith(true, false);
  });

  /**
   * Verifies: without canManageTeam the icon opens no team menu.
   * Interacts with: the icon area (user-event); the canManageTeam input (canManageTeam: false).
   * Data: canManageTeam false; kali on Blue.
   */
  it('opens no team menu without canManageTeam', async () => {
    const user = userEvent.setup();
    const { vmsApi, menuButton } = await renderVmItem({ canManageTeam: false });

    await user.click(menuButton());

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Red' }),
    ).not.toBeInTheDocument();
    expect(vmsApi.addVmToTeam).not.toHaveBeenCalled();
  });

  /**
   * Verifies: clicking an embeddable VM's link opens it in a Player tab instead of navigating.
   * Interacts with: the VM link (user-event); openVmHere output.
   * Data: kali is embeddable.
   */
  it('opens an embeddable VM in a Player tab from its link', async () => {
    const user = userEvent.setup();
    const { openVmHere } = await renderVmItem({ canManageTeam: false });

    await user.click(screen.getByRole('link', { name: 'kali' }));

    expect(openVmHere).toHaveBeenCalledExactlyOnceWith({
      name: 'kali',
      url: 'http://console.test/vm-a?theme=light-theme',
    });
  });

  /**
   * Verifies: Show IPs lists the VM's addresses, IPv4 only unless ipv4Only is off.
   * Interacts with: the showIps and ipv4Only inputs.
   * Data: addresses 10.0.0.5 and fe80::1; one row per ipv4Only value.
   */
  it.each([
    { ipv4Only: true, expected: ['10.0.0.5'] },
    { ipv4Only: false, expected: ['10.0.0.5', 'fe80::1'] },
  ])(
    'lists the addresses $expected with ipv4Only $ipv4Only',
    async ({ ipv4Only, expected }) => {
      const { container } = await renderVmItem({
        canManageTeam: false,
        showIps: true,
        ipv4Only,
      });

      expect(
        Array.from(container.querySelectorAll('label.text')).map((l) =>
          l.textContent?.trim(),
        ),
      ).toEqual(expected);
    },
  );
});
