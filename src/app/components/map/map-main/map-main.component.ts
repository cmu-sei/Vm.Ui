/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { AfterViewChecked, ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { VmMap, VmsService } from '../../../generated/vm-api';
import { AddPointComponent } from '../add-point/add-point.component';
import { MapTeamDisplayComponent } from '../map-team-display/map-team-display.component';
import { MapComponent } from '../map.component';
import { NewMapComponent } from '../new-map/new-map.component';

@Component({
  selector: 'app-map-main',
  templateUrl: './map-main.component.html',
  styleUrls: ['./map-main.component.css']
})

export class MapMainComponent implements OnInit, AfterViewChecked {
  VmMaps: VmMap[];
  selected: VmMap;
  editMode: boolean;
  readMap: boolean;
  mapInitialized: boolean;
  teamId: string;
  viewId: string;
  build: boolean;
  mapId: string;
  editProps: boolean;
  creatingMap: boolean;

  @ViewChild(MapTeamDisplayComponent) displayChild: MapTeamDisplayComponent;
  @ViewChild(MapComponent) buildChild: MapComponent;
  @ViewChild(NewMapComponent) propertiesDialog: NewMapComponent;

  @ViewChild('newMapDialog') newMapDialog: TemplateRef<NewMapComponent>;
  @ViewChild('editPropsDialog') editPropsDialog: TemplateRef<NewMapComponent>;
  private dialogRef: MatDialogRef<NewMapComponent>;

  constructor(
    private vmsService: VmsService,
    private route: ActivatedRoute,
    private changeDetector: ChangeDetectorRef,
    private dialog: MatDialog
  ) { this.mapInitialized = false; }

  ngOnInit(): void {
    this.VmMaps = new Array<VmMap>();
    this.route.params.subscribe(params => {
      this.viewId = params['viewId']
    })
    this.getMaps();
  }

  ngAfterViewChecked() {
    this.changeDetector.detectChanges();
  }

  buildMap() {
    // this.build = true;
    this.creatingMap = true;
    this.dialogRef = this.dialog.open(this.newMapDialog);
  }

  async mapDeleted() {
    await this.getMaps();

    this.selected = undefined;
    this.goToMap();
  }

  async getMaps() {
    const dataPromise = this.vmsService.getViewMaps(this.viewId).toPromise();
    const data = await dataPromise;

    console.log('Length in getMaps: ' + data.length);

    this.VmMaps = data;
    if (data.length === 0) {
      this.readMap = false;
      this.selected = undefined;
    }
  }

  goToMap() {
    if (this.selected === undefined) {
      console.log('In go to map, selected undefined');
      this.readMap = false;
    } else {
      console.log('In go to map, selected is: ' + this.selected.name);
      this.teamId = this.selected.teamIds[0];
      this.mapId = this.selected.id;
      this.readMap = true;
    }
    this.build = false;
  }

  trackByMaps(index: number, item: VmMap): string {
    return item.id;
  }

  async delete() {
    this.vmsService.deleteMap(this.selected.id).subscribe(
      x => console.log('Got a next value: ' + x),
      err => console.log('Got an error: ' + err),
      async () => { console.log('Map deleted'); window.alert('Map Deleted!'); await this.mapDeleted(); }
    );
  }

  save() {
    this.buildChild.save();
    this.editMode = false;
  }

  mapInit(val: boolean) {
    this.mapInitialized = val;
  }

  editClicked() {
    this.editMode = !this.editMode;
    console.log('Edit mode: ' + this.editMode);
  }

  async mapCreated(id: string) {
    console.log('Emitted id: ' + id);
    this.mapId = id;

    this.build = false;
    this.readMap = true;
    this.editMode = true;
    
    console.log('Calling getMaps from mapCreated');
    await this.getMaps();
    
    console.log('Length: ' + this.VmMaps.length);
    this.selected = this.VmMaps.find(m => {
      console.log('Comparing ' + m.id + ' to ' + id);
      return m.id == id;
    })

    console.log('Before calling go to map, selected is: ' + this.selected);
    this.goToMap();

    this.dialogRef.close();
  }

  editProperties(): void {
    // this.editProps = true;
    this.creatingMap = false;
    this.dialogRef = this.dialog.open(this.editPropsDialog);
  }

  propertiesChanged(tuple: [string, string, string[]]): void {
    const name = tuple[0];
    const url = tuple[1];
    const ids = tuple[2];

    let payload = <VmMap> {
      coordinates: this.selected.coordinates,
      name: name,
      imageUrl: url,
      teamIds: ids
    }

    this.vmsService.updateMap(this.selected.id, payload).subscribe(
      (x) => console.log('Got a next value ' + x),
      () => window.alert('Error editing properties'),
      () => window.alert('Properties successfully saved!')
    )
    this.dialogRef.close();
  }
}