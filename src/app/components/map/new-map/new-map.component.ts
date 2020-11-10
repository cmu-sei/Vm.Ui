/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SimpleTeam, VmMap, VmsService } from '../../../generated/vm-api';

@Component({
  selector: 'app-new-map',
  templateUrl: './new-map.component.html',
  styleUrls: ['./new-map.component.css']
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
  ) { }

  ngOnInit(): void {
    console.log('In new map component');
    this.getTeams();

    this.form = this.formBuilder.group({
      name: [this.name],
      imageURL: [this.url],
      teamIDs: [this.teamsInput],
    });
  }

  getTeams(): void {
    this.vmService.getTeams(this.viewId).subscribe(data => {
      this.teams = data;
      console.log(this.teams);
    })
  }

  submit(): void {
    console.log('submit pressed');
    console.log('Creating: ' + this.creating + ' type: ' + typeof(this.creating));
    if (this.creating) {
      // Save an empty map
      let payload = <VmMap> {
        coordinates: null,
        name: this.form.get('name').value as string,
        imageUrl: this.form.get('imageURL').value as string,
        teamIds: null
      }
      
      console.log('Creating map assigned to view ' + this.viewId + ' with payload ' + payload);
      let mapId;
      this.vmService.createMap(this.viewId, payload).subscribe(
        (x) => {console.log('Got a next value ' + x); mapId = x.id },
        () => window.alert('Error creating new map'),
        () => { window.alert('Map created successfully!'), this.mapCreated.emit(mapId); }
      )
    } else {
      console.log('Editing properties');
      this.propertiesChanged.emit([this.form.get('name').value as string, this.form.get('imageURL').value as string, 
        this.form.get('teamIDs').value as string[]])
    }
  }
}
