// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { VmItemComponent } from './vm-item.component';
import { renderComponent } from 'src/app/test-utils/render-component';

function createMockVm(overrides: Record<string, any> = {}) {
  return {
    id: 'vm-1',
    name: 'Test VM Alpha',
    url: 'http://localhost:4310/vm/1',
    powerState: 'On',
    ipAddresses: ['192.168.1.10', 'fe80::1'],
    teamIds: ['team-1'],
    hasPendingTasks: false,
    hasSnapshot: false,
    embeddable: true,
    lastError: null,
    ...overrides,
  };
}

async function renderVmItem(overrides: Partial<VmItemComponent> = {}) {
  return renderComponent(VmItemComponent, {
    componentProperties: {
      vm: createMockVm(),
      ipv4Only: true,
      showIps: false,
      teamsList: [],
      canManageTeam: false,
      ...overrides,
    } as any,
  });
}

describe('VmItemComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderVmItem();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display VM name', async () => {
    await renderVmItem({ vm: createMockVm({ name: 'My Server' }) } as any);
    expect(screen.getByText('My Server')).toBeInTheDocument();
  });

  it('should display IP addresses when showIps is true', async () => {
    await renderVmItem({
      vm: createMockVm({ ipAddresses: ['10.0.0.5', 'fe80::1'] }),
      showIps: true,
      ipv4Only: false,
    } as any);
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    expect(screen.getByText('fe80::1')).toBeInTheDocument();
  });

  it('should hide IP addresses when showIps is false', async () => {
    await renderVmItem({
      vm: createMockVm({ ipAddresses: ['10.0.0.5'] }),
      showIps: false,
    } as any);
    expect(screen.queryByText('10.0.0.5')).not.toBeInTheDocument();
  });

  it('should filter to IPv4 only when ipv4Only is true', async () => {
    await renderVmItem({
      vm: createMockVm({ ipAddresses: ['10.0.0.5', 'fe80::1'] }),
      showIps: true,
      ipv4Only: true,
    } as any);
    expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    expect(screen.queryByText('fe80::1')).not.toBeInTheDocument();
  });
});
