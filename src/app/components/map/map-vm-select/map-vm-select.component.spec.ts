// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ThemeService } from '../../../services/theme/theme.service';
import { dialogRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { MapVmSelectComponent } from './map-vm-select.component';

async function renderVmSelect() {
  const { dialogRef, close } = dialogRefStub<MapVmSelectComponent>();
  const theme: Pick<ThemeService, 'addThemeQueryParam'> = {
    addThemeQueryParam: (url) => `${url}?theme=light-theme`,
  };
  const rendered = await renderComponent(MapVmSelectComponent, {
    providers: [
      { provide: MatDialogRef, useValue: dialogRef },
      {
        provide: MAT_DIALOG_DATA,
        useValue: { vms: ['web-1', 'web-2'], viewId: 'view-1' },
      },
      { provide: ThemeService, useValue: theme },
    ],
  });
  return { ...rendered, close };
}

describe('MapVmSelectComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: MAT_DIALOG_DATA; dialogRefStub; the crucible-dialog shell.
   * Data: VMs web-1 and web-2 in view-1.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderVmSelect();

    expect(fixture.componentInstance).toBeInstanceOf(MapVmSelectComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: Navigate stays disabled until a VM is chosen.
   * Interacts with: the crucible-dialog shell's submit button.
   * Data: VMs web-1 and web-2; none chosen.
   */
  it('disables Navigate until a VM is chosen', async () => {
    await renderVmSelect();

    expect(screen.getByRole('button', { name: 'Navigate' })).toBeDisabled();
  });

  /**
   * Verifies: Navigate opens each chosen VM's console in a browser tab and closes the dialog.
   * Interacts with: MatSelectHarness; Navigate button (user-event); window.open spy; ThemeService stub; dialogRefStub close.
   * Data: both VMs chosen.
   */
  it('opens the chosen VM consoles and closes', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { fixture, close } = await renderVmSelect();
    const select =
      await TestbedHarnessEnvironment.loader(fixture).getHarness(
        MatSelectHarness,
      );
    await select.open();
    await select.clickOptions({ text: 'web-1' });
    await select.clickOptions({ text: 'web-2' });
    await select.close();

    await user.click(screen.getByRole('button', { name: 'Navigate' }));

    expect(open.mock.calls).toEqual([
      ['views/view-1/vms/web-1/console?theme=light-theme', '_blank'],
      ['views/view-1/vms/web-2/console?theme=light-theme', '_blank'],
    ]);
    expect(close).toHaveBeenCalledOnce();
  });
});
