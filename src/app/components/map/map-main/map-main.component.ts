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
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { VmMap, VmsService } from '../../../generated/vm-api';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { VmMapsService } from '../../../state/vmMaps/vm-maps.service';
import { MapTeamDisplayComponent } from '../map-team-display/map-team-display.component';
import { MapComponent } from '../map.component';
import { NewMapComponent } from '../new-map/new-map.component';

@Component({
  selector: 'app-map-main',
  templateUrl: './map-main.component.html',
  styleUrls: ['./map-main.component.css'],
})
export class MapMainComponent implements OnInit, AfterViewChecked {
  selected: VmMap;
  editMode: boolean;
  readMap: boolean;
  mapInitialized: boolean;
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
  maps: Observable<VmMap[]>;

  constructor(
    private vmsService: VmsService,
    private route: ActivatedRoute,
    private changeDetector: ChangeDetectorRef,
    private dialog: MatDialog,
    private vmMapsService: VmMapsService,
    private vmMapQuery: VmMapsQuery,
  ) {
    this.mapInitialized = false;
  }

  ngOnInit(): void {
    console.log('Top of on init');
    this.vmMapsService.get();

    this.maps = this.route.params.pipe(
      switchMap((params) => {
        console.log('In switch map');
        this.viewId = params['viewId']
        return this.vmMapQuery.getByViewId(this.viewId);
      })
    );
  }

  ngAfterViewChecked() {
    this.changeDetector.detectChanges();
  }

  buildMap() {
    this.creatingMap = true;
    this.dialogRef = this.dialog.open(this.newMapDialog);
  }

  goToMap() {
    if (this.selected === undefined) {
      console.log('In go to map, selected undefined');
      this.readMap = false;
    } else {
      console.log('In go to map, selected is: ' + this.selected.name);
      this.mapId = this.selected.id;
      this.readMap = true;
    }
    this.build = false;
  }

  // Track changes in the map select by map IDs
  trackByMaps(item: VmMap): string {
    return item.id;
  }

  delete() {
    this.vmMapsService.remove(this.selected.id);
    this.selected = undefined;
    this.goToMap();
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

  mapCreated(id: string) {
    console.log('Emitted id: ' + id);
    this.mapId = id;

    this.build = false;
    this.readMap = true;
    this.editMode = true;

    this.vmMapQuery.getById(id).subscribe(m => {
      this.selected = m;

      console.log('Before calling go to map, selected is: ' + this.selected);
      this.goToMap();
  
      this.dialogRef.close();
    });
  }

  editProperties(): void {
    this.creatingMap = false;
    this.dialogRef = this.dialog.open(this.editPropsDialog);
  }

  propertiesChanged(tuple: [string, string, string[]]) {
    const name = tuple[0];
    const url = tuple[1];
    const ids = tuple[2];
    const id = this.selected.id;

    let payload = <VmMap>{
      coordinates: this.selected.coordinates,
      name: name,
      imageUrl: url,
      teamIds: ids,
    };

    this.vmMapsService.update(id, payload);

    this.vmMapQuery.getById(id).subscribe(m => {
      this.selected = m;
      this.buildChild.ngOnInit();
      this.dialogRef.close();
    });
  }

  // User clicked a clickpoint that points to a map
  redirectToMap(id: string) {
    this.vmMapQuery.getById(id).subscribe(m => {
      this.selected = m;
      this.goToMap();
    });
  }
}
