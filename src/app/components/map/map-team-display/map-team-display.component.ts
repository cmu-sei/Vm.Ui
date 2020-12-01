/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Machine } from '../../../models/machine';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';

@Component({
  selector: 'app-map-team-display',
  templateUrl: './map-team-display.component.html',
  styleUrls: ['./map-team-display.component.css'],
})
export class MapTeamDisplayComponent implements OnInit {
  machines: Observable<Machine[]>;
  id: string;
  mapId: string;
  imageUrl: string;
  mapInitialized: boolean;

  @Input() imageUrlInput: string;
  @Input() mapIdInput: string;

  @Output() mapSwitched = new EventEmitter<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vmMapsQuery: VmMapsQuery,
  ) {}

  ngOnInit() {
    this.mapId = this.mapIdInput;
    this.machines = this.vmMapsQuery.getMapCoordinates(this.mapId);
    this.imageUrl = this.imageUrlInput;
    this.mapInitialized = true;
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

  redirect(url: string): void {
    console.log(url);
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    // If the url is just a guid, we are redirecting to a map. This is a special case and will behave as if the user
    // selected the new map from the drop down. This approach works because the only maps available
    // to link to are other maps in the same view that the user can access. So given some map m that links to a map m'
    // we know that 1. m' is in this view and 2. the user can access m' (these conditions are the same for the maps in the drop down)
    if (url.match(guidRegex)) {
      console.log('Map clicked');
      this.mapSwitched.emit(url);
    } else {
      console.log('Non map clicked');
      window.open(url);
    }
  }

  calcFontSize(radius: number): number {
    return radius / 3;
  }
}
