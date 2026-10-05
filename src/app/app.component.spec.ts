// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnHeaderBarModule,
  ComnSettingsService,
  CrucibleThemeService,
  Theme,
  provideCrucibleTheme,
} from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { renderComponent } from './test-utils/render-component';
import { AppComponent } from './app.component';

@Component({ selector: 'comn-header-bar', template: '' })
class HeaderBarStub {}

const THEME_PROPERTIES = [
  '--crucible-topbar-background',
  '--crucible-topbar-text',
  '--mat-sys-primary',
  '--mat-sys-on-primary',
];

const COLOR_SETTINGS = {
  AppTopBarHexColor: '#112233',
  AppTopBarHexTextColor: '#EEEEEE',
  AppLightModePrimaryHexColor: '#AB1234',
  AppLightModePrimaryHexTextColor: '#FFFFFF',
  AppDarkModePrimaryHexColor: '#CD5678',
  AppDarkModePrimaryHexTextColor: '#000000',
};

function bodyStyle(prop: string): string {
  return document.body.style.getPropertyValue(prop).trim().toUpperCase();
}

/**
 * Builds the providers for AppComponent with the real CrucibleThemeService
 * (via provideCrucibleTheme and the Player brand) and controllable theme
 * streams.
 */
function setup(
  options: { initialTheme?: Theme; colorSettings?: Record<string, string> } = {},
) {
  const userTheme$ = new BehaviorSubject<Theme>(
    options.initialTheme ?? Theme.LIGHT,
  );
  const queryTheme$ = new Subject<string | null>();
  const setUserTheme = vi.fn();
  const providers = [
    provideCrucibleTheme({ brand: { color: '#3B62A5', text: '#FFFFFF' } }),
    { provide: ComnAuthQuery, useValue: { userTheme$ } },
    { provide: ComnAuthService, useValue: { setUserTheme } },
    {
      provide: ComnSettingsService,
      useValue: { settings: { ...(options.colorSettings ?? {}) } },
    },
    {
      provide: RouterQuery,
      useValue: { selectQueryParams: () => queryTheme$.asObservable() },
    },
  ];

  const render = () =>
    renderComponent(AppComponent, {
      providers,
      childStubs: [{ replace: ComnHeaderBarModule, with: HeaderBarStub }],
    });

  return { render, userTheme$, queryTheme$, setUserTheme };
}

describe('AppComponent', () => {
  beforeEach(() => {
    document.body.classList.remove('darkMode');
    for (const el of [document.documentElement, document.body]) {
      for (const prop of THEME_PROPERTIES) {
        el.style.removeProperty(prop);
      }
    }
  });

  /**
   * Verifies: the root component renders its shell with the header bar and router outlet.
   * Interacts with: real CrucibleThemeService; stubbed comn-header-bar.
   * Data: default light theme, no color settings.
   */
  it('renders the header bar and router outlet', async () => {
    const { container } = await setup().render();

    expect(container.querySelector('comn-header-bar')).toBeInTheDocument();
    expect(container.querySelector('main router-outlet')).toBeInTheDocument();
  });

  /**
   * Verifies: every user theme emission is handed to CrucibleThemeService.applyTheme and toggles darkMode.
   * Interacts with: real CrucibleThemeService (prototype spied, calling through); ComnAuthQuery.userTheme$.
   * Data: light, then dark.
   */
  it('hands each emitted user theme to CrucibleThemeService.applyTheme', async () => {
    const { render, userTheme$ } = setup();
    const applyTheme = vi.spyOn(CrucibleThemeService.prototype, 'applyTheme');
    const rendered = await render();

    expect(applyTheme).toHaveBeenCalledWith(Theme.LIGHT);

    userTheme$.next(Theme.DARK);
    await rendered.fixture.whenStable();

    expect(applyTheme).toHaveBeenCalledWith(Theme.DARK);
    expect(document.body).toHaveClass('darkMode');
  });

  /**
   * Verifies: in light mode the top bar and primary come from their own settings pairs.
   * Interacts with: real CrucibleThemeService; ComnSettingsService.settings.
   * Data: COLOR_SETTINGS with distinct top-bar, light and dark colors.
   */
  it('applies independent top-bar and primary pairs in light mode', async () => {
    await setup({ colorSettings: COLOR_SETTINGS }).render();

    expect(document.body).not.toHaveClass('darkMode');
    expect(bodyStyle('--crucible-topbar-background')).toBe('#112233');
    expect(bodyStyle('--crucible-topbar-text')).toBe('#EEEEEE');
    expect(bodyStyle('--mat-sys-primary')).toBe('#AB1234');
    expect(bodyStyle('--mat-sys-on-primary')).toBe('#FFFFFF');
  });

  /**
   * Verifies: dark mode switches to the dark primary pair while the top bar keeps its colors.
   * Interacts with: real CrucibleThemeService; ComnSettingsService.settings.
   * Data: initial dark theme; COLOR_SETTINGS.
   */
  it('switches primary in dark mode while the top bar stays the same', async () => {
    await setup({
      initialTheme: Theme.DARK,
      colorSettings: COLOR_SETTINGS,
    }).render();

    expect(document.body).toHaveClass('darkMode');
    expect(bodyStyle('--crucible-topbar-background')).toBe('#112233');
    expect(bodyStyle('--crucible-topbar-text')).toBe('#EEEEEE');
    expect(bodyStyle('--mat-sys-primary')).toBe('#CD5678');
    expect(bodyStyle('--mat-sys-on-primary')).toBe('#000000');
  });

  /**
   * Verifies: with no top-bar settings the Player brand color passed to provideCrucibleTheme is used.
   * Interacts with: real CrucibleThemeService.
   * Data: empty settings; brand #3B62A5 / #FFFFFF.
   */
  it('falls back to the Player brand color for the top bar', async () => {
    await setup().render();

    expect(bodyStyle('--crucible-topbar-background')).toBe('#3B62A5');
    expect(bodyStyle('--crucible-topbar-text')).toBe('#FFFFFF');
  });

  /**
   * Verifies: a ?theme= query param is forwarded to ComnAuthService.setUserTheme, mapping unknown values to light.
   * Interacts with: RouterQuery.selectQueryParams('theme'); stubbed ComnAuthService.setUserTheme.
   * Data: 'dark-theme', then 'anything-else'.
   */
  it('forwards a ?theme= query param to the auth service', async () => {
    const { render, queryTheme$, setUserTheme } = setup();
    await render();

    queryTheme$.next('dark-theme');
    expect(setUserTheme).toHaveBeenLastCalledWith(Theme.DARK);

    queryTheme$.next('anything-else');
    expect(setUserTheme).toHaveBeenLastCalledWith(Theme.LIGHT);
  });
});
