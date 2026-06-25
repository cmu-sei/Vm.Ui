// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { IsoGroup, IsoRow, IsoViewGroup } from '../iso-list.component';
import { IsoGroupComponent } from '../iso-group/iso-group.component';

// Presentational panel for a single View in all-views mode: an inner accordion of the view-wide
// group plus a panel per team. The parent owns the delete/confirm/spinner flow; this component just
// emits the chosen row. Per-row delete state comes from the shared `deleting` set keyed by isoRowKey.
@Component({
  selector: 'app-iso-view-group',
  templateUrl: './iso-view-group.component.html',
  styleUrls: ['./iso-view-group.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatAccordion, IsoGroupComponent],
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
}
