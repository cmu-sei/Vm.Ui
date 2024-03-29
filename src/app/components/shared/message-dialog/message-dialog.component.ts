/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'message-dialog',
  templateUrl: './message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss'],
  standalone: true,
  imports: [MatDialogTitle, MatDialogActions, MatButton],
})
export class MessageDialogComponent implements OnInit {
  public title: string;
  public message: string;

  ngOnInit(): void {}

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<MessageDialogComponent>,
  ) {
    this.dialogRef.disableClose = true;
  }

  onClick(): void {
    this.dialogRef.close();
  }
}
