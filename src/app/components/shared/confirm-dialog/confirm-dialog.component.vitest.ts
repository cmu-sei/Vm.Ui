// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { renderComponent } from 'src/app/test-utils/render-component';

async function renderConfirmDialog(
  overrides: {
    title?: string;
    message?: string;
    data?: any;
    dialogRef?: any;
  } = {},
) {
  const data = overrides.data ?? {
    buttonTrueText: 'Yes',
    buttonFalseText: 'No',
  };

  const closeSpy = vi.fn();
  const mockDialogRef = overrides.dialogRef ?? {
    close: closeSpy,
    disableClose: false,
    componentInstance: {},
  };

  const { fixture } = await renderComponent(ConfirmDialogComponent, {
    declarations: [ConfirmDialogComponent],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: mockDialogRef },
    ],
    componentProperties: {
      ...(overrides.title ? { title: overrides.title } : {}),
      ...(overrides.message ? { message: overrides.message } : {}),
    } as any,
  });

  return { fixture, closeSpy, mockDialogRef };
}

describe('ConfirmDialogComponent', () => {
  it('should create the component', async () => {
    const { fixture } = await renderConfirmDialog();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display the title and message', async () => {
    await renderConfirmDialog({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item?',
    });

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this item?'),
    ).toBeInTheDocument();
  });

  it('should display custom button text from MAT_DIALOG_DATA', async () => {
    await renderConfirmDialog({
      data: { buttonTrueText: 'Confirm', buttonFalseText: 'Decline' },
    });

    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('should always display a Cancel button', async () => {
    await renderConfirmDialog();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should close dialog with confirm=true when true button is clicked', async () => {
    const user = userEvent.setup();
    const data = { buttonTrueText: 'Yes', buttonFalseText: 'No' };
    const { closeSpy } = await renderConfirmDialog({ data });

    await user.click(screen.getByText('Yes'));

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const result = closeSpy.mock.calls[0][0];
    expect(result.confirm).toBe(true);
    expect(result.wasCancelled).toBe(false);
  });

  it('should close dialog with confirm=false when false button is clicked', async () => {
    const user = userEvent.setup();
    const data = { buttonTrueText: 'Yes', buttonFalseText: 'No' };
    const { closeSpy } = await renderConfirmDialog({ data });

    await user.click(screen.getByText('No'));

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const result = closeSpy.mock.calls[0][0];
    expect(result.confirm).toBe(false);
    expect(result.wasCancelled).toBe(false);
  });

  it('should close dialog with wasCancelled=true when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const data = { buttonTrueText: 'Yes', buttonFalseText: 'No' };
    const { closeSpy } = await renderConfirmDialog({ data });

    await user.click(screen.getByText('Cancel'));

    expect(closeSpy).toHaveBeenCalledTimes(1);
    const result = closeSpy.mock.calls[0][0];
    expect(result.wasCancelled).toBe(true);
  });

  it('should disable close on escape by default', async () => {
    const { mockDialogRef } = await renderConfirmDialog();
    expect(mockDialogRef.disableClose).toBe(true);
  });
});
