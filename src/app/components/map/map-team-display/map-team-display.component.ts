// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Clickpoint } from '../../../models/clickpoint';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { MapVmSelectComponent } from '../map-vm-select/map-vm-select.component';

@Component({
  selector: 'app-map-team-display',
  templateUrl: './map-team-display.component.html',
  styleUrls: ['./map-team-display.component.css'],
})
export class MapTeamDisplayComponent implements OnInit {
  machines: Observable<Clickpoint[]>;
  id: string;
  mapId: string;
  imageUrl: SafeUrl;
  mapInitialized: boolean;

  @Input() imageUrlInput: string;
  @Input() mapIdInput: string;

  @Output() mapSwitched = new EventEmitter<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vmMapsQuery: VmMapsQuery,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.mapId = this.mapIdInput;
    this.machines = this.vmMapsQuery.getMapCoordinates(this.mapId);

    this.vmMapsQuery.getById(this.mapId).subscribe((m) => {
      const url = m.imageUrl;
      // If this is a base64 string, this image was uploaded to the view. Get a blob from the b64 string
      // and use that to get an object url that will point to the image

      // Simple test for whether the string is an actual url. If not, it is b64 encoded.
      if (!this.isURL(url)) {
        const asBlob = this.b64ToBlob(url);
        const objUrl = window.URL.createObjectURL(asBlob);
        this.imageUrl = objUrl;
      } else {
        this.imageUrl = url;
      }
      this.mapInitialized = true;
    });
  }

  // Needed to facilitate switching between maps
  ngOnChanges(): void {
    this.ngOnInit();
  }

  back(): void {
    this.router.navigate(['../'], { relativeTo: this.route }).then(() => {
      window.location.reload();
    });
  }

  redirect(urls: string[]): void {
    const viewId = this.route.snapshot.params['viewId'];

    if (urls.length == 1) {
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const url = urls[0];
      // If the url is just a guid, we are redirecting to a map. This is a special case and will behave as if the user
      // selected the new map from the drop down. This approach works because the only maps available
      // to link to are other maps in the same view that the user can access. So given some map m that links to a map m'
      // we know that 1. m' is in this view and 2. the user can access m' (these conditions are the same for the maps in the drop down)
      if (url.match(guidRegex)) {
        this.mapSwitched.emit(url);
      } else if (url.startsWith('http')) {
        // If the URL starts with http, we assume it is a custom URL
        window.open(url);
      } else {
        // If neither a map or custom url was clicked, it must be a VM. Url is the name of the VM
        this.route.params.subscribe((params) => {
          const viewId = params['viewId'];
          window.open(`views/${viewId}/vms/${url}/console`);
        });
      }
    } else {
      this.dialog.open(MapVmSelectComponent, {
        data: { vms: urls, viewId: viewId }
      });
    }
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
