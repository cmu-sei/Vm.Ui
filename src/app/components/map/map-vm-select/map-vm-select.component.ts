/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../../services/theme/theme.service';
import { MatOption } from '@angular/material/core';

import {
  ReactiveFormsModule,
  UntypedFormControl,
  UntypedFormGroup,
} from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';

@Component({
  selector: 'map-vm-select',
  templateUrl: './map-vm-select.component.html',
  styleUrls: ['./map-vm-select.component.scss'],
  imports: [
    ...CRUCIBLE_DIALOG_IMPORTS,
    MatFormField,
    MatLabel,
    MatSelect,
    ReactiveFormsModule,
    MatOption,
  ],
})
export class MapVmSelectComponent {
  route = inject(ActivatedRoute);
  data = inject<{
    vms: string[];
    viewId: string;
  }>(MAT_DIALOG_DATA);
  private themeService = inject(ThemeService);
  private dialogRef = inject<MatDialogRef<MapVmSelectComponent>>(MatDialogRef);

  public form = new UntypedFormGroup({
    selected: new UntypedFormControl([]),
  });

  redirect() {
    for (let vm of this.form.controls.selected.value) {
      window.open(
        this.themeService.addThemeQueryParam(
          `views/${this.data.viewId}/vms/${vm}/console`,
        ),
        '_blank',
      );
    }
    this.dialogRef.close();
  }
}
