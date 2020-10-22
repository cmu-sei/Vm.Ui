/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component, Input, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  viewId: string;
  custom: boolean;

  constructor(
    private formBuilder: FormBuilder,
    private vmService: VmsService,
    private route: ActivatedRoute
    ) {}

  ngOnInit(): void {
    this.custom = false;
    // Default values come from map component
    this.form = new FormGroup({
      rad: new FormControl({value: this.rad}),
      url: new FormControl({value: ''}),
      label: new FormControl({value: this.label}),
      customUrl: new FormControl({value: '', disabled: true})
    });

    this.route.params.subscribe(params => {
      this.viewId = params['viewId'];
    });
    this.getVms();
    this.getVmMaps();
  }

  onSubmit(): void {
    console.log("form submitted");   
    console.log('url = ' + this.form.get('url').value); 
    const url = this.form.get('url').value == '' ? this.form.get('customUrl').value : this.form.get('url').value;

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
  getVms(): void {
    this.vmService.getViewVms(this.viewId).subscribe(data => {
      this.vms = data;
    })
  }

  getVmMaps(): void {
    this.vmService.getViewMaps(this.viewId).subscribe(data => {
      this.vmMaps = data;
    })
  }

  getMapUrl(m: VmMap): string {
    return 'views/' + m.viewId + '/map/' + m.teamIds[0];
  }
}

