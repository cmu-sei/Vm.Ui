// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComnAuthQuery, Theme } from '@cmusei/crucible-common';
import { ThemeService } from './theme.service';

function setup(theme: Theme) {
  const authQuery: Pick<ComnAuthQuery, 'getValue'> = {
    getValue: () =>
      ({ ui: { theme } }) as ReturnType<ComnAuthQuery['getValue']>,
  };
  TestBed.configureTestingModule({
    providers: [{ provide: ComnAuthQuery, useValue: authQuery }],
  });
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  /**
   * Verifies: the current theme is added to an absolute URL, replacing any theme already there.
   * Interacts with: stubbed ComnAuthQuery.getValue.
   * Data: dark theme; URL with ?theme=light-theme&x=1.
   */
  it('sets the theme query parameter on an absolute URL', () => {
    const service = setup(Theme.DARK);

    expect(
      service.addThemeQueryParam(
        'http://console.test/vm/1?theme=light-theme&x=1',
      ),
    ).toBe('http://console.test/vm/1?theme=dark-theme&x=1');
  });

  /**
   * Verifies: a relative URL is resolved against the document base before the theme is added.
   * Interacts with: stubbed ComnAuthQuery.getValue; document.baseURI.
   * Data: light theme; relative path 'views/1/vms/web/console'.
   */
  it('resolves a relative URL against the document base', () => {
    const service = setup(Theme.LIGHT);

    expect(service.addThemeQueryParam('views/1/vms/web/console')).toBe(
      new URL(
        'views/1/vms/web/console?theme=light-theme',
        document.baseURI,
      ).toString(),
    );
  });
});
