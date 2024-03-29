// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton],
})
export class ConfirmDialogComponent {
  public title: string;
  public message: string;
  public buttonFalseText: string;
  public buttonTrueText: string;
  public removeArtifacts: boolean = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
  ) {
    this.dialogRef.disableClose = true;
    this.buttonFalseText = this.data['buttonFalseText'];
    this.buttonTrueText = this.data['buttonTrueText'];
  }

  onClick(confirm: boolean): void {
    this.data.artifacts && this.data.artifacts.length > 0
      ? (this.data.removeArtifacts = this.removeArtifacts)
      : (this.data.removeArtifacts = false);
    this.data.confirm = confirm;
    this.data.wasCancelled = false;
    this.dialogRef.close(this.data);
  }

  onCancel(): void {
    this.data.artifacts && this.data.artifacts.length > 0
      ? (this.data.removeArtifacts = this.removeArtifacts)
      : (this.data.removeArtifacts = false);
    this.data.wasCancelled = true;
    this.dialogRef.close(this.data);
  }
}
