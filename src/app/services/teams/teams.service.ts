// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Observable } from 'rxjs';
import { TeamData } from '../../models/team-data';

@Injectable()
export class TeamsService {
  constructor(
    private http: HttpClient,
    private settings: ComnSettingsService
  ) {}

  public GetAllMyTeams(viewId: string): Observable<Array<TeamData>> {
    const url = `${this.settings.settings.ApiPlayerUrl}/api/me/views/${viewId}/teams`;
    return this.http.get<Array<TeamData>>(url);
  }
}
