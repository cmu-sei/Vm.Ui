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
import { ComnSettingsService } from '@cmusei/crucible-common';
import { WelderService } from './welder.service';

const WELDER_URL = 'http://welder.test';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { WelderUrl: WELDER_URL },
        } satisfies Pick<ComnSettingsService, 'settings'>,
      },
      WelderService,
    ],
  });
  return {
    service: TestBed.inject(WelderService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('WelderService', () => {
  let http: HttpTestingController | undefined;

  afterEach(() => {
    http?.verify();
    http = undefined;
  });

  /**
   * Verifies: getDeploymentForView GETs the named view's deployment from Welder and returns the response.
   * Interacts with: HttpTestingController; ComnSettingsService (WelderUrl).
   * Data: view name 'Exercise-A'; one workstation in the response.
   */
  it("GETs a view's deployment from Welder by view name", async () => {
    const ctx = setup();
    http = ctx.http;
    const deployment = [{ name: 'ws-1', status: 'Deployed' }];

    const result = firstValueFrom(
      ctx.service.getDeploymentForView('Exercise-A'),
    );
    const req = http.expectOne(`${WELDER_URL}/api/Exercise-A`);
    expect(req.request.method).toBe('GET');
    req.flush(deployment);

    expect(await result).toEqual(deployment);
  });

  /**
   * Verifies: deployToView POSTs an empty body for the named view to Welder and returns the response.
   * Interacts with: HttpTestingController; ComnSettingsService (WelderUrl).
   * Data: view name 'Exercise-A'; Welder answers with a confirmation message.
   */
  it('POSTs a deployment for a view name to Welder', async () => {
    const ctx = setup();
    http = ctx.http;
    const queued = { message: 'queued' };

    const result = firstValueFrom(ctx.service.deployToView('Exercise-A'));
    const req = http.expectOne(`${WELDER_URL}/api/Exercise-A`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(queued);

    expect(await result).toEqual(queued);
  });

  /**
   * Verifies: getQueueSize GETs the deployment queue from Welder and returns the response.
   * Interacts with: HttpTestingController; ComnSettingsService (WelderUrl).
   * Data: Welder reports a queue of 5.
   */
  it('GETs the deployment queue size from Welder', async () => {
    const ctx = setup();
    http = ctx.http;

    const result = firstValueFrom(ctx.service.getQueueSize());
    const req = http.expectOne(`${WELDER_URL}/queue`);
    expect(req.request.method).toBe('GET');
    req.flush(5);

    expect(await result).toBe(5);
  });
});
