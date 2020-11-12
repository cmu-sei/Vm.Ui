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
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Vm, VmMap, VmsService } from '../../../generated/vm-api';
import { Machine } from '../../../models/machine';

@Component({
  selector: 'app-add-point',
  templateUrl: './add-point.component.html',
  styleUrls: ['./add-point.component.css']
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
  vms: Vm[];
  vmMaps: VmMap[];
  vmsFiltered: Observable<Vm[]>;
  vmMapsFiltered: Observable<VmMap[]>;
  control: FormControl;
  viewId: string;
  custom: boolean;

  constructor(
    private vmService: VmsService,
    private route: ActivatedRoute
    ) {}

  async ngOnInit() {
    this.custom = false;
    this.control = new FormControl();

    // Default values come from map component
    this.form = new FormGroup({
      rad: new FormControl({value: this.rad, disabled: false}),
      url: new FormControl({value: '', disabled: false}),
      label: new FormControl({value: '',disabled: false}),
      customUrl: new FormControl({value: '', disabled: true})
    });

    this.route.params.subscribe(params => {
      this.viewId = params['viewId'];
    });

    await this.getVms();
    await this.getVmMaps();

    this.vmsFiltered = this.form.get('url').valueChanges
      .pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => name ? this._filterVms(name) : this.vms.slice())
      );

    this.vmMapsFiltered = this.form.get('url').valueChanges
      .pipe(
        startWith(''),
        map(value => typeof value === 'string' ? value : value.name),
        map(name => name ? this._filterVmMaps(name) : this.vmMaps.slice())
      );
  }

  onSubmit(): void {
    console.log("form submitted");
    const isMap = this.form.get('url').value.url === undefined
    const urlVal = this.form.get('url').value;

    // If a custom url was selected, use that. Else, if a VmMap was selected, get its url. If a VM was selected, use its url field
    const url = this.custom ? this.form.get('customUrl').value : isMap ? this.getMapUrl(urlVal as VmMap) : urlVal.url;

    const machine = new Machine(+this.xPos, +this.yPos, +this.form.get("rad").value, url, 
      this.id, this.form.get('label').value);

    console.log(machine);
    this.machineEmitter.emit(machine);
  }

  onDelete(): void {
    // Send a machine with fields set to -1 to signal that it should be deleted
    this.machineEmitter.emit(new Machine(-1, -1, -1, '', this.id, '')); 
  }

  // Currently getting all VMs/Maps in view. May need to get more granular
  async getVms() {
    const data = await this.vmService.getViewVms(this.viewId).toPromise();
    this.vms = data;
  }

  async getVmMaps() {
    const data = await this.vmService.getViewMaps(this.viewId).toPromise();
    this.vmMaps = data;
  }

  getMapUrl(m: VmMap): string {
    return 'views/' + m.viewId + '/map/' + m.id;
  }

  display(item: Vm | VmMap): string {
    return item && item.name ? item.name : '';
  }

  private _filterVms(value: string): Vm[] {
    const lower = value.toLowerCase();

    return this.vms.filter(vm => vm.name.toLowerCase().includes(lower));
  }

  private _filterVmMaps(value: string): VmMap[] {
    const lower = value.toLowerCase();

    return this.vmMaps.filter(m => m.name.toLowerCase().includes(lower));
  }
}
