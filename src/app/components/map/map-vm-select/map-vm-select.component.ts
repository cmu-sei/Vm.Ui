/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';

@Component({
    selector: 'map-vm-select',
    templateUrl: './map-vm-select.component.html',
    styleUrls: ['./map-vm-select.component.scss'],
    imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    ReactiveFormsModule,
    FormsModule,
    MatOption,
    MatButton
]
})
export class MapVmSelectComponent implements OnInit {
  public selected: string[];

  constructor(
    public route: ActivatedRoute,
    @Inject(MAT_DIALOG_DATA) public data: { vms: string[]; viewId: string },
  ) {}

  ngOnInit(): void {}

  redirect() {
    for (let vm of this.selected) {
      window.open(`views/${this.data.viewId}/vms/${vm}/console`, '_blank');
    }
  }
}
