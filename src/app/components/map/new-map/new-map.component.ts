// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { SimpleTeam, VmMap, VmsService } from '../../../generated/vm-api';
import { FileModel, FileService } from '../../../generated/player-api';
import { v4 as uuidv4 } from 'uuid';
import { VmMapsService } from '../../../state/vmMaps/vm-maps.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { NgFor } from '@angular/common';
import { MatSelect } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatDialogTitle } from '@angular/material/dialog';

@Component({
  selector: 'app-new-map',
  templateUrl: './new-map.component.html',
  styleUrls: ['./new-map.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    NgFor,
    MatOption,
    MatButton,
  ],
})
export class NewMapComponent implements OnInit {
  teams: SimpleTeam[];
  form: UntypedFormGroup;
  images: Image[];

  @Input() viewId: string;
  @Input() creating: boolean;
  @Input() name: string;
  @Input() url: string;
  @Input() teamsInput: string[];

  @Output() mapCreated = new EventEmitter<string>();
  @Output() propertiesChanged = new EventEmitter<[string, string, string[]]>();

  constructor(
    private vmService: VmsService,
    private formBuilder: UntypedFormBuilder,
    private vmMapsService: VmMapsService,
    private fileService: FileService,
  ) {}

  ngOnInit(): void {
    this.getTeams();
    this.getImages();

    this.form = this.formBuilder.group({
      name: [this.name],
      imageURL: [this.url],
      viewImage: [''],
      teamIDs: [this.teamsInput],
    });
  }

  // Get the available teams within this view
  getTeams(): void {
    this.vmService.getTeams(this.viewId).subscribe((data) => {
      this.teams = data;
    });
  }

  // Get the available image files within this view
  getImages(): void {
    this.images = new Array<Image>();

    this.fileService.getViewFiles(this.viewId).subscribe((data) => {
      for (let fp of data.filter((f) => this.isImage(f.name))) {
        this.getImageBlob(fp.id).subscribe((blob) => {
          this.images.push(new Image(fp, blob));
        });
      }
    });
  }

  submit(): void {
    // Images uploaded to this view are given precedence if two URLs are specified

    // Get name and assigned teams
    const name = this.form.get('name').value as string;
    const teams = this.form.get('teamIDs').value as string[];

    const selectUsed = (this.form.get('viewImage').value as string) != '';
    const selectBlob = this.form.get('viewImage').value as Blob;

    const mapId = uuidv4();

    // If a image that was uploaded to the view was selected, convert the Blob to base64
    // We can't just use window.URL.createObjectURL() becuase that URL is only valid inside this document
    // So by encoding the image as base64, other components can decode it back into a blob and then generate an object URL
    let reader = new FileReader();
    // Allow us to access instance variables and methods inside the function literal
    const self = this;
    reader.onload = function () {
      const asB64 = reader.result.toString();

      if (self.creating) {
        const urlToSave = selectUsed
          ? asB64
          : (self.form.get('imageURL').value as string);

        self.saveMap(name, urlToSave, teams, mapId);
      } else {
        // Figure out whether to emit the url of an external image or an uploaded one
        const urlToEmit = selectUsed
          ? asB64
          : (self.form.get('imageURL').value as string);

        self.propertiesChanged.emit([name, urlToEmit, teams]);
      }
    };

    if (selectUsed) {
      reader.readAsDataURL(selectBlob);
    } else if (this.creating) {
      this.saveMap(
        name,
        this.form.get('imageURL').value as string,
        teams,
        mapId,
      );
    } else {
      this.propertiesChanged.emit([
        name,
        this.form.get('imageURL').value as string,
        teams,
      ]);
    }
  }

  // Get the blob representing an image file in this view
  getImageBlob(id: string): Observable<Blob> {
    return this.fileService.download(id).pipe(
      map((data) => {
        return data;
      }),
    );
  }

  saveMap(
    name: string,
    imageUrl: string,
    teams: string[],
    mapId: string,
  ): void {
    // Save an empty map (no coordinates)
    let payload = <VmMap>{
      coordinates: null,
      name: name,
      imageUrl: imageUrl,
      teamIds: teams,
      id: mapId,
    };

    this.vmMapsService.add(this.viewId, payload);
    this.mapCreated.emit(mapId);
  }

  // Returns whether this file is an image. This is determined by the file's extension.
  private isImage(file: string): boolean {
    return (
      file.endsWith('.png') ||
      file.endsWith('.jpg') ||
      file.endsWith('.jpeg') ||
      file.endsWith('.gif')
    );
  }
}

class Image {
  file: FileModel;
  blob: Blob;

  constructor(file: FileModel, blob: Blob) {
    this.file = file;
    this.blob = blob;
  }
}
