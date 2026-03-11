// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { SystemMessageComponent } from './system-message.component';
import { renderComponent } from 'src/app/test-utils/render-component';

async function renderSystemMessage(
  overrides: { title?: string; message?: string } = {},
) {
  const dismissSpy = vi.fn();
  const mockSheetRef = {
    dismiss: dismissSpy,
  };

  const data = {
    title: overrides.title ?? 'System Alert',
    message: overrides.message ?? 'Something happened',
  };

  const { fixture } = await renderComponent(SystemMessageComponent, {
    providers: [
      { provide: MatBottomSheetRef, useValue: mockSheetRef },
      { provide: MAT_BOTTOM_SHEET_DATA, useValue: data },
    ],
  });

  return { fixture, dismissSpy };
}

describe('SystemMessageComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderSystemMessage();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display title', async () => {
    await renderSystemMessage({ title: 'Connection Error' });
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('should display message text', async () => {
    await renderSystemMessage({ message: 'Unable to reach the server' });
    expect(
      screen.getByText('Unable to reach the server'),
    ).toBeInTheDocument();
  });

  it('should populate displayTitle and displayMessage from injected data', async () => {
    const { fixture } = await renderSystemMessage({
      title: 'Test Title',
      message: 'Test Message',
    });
    expect(fixture.componentInstance.displayTitle).toBe('Test Title');
    expect(fixture.componentInstance.displayMessage).toBe('Test Message');
  });
});
