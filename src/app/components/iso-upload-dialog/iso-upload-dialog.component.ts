// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { FileService } from '../../services/file/file.service';
import { ErrorMessageService } from '../../services/error-message/error-message.service';
import { IsoUploadResult } from '../../generated/vm-api';

// A team the current user may upload to, surfaced as a checkbox in the dialog.
interface UploadTeamOption {
  id: string;
  name: string;
}

// Data the opener passes in. canUploadView/uploadableTeams are derived from permissions by the
// opener (the iso-list component) so the dialog itself stays free of permission logic.
export interface IsoUploadDialogData {
  viewId: string;
  canUploadView: boolean;
  uploadableTeams: UploadTeamOption[];
}

@Component({
  selector: 'app-iso-upload-dialog',
  templateUrl: './iso-upload-dialog.component.html',
  styleUrls: ['./iso-upload-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatCheckbox,
    MatIcon,
    MatProgressBar,
  ],
})
export class IsoUploadDialogComponent {
  readonly file = signal<File | null>(null);
  readonly uploadToView = signal(false);
  // Selected team ids (only relevant when not uploading to the whole View).
  readonly selectedTeamIds = signal<ReadonlySet<string>>(new Set());

  readonly uploading = signal(false);
  readonly progress = signal(0);
  readonly errorMessage = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<IsoUploadDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<IsoUploadDialogComponent>>(MatDialogRef);
  private readonly fileService = inject(FileService);

  // True when the dialog offers exactly one target: no view-wide option and a single team.
  // In that case the team is auto-selected and locked (nothing else to choose).
  readonly singleTeamOnly = computed(
    () => !this.data.canUploadView && this.data.uploadableTeams.length === 1,
  );

  constructor() {
    if (this.singleTeamOnly()) {
      this.selectedTeamIds.set(new Set([this.data.uploadableTeams[0].id]));
    }
  }

  onFileChosen(input: HTMLInputElement) {
    this.file.set(input.files?.[0] ?? null);
  }

  toggleView(checked: boolean) {
    this.uploadToView.set(checked);
  }

  isTeamSelected(teamId: string): boolean {
    return this.selectedTeamIds().has(teamId);
  }

  toggleTeam(teamId: string, checked: boolean) {
    this.selectedTeamIds.update((set) => {
      const next = new Set(set);
      if (checked) {
        next.add(teamId);
      } else {
        next.delete(teamId);
      }
      return next;
    });
  }

  // Submit is allowed once a file is chosen and at least one target is selected.
  canSubmit(): boolean {
    if (this.uploading() || !this.file()) {
      return false;
    }
    return this.uploadToView() || this.selectedTeamIds().size > 0;
  }

  submit() {
    const file = this.file();
    if (!file || !this.canSubmit()) {
      return;
    }

    const scope = this.uploadToView() ? 'view' : 'team';
    const teamIds = this.uploadToView() ? [] : Array.from(this.selectedTeamIds());

    this.uploading.set(true);
    this.progress.set(0);
    this.errorMessage.set(null);

    this.fileService
      .uploadIso(file, scope, teamIds, this.data.viewId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress.set(Math.round((100 * event.loaded) / event.total));
          } else if (event.type === HttpEventType.Response) {
            // A partial-host failure still returns 200 with a non-zero failed count; surface that
            // rather than reporting a clean success.
            const body = event.body as IsoUploadResult;
            this.dialogRef.close({
              success: true,
              partialFailure: (body?.failedHostCount ?? 0) > 0,
              message: body?.message,
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          this.uploading.set(false);
          this.errorMessage.set(
            ErrorMessageService.getApiErrorMessage(
              err,
              'An unexpected error occurred while uploading the ISO.',
            ),
          );
        },
      });
  }

  cancel() {
    this.dialogRef.close();
  }
}
