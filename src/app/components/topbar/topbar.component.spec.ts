// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { User as OidcUser } from 'oidc-client-ts';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { ComnAuthQuery, ComnAuthService, Theme } from '@cmusei/crucible-common';
import { renderComponent } from '../../test-utils/render-component';
import { TopbarComponent } from './topbar.component';

async function renderTopbar() {
  const auth = {
    user$: of({ profile: { sub: 'u-1', name: 'Pat Analyst' } } as OidcUser),
    setUserTheme: vi.fn(),
    logout: vi.fn(),
  } satisfies Pick<ComnAuthService, 'user$' | 'setUserTheme' | 'logout'>;
  const authQuery: Pick<ComnAuthQuery, 'userTheme$'> = {
    userTheme$: of(Theme.LIGHT),
  };
  const rendered = await renderComponent(TopbarComponent, {
    providers: [
      { provide: ComnAuthService, useValue: auth },
      { provide: ComnAuthQuery, useValue: authQuery },
    ],
  });
  return { ...rendered, auth };
}

describe('TopbarComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: ComnAuthService.user$ and ComnAuthQuery.userTheme$ stubs.
   * Data: user 'Pat Analyst'; light theme.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderTopbar();

    expect(fixture.componentInstance).toBeInstanceOf(TopbarComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the menu button shows the signed-in user's name.
   * Interacts with: ComnAuthService.user$ stub.
   * Data: user 'Pat Analyst'.
   */
  it("shows the signed-in user's name on the menu button", async () => {
    await renderTopbar();

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveTextContent(
      'Pat Analyst',
    );
  });

  /**
   * Verifies: Logout in the user menu signs the user out.
   * Interacts with: the user menu (user-event); ComnAuthService.logout stub.
   * Data: user 'Pat Analyst'.
   */
  it('logs out from the user menu', async () => {
    const user = userEvent.setup();
    const { auth } = await renderTopbar();

    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));

    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
