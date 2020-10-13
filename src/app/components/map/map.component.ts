/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { AfterViewInit, Component, ElementRef, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Machine } from '../../models/machine'
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddPointComponent } from './add-point/add-point.component';
import { Coordinate, VmMap, VmsService } from '../../generated/vm-api';
import { core } from '@angular/compiler';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  machines: Machine[];
  viewId: string;
  mapInitialzed: boolean;
  form: FormGroup;
  teamID: string;
  name: string;
  imageURL: string;
  currentID: number;

  @Input() xActual: number;
  @Input() yActual: number;
  @Input() idToSend: number;

  @ViewChild('addPointDialog') addPointDialog: TemplateRef<AddPointComponent>;
  private dialogRef: MatDialogRef<AddPointComponent>;

  constructor(
    private dialog: MatDialog,
    private vmService: VmsService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder
    ) { }

  ngOnInit(): void {
    this.machines = new Array<Machine>();
    this.route.params.subscribe(params => {
      this.viewId = params['viewId'];
    });
    this.mapInitialzed = false;
    this.form = this.formBuilder.group({
      name: [''],
      imageURL: [''],
      teamID: [''],
    });
    this.currentID = 0;
  }

  initMap(): void {
    this.teamID = this.form.get('teamID').value;
    this.name = this.form.get('name').value;
    this.imageURL = this.form.get('imageURL').value;
    this.mapInitialzed = true;
  }

  redirect(url): void {
    window.open(url, '_blank')
  }

  append(event): void {
    // Get the offsets relative to the image. Note that this assumes a 100x100 image
    let target = event.target;
    let width = target.getBoundingClientRect().width;
    this.xActual = (100 * event.offsetX) / width;
    let height = target.getBoundingClientRect().height;
    this.yActual = (100 * event.offsetY) / height;
    this.idToSend = this.currentID;
    this.currentID++;

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  receiveMachine(machine: Machine): void {
    console.log('In receive');
    // Check if this is an edit or creation
    let machineToEdit: Machine = null; 
    for (let m of this.machines) {
      // It's an edit
      if (m.id == machine.id) {
        machineToEdit = m;
        break;
      }
    }

    if (machineToEdit != null) {
      const index = this.machines.indexOf(machineToEdit);
      this.machines[index] = machine;
    } else {
      this.machines.push(machine);
    }

    this.dialogRef.close();
  }

  // click button, save map
  async save(): Promise<void> {
    console.log('Save pressed');
    let coords = new Array<Coordinate>();
    for (let machine of this.machines) {
      let coord = <Coordinate>{
        xPosition: machine.x,
        yPosition: machine.y,
        radius: machine.r,
        url: machine.url
      }
      coords.push(coord);
      let payload = <VmMap>{
        coordinates: coords,
        name: this.name,
        imageUrl: this.imageURL,
        teamIds: this.teamID == '' ? null : [this.teamID]
      }

      console.log(JSON.stringify(payload))

      this.vmService.createMap(this.viewId, payload).subscribe(
        x => console.log('Got a next value: ' + x),
        err => console.log('Got an error: ' + err),
        () => console.log('Got a complete notification')
      );
    }
  }

  back(): void {
    this.router.navigate(['../'], { relativeTo:this.route })
  }

  edit(m: Machine): void {
    console.log(m);
    this.idToSend = m.id;
    this.dialogRef = this.dialog.open(this.addPointDialog);
  }
}

