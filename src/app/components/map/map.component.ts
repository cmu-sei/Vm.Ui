// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Clickpoint } from '../../models/clickpoint';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddPointComponent } from './add-point/add-point.component';
import { Coordinate, VmMap, VmsService } from '../../generated/vm-api';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import { VmMapsService } from '../../state/vmMaps/vm-maps.service';
import { VmMapsQuery } from '../../state/vmMaps/vm-maps.query';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit, OnChanges {
  machines: Clickpoint[];
  mapInitialzed: boolean;
  teamIDs: string[];
  name: string;
  imageURL: string;
  imageUrlToSave: string;
  mapId: string;

  xActual: number;
  yActual: number;
  idToSend: string;
  selectedRad: number;
  selectedURL: string;
  selectedLabel: string;
  timesSaved: number;
  editing: boolean;

  viewId: string;

  @Input() mapIdInput: string;

  @Output() mapSaved = new EventEmitter<void>();
  @Output() initEmitter = new EventEmitter<boolean>();

  @ViewChild('addPointDialog') addPointDialog: TemplateRef<AddPointComponent>;
  private dialogRef: MatDialogRef<AddPointComponent>;

  constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private vmMapsService: VmMapsService,
    private vmMapsQuery: VmMapsQuery,
    private vmsService: VmsService 
  ) {}

  ngOnInit(): void {
    this.timesSaved = 0;
    this.machines = new Array<Clickpoint>();

    this.route.params.subscribe((params) => {
      this.viewId = params['viewId'];
    });

    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Don't call init again on the first change. This causes clickpoints to be duplicated
    if (!changes['mapIdInput'].firstChange) {
      this.ngOnInit();
    }
  }

  initMap(): void {
    // Get map data, put coordinates into machines array
    this.vmMapsQuery.getById(this.mapIdInput).subscribe((data) => {
      this.name = data.name;
      this.mapId = data.id;
      this.teamIDs = data.teamIds;

      // As in display component, need to figure out if the URL is b64 encoded and, if so, convert it to a blob
      // and then generate an object url
      const url = data.imageUrl;
      // Using the same basic check as in display component for whether a string is a url
      if (!this.isURL(url)) {
        const asBlob = this.b64ToBlob(url);
        const objUrl = window.URL.createObjectURL(asBlob);
        this.imageURL = objUrl;
      } else {
        this.imageURL = url;
      }
      this.imageUrlToSave = url;

      if (data.coordinates != null) {
        for (let coord of data.coordinates) {
          this.machines.push(
            new Clickpoint(
              coord.xPosition,
              coord.yPosition,
              coord.radius,
              coord.urls,
              coord.id,
              coord.label,
              '',
              false
            )
          );
        }
      }

      this.mapInitialzed = true;
      this.initEmitter.emit(true);
    });
  }

  redirect(url: string): void {
    window.open(url);
  }

  // Add a new click point
  append(event): void {
    const isFirefox = 'InstallTrigger' in window;
    
    if (!isFirefox) {
      // Get the offsets relative to the image. Note that this assumes a 100x100 image
      let target = event.target;
      let width = target.getBoundingClientRect().width;
      this.xActual = (100 * event.pageX) / width;
      let height = target.getBoundingClientRect().height;
      this.yActual = ((100 * event.pageY) / height) + 2;
    } else {
      this.xActual = event.offsetX;
      this.yActual = event.offsetY;
    }

    this.idToSend = uuidv4();
    this.selectedRad = 3;
    this.selectedURL = 'https://example.com';
    this.editing = false;

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  receiveMachine(point: Clickpoint): void {
    // Find the machine being edited. If not undefined, an existing machine is being edited.
    // Else a new machine is being created
    const machineToEdit = this.machines.find((m) => {
      return m.id === point.id;
    });

    const editing = machineToEdit != undefined;

    if (editing) {
      const index = this.machines.indexOf(machineToEdit);
      // Remove the machine, a -1 field means deletion
      if (point.xPosition === -1) {
        this.machines.splice(index, 1);
      } else {
        // Replace the machine with an edited version
        point.urls = [point.query];
        this.machines[index] = point;
      }
    } else if (point.multiple) {
      // The user wants to associate multiple VMs with this clickpoint, find their URLs
      // The user can specify a wildcard with * or a range with [0,9]. As of now they need to be at the end of
      // the string. Putting them in the middle isn't far from just allowing regular expressions, and if we want
      // to do that, we should just let users input a regex and not mess with it
      const query = point.query;
      let vmNames = new Array<string>();
      if (query.endsWith('*')) {
        const start = query.substring(0, query.length - 1);
        this.vmsService.getViewVms(this.viewId).subscribe(vms => {
          const filtered = vms.filter(vm => {
            return vm.name.startsWith(start);
          })
          vmNames = filtered.map(vm => vm.name);

          point.urls = vmNames;
          this.machines.push(point);
        });  

      } else if (query.endsWith(']')) {
        const start = query.substring(0, query.lastIndexOf('['));
        const range = query.substring(query.lastIndexOf('[') + 1, query.lastIndexOf(']'));
        const numbers = range.split(',');
        const lower = parseInt(numbers[0]);
        const upper = parseInt(numbers[1]);

        this.vmsService.getViewVms(this.viewId).subscribe(vms => {
          const filtered = vms.filter(vm => {
            const num = vm.name.charAt(vm.name.length - 1);
            const parsed = parseInt(num);
            if (parsed == NaN) {
              return false
            }
            return vm.name.startsWith(start) && (parsed >= lower && parsed <= upper); 
          })

          const names = filtered.map(vm => vm.name);
          point.urls = names;
          this.machines.push(point);
        })
      } else {
        window.alert('Invalid query');
      }
      
    } else {
      point.urls = [point.query];
      this.machines.push(point);
    }

    this.dialogRef.close();
  }

  // Save button clicked, save the map
  save() {
    let coords = new Array<Coordinate>();
    for (let machine of this.machines) {
      const coord = <Coordinate>{
        xPosition: machine.xPosition,
        yPosition: machine.yPosition,
        radius: machine.radius,
        urls: machine.urls,
        id: machine.id,
        label: machine.label,
      };
      coords.push(coord);
    }

    const payload = <VmMap>{
      coordinates: coords,
      name: this.name,
      imageUrl: this.imageUrlToSave,
      teamIds: this.teamIDs.length == 0 ? null : this.teamIDs,
    };

    this.vmMapsService.update(this.mapId, payload);
    window.alert('Map successfully saved!');
  }

  back(): void {
    this.router.navigate(['views/' + this.viewId + '/map']);
  }

  edit(c: Clickpoint): void {
    this.xActual = c.xPosition;
    this.yActual = c.yPosition;
    this.selectedRad = c.radius;
    this.selectedURL = '';
    this.idToSend = c.id;
    this.selectedLabel = c.label;
    this.editing = true;

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  calcFontSize(radius: number): number {
    return radius / 3;
  }

  isURL(str: string): boolean {
    return str.startsWith('http');
  }

  b64ToBlob(b64: string): Blob {
    let byteStr = atob(b64.split(',')[1]);
    let buffer = new ArrayBuffer(byteStr.length);
    let byteVals = new Uint8Array(buffer);

    for (let i = 0; i < byteStr.length; i++) {
      byteVals[i] = byteStr.charCodeAt(i);
    }

    return new Blob([buffer]);
  }
}
