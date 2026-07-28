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
    private router: Router,
  ) {
    this.viewId =
      this.router.routerState.snapshot.root.firstChild.params['viewId'];
  }

  // Upload a file (converted to an ISO server-side if needed) to one or more targets.
  //  - scope 'view': made available to the whole View (requires UploadViewIsos).
  //  - scope 'team': written to each id in teamIds, or the caller's primary team when teamIds is empty.
  // viewId defaults to the route-derived View when not supplied.
  public uploadIso(
    file: File,
    scope: 'view' | 'team',
    teamIds?: string[],
    viewId?: string,
  ) {
    const payload: FormData = new FormData();
    payload.append('size', file.size.toString());
    payload.append('scope', scope);
    if (scope === 'team') {
      (teamIds ?? []).forEach((id) => payload.append('teamIds', id));
    }
    payload.append(file.name, file);
    return this.http.request(
      new HttpRequest(
        'POST',
        `${this.settings.settings.ApiUrl}/views/${viewId ?? this.viewId}/isos`,
        payload,
        { reportProgress: true },
      ),
    );
  }
}
