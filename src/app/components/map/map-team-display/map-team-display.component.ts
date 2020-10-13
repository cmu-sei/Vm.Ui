/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VmMap, VmsService } from '../../../generated/vm-api';
import { Machine } from '../../../models/machine';

@Component({
  selector: 'app-map-team-display',
  templateUrl: './map-team-display.component.html',
  styleUrls: ['./map-team-display.component.css']
})
export class MapTeamDisplayComponent implements OnInit {
  machines: Machine[];
  teamId: string;
  imageUrl: string;
  id: string;

  constructor(
    private vmService: VmsService,
    private route: ActivatedRoute,
    private router: Router
    ) { }

  ngOnInit(): void {
    this.machines = new Array<Machine>();
    this.route.params.subscribe(params => {
      this.teamId = params['teamId']
    })
    this.getMapData();
  }

  getMapData(): void {
    this.vmService.getTeamMap(this.teamId).subscribe(data => {
      this.id = data.id;
      for (let coord of data.coordinates) {
        this.machines.push(new Machine(coord.xPosition, coord.yPosition, coord.radius, coord.url, -1));
      }
      this.imageUrl = data.imageUrl;
    });
  }

  deleteMap(): void {
    this.vmService.deleteMap(this.id).subscribe(
      x => console.log('Got a next value: ' + x),
      err => console.log('Got an error: ' + err),
      () => console.log('Got a complete notification')
    );
    
    this.back();
  }

  back(): void {
    this.router.navigate(['../..'], { relativeTo:this.route });
  }

  redirect(url): void {
    window.open(url, '_blank')
  }
}

