// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MessageDialogComponent } from './message-dialog.component';
import { renderComponent } from 'src/app/test-utils/render-component';

async function renderMessageDialog(
  overrides: { title?: string; message?: string; data?: any } = {},
) {
  const closeSpy = vi.fn();
  const mockDialogRef = {
    close: closeSpy,
    disableClose: false,
    componentInstance: {},
  };

  const { fixture } = await renderComponent(MessageDialogComponent, {
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: overrides.data ?? {} },
      { provide: MatDialogRef, useValue: mockDialogRef },
    ],
    componentProperties: {
      ...(overrides.title ? { title: overrides.title } : {}),
      ...(overrides.message ? { message: overrides.message } : {}),
    } as any,
  });

  return { fixture, closeSpy };
}

describe('MessageDialogComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderMessageDialog();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display dialog title', async () => {
    await renderMessageDialog({ title: 'Upload Status' });
    expect(screen.getByText('Upload Status')).toBeInTheDocument();
  });

  it('should display dialog message', async () => {
    await renderMessageDialog({ message: 'File uploaded successfully' });
    expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
  });

  it('should have OK button', async () => {
    await renderMessageDialog();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('should close dialog when OK is clicked', async () => {
    const user = userEvent.setup();
    const { closeSpy } = await renderMessageDialog();

    await user.click(screen.getByText('OK'));

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('should disable close on escape', async () => {
    const { fixture } = await renderMessageDialog();
    expect(fixture.componentInstance.dialogRef.disableClose).toBe(true);
  });
});
