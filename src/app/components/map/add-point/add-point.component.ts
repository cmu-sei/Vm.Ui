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
import { FormBuilder, FormGroup } from '@angular/forms';
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
  @Input() editing: boolean;
  @Input() label: string;

  @Output() machineEmitter = new EventEmitter<Machine>();
  form: FormGroup;
  vms: Vm[];
  vmMaps: VmMap[];

  constructor(
    private formBuilder: FormBuilder,
    private vmService: VmsService,
    ) {}

  ngOnInit(): void {
    // Default values come from map component
    this.form = this.formBuilder.group({
      rad: [this.rad],
      url: [this.url],
      label: [this.label]
    });
    console.log(this.editing);
    this.getVms();
    this.getVmMaps();
  }

  onSubmit(): void {
    console.log("form submitted");    

    this.machineEmitter.emit(new Machine(+this.xPos, +this.yPos, +this.form.get("rad").value, 
      this.form.get("url").value, this.id, this.form.get('label').value));
  }

  onDelete(): void {
    // Send a machine with fields set to -1 to signal that it should be deleted
    this.machineEmitter.emit(new Machine(-1, -1, -1, '', this.id, '')); 
  }

  // TODO get only the relevant VMs/Maps
  getVms(): void {
    this.vmService.getAll().subscribe(data => {
      this.vms = data;
    })
  }

  getVmMaps(): void {
    this.vmService.getAllMaps().subscribe(data => {
      this.vmMaps = data;
    })
  }
}

