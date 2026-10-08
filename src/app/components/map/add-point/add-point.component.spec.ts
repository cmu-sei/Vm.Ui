// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Clickpoint } from '../../../models/clickpoint';
import { VmService } from '../../../state/vms/vms.service';
import { activatedRouteStub } from '../../../test-utils/activated-route';
import { renderComponent } from '../../../test-utils/render-component';
import { AddPointComponent } from './add-point.component';

async function renderAddPoint(editing: boolean) {
  const vmService = {
    GetViewVms: vi.fn(() => of([])),
  } satisfies Pick<VmService, 'GetViewVms'>;
  const { route } = activatedRouteStub({}, { viewId: 'view-1' });
  const machineEmitter = vi.fn<(point: Clickpoint | null) => void>();
  const rendered = await renderComponent(AddPointComponent, {
    inputs: {
      xPos: 10,
      yPos: 20,
      rad: 3,
      url: 'web-1',
      id: 'point-1',
      label: 'Web',
      editing,
    },
    on: { machineEmitter },
    providers: [
      { provide: VmService, useValue: vmService },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return { ...rendered, vmService, machineEmitter };
}

describe('AddPointComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: VmService.GetViewVms stub; activatedRouteStub; the crucible-dialog shell.
   * Data: a new point at (10, 20), radius 3.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderAddPoint(false);

    expect(fixture.componentInstance).toBeInstanceOf(AddPointComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: a new point opens as Add Click Point, loads the view's VMs for the resource list, and offers no Delete.
   * Interacts with: VmService.GetViewVms stub; the crucible-dialog shell.
   * Data: a new point at (10, 20), radius 3; editing false.
   */
  it('opens a new point as Add Click Point without Delete', async () => {
    const { vmService } = await renderAddPoint(false);

    expect(
      screen.getByRole('heading', { name: 'Add Click Point' }),
    ).toBeInTheDocument();
    expect(vmService.GetViewVms).toHaveBeenCalledWith(true, false);
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: editing an existing point offers Delete, which emits a point at -1 to remove it.
   * Interacts with: the rendered Delete button (user-event); machineEmitter output.
   * Data: editing point-1.
   */
  it('emits a removal point from Delete when editing', async () => {
    const user = userEvent.setup();
    const { machineEmitter } = await renderAddPoint(true);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(machineEmitter).toHaveBeenCalledExactlyOnceWith(
      new Clickpoint(-1, -1, -1, [], 'point-1', '', '', false),
    );
  });
});
