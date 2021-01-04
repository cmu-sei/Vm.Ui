// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ComnSettingsService } from '@cmusei/crucible-common';

@Injectable()
export class FileService {
  private viewId: string;

  constructor(
    private http: HttpClient,
    private settings: ComnSettingsService,
    private router: Router
  ) {
    this.viewId = this.router.routerState.snapshot.root.firstChild.params[
      'viewId'
    ];
  }

  public uploadIso(isForAll: boolean, file: File) {
    const scope = isForAll ? 'view' : 'team';
    const payload: FormData = new FormData();
    payload.append('size', file.size.toString());
    payload.append('scope', scope);
    payload.append(file.name, file);
    return this.http.request(
      new HttpRequest(
        'POST',
        `${this.settings.settings.ApiUrl}/views/${this.viewId}/isos`,
        payload,
        { reportProgress: true }
      )
    );
  }
}
