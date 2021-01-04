// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SimpleTeam, VmMap, VmsService } from '../../../generated/vm-api';
import { v4 as uuidv4 } from 'uuid';
import { VmMapsService } from '../../../state/vmMaps/vm-maps.service';

@Component({
  selector: 'app-new-map',
  templateUrl: './new-map.component.html',
  styleUrls: ['./new-map.component.css'],
})
export class NewMapComponent implements OnInit {
  teams: SimpleTeam[];
  form: FormGroup;

  @Input() viewId: string;
  @Input() creating: boolean;
  @Input() name: string;
  @Input() url: string;
  @Input() teamsInput: string[];

  @Output() mapCreated = new EventEmitter<string>();
  @Output() propertiesChanged = new EventEmitter<[string, string, string[]]>();

  constructor(
    private vmService: VmsService,
    private formBuilder: FormBuilder,
    private vmMapsService: VmMapsService
  ) {}

  ngOnInit(): void {
    this.getTeams();

    this.form = this.formBuilder.group({
      name: [this.name],
      imageURL: [this.url],
      teamIDs: [this.teamsInput],
    });
  }

  // Get the available teams within this view
  getTeams(): void {
    this.vmService.getTeams(this.viewId).subscribe((data) => {
      this.teams = data;
      console.log(this.teams);
    });
  }

  submit(): void {
    console.log('submit pressed');
    if (this.creating) {
      const mapId = uuidv4();
      console.log('Map ID: ' + mapId);
      // Save an empty map
      let payload = <VmMap>{
        coordinates: null,
        name: this.form.get('name').value as string,
        imageUrl: this.form.get('imageURL').value as string,
        teamIds: this.form.get('teamIDs').value as string[],
        id: mapId,
      };

      console.log(
        'Creating map assigned to view ' +
          this.viewId +
          ' with payload ' +
          payload
      );

      this.vmMapsService.add(this.viewId, payload);
      this.mapCreated.emit(mapId);
    } else {
      // Properties are being edited, emit the changes
      console.log('Editing properties');
      this.propertiesChanged.emit([
        this.form.get('name').value as string,
        this.form.get('imageURL').value as string,
        this.form.get('teamIDs').value as string[],
      ]);
    }
  }
}
