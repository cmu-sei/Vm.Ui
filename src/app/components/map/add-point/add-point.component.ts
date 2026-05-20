// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import {
  UntypedFormControl,
  UntypedFormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Vm, VmMap } from '../../../generated/vm-api';
import { Clickpoint } from '../../../models/clickpoint';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { VmsQuery } from '../../../state/vms/vms.query';
import { VmService } from '../../../state/vms/vms.service';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { AsyncPipe } from '@angular/common';
import { MatOptgroup, MatOption } from '@angular/material/core';
import {
  MatAutocompleteTrigger,
  MatAutocomplete,
} from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatDialogTitle } from '@angular/material/dialog';

@Component({
    selector: 'app-add-point',
    templateUrl: './add-point.component.html',
    styleUrls: ['./add-point.component.scss'],
    imports: [
    MatDialogTitle,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatOptgroup,
    MatOption,
    MatCheckbox,
    FormsModule,
    MatButton,
    AsyncPipe,
    MatError,
    MatHint
]
})
export class AddPointComponent implements OnInit {
  @Input() xPos: number;
  @Input() yPos: number;
  @Input() rad: number;
  @Input() url: string;
  @Input() id: string;
  @Input() label: string;
  @Input() editing: boolean;

  @Output() machineEmitter = new EventEmitter<Clickpoint>();

  form: UntypedFormGroup;
  vmsFiltered: Observable<Vm[]>;
  vmMapsFiltered: Observable<VmMap[]>;
  control: UntypedFormControl;
  viewId: string;
  custom: boolean;

  constructor(
    private route: ActivatedRoute,
    private vmMapsQuery: VmMapsQuery,
    private VmAkitaService: VmService,
    private vmsQuery: VmsQuery,
  ) {}

  ngOnInit() {
    this.custom = false;
    this.control = new UntypedFormControl();

    // URL pattern that matches http/https URLs
    const urlPattern = /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/[\w.-]*)*$/;

    // Default values come from map component
    this.form = new UntypedFormGroup({
      rad: new UntypedFormControl(
        { value: this.rad, disabled: false },
        [Validators.required, Validators.min(0.1)]
      ),
      url: new UntypedFormControl({ value: this.url, disabled: false }, [Validators.required]),
      label: new UntypedFormControl({ value: this.label, disabled: false }, [Validators.required]),
      customUrl: new UntypedFormControl({ value: '', disabled: true }, [Validators.pattern(urlPattern)]),
    });

    if (this.editing && this.url) {
      const vmMap = this.vmMapsQuery.getEntity(this.url);
      if (vmMap) {
        this.form.get('url').setValue(vmMap);
      } else if (this.url.includes('://')) {
        this.custom = true;
        this.form.get('customUrl').setValue(this.url);
        this.form.get('url').setValue('');
        this.onCustomToggle(true);
      }
    }

    // Get VM Maps in view
    this.vmMapsFiltered = this.route.params.pipe(
      switchMap((params) => {
        const viewId = params['viewId'];
        return this.vmMapsQuery.getByViewId(viewId);
      }),
    );

    // Get VMs in view
    // Calling the service directly here because the API doesn't set a viewId field on a VM, so there's no way to do this as a query
    this.vmsFiltered = this.VmAkitaService.GetViewVms(true, false);

    // Set up filter for VM Maps
    this.form
      .get('url')
      .valueChanges.subscribe(
        (value) =>
          (this.vmMapsFiltered = this.vmMapsQuery.getAllWithName(
            typeof value === 'string' ? value : '',
          )),
      );

    // Set up filter for VMs
    this.form
      .get('url')
      .valueChanges.subscribe(
        (value) =>
          (this.vmsFiltered = this.vmsQuery.getAllWithName(
            typeof value === 'string' ? value : '',
          )),
      );
  }

  onSubmit(): void {
    const urlVal = this.form.get('url').value;

    // If a custom url was selected, use that. Else, if a VmMap was selected, get its id.
    // If not a custom URL or Map, determine whether it is a VM or a multiple select query (ie * or a range)
    // and send either the VM's name or the query
    let query = '';
    let multiple = false;

    if (this.custom) {
      query = this.form.get('customUrl').value;
    } else if (typeof urlVal == 'string') {
      // Assume that if a string is entered, the user wants multiple VMs
      multiple = true;
      query = urlVal as string;
    } else if (this.isVmMap(urlVal)) {
      query = (urlVal as VmMap).id;
    } else {
      // If here, the only remaining possible value is a Vm
      query = (urlVal as Vm).name;
    }

    const point = new Clickpoint(
      +this.xPos,
      +this.yPos,
      +this.form.get('rad').value,
      [],
      this.id,
      this.form.get('label').value,
      query,
      multiple,
    );

    this.machineEmitter.emit(point);
  }

  onCustomToggle(isCustom: boolean): void {
    if (isCustom) {
      this.form.get('url').disable();
      this.form.get('customUrl').enable();
    } else {
      this.form.get('url').enable();
      this.form.get('customUrl').disable();
    }
  }

  onCancel(): void {
    // Close dialog without emitting changes
    this.machineEmitter.emit(null);
  }

  onDelete(): void {
    // Send a clickpoint with fields set to -1 to signal that it should be deleted
    this.machineEmitter.emit(
      new Clickpoint(-1, -1, -1, [], this.id, '', '', false),
    );
  }

  getMapUrl(m: VmMap): string {
    return 'views/' + m.viewId + '/map/' + m.id;
  }

  display(item: Vm | VmMap | string): string {
    if (typeof item === 'string') return item;
    return item && item.name ? item.name : '';
  }

  private isVmMap(object: any): object is VmMap {
    return 'coordinates' in object;
  }

  private isVmModel(object: any): object is Vm {
    return 'powerState' in object;
  }
}
