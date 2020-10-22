/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Machine } from '../../models/machine';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddPointComponent } from './add-point/add-point.component';
import { Coordinate, SimpleTeam, VmMap, VmsService } from '../../generated/vm-api';
import { core } from '@angular/compiler';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  machines: Machine[];
  viewId: string;
  mapInitialzed: boolean;
  form: FormGroup;
  teamIDs: string[];
  name: string;
  imageURL: string;
  editMode: boolean;
  mapId: string;

  xActual: number;
  yActual: number;
  idToSend: string;
  selectedRad: number;
  selectedURL: string;
  selectedLabel: string;
  teams: SimpleTeam[];

  @ViewChild('addPointDialog') addPointDialog: TemplateRef<AddPointComponent>;
  private dialogRef: MatDialogRef<AddPointComponent>;

  constructor(
    private dialog: MatDialog,
    private vmService: VmsService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.machines = new Array<Machine>();
    this.teamIDs = new Array<string>();
    this.route.params.subscribe((params) => {
      this.viewId = params['viewId'];
    });
    this.getTeams();
    this.editMode = this.router.url.endsWith('edit');
    if (this.editMode) {
      this.initMapEdit();
    } else {
      this.mapInitialzed = false;
      this.form = this.formBuilder.group({
        name: [''],
        imageURL: [''],
        teamIDs: [''],
      });
    }
  }

  initMap(): void {
    this.name = this.form.get('name').value;
    this.imageURL = this.form.get('imageURL').value;
    this.teamIDs = this.form.get('teamIDs').value;
    this.mapInitialzed = true;
  }

  initMapEdit(): void {
    let teamId: string;
    this.route.params.subscribe((params) => {
      teamId = params['teamId'];
    });
    this.vmService.getTeamMap(teamId).subscribe((data) => {
      this.name = data.name;
      this.mapId = data.id;
      this.imageURL = data.imageUrl;
      this.teamIDs = data.teamIds;
      for (let coord of data.coordinates) {
        this.machines.push(
          new Machine(
            coord.xPosition,
            coord.yPosition,
            coord.radius,
            coord.url,
            coord.id,
            coord.label
          )
        );
      }
    });
    this.mapInitialzed = true;
  }

  redirect(url: string): void {
    window.open(url, '_blank');
  }

  append(event): void {
    // Get the offsets relative to the image. Note that this assumes a 100x100 image
    let target = event.target;
    let width = target.getBoundingClientRect().width;
    this.xActual = (100 * event.offsetX) / width;
    let height = target.getBoundingClientRect().height;
    this.yActual = (100 * event.offsetY) / height;

    this.idToSend = uuidv4();
    this.selectedRad = 3;
    this.selectedURL = 'https://example.com';

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  receiveMachine(machine: Machine): void {
    console.log('In receive');
    console.log(machine);
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
      // Remove the machine
      if (machine.x == -1) {
        this.machines.splice(index, 1);
        // Replace the machine with an edited version
      } else {
        this.machines[index] = machine;
      }
      // Add the new machine
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
        url: machine.url,
        id: machine.id,
        label: machine.label,
      };
      coords.push(coord);
      let payload = <VmMap>{
        coordinates: coords,
        name: this.name,
        imageUrl: this.imageURL,
        teamIds: this.teamIDs.length == 0 ? null : this.teamIDs,
      };

      console.log(JSON.stringify(payload));

      if (this.editMode) {
        this.vmService.updateMap(this.mapId, payload).subscribe(
          (x) => console.log('Got a next value: ' + x),
          (err) => console.log('Got an error: ' + err),
          () => console.log('Got a complete notification')
        );
      } else {
        this.vmService.createMap(this.viewId, payload).subscribe(
          (x) => console.log('Got a next value: ' + x),
          (err) => console.log('Got an error: ' + err),
          () => console.log('Got a complete notification')
        );
      }
    }
  }

  back(): void {
    this.router.navigate(['views/' + this.viewId + '/map']);
  }

  edit(m: Machine): void {
    console.log(m);
    this.idToSend = m.id;
    this.selectedRad = m.r;
    this.selectedURL = m.url;
    this.selectedLabel = m.label;

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  // This gets called a lot for some reason. May want to investigate
  calcFontSize(radius: number): number {
    return radius / 3;
  }

  getTeams(): void {
    this.vmService.getTeams(this.viewId).subscribe(data => {
      this.teams = data;
      console.log(this.teams);
    })
  }
}

