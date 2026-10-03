// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  ComnAuthQuery,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { VmUser } from '../../../generated/vm-api';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmTeam } from '../../../state/vm-teams/vm-team.model';
import { VmsStore } from '../../../state/vms/vms.store';
import { renderComponent } from '../../../test-utils/render-component';
import { TeamUsersComponent } from './team-users.component';

const FOLLOW_URL = 'http://console.test/user/{userId}/view/{viewId}/console';

// The real ThemeService reads the theme off ComnAuthQuery.getValue().
const authQuery: Pick<
  ComnAuthQuery,
  'userTheme$' | 'isLoggedIn$' | 'getValue'
> = {
  userTheme$: of(Theme.LIGHT),
  isLoggedIn$: of(true),
  getValue: () =>
    ({ ui: { theme: Theme.LIGHT } }) as ReturnType<ComnAuthQuery['getValue']>,
};

const TEAM: VmTeam = { id: 'team-1', name: 'Team 1', viewId: 'view-1' };

function users(count: number): VmUser[] {
  return Array.from({ length: count }, (_, index) => ({
    userId: `user-${index + 1}`,
    teamId: TEAM.id,
    username: `User ${index + 1}`,
    activeVmId: null,
  }));
}

async function renderTeamUsers(
  inputs: Partial<{
    users: VmUser[];
    hideInactive: boolean;
    searchTerm: string;
  }> = {},
) {
  const openTab = vi.fn();
  const rendered = await renderComponent(TeamUsersComponent, {
    inputs: { team: TEAM, users: users(2), ...inputs },
    on: { openTab },
    providers: [
      { provide: ThemeService, useClass: ThemeService },
      { provide: ComnAuthQuery, useValue: authQuery },
      {
        provide: ComnSettingsService,
        useValue: { settings: { UserFollowUrl: FOLLOW_URL } },
      },
    ],
  });
  const viewport = rendered.container.querySelector(
    '.user-table-viewport',
  ) as HTMLElement;
  return { ...rendered, openTab, viewport };
}

describe('TeamUsersComponent', () => {
  /**
   * Verifies: every user row is in the DOM, so scrolling a long list cannot leave the bottom users unrendered.
   * Interacts with: mat-table over a native scroll container (no virtual-scroll adapter).
   * Data: 15 users.
   * Why: this replaces the Karma regression test from #592, which scrolled a real browser
   *   viewport. jsdom has no layout, so the scroll position and bounding boxes cannot be
   *   checked here; the guarantee left to check is that no row is virtualized away.
   */
  it('renders every user of a 15-user team', async () => {
    await renderTeamUsers({ users: users(15) });

    // One header row plus fifteen user rows.
    expect(screen.getAllByRole('row')).toHaveLength(16);
    expect(screen.getByRole('link', { name: 'User 15' })).toBeInTheDocument();
  });

  /**
   * Verifies: the viewport is capped at seven rows for a long list.
   * Interacts with: calculateTableHeight via the users input; the viewport's inline height.
   * Data: 15 users (capped at 7 * 48).
   */
  it('caps the viewport at seven rows', async () => {
    const { viewport } = await renderTeamUsers({ users: users(15) });

    expect(viewport.style.height).toBe(`${48 * 7}px`);
  });

  /**
   * Verifies: a short list's viewport is sized to fit its header and rows.
   * Interacts with: calculateTableHeight via the users input; the viewport's inline height.
   * Data: 2 users (56 * 1.2 + 2 * 48).
   */
  it('shrinks the viewport for a short list', async () => {
    const { viewport } = await renderTeamUsers({ users: users(2) });

    expect(viewport.style.height).toBe('163.2px');
  });

  /**
   * Verifies: a user's follow link points at the console's follow URL for the team, with the theme.
   * Interacts with: stubbed ComnSettingsService UserFollowUrl; real ThemeService over a light-theme ComnAuthQuery.
   * Data: user-1 on team-1 in view-1; light theme.
   */
  it('links each user to their follow console', async () => {
    await renderTeamUsers();

    expect(screen.getByRole('link', { name: 'User 1' })).toHaveAttribute(
      'href',
      'http://console.test/user/user-1/view/view-1/console?teamId=team-1&theme=light-theme',
    );
  });

  /**
   * Verifies: clicking a user opens their console in a tab inside the app instead of navigating.
   * Interacts with: openTab output; user-event click.
   * Data: user-2; plain click (no Ctrl).
   */
  it('emits openTab with the follow URL when a user is clicked', async () => {
    const user = userEvent.setup();
    const { openTab } = await renderTeamUsers();

    await user.click(screen.getByRole('link', { name: 'User 2' }));

    expect(openTab).toHaveBeenCalledExactlyOnceWith({
      name: 'User 2',
      url: 'http://console.test/user/user-2/view/view-1/console?teamId=team-1&theme=light-theme',
    });
  });

  /**
   * Verifies: the Virtual Machine column shows the active VM's name from the store, and None otherwise.
   * Interacts with: real VmsStore/VmsQuery.selectEntity.
   * Data: User 1 active on vm-a (named 'web-01'); User 2 inactive.
   */
  it('shows the active VM name from the VM store', async () => {
    const team = users(2);
    team[0].activeVmId = 'vm-a';
    const { detectChanges } = await renderTeamUsers({ users: team });

    TestBed.inject(VmsStore).set([
      { id: 'vm-a', name: 'web-01', url: 'http://console.test/vm-a' },
    ]);
    detectChanges();

    const [, first, second] = screen.getAllByRole('row');
    expect(first).toHaveTextContent('web-01');
    expect(second).toHaveTextContent('None');
  });

  /**
   * Verifies: hideInactive drops users with no active VM.
   * Interacts with: the hideInactive input; the rendered user links.
   * Data: User 1 active on vm-a, User 2 and User 3 inactive; hideInactive true.
   */
  it('hides inactive users', async () => {
    const team = users(3);
    team[0].activeVmId = 'vm-a';

    await renderTeamUsers({ users: team, hideInactive: true });

    expect(
      screen.getAllByRole('link').map((link) => link.textContent?.trim()),
    ).toEqual(['User 1']);
  });

  /**
   * Verifies: the search term filters users by name, case-insensitively.
   * Interacts with: the searchTerm input; the rendered user links.
   * Data: User 1 active on vm-a, User 2 and User 3 inactive; search 'user 3'; hideInactive off.
   */
  it('filters users by search term', async () => {
    const team = users(3);
    team[0].activeVmId = 'vm-a';

    await renderTeamUsers({ users: team, searchTerm: 'user 3' });

    expect(
      screen.getAllByRole('link').map((link) => link.textContent?.trim()),
    ).toEqual(['User 3']);
  });
});
