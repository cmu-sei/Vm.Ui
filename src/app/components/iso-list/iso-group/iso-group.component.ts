// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { IsoGroup, IsoRow, isoRowKey } from '../iso-list.component';

// Presentational expansion panel for a single ISO group (the view-wide group or one team). Renders
// the header (title + count) and the rows, each with a delete affordance, and emits the chosen row;
// the parent owns the delete/confirm/spinner flow. Per-row delete state comes from the shared
// `deleting` set keyed by isoRowKey. Used by both the single-view list and the all-views child.
@Component({
  selector: 'app-iso-group',
  templateUrl: './iso-group.component.html',
  styleUrls: ['./iso-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconButton, MatIcon, MatTooltip, MatProgressSpinner],
})
export class IsoGroupComponent {
  readonly group = input.required<IsoGroup>();
  // The parent's in-flight delete set, keyed by isoRowKey, so a row's spinner stays in sync.
  readonly deleting = input.required<ReadonlySet<string>>();

  readonly delete = output<IsoRow>();

  rowKey(row: IsoRow): string {
    return isoRowKey(row);
  }

  isDeleting(row: IsoRow): boolean {
    return this.deleting().has(isoRowKey(row));
  }

  // Names the hypervisors the file is absent from, and says what to do about it - the fix is a
  // re-upload of the same name, which overwrites where the file exists and creates it where it
  // does not.
  missingTooltip(row: IsoRow): string {
    const missing = row.missingProviders ?? [];
    return `Missing on ${missing.join(', ')} - re-upload this file to fix`;
  }
}
