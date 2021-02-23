import { Component, Inject, Input, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'map-vm-select',
  templateUrl: './map-vm-select.component.html',
  styleUrls: ['./map-vm-select.component.scss']
})
export class MapVmSelectComponent implements OnInit {

  public selected: string[];

  constructor(
    public route: ActivatedRoute,
    @Inject(MAT_DIALOG_DATA) public data: { vms: string[], viewId: string }
  ) { }

  ngOnInit(): void {
  }

  redirect() {
    for (let vm of this.selected) {
      window.open(`views/${this.data.viewId}/vms/${vm}/console`, '_blank');
    }
  }

}
