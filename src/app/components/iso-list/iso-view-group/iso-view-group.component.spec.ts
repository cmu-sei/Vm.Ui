// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderComponent } from '../../../test-utils/render-component';
import { IsoRow, IsoViewGroup } from '../iso-list.component';
import { IsoViewGroupComponent } from './iso-view-group.component';

const KALI: IsoRow = {
  filename: 'kali.iso',
  canDelete: true,
  scope: 'team',
  teamId: 'team-1',
  viewId: 'view-1',
};

const VIEW_GROUP: IsoViewGroup = {
  viewId: 'view-1',
  viewName: 'Exercise',
  viewWideGroup: { title: 'View (All Teams)', isTeam: false, rows: [] },
  teamGroups: [{ title: 'Blue', isTeam: true, teamId: 'team-1', rows: [KALI] }],
  isoCount: 1,
};

async function renderViewGroup() {
  const onDelete = vi.fn<(row: IsoRow) => void>();
  const rendered = await renderComponent(IsoViewGroupComponent, {
    inputs: { viewGroup: VIEW_GROUP, deleting: new Set<string>() },
    on: { delete: onDelete },
  });
  return { ...rendered, onDelete };
}

describe('IsoViewGroupComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: the viewGroup input; the real IsoGroupComponent.
   * Data: an empty view-wide group and team Blue with one ISO.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderViewGroup();

    expect(fixture.componentInstance).toBeInstanceOf(IsoViewGroupComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the view gets a panel for its view-wide group and one per team, each with its count.
   * Interacts with: the viewGroup input; the panel headers.
   * Data: an empty view-wide group and team Blue with one ISO.
   */
  it('shows a panel per group with its count', async () => {
    await renderViewGroup();

    expect(
      screen.getAllByRole('button').map((header) => header.textContent?.trim()),
    ).toEqual(['View (All Teams)Count: 0', 'BlueCount: 1']);
  });

  /**
   * Verifies: a Delete in a team panel is passed up as the component's own delete output.
   * Interacts with: the team panel header and the row's Delete button (user-event); delete output.
   * Data: kali.iso on team Blue, deletable.
   */
  it('passes a row delete up from a team panel', async () => {
    const user = userEvent.setup();
    const { onDelete } = await renderViewGroup();

    await user.click(screen.getByRole('button', { name: /Blue/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(KALI);
  });
});
