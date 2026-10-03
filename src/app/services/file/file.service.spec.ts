// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, afterEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { FileService } from './file.service';

const API_URL = 'http://vm.test/api';

@Component({ template: '' })
class BlankComponent {}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      // FileService reads the viewId off the active child route when it is built.
      provideRouter([{ path: 'views/:viewId', component: BlankComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ComnSettingsService,
        useValue: { settings: { ApiUrl: API_URL } },
      },
      FileService,
    ],
  });
  await RouterTestingHarness.create('/views/view-1');
  return {
    service: TestBed.inject(FileService),
    http: TestBed.inject(HttpTestingController),
  };
}

const iso = () => new File(['data'], 'tools.iso');

describe('FileService.uploadIso()', () => {
  let http: HttpTestingController | undefined;

  afterEach(() => {
    http?.verify();
    http = undefined;
  });

  /**
   * Verifies: a team-scoped upload POSTs the file, its size, the scope and each team id, with progress events on.
   * Interacts with: HttpTestingController; real Router (route viewId).
   * Data: 4-byte tools.iso, scope 'team', teamIds [team-1, team-2], no explicit viewId.
   */
  it('posts a team upload with each team id to the routed view', async () => {
    const ctx = await setup();
    http = ctx.http;

    ctx.service.uploadIso(iso(), 'team', ['team-1', 'team-2']).subscribe();

    const req = http.expectOne(`${API_URL}/views/view-1/isos`);
    const body = req.request.body as FormData;
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBe(true);
    expect(body.get('size')).toBe('4');
    expect(body.get('scope')).toBe('team');
    expect(body.getAll('teamIds')).toEqual(['team-1', 'team-2']);
    expect((body.get('tools.iso') as File).name).toBe('tools.iso');
    req.flush({});
  });

  /**
   * Verifies: a view-scoped upload sends no team ids, and an explicit viewId overrides the route.
   * Interacts with: HttpTestingController.
   * Data: scope 'view', teamIds [team-1] (ignored), viewId view-2.
   */
  it('omits team ids for a view upload and honours an explicit view', async () => {
    const ctx = await setup();
    http = ctx.http;

    ctx.service.uploadIso(iso(), 'view', ['team-1'], 'view-2').subscribe();

    const req = http.expectOne(`${API_URL}/views/view-2/isos`);
    const body = req.request.body as FormData;
    expect(body.get('scope')).toBe('view');
    expect(body.getAll('teamIds')).toEqual([]);
    req.flush({});
  });

  /**
   * Verifies: a team upload with no team ids sends none, leaving vm.api to use the caller's primary team.
   * Interacts with: HttpTestingController.
   * Data: scope 'team', teamIds undefined.
   */
  it('sends no team ids when none are given', async () => {
    const ctx = await setup();
    http = ctx.http;

    ctx.service.uploadIso(iso(), 'team').subscribe();

    const req = http.expectOne(`${API_URL}/views/view-1/isos`);
    expect((req.request.body as FormData).getAll('teamIds')).toEqual([]);
    req.flush({});
  });
});
