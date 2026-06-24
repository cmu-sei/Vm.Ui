// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, ViewChild, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';
import {
  IsoGroup,
  IsoRow,
  IsoViewGroup,
  isoRowKey,
} from '../iso-list.component';

// Presentational panel for a single View in all-views mode: an inner accordion of the view-wide
// group plus a panel per team. The parent owns the delete/confirm/spinner flow; this component just
// emits the chosen row. Per-row delete state comes from the shared `deleting` set keyed by isoRowKey.
@Component({
  selector: 'app-iso-view-group',
  templateUrl: './iso-view-group.component.html',
  styleUrls: ['./iso-view-group.component.scss'],
  imports: [
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatProgressSpinner,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
  ],
})
export class IsoViewGroupComponent {
  readonly viewGroup = input.required<IsoViewGroup>();
  // The parent's in-flight delete set, keyed by isoRowKey, so a row's spinner stays in sync.
  readonly deleting = input.required<ReadonlySet<string>>();

  readonly delete = output<IsoRow>();

  // The inner team/view-wide accordion, so the parent's Expand/Collapse-All can reach this View's
  // nested panels (the outer accordion only controls the View-level panels).
  @ViewChild(MatAccordion) accordion: MatAccordion;

  // The view-wide group followed by the team groups, in display order.
  groups(): IsoGroup[] {
    const vg = this.viewGroup();
    return [vg.viewWideGroup, ...vg.teamGroups];
  }

  openAll() {
    this.accordion?.openAll();
  }

  closeAll() {
    this.accordion?.closeAll();
  }

  rowKey(row: IsoRow): string {
    return isoRowKey(row);
  }

  isDeleting(row: IsoRow): boolean {
    return this.deleting().has(isoRowKey(row));
  }
}
