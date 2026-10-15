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
import { Router } from '@angular/router';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { unstubbed } from '../../test-utils/unstubbed';
import { AutoDeployService } from './auto-deploy.service';

const DEPLOY_URL = 'http://deploy.test';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { DeployApiUrl: DEPLOY_URL },
        } satisfies Pick<ComnSettingsService, 'settings'>,
      },
      // Injected by the constructor but never used by the service.
      unstubbed(Router),
      AutoDeployService,
    ],
  });
  return {
    service: TestBed.inject(AutoDeployService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AutoDeployService', () => {
  let http: HttpTestingController | undefined;

  afterEach(() => {
    http?.verify();
    http = undefined;
  });

  /**
   * Verifies: getDeploymentForView GETs the view's workstation status from the deploy API and returns the response.
   * Interacts with: HttpTestingController; ComnSettingsService (DeployApiUrl).
   * Data: view-1; the API reports a configured default template and room to deploy.
   */
  it("GETs a view's workstation status from the deploy API", async () => {
    const ctx = setup();
    http = ctx.http;
    const status = { DefaultTemplateConfigured: true, RoomFull: false };

    const result = firstValueFrom(ctx.service.getDeploymentForView('view-1'));
    const req = http.expectOne(`${DEPLOY_URL}/views/view-1/workstations`);
    expect(req.request.method).toBe('GET');
    req.flush(status);

    expect(await result).toEqual(status);
  });

  /**
   * Verifies: deployToView POSTs an empty body to the view's workstations on the deploy API and returns the response.
   * Interacts with: HttpTestingController; ComnSettingsService (DeployApiUrl).
   * Data: view-1; the API answers with an empty object.
   */
  it("POSTs a deployment to a view's workstations on the deploy API", async () => {
    const ctx = setup();
    http = ctx.http;
    const deployment = {};

    const result = firstValueFrom(ctx.service.deployToView('view-1'));
    const req = http.expectOne(`${DEPLOY_URL}/views/view-1/workstations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(deployment);

    expect(await result).toEqual(deployment);
  });
});
