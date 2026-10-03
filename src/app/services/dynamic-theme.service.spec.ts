// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { hexFromArgb } from '@material/material-color-utilities';
import { DynamicThemeService } from './dynamic-theme.service';
import { initializeTheme } from './theme-initializer.factory';

describe('DynamicThemeService', () => {
  beforeEach(() => {
    document.getElementById('dynamic-dark-theme')?.remove();
    document.documentElement.removeAttribute('style');
  });

  /**
   * Verifies: a source color yields Material light and dark schemes with different primaries.
   * Interacts with: @material/material-color-utilities (patched for ESM).
   * Data: source color #BB0000.
   */
  it('generates light and dark schemes from a hex color', () => {
    const { light, dark } = new DynamicThemeService().generateThemeFromHex(
      '#BB0000',
    );

    expect(hexFromArgb(light.primary)).toMatch(/^#[0-9a-f]{6}$/);
    expect(light.primary).not.toBe(dark.primary);
  });

  /**
   * Verifies: applying a theme sets light variables on :root and one reusable dark-mode style element.
   * Interacts with: document.documentElement style; the #dynamic-dark-theme <style>.
   * Data: #BB0000 applied twice.
   */
  it('writes light variables to :root and dark variables to one style element', () => {
    const service = new DynamicThemeService();
    const { light } = service.generateThemeFromHex('#BB0000');

    service.applyThemeToDocument('#BB0000');
    service.applyThemeToDocument('#BB0000');

    expect(
      document.documentElement.style.getPropertyValue('--mat-sys-primary'),
    ).toBe(hexFromArgb(light.primary));
    const styles = document.querySelectorAll('#dynamic-dark-theme');
    expect(styles).toHaveLength(1);
    expect(styles[0].textContent).toMatch(
      /^body\.darkMode \{\n {2}--mat-sys-primary: #/,
    );
  });

  /**
   * Verifies: the app initializer applies the configured color, or the default red when unset.
   * Interacts with: initializeTheme factory; DynamicThemeService.applyThemeToDocument spy.
   * Data: one row with AppPrimaryThemeColor '#123456', one with empty settings.
   */
  it.each([
    { settings: { AppPrimaryThemeColor: '#123456' }, expected: '#123456' },
    { settings: {}, expected: '#BB0000' },
  ])(
    'initializeTheme applies $expected for settings $settings',
    async ({ settings, expected }) => {
      const service = new DynamicThemeService();
      const apply = vi.spyOn(service, 'applyThemeToDocument');
      const settingsService: Pick<ComnSettingsService, 'settings'> = {
        settings,
      };

      await initializeTheme(settingsService as ComnSettingsService, service)();

      expect(apply.mock.calls).toEqual([[expected]]);
    },
  );
});
