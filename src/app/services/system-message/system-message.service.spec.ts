// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { screen, within } from '@testing-library/angular';
import { SystemMessageService } from './system-message.service';

describe('SystemMessageService', () => {
  /**
   * Verifies: displayMessage opens a bottom sheet that renders SystemMessageComponent with the given title and message.
   * Interacts with: real MatBottomSheet and its overlay container; SystemMessageComponent template.
   * Data: title 'Error', message 'The VM could not be reached'.
   */
  it('opens the system message bottom sheet with the title and message', async () => {
    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatIconTestingModule],
      providers: [SystemMessageService],
    });
    const service = TestBed.inject(SystemMessageService);

    service.displayMessage('Error', 'The VM could not be reached');
    await TestBed.inject(ApplicationRef).whenStable();

    const sheet = document.querySelector<HTMLElement>(
      'mat-bottom-sheet-container',
    );
    expect(sheet).not.toBeNull();
    const content = within(sheet as HTMLElement);
    expect(content.getByRole('heading', { name: 'Error' })).toBeInTheDocument();
    expect(
      content.getByText('The VM could not be reached'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Error' })).toHaveLength(1);
  });
});
