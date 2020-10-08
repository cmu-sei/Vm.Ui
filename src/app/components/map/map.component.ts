import { AfterViewInit, Component, ElementRef, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Machine } from '../../models/machine'
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddPointComponent } from './add-point/add-point.component';
import { Coordinate, VmMap, VmsService } from '../../generated/vm-api';
import { core } from '@angular/compiler';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  machines: Machine[];
  viewId: string;
  mapInitialzed: boolean;
  form: FormGroup;
  teamID: string;
  name: string;
  imageURL: string;

  @Input() xActual: number;
  @Input() yActual: number;

  @ViewChild('addPointDialog') addPointDialog: TemplateRef<AddPointComponent>;
  private dialogRef: MatDialogRef<AddPointComponent>;

  constructor(
    private dialog: MatDialog,
    private vmService: VmsService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder
    ) { }

  ngOnInit(): void {
    this.machines = new Array<Machine>();
    this.route.params.subscribe(params => {
      this.viewId = params['viewId'];
    });
    this.mapInitialzed = false;
    this.form = this.formBuilder.group({
      name: [''],
      imageURL: [''],
      teamID: [''],
    });
  }

  initMap(): void {
    this.teamID = this.form.get('teamID').value;
    this.name = this.form.get('name').value;
    this.imageURL = this.form.get('imageURL').value;
    this.mapInitialzed = true;
  }

  redirect(url): void {
    window.open(url, '_blank')
  }

  append(event): void {
    // Get the offsets relative to the image. Note that this assumes a 100x100 image
    let target = event.target;
    let width = target.getBoundingClientRect().width;
    this.xActual = (100 * event.offsetX) / width;
    let height = target.getBoundingClientRect().height;
    this.yActual = (100 * event.offsetY) / height;

    this.dialogRef = this.dialog.open(this.addPointDialog);
  }

  receiveMachine(machine) {
    console.log('In receive');
    this.machines.push(machine);
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
        url: machine.url
      }
      coords.push(coord);
      let payload = <VmMap>{
        coordinates: coords,
        name: this.name,
        imageUrl: this.imageURL,
        teamIds: this.teamID == '' ? null : [this.teamID]
      }

      console.log(JSON.stringify(payload))

      this.vmService.createMap(this.viewId, payload).subscribe(
        x => console.log('Got a next value: ' + x),
        err => console.log('Got an error: ' + err),
        () => console.log('Got a complete notification')
      );
    }
  }
}
