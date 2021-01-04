// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Vm, VmMap } from '../../../generated/vm-api';
import { Machine } from '../../../models/machine';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { VmModel } from '../../../state/vms/vm.model';
import { VmsQuery } from '../../../state/vms/vms.query';
import { VmService } from '../../../state/vms/vms.service';

@Component({
  selector: 'app-add-point',
  templateUrl: './add-point.component.html',
  styleUrls: ['./add-point.component.css'],
})
export class AddPointComponent implements OnInit {
  @Input() xPos: number;
  @Input() yPos: number;
  @Input() rad: number;
  @Input() url: string;
  @Input() id: string;
  @Input() label: string;

  @Output() machineEmitter = new EventEmitter<Machine>();

  form: FormGroup;
  vmsFiltered: Observable<VmModel[]>;
  vmMapsFiltered: Observable<VmMap[]>;
  control: FormControl;
  viewId: string;
  custom: boolean;

  constructor(
    private route: ActivatedRoute,
    private vmMapsQuery: VmMapsQuery,
    private VmAkitaService: VmService,
    private vmsQuery: VmsQuery
  ) {}

  ngOnInit() {
    this.custom = false;
    this.control = new FormControl();

    // Default values come from map component
    this.form = new FormGroup({
      rad: new FormControl({ value: this.rad, disabled: false }),
      url: new FormControl({ value: '', disabled: false }),
      label: new FormControl({ value: this.label, disabled: false }),
      customUrl: new FormControl({ value: this.url, disabled: true }),
    });

    // Get VM Maps in view
    this.vmMapsFiltered = this.route.params.pipe(
      switchMap((params) => {
        const viewId = params['viewId'];
        return this.vmMapsQuery.getByViewId(viewId);
      })
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
            typeof value === 'string' ? value : value.name
          ))
      );
    
    // Set up filter for VMs
    this.form
      .get('url')
      .valueChanges.subscribe(
        (value) =>
          (this.vmsFiltered = this.vmsQuery.getAllWithName(
            typeof value === 'string' ? value : value.name
          ))
      );
  }

  onSubmit(): void {
    console.log('form submitted');
    const isMap = this.form.get('url').value.url === undefined;
    const urlVal = this.form.get('url').value;

    // If a custom url was selected, use that. Else, if a VmMap was selected, get its id. If a VM was selected, use its name field
    const url = this.custom
      ? this.form.get('customUrl').value
      : isMap
      ? (urlVal as VmMap).id
      : (urlVal as VmModel).name;

    const machine = new Machine(
      +this.xPos,
      +this.yPos,
      +this.form.get('rad').value,
      url,
      this.id,
      this.form.get('label').value
    );

    console.log(machine);
    this.machineEmitter.emit(machine);
  }

  onDelete(): void {
    // Send a machine with fields set to -1 to signal that it should be deleted
    this.machineEmitter.emit(new Machine(-1, -1, -1, '', this.id, ''));
  }

  getMapUrl(m: VmMap): string {
    return 'views/' + m.viewId + '/map/' + m.id;
  }

  // Display resource name in dialog instead of url
  display(item: Vm | VmMap): string {
    return item && item.name ? item.name : '';
  }
}
