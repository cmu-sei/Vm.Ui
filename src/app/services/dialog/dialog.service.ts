// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Observable } from 'rxjs';
import {
  MatDialogRef,
  MatDialog,
  MatDialogConfig,
} from '@angular/material/dialog';
import { Injectable } from '@angular/core';
import { ConfirmDialogComponent } from '../../components/shared/confirm-dialog/confirm-dialog.component';
import { MessageDialogComponent } from '../../components/shared/message-dialog/message-dialog.component';

@Injectable()
export class DialogService {
  constructor(private dialog: MatDialog) {}

  public confirm(title: string, message: string, data?: any): Observable<any> {
    let dialogRef: MatDialogRef<ConfirmDialogComponent>;
    dialogRef = this.dialog.open(ConfirmDialogComponent, { data: data || {} });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
  }

  public message(
    title: string,
    message: string,
    data?: MatDialogConfig,
  ): Observable<any> {
    let dialogRef = this.dialog.open(MessageDialogComponent, {
      data: data || {},
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
  }
}
