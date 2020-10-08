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
        this.machines.push(new Machine(coord.xPosition, coord.yPosition, coord.radius, coord.url));
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
