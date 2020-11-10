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
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Machine } from '../../models/machine';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddPointComponent } from './add-point/add-point.component';
import { Coordinate, VmMap, VmsService } from '../../generated/vm-api';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  machines: Machine[];
  mapInitialzed: boolean;
  teamIDs: string[];
  name: string;
  imageURL: string;
  mapId: string;

  xActual: number;
  yActual: number;
  idToSend: string;
  selectedRad: number;
  selectedURL: string;
  selectedLabel: string;
  timesSaved: number;

  viewId: string;

  // Edit mode input doesn't work as a bool
  @Input() viewIdInput: string;
  @Input() teamIdInput: string;
  @Input() mapIdInput: string;

  @Output() mapSaved = new EventEmitter<void>();
  @Output() initEmitter = new EventEmitter<boolean>();

  @ViewChild('addPointDialog') addPointDialog: TemplateRef<AddPointComponent>;
  private dialogRef: MatDialogRef<AddPointComponent>;

  constructor(
    private dialog: MatDialog,
    private vmService: VmsService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit map component');
    this.timesSaved = 0;
    this.machines = new Array<Machine>();

    if (this.viewIdInput === undefined) {
      this.route.params.subscribe((params) => {
        this.viewId = params['viewId'];
      });
    } else {
      this.viewId = this.viewIdInput;
    }

    this.initMap();
  }

  initMap(): void {
    console.log('Calling initMap');

    let teamId: string;
    if (this.teamIdInput === undefined) {
      this.route.params.subscribe((params) => {
        teamId = params['teamId'];
      });
    } else {
      teamId = this.teamIdInput;
    }

    console.log('Calling getMap');
    this.vmService.getMap(this.mapIdInput).subscribe((data) => {
      this.name = data.name;
      this.mapId = data.id;
      this.imageURL = data.imageUrl;
      this.teamIDs = data.teamIds;

      if (data.coordinates != null) {
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
      }
    });

    console.log('After getMap machines array is:');
    console.log(this.machines);

    this.mapInitialzed = true;
    this.initEmitter.emit(true);
  }

  redirect(url: string): void {
    window.open(url);
  }

  append(event): void {
    const isFirefox = 'InstallTrigger' in window

    if (!isFirefox) {
      // Get the offsets relative to the image. Note that this assumes a 100x100 image
      let target = event.target;
      let width = target.getBoundingClientRect().width;
      this.xActual = (100 * event.offsetX) / width;
      let height = target.getBoundingClientRect().height;
      this.yActual = (100 * event.offsetY) / height;
    } else {
      this.xActual = event.offsetX;
      this.yActual = event.offsetY;
    }

    this.idToSend = uuidv4();
    this.selectedRad = 3;
    this.selectedURL = 'https://example.com';

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  receiveMachine(machine: Machine): void {
    console.log('In receive');
    console.log('Machine: ');
    console.log(machine);

    // Find the machine being edited. If not undefined, an existing machine is being edited.
    // Else a new machine is being created
    const machineToEdit = this.machines.find(m => {
      console.log('Comparing ' + m.id + ' to ' + machine.id);
      return m.id === machine.id;
    });

    console.log('Machine to edit: ' + machineToEdit);

    if (machineToEdit != undefined) {
      const index = this.machines.indexOf(machineToEdit);
      // Remove the machine
      if (machine.x === -1) {
        console.log('Removing machine');
        console.log('Array before:')
        console.log(this.machines);
        this.machines.splice(index, 1);
        console.log('New machines array: ');
        console.log(this.machines);
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
    }

    let payload = <VmMap>{
      coordinates: coords,
      name: this.name,
      imageUrl: this.imageURL,
      teamIds: this.teamIDs.length == 0 ? null : this.teamIDs,
    };

    console.log(JSON.stringify(payload));

    await this.vmService.updateMap(this.mapId, payload).toPromise();
    window.alert('Map successfully saved!');
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
}
