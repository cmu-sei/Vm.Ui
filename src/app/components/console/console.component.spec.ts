// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { screen } from '@testing-library/angular';
import { Vm } from '../../generated/vm-api';
import { VmService } from '../../state/vms/vms.service';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { renderComponent } from '../../test-utils/render-component';
import { ConsoleComponent } from './console.component';

async function renderConsole(
  result: ReturnType<VmService['GetViewVmsByName']>,
) {
  const vmService = {
    GetViewVmsByName: vi.fn(() => result),
  } satisfies Pick<VmService, 'GetViewVmsByName'>;
  const { route } = activatedRouteStub({}, { viewId: 'view-1', name: 'web' });
  const rendered = await renderComponent(ConsoleComponent, {
    providers: [
      { provide: VmService, useValue: vmService },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return { ...rendered, vmService };
}

describe('ConsoleComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: VmService.GetViewVmsByName stub (NEVER, so the lookup stays pending); activatedRouteStub.
   * Data: route viewId 'view-1', name 'web'.
   */
  it('renders with the default test providers', async () => {
    // NEVER keeps the lookup pending, so the component stays on its loading text.
    const { fixture } = await renderConsole(NEVER);

    expect(fixture.componentInstance).toBeInstanceOf(ConsoleComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the page looks up the routed VM name in the routed view and shows Loading... meanwhile.
   * Interacts with: VmService.GetViewVmsByName stub (NEVER, so the lookup stays pending); activatedRouteStub.
   * Data: route viewId 'view-1', name 'web'.
   */
  it('looks up the routed VM name while showing Loading...', async () => {
    // NEVER keeps the lookup pending, so the component stays on its loading text.
    const { vmService } = await renderConsole(NEVER);

    expect(vmService.GetViewVmsByName).toHaveBeenCalledWith('view-1', 'web');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  /**
   * Verifies: no VM with the name, or a failed lookup, shows Virtual Machine Not Found with the name.
   * Interacts with: VmService.GetViewVmsByName stub; the real PageNotFoundComponent.
   * Data: an empty result, or a 500 error.
   */
  it.each([
    { outcome: 'no match', result: of<Vm[]>([]) },
    { outcome: 'a failed lookup', result: throwError(() => ({ status: 500 })) },
  ])('shows Virtual Machine Not Found after $outcome', async ({ result }) => {
    await renderConsole(result);

    expect(
      screen.getByRole('heading', { name: 'Virtual Machine Not Found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No virtual machines named "web"/),
    ).toBeInTheDocument();
  });
});
