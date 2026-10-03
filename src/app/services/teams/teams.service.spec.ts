// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BASE_PATH } from '../../generated/player-api';
import { TeamData } from '../../models/team-data';
import { TeamsService } from './teams.service';

const PLAYER_URL = 'http://player.test';

describe('TeamsService', () => {
  let http: HttpTestingController;

  afterEach(() => http?.verify());

  /**
   * Verifies: GetAllMyTeams GETs the caller's teams for a view from player.api and returns them.
   * Interacts with: HttpTestingController; player-api BASE_PATH token.
   * Data: view-1; one team in the response.
   */
  it("GETs the caller's teams in a view from player.api", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BASE_PATH, useValue: PLAYER_URL },
        TeamsService,
      ],
    });
    const service = TestBed.inject(TeamsService);
    http = TestBed.inject(HttpTestingController);
    const teams: TeamData[] = [
      { id: 'team-1', name: 'Blue', isMember: true, isPrimary: true },
    ];

    const result = firstValueFrom(service.GetAllMyTeams('view-1'));
    const req = http.expectOne(`${PLAYER_URL}/api/me/views/view-1/teams`);
    expect(req.request.method).toBe('GET');
    req.flush(teams);

    expect(await result).toEqual(teams);
  });
});
