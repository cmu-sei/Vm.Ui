// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { VmListComponent } from './vm-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { DragToSelectModule } from 'ngx-drag-to-select';

async function renderVmList(overrides: Partial<VmListComponent> = {}) {
  return renderComponent(VmListComponent, {
    imports: [DragToSelectModule.forRoot()],
    componentProperties: {
      vms: [],
      readOnly: false,
      canViewView: true,
      canManageView: false,
      ...overrides,
    } as any,
  });
}

describe('VmListComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderVmList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the search input', async () => {
    await renderVmList();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should display Virtual Machines heading', async () => {
    await renderVmList();
    expect(screen.getByText('Virtual Machines')).toBeInTheDocument();
  });

  it('should display the Show IPs checkbox', async () => {
    await renderVmList();
    expect(screen.getByText('Show IPs')).toBeInTheDocument();
  });

  it('should show selected count button when not readOnly', async () => {
    await renderVmList({ readOnly: false });
    expect(screen.getByText(/0 selected/)).toBeInTheDocument();
  });

  it('should hide selected count button when readOnly', async () => {
    await renderVmList({ readOnly: true });
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('should display the power filter dropdown with Show label', async () => {
    await renderVmList();
    expect(screen.getByText('Show')).toBeInTheDocument();
  });

  it('should show Sort by Team checkbox when canViewView is true', async () => {
    await renderVmList({ canViewView: true });
    expect(screen.getByText('Sort by Team')).toBeInTheDocument();
  });
});
