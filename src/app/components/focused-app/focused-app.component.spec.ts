// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { renderComponent } from '../../test-utils/render-component';
import { ThemeService } from '../../services/theme/theme.service';
import { FocusedAppComponent } from './focused-app.component';

async function renderFocusedApp() {
  const addThemeQueryParam = vi.fn((url: string) => `${url}?theme=dark`);
  const theme: Pick<ThemeService, 'addThemeQueryParam'> = {
    addThemeQueryParam,
  };
  const rendered = await renderComponent(FocusedAppComponent, {
    inputs: { vmUrl: 'http://console.test/vm-a' },
    providers: [{ provide: ThemeService, useValue: theme }],
  });
  return { ...rendered, addThemeQueryParam };
}

describe('FocusedAppComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: ThemeService.addThemeQueryParam stub; DomSanitizer (real).
   * Data: vmUrl 'http://console.test/vm-a'.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderFocusedApp();

    expect(fixture.componentInstance).toBeInstanceOf(FocusedAppComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the VM URL is framed with the theme query parameter added.
   * Interacts with: ThemeService.addThemeQueryParam stub; DomSanitizer (real).
   * Data: vmUrl 'http://console.test/vm-a'.
   */
  it('frames the VM URL with the theme parameter', async () => {
    const { container, addThemeQueryParam } = await renderFocusedApp();

    expect(addThemeQueryParam).toHaveBeenCalledWith('http://console.test/vm-a');
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe(
      'http://console.test/vm-a?theme=dark',
    );
  });
});
