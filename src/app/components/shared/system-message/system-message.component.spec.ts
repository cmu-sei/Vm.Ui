// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { bottomSheetRefStub } from '../../../test-utils/dialog-refs';
import { renderComponent } from '../../../test-utils/render-component';
import { SystemMessageComponent } from './system-message.component';

async function renderSystemMessage() {
  const { sheetRef, dismiss } = bottomSheetRefStub<SystemMessageComponent>();
  const rendered = await renderComponent(SystemMessageComponent, {
    providers: [
      { provide: MatBottomSheetRef, useValue: sheetRef },
      {
        provide: MAT_BOTTOM_SHEET_DATA,
        useValue: { title: 'Error', message: 'The VM API is not responding.' },
      },
    ],
  });
  return { ...rendered, dismiss };
}

describe('SystemMessageComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: MAT_BOTTOM_SHEET_DATA; bottomSheetRefStub.
   * Data: title 'Error' and a message.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderSystemMessage();

    expect(fixture.componentInstance).toBeInstanceOf(SystemMessageComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the sheet shows the title and message it was opened with.
   * Interacts with: MAT_BOTTOM_SHEET_DATA.
   * Data: title 'Error' and a message.
   */
  it('shows the title and message from the sheet data', async () => {
    await renderSystemMessage();

    expect(screen.getByRole('heading', { name: 'Error' })).toBeInTheDocument();
    expect(
      screen.getByText('The VM API is not responding.'),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: the close button dismisses the bottom sheet.
   * Interacts with: the rendered close button (user-event); MatBottomSheetRef.dismiss stub.
   * Data: any message.
   */
  it('dismisses the sheet from the close button', async () => {
    const user = userEvent.setup();
    const { dismiss } = await renderSystemMessage();

    await user.click(screen.getByRole('button'));

    expect(dismiss).toHaveBeenCalledOnce();
  });
});
