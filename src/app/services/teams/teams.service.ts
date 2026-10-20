// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BASE_PATH } from '../../generated/player-api';
import { TeamData } from '../../models/team-data';

@Injectable()
export class TeamsService {
  private http = inject(HttpClient);

  playerApiUrl: string;

  constructor() {
    const basePath = inject(BASE_PATH);

    this.playerApiUrl = basePath;
  }

  public GetAllMyTeams(viewId: string): Observable<Array<TeamData>> {
    const url = `${this.playerApiUrl}/api/me/views/${viewId}/teams`;
    return this.http.get<Array<TeamData>>(url);
  }
}
