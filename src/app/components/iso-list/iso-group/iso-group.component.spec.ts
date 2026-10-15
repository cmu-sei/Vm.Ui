// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { VmType } from '../../../generated/vm-api';
import { renderComponent } from '../../../test-utils/render-component';
import { IsoGroup, IsoRow, isoRowKey } from '../iso-list.component';
import { IsoGroupComponent } from './iso-group.component';

function row(
  filename: string,
  canDelete: boolean,
  extra: Partial<IsoRow> = {},
): IsoRow {
  return { filename, canDelete, scope: 'team', teamId: 'team-1', ...extra };
}

async function renderGroup(
  rows: IsoRow[],
  deleting: ReadonlySet<string> = new Set(),
) {
  const group: IsoGroup = {
    title: 'Blue',
    isTeam: true,
    teamId: 'team-1',
    rows,
  };
  const onDelete = vi.fn<(row: IsoRow) => void>();
  const rendered = await renderComponent(IsoGroupComponent, {
    inputs: { group, deleting },
    on: { delete: onDelete },
  });
  // One element per rendered row, keyed by its file name.
  const rowFor = (filename: string) =>
    within(screen.getByText(filename).closest('.iso-row') as HTMLElement);
  return { ...rendered, onDelete, rowFor };
}

describe('IsoGroupComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: the group and deleting inputs only.
   * Data: an empty team group.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderGroup([]);

    expect(fixture.componentInstance).toBeInstanceOf(IsoGroupComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: a group with no rows says it has no ISO files.
   * Interacts with: the group input.
   * Data: an empty team group.
   */
  it('says No ISO Files for an empty group', async () => {
    await renderGroup([]);

    expect(screen.getByText('No ISO Files')).toBeInTheDocument();
  });

  /**
   * Verifies: a row the caller may delete has a Delete button that emits the row.
   * Interacts with: the row's Delete button (user-event); delete output.
   * Data: one row with canDelete true.
   */
  it('emits the row from Delete when the row can be deleted', async () => {
    const user = userEvent.setup();
    const deletable = row('kali.iso', true);
    const { onDelete, rowFor } = await renderGroup([deletable]);

    await user.click(
      rowFor('kali.iso').getByRole('button', { name: 'Delete' }),
    );

    expect(onDelete).toHaveBeenCalledExactlyOnceWith(deletable);
  });

  /**
   * Verifies: a row with canDelete false shows its file name and no Delete button, next to a deletable row that keeps its own.
   * Interacts with: the rendered rows.
   * Data: win10.iso with canDelete false and kali.iso with canDelete true.
   */
  it('hides Delete on a row without canDelete', async () => {
    const { rowFor } = await renderGroup([
      row('win10.iso', false),
      row('kali.iso', true),
    ]);

    expect(
      rowFor('win10.iso').queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
    expect(
      rowFor('kali.iso').getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: a row whose delete is in flight shows a spinner instead of its Delete button.
   * Interacts with: the deleting input, keyed by isoRowKey.
   * Data: kali.iso with canDelete true and its key in deleting.
   */
  it('shows a spinner while the row is being deleted', async () => {
    const busy = row('kali.iso', true);
    const { rowFor } = await renderGroup([busy], new Set([isoRowKey(busy)]));

    expect(
      rowFor('kali.iso').queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
    expect(rowFor('kali.iso').getByRole('progressbar')).toBeInTheDocument();
  });

  /**
   * Verifies: a file missing on some hypervisors carries a warning naming them.
   * Interacts with: the missing-providers icon's accessible label.
   * Data: kali.iso missing on Proxmox.
   */
  it('names the hypervisors a file is missing on', async () => {
    const { rowFor } = await renderGroup([
      row('kali.iso', false, { missingProviders: [VmType.Proxmox] }),
    ]);

    expect(
      rowFor('kali.iso').getByLabelText(
        'Missing on Proxmox - re-upload this file to fix',
      ),
    ).toBeInTheDocument();
  });
});
