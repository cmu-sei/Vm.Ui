// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Component } from '@angular/core';
import { of } from 'rxjs';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnHeaderBarModule,
  Theme,
} from '@cmusei/crucible-common';
import { renderComponent } from './test-utils/render-component';
import { AppComponent } from './app.component';

@Component({ selector: 'comn-header-bar', template: '' })
class HeaderBarStubComponent {}

async function renderApp(themeParam: string | null = null) {
  const auth: Pick<ComnAuthService, 'setUserTheme'> = {
    setUserTheme: vi.fn(),
  };
  const authQuery: Pick<ComnAuthQuery, 'userTheme$'> = {
    userTheme$: of(Theme.LIGHT),
  };
  // selectQueryParams is overloaded (one name or a list); the component reads one name.
  const routerQuery = {
    selectQueryParams: vi.fn(() => of(themeParam)),
  } as unknown as Pick<RouterQuery, 'selectQueryParams'>;
  const rendered = await renderComponent(AppComponent, {
    childStubs: [
      { replace: ComnHeaderBarModule, with: HeaderBarStubComponent },
    ],
    providers: [
      { provide: ComnAuthService, useValue: auth },
      { provide: ComnAuthQuery, useValue: authQuery },
      { provide: RouterQuery, useValue: routerQuery },
    ],
  });
  return { ...rendered, auth };
}

describe('AppComponent', () => {
  afterEach(() => {
    document.body.classList.remove('darkMode');
  });

  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: getDefaultProviders; ComnHeaderBarModule swapped for a stub; RouterQuery stub (no theme parameter).
   * Data: light user theme, no ?theme parameter.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderApp();

    expect(fixture.componentInstance).toBeInstanceOf(AppComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the root component renders the header bar and the router outlet, and without a ?theme parameter leaves the user's theme alone.
   * Interacts with: HeaderBar stub; RouterQuery stub (no theme parameter); ComnAuthService.setUserTheme stub.
   * Data: light user theme, no ?theme parameter.
   */
  it('renders the header bar and router outlet without changing the theme', async () => {
    const { container, auth } = await renderApp();

    expect(container.querySelector('comn-header-bar')).not.toBeNull();
    expect(container.querySelector('router-outlet')).not.toBeNull();
    expect(auth.setUserTheme).not.toHaveBeenCalled();
    expect(document.body.classList.contains('darkMode')).toBe(false);
  });

  /**
   * Verifies: a ?theme=dark-theme query parameter is applied as the user's theme.
   * Interacts with: RouterQuery.selectQueryParams stub; ComnAuthService.setUserTheme stub.
   * Data: theme parameter 'dark-theme'.
   */
  it('applies the theme from the query string', async () => {
    const { auth } = await renderApp(Theme.DARK);

    expect(auth.setUserTheme).toHaveBeenCalledWith(Theme.DARK);
  });
});
