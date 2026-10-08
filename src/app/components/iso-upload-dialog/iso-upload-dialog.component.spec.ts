// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import {
  HttpErrorResponse,
  HttpEventType,
  HttpResponse,
} from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of, throwError } from 'rxjs';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { IsoUploadResult } from '../../generated/vm-api';
import { FileService } from '../../services/file/file.service';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { renderComponent } from '../../test-utils/render-component';
import {
  IsoUploadDialogComponent,
  IsoUploadDialogData,
} from './iso-upload-dialog.component';

const BLUE = { id: 'team-1', name: 'Blue' };
const RED = { id: 'team-2', name: 'Red' };

type UploadResult = ReturnType<FileService['uploadIso']>;

async function renderUpload(
  data: Omit<IsoUploadDialogData, 'viewId'>,
  upload: () => UploadResult = () =>
    of(
      new HttpResponse<IsoUploadResult>({
        body: { partialFailure: false, message: 'Uploaded to 2 hosts.' },
      }),
    ) as UploadResult,
) {
  const { dialogRef, close } = dialogRefStub<IsoUploadDialogComponent>();
  const fileService = {
    uploadIso: vi.fn(upload),
  } satisfies Pick<FileService, 'uploadIso'>;
  const rendered = await renderComponent(IsoUploadDialogComponent, {
    providers: [
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: { viewId: 'view-1', ...data } },
      { provide: FileService, useValue: fileService },
    ],
  });
  // The checkbox's own input carries its disabled state.
  const checkbox = (name: string) =>
    screen.getByRole('checkbox', { name }) as HTMLInputElement;
  const chooseFile = async (user: ReturnType<typeof userEvent.setup>) => {
    const input = rendered.container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    await user.upload(input, new File(['iso'], 'kali.iso'));
  };
  return { ...rendered, close, fileService, checkbox, chooseFile };
}

const uploadButton = () => screen.getByRole('button', { name: 'Upload' });

describe('IsoUploadDialogComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: MAT_DIALOG_DATA; dialogRefStub; the crucible-dialog shell.
   * Data: canUploadView true; teams Blue and Red.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderUpload({
      canUploadView: true,
      uploadableTeams: [BLUE, RED],
    });

    expect(fixture.componentInstance).toBeInstanceOf(IsoUploadDialogComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the dialog offers a target per uploadable team and keeps Upload disabled until a file and a target are chosen.
   * Interacts with: MAT_DIALOG_DATA; the rendered checkboxes and Upload button.
   * Data: canUploadView true; teams Blue and Red; no file chosen.
   */
  it('offers each uploadable team and disables Upload until ready', async () => {
    const { checkbox } = await renderUpload({
      canUploadView: true,
      uploadableTeams: [BLUE, RED],
    });

    expect(checkbox('Blue')).toBeInTheDocument();
    expect(checkbox('Red')).toBeInTheDocument();
    expect(uploadButton()).toBeDisabled();
  });

  /**
   * Verifies: canUploadView offers the View (All Teams) target, and choosing it locks the team targets.
   * Interacts with: the View checkbox (keyboard, user-event); team checkboxes' disabled state.
   * Data: canUploadView true; teams Blue and Red.
   */
  it('offers the view-wide target with canUploadView', async () => {
    const user = userEvent.setup();
    const { checkbox } = await renderUpload({
      canUploadView: true,
      uploadableTeams: [BLUE, RED],
    });
    const view = checkbox('View (All Teams)');

    view.focus();
    await user.keyboard(' ');

    expect(view.checked).toBe(true);
    expect(checkbox('Blue').disabled).toBe(true);
    expect(checkbox('Red').disabled).toBe(true);
  });

  /**
   * Verifies: without canUploadView there is no view-wide target, and a single uploadable team is preselected and locked.
   * Interacts with: the rendered checkboxes (canUploadView: false).
   * Data: canUploadView false; only team Blue.
   */
  it('hides the view-wide target without canUploadView', async () => {
    const { checkbox } = await renderUpload({
      canUploadView: false,
      uploadableTeams: [BLUE],
    });

    expect(
      screen.queryByRole('checkbox', { name: 'View (All Teams)' }),
    ).not.toBeInTheDocument();
    expect(checkbox('Blue').checked).toBe(true);
    expect(checkbox('Blue').disabled).toBe(true);
  });

  /**
   * Verifies: uploading a file to a chosen team sends it with the team scope and closes the dialog with the API's result.
   * Interacts with: the file input (user.upload); a team checkbox (keyboard); Upload (user-event); FileService.uploadIso stub; dialogRefStub close.
   * Data: canUploadView true; Blue chosen; the API reports a clean upload with a message.
   */
  it('uploads to the chosen team and closes with the result', async () => {
    const user = userEvent.setup();
    const { close, fileService, checkbox, chooseFile } = await renderUpload({
      canUploadView: true,
      uploadableTeams: [BLUE, RED],
    });

    await chooseFile(user);
    const blue = checkbox('Blue');
    blue.focus();
    await user.keyboard(' ');
    await user.click(uploadButton());

    expect(fileService.uploadIso).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ name: 'kali.iso' }),
      'team',
      ['team-1'],
      'view-1',
    );
    expect(close).toHaveBeenCalledExactlyOnceWith({
      success: true,
      partialFailure: false,
      message: 'Uploaded to 2 hosts.',
    });
  });

  /**
   * Verifies: a failed upload stays open and shows the API's error message.
   * Interacts with: the file input (user.upload); Upload (user-event); FileService.uploadIso stub (throws); ErrorMessageService formatting.
   * Data: only team Blue (preselected); the API answers 403 with a ProblemDetails title.
   */
  it('shows the error when the upload fails', async () => {
    const user = userEvent.setup();
    const failure = new HttpErrorResponse({
      status: 403,
      // vm.api's ExceptionMiddleware puts the exception message in the title.
      error: {
        title: 'You do not have permission to upload files for this Team',
        status: 403,
      },
    });
    const { close, chooseFile } = await renderUpload(
      { canUploadView: false, uploadableTeams: [BLUE] },
      () => throwError(() => failure) as Observable<never>,
    );

    await chooseFile(user);
    await user.click(uploadButton());

    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You do not have permission to upload files for this Team',
    );
  });
});
