/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, startWith, switchMap } from 'rxjs/operators';
import { Vm, VmMap, VmsService } from '../../../generated/vm-api';
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
    private vmService: VmsService,
    private route: ActivatedRoute,
    private vmMapsQuery: VmMapsQuery,
    private VmAkitaService: VmService,
    private vmsQuery: VmsQuery,
  ) {}

  async ngOnInit() {
    this.custom = false;
    this.control = new FormControl();

    // Default values come from map component
    this.form = new FormGroup({
      rad: new FormControl({ value: this.rad, disabled: false }),
      url: new FormControl({ value: '', disabled: false }),
      label: new FormControl({ value: this.label, disabled: false }),
      customUrl: new FormControl({ value: this.url, disabled: true }),
    });

    this.vmMapsFiltered = this.route.params.pipe(
      switchMap((params) => {
        this.viewId = params['viewId'];
        return this.vmMapsQuery.getByViewId(this.viewId);
      })
    );

    this.vmsFiltered = this.VmAkitaService.GetViewVms(true, false);

    this.form
      .get('url')
      .valueChanges.subscribe(
        (value) =>
          (this.vmMapsFiltered = this.vmMapsQuery.getAllWithName(
            typeof value === 'string' ? value : value.name
          ))
      );
    
    this.form.get('url').valueChanges.subscribe(
      (value) => this.vmsFiltered = this.vmsQuery.getAllWithName(typeof value === 'string' ? value : value.name)
    )
  }

  onSubmit(): void {
    console.log('form submitted');
    const isMap = this.form.get('url').value.url === undefined;
    const urlVal = this.form.get('url').value;

    // If a custom url was selected, use that. Else, if a VmMap was selected, get its url. If a VM was selected, use its url field
    const url = this.custom
      ? this.form.get('customUrl').value
      : isMap
      ? this.getMapUrl(urlVal as VmMap)
      : urlVal.url;

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
