// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ComnSettingsService } from '@cmusei/crucible-common';
import {
  BulkPowerOperationResponse,
  PowerState,
  Vm,
  VmsService,
} from '../../generated/vm-api';
import { ApiStub } from '../../test-utils/api-stub';
import { VmService } from './vms.service';
import { VmsQuery } from './vms.query';
import { VmsStore } from './vms.store';

const API_URL = 'http://vm.test/api';

@Component({ template: '' })
class BlankComponent {}

function makeVm(id: string, extra: Partial<Vm> = {}): Vm {
  return {
    id,
    name: `vm-${id}`,
    powerState: PowerState.Off,
    teamIds: ['team-1'],
    ...extra,
  };
}

async function setup(
  url = '/views/view-1',
  overrides: { teamVms?: Vm[]; teamVmsError?: unknown } = {},
) {
  const okResponse: BulkPowerOperationResponse = { errors: {} };
  const vmsApi = {
    getTeamVms: vi.fn(() =>
      overrides.teamVmsError
        ? throwError(() => overrides.teamVmsError)
        : of(overrides.teamVms ?? []),
    ),
    bulkPowerOn: vi.fn(() => of(okResponse)),
    bulkPowerOff: vi.fn(() => of(okResponse)),
    bulkShutdown: vi.fn(() => of(okResponse)),
    bulkReboot: vi.fn(() => of(okResponse)),
    bulkRevert: vi.fn(() => of(okResponse)),
  } satisfies ApiStub<VmsService>;

  TestBed.configureTestingModule({
    providers: [
      // VmService reads viewId/teamId off the active child route when it is built,
      // so the real router is navigated before the service is injected.
      provideRouter([
        { path: 'views/:viewId', component: BlankComponent },
        { path: 'views/:viewName/:teamId/welder', component: BlankComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ComnSettingsService,
        useValue: { settings: { ApiUrl: API_URL } },
      },
      { provide: VmsService, useValue: vmsApi },
    ],
  });
  await RouterTestingHarness.create(url);

  return {
    service: TestBed.inject(VmService),
    store: TestBed.inject(VmsStore),
    query: TestBed.inject(VmsQuery),
    http: TestBed.inject(HttpTestingController),
    vmsApi,
  };
}

describe('VmService', () => {
  let http: HttpTestingController | undefined;

  afterEach(() => {
    http?.verify();
    http = undefined;
  });

  describe('route context', () => {
    /**
     * Verifies: the service captures the viewId of the active route when it is constructed.
     * Interacts with: real Router (RouterTestingHarness) and VmService constructor.
     * Data: navigation to /views/view-1, which has no teamId segment.
     */
    it('reads the viewId from the active route and leaves teamId unset on a view route', async () => {
      const { service } = await setup('/views/view-1');

      expect(service.viewId).toBe('view-1');
      expect(service.teamId).toBeUndefined();
    });

    /**
     * Verifies: on the welder route the teamId segment is captured as well.
     * Interacts with: real Router (RouterTestingHarness) and VmService constructor.
     * Data: navigation to /views/Exercise/team-9/welder.
     */
    it('reads the teamId from the welder route', async () => {
      const { service } = await setup('/views/Exercise/team-9/welder');

      expect(service.teamId).toBe('team-9');
    });
  });

  describe('store updates', () => {
    /**
     * Verifies: upsert applies only the given changes to a VM that is already in the store.
     * Interacts with: real VmsStore.upsert via VmService.upsert; VmsQuery.getEntity.
     * Data: stored VM 'a' powered off; upsert with a full VM payload but changes { powerState: On }.
     */
    it('upsert applies the changes to an existing VM and keeps its other fields', async () => {
      const { service, store, query } = await setup();
      store.set([makeVm('a', { name: 'original' })]);

      service.upsert(makeVm('a', { name: 'renamed' }), {
        powerState: PowerState.On,
      });

      expect(query.getEntity('a')).toMatchObject({
        name: 'original',
        powerState: PowerState.On,
      });
    });

    /**
     * Verifies: upsert inserts the full VM when the store does not have it yet (VmUpdated before VmCreated).
     * Interacts with: real VmsStore.upsert via VmService.upsert; VmsQuery.getEntity.
     * Data: empty store; upsert of VM 'b' with changes limited to powerState.
     */
    it('upsert inserts the whole VM, not just the changes, when it is missing', async () => {
      const { service, query } = await setup();
      const vm = makeVm('b', { name: 'new-vm', powerState: PowerState.On });

      service.upsert(vm, { powerState: PowerState.On });

      expect(query.getEntity('b')).toEqual(vm);
    });

    /**
     * Verifies: add does not overwrite a VM that is already in the store.
     * Interacts with: real VmsStore.add via VmService.add.
     * Data: stored VM 'a' powered on; add of a stale copy powered off.
     */
    it('add ignores a VM whose id is already stored', async () => {
      const { service, store, query } = await setup();
      store.set([makeVm('a', { powerState: PowerState.On })]);

      service.add(makeVm('a', { powerState: PowerState.Off }));

      expect(query.getEntity('a').powerState).toBe(PowerState.On);
    });

    /**
     * Verifies: update merges a partial change and remove deletes the entity.
     * Interacts with: real VmsStore.update/remove via VmService.
     * Data: stored VMs 'a' and 'b'; update 'a' name, remove 'b'.
     */
    it('update merges changes and remove deletes the VM', async () => {
      const { service, store, query } = await setup();
      store.set([makeVm('a'), makeVm('b')]);

      service.update('a', { name: 'changed' });
      service.remove('b');

      expect(query.getAll().map((v) => [v.id, v.name])).toEqual([
        ['a', 'changed'],
      ]);
    });
  });

  describe('GetViewVms()', () => {
    /**
     * Verifies: GetViewVms GETs the view's VM list with the flags as query params and replaces the store.
     * Interacts with: HttpTestingController; real VmsStore and VmsQuery.
     * Data: route view-1; includePersonal true, onlyMine false; store pre-seeded with a stale VM.
     */
    it('GETs the view VMs with the flags and replaces the store contents', async () => {
      const ctx = await setup();
      http = ctx.http;
      ctx.store.set([makeVm('stale')]);

      const result = firstValueFrom(ctx.service.GetViewVms(true, false));
      const req = http.expectOne(
        (r) => r.url === `${API_URL}/views/view-1/vms`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('includePersonal')).toBe('true');
      expect(req.request.params.get('onlyMine')).toBe('false');
      req.flush([makeVm('a'), makeVm('b')]);

      expect((await result).map((v) => v.id)).toEqual(['a', 'b']);
      expect(ctx.query.getAll().map((v) => v.id)).toEqual(['a', 'b']);
    });

    /**
     * Verifies: a failed GetViewVms leaves the store as it was and surfaces the error.
     * Interacts with: HttpTestingController (500); real VmsStore.
     * Data: store seeded with VM 'a'; server error flushed.
     */
    it('keeps the store unchanged and rejects when the request fails', async () => {
      const ctx = await setup();
      http = ctx.http;
      ctx.store.set([makeVm('a')]);

      const result = firstValueFrom(ctx.service.GetViewVms(true, true));
      http
        .expectOne((r) => r.url === `${API_URL}/views/view-1/vms`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      await expect(result).rejects.toMatchObject({ status: 500 });
      expect(ctx.query.getAll().map((v) => v.id)).toEqual(['a']);
    });
  });

  describe('GetTeamVms()', () => {
    /**
     * Verifies: GetTeamVms without a teamId falls back to the route teamId and stores the result.
     * Interacts with: stubbed generated VmsService.getTeamVms; real VmsStore and VmsQuery.
     * Data: welder route with team-9; API returns VMs 'a' and 'b'.
     */
    it('uses the route teamId when none is passed and replaces the store', async () => {
      const { service, query, vmsApi } = await setup(
        '/views/Exercise/team-9/welder',
        { teamVms: [makeVm('a'), makeVm('b')] },
      );

      await firstValueFrom(service.GetTeamVms(true, false));

      expect(vmsApi.getTeamVms).toHaveBeenCalledWith(
        'team-9',
        null,
        true,
        false,
      );
      expect(query.getAll().map((v) => v.id)).toEqual(['a', 'b']);
    });

    /**
     * Verifies: an explicit teamId wins over the route teamId.
     * Interacts with: stubbed generated VmsService.getTeamVms.
     * Data: welder route with team-9; call passes team-2.
     */
    it('passes an explicit teamId through', async () => {
      const { service, vmsApi } = await setup('/views/Exercise/team-9/welder');

      await firstValueFrom(service.GetTeamVms(false, true, 'team-2'));

      expect(vmsApi.getTeamVms).toHaveBeenCalledWith(
        'team-2',
        null,
        false,
        true,
      );
    });

    /**
     * Verifies: a failing getTeamVms leaves the store untouched and surfaces the error.
     * Interacts with: stubbed generated VmsService.getTeamVms (throwError); real VmsStore.
     * Data: store seeded with VM 'a'; API error { status: 403 }.
     */
    it('keeps the store unchanged when the API errors', async () => {
      const { service, store, query } = await setup('/views/view-1', {
        teamVmsError: { status: 403 },
      });
      store.set([makeVm('a')]);

      await expect(
        firstValueFrom(service.GetTeamVms(true, false, 'team-1')),
      ).rejects.toEqual({ status: 403 });
      expect(query.getAll().map((v) => v.id)).toEqual(['a']);
    });
  });

  describe('GetViewVmsByName()', () => {
    /**
     * Verifies: GetViewVmsByName GETs the named VMs for the given view and does not touch the store.
     * Interacts with: HttpTestingController; real VmsQuery.
     * Data: view-2, name 'web-01'; store seeded with VM 'a'.
     */
    it('GETs VMs by name without writing to the store', async () => {
      const ctx = await setup();
      http = ctx.http;
      ctx.store.set([makeVm('a')]);

      const result = firstValueFrom(
        ctx.service.GetViewVmsByName('view-2', 'web-01'),
      );
      http
        .expectOne(`${API_URL}/views/view-2/vms?name=web-01`)
        .flush([makeVm('w')]);

      expect((await result).map((v) => v.id)).toEqual(['w']);
      expect(ctx.query.getAll().map((v) => v.id)).toEqual(['a']);
    });

    /**
     * Verifies: the VM name is concatenated into the URL without encoding.
     * Interacts with: HttpTestingController.
     * Data: name 'web&db #2'.
     */
    it('does not encode the VM name in the query string', async () => {
      const ctx = await setup();
      http = ctx.http;

      ctx.service.GetViewVmsByName('view-1', 'web&db #2').subscribe();

      const req = http.expectOne(`${API_URL}/views/view-1/vms?name=web&db #2`);
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
    });
  });

  describe('power operations', () => {
    type PowerMethod = keyof Pick<
      VmService,
      'powerOn' | 'powerOff' | 'shutdown' | 'reboot' | 'revert'
    >;
    type BulkEndpoint = keyof Pick<
      VmsService,
      | 'bulkPowerOn'
      | 'bulkPowerOff'
      | 'bulkShutdown'
      | 'bulkReboot'
      | 'bulkRevert'
    >;

    /**
     * Verifies: each bulk power method wraps the ids in a BulkPowerOperation for its matching endpoint and calls no other.
     * Interacts with: stubbed generated VmsService bulk* methods.
     * Data: ids ['a', 'b']; one row per power method.
     */
    it.each<[PowerMethod, BulkEndpoint]>([
      ['powerOn', 'bulkPowerOn'],
      ['powerOff', 'bulkPowerOff'],
      ['shutdown', 'bulkShutdown'],
      ['reboot', 'bulkReboot'],
      ['revert', 'bulkRevert'],
    ])('%s sends the ids to %s', async (method, endpoint) => {
      const { service, vmsApi } = await setup();
      const ids = ['a', 'b'];

      await firstValueFrom(service[method](ids));

      expect(vmsApi[endpoint]).toHaveBeenCalledExactlyOnceWith({ ids });
      const others = (Object.keys(vmsApi) as Array<keyof typeof vmsApi>).filter(
        (k) => k.startsWith('bulk') && k !== endpoint,
      );
      for (const other of others) {
        expect(vmsApi[other]).not.toHaveBeenCalled();
      }
    });
  });
});
