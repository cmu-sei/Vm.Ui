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
import { VmsService } from '../../../generated/vm-api';
import { Machine } from '../../../models/machine';

@Component({
  selector: 'app-map-team-display',
  templateUrl: './map-team-display.component.html',
  styleUrls: ['./map-team-display.component.css']
})
export class MapTeamDisplayComponent implements OnInit {
  machines: Machine[];
  imageUrl: string;
  id: string;
  teamId: string;

  @Input() teamIdInput: string;
  @Input() mapIdInput: string;

  @Output() mapDeleted = new EventEmitter<void>();

  constructor(
    private vmService: VmsService,
    private route: ActivatedRoute,
    private router: Router
    ) { }

  ngOnInit(): void {
    console.log('Calling init in display component');
    this.machines = new Array<Machine>();
    if (this.teamIdInput === undefined) {
      this.route.params.subscribe(params => {
        this.teamId = params['teamId']
      })
    } else {
      this.teamId = this.teamIdInput;
    }
    
    this.getMapData();
  }

  ngOnChanges(): void {
    console.log('Changes found in display component');
    this.ngOnInit();
  }

  getMapData(): void {
    this.vmService.getMap(this.mapIdInput).subscribe(data => {
      this.id = data.id;
      for (let coord of data.coordinates) {
        this.machines.push(new Machine(coord.xPosition, coord.yPosition, coord.radius, coord.url, coord.id, coord.label));
      }
      this.imageUrl = data.imageUrl;
    });
  }

  back(): void {
    this.router.navigate(['../'], { relativeTo:this.route })
    .then(() => {
      window.location.reload();
    });
  }

  redirect(url: string): void {
    window.open(url)
  }
  
  calcFontSize(radius: number): number {
    return radius / 3;
  }
}
