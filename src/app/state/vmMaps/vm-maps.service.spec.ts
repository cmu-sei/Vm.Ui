// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { VmMap, VmsService } from '../../generated/vm-api';
import { ApiStub } from '../../test-utils/api-stub';
import { recordEmissions } from '../../test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from '../../test-utils/unhandled-rx-errors';
import { VmMapsQuery } from './vm-maps.query';
import { VmMapsService } from './vm-maps.service';
import { VmMapsStore } from './vm-maps.store';

function makeMap(id: string, extra: Partial<VmMap> = {}): VmMap {
  return {
    id,
    viewId: 'view-1',
    name: `Map ${id}`,
    imageUrl: 'http://img.test/map.png',
    coordinates: [],
    teamIds: ['team-1'],
    ...extra,
  };
}

type MapsApi = {
  getAllMaps: () => Observable<VmMap[]>;
  getViewMaps: (viewId: string) => Observable<VmMap[]>;
  getTeamMap: (teamId: string) => Observable<VmMap>;
  createMap: (viewId: string, map: VmMap) => Observable<VmMap>;
  updateMap: (id: string, map: Partial<VmMap>) => Observable<VmMap>;
  deleteMap: (id: string) => Observable<unknown>;
};

function setup(api: Partial<MapsApi> = {}) {
  const mapsApi = {
    getAllMaps: vi.fn(api.getAllMaps ?? (() => of([]))),
    getViewMaps: vi.fn(api.getViewMaps ?? (() => of([]))),
    getTeamMap: vi.fn(api.getTeamMap ?? (() => of(makeMap('team-map')))),
    createMap: vi.fn(api.createMap ?? ((_v: string, m: VmMap) => of(m))),
    updateMap: vi.fn(
      api.updateMap ?? ((id: string, m: Partial<VmMap>) => of({ ...m, id })),
    ),
    deleteMap: vi.fn(api.deleteMap ?? (() => of(null))),
  } satisfies ApiStub<VmsService>;
  TestBed.configureTestingModule({
    providers: [{ provide: VmsService, useValue: mapsApi }],
  });
  return {
    service: TestBed.inject(VmMapsService),
    store: TestBed.inject(VmMapsStore),
    query: TestBed.inject(VmMapsQuery),
    mapsApi,
  };
}

describe('VmMapsService', () => {
  describe('getViewMaps()', () => {
    /**
     * Verifies: getViewMaps flags loading while the request is in flight, then stores the maps and clears loading.
     * Interacts with: stubbed VmsService.getViewMaps (Subject); real VmMapsStore and VmMapsQuery.
     * Data: view-1; response with maps 'a' and 'b' pushed after the call.
     */
    it('sets loading during the request, then stores the maps', () => {
      const response = new Subject<VmMap[]>();
      const { service, query, mapsApi } = setup({
        getViewMaps: () => response,
      });
      service.unload();
      const loading = recordEmissions(query.selectLoading());

      service.getViewMaps('view-1');
      expect(loading).toEqual([false, true]);

      response.next([makeMap('a'), makeMap('b')]);

      expect(mapsApi.getViewMaps).toHaveBeenCalledWith('view-1');
      expect(loading).toEqual([false, true, false]);
      expect(query.getAll().map((m) => m.id)).toEqual(['a', 'b']);
    });

    /**
     * Verifies: a 404 (view not found) empties the store and clears loading without raising an error.
     * Interacts with: stubbed VmsService.getViewMaps (throwError 404); real store/query; captureUnhandledRxErrors.
     * Data: store pre-seeded with map 'old'; API error { status: 404 }.
     */
    it('treats a 404 as "no maps": empties the store and clears loading', async () => {
      const unhandled = captureUnhandledRxErrors();
      const { service, store, query } = setup({
        getViewMaps: () => throwError(() => ({ status: 404 })),
      });
      store.set([makeMap('old')]);

      service.getViewMaps('missing-view');
      await flush();

      expect(query.getAll()).toEqual([]);
      expect(query.getValue().loading).toBe(false);
      expect(unhandled).toEqual([]);
    });

    /**
     * Verifies: any other error clears loading, keeps the existing maps, and is re-thrown to the global handler.
     * Interacts with: stubbed VmsService.getViewMaps (throwError 500); captureUnhandledRxErrors.
     * Data: store pre-seeded with map 'old'; API error { status: 500 }.
     */
    it('re-throws other errors after clearing loading and keeps the stored maps', async () => {
      const unhandled = captureUnhandledRxErrors();
      const error = { status: 500 };
      const { service, store, query } = setup({
        getViewMaps: () => throwError(() => error),
      });
      store.set([makeMap('old')]);

      service.getViewMaps('view-1');
      await flush();

      expect(query.getValue().loading).toBe(false);
      expect(query.getAll().map((m) => m.id)).toEqual(['old']);
      expect(unhandled).toEqual([error]);
    });
  });

  describe('get()', () => {
    /**
     * Verifies: get loads every map into the store and clears loading.
     * Interacts with: stubbed VmsService.getAllMaps; real store/query.
     * Data: API returns maps 'a' (view-1) and 'b' (view-2).
     */
    it('stores every map returned by getAllMaps', () => {
      const { service, query } = setup({
        getAllMaps: () =>
          of([makeMap('a'), makeMap('b', { viewId: 'view-2' })]),
      });

      service.get();

      expect(query.getAll().map((m) => m.id)).toEqual(['a', 'b']);
      expect(query.getValue().loading).toBe(false);
    });
  });

  describe('getTeamMap()', () => {
    /**
     * Verifies: getTeamMap adds the team's map to the store and clears loading.
     * Interacts with: stubbed VmsService.getTeamMap; real store/query.
     * Data: team-1; API returns map 't'.
     */
    it('adds the team map to the store', () => {
      const { service, query, mapsApi } = setup({
        getTeamMap: () => of(makeMap('t')),
      });

      service.getTeamMap('team-1');

      expect(mapsApi.getTeamMap).toHaveBeenCalledWith('team-1');
      expect(query.getAll().map((m) => m.id)).toEqual(['t']);
      expect(query.getValue().loading).toBe(false);
    });

    /**
     * Verifies: re-fetching a team map that is already stored keeps the stale copy and leaves loading on.
     * Interacts with: stubbed VmsService.getTeamMap; real VmMapsStore.add; VmMapsQuery.
     * Data: store seeded with map 't' named 'Old'; API returns 't' named 'New'.
     */
    it('keeps the stale map when the team map is already stored', () => {
      const { service, store, query } = setup({
        getTeamMap: () => of(makeMap('t', { name: 'New' })),
      });
      store.set([makeMap('t', { name: 'Old' })]);

      service.getTeamMap('team-1');

      expect(query.getEntity('t')?.name).toBe('Old');
      expect(query.getValue().loading).toBe(true);
    });
  });

  describe('failed loads', () => {
    const failing = () => throwError(() => ({ status: 500 }));

    /**
     * Verifies: a failed request leaves loading set and lets the error escape (current behavior).
     * Interacts with: stubbed VmsService endpoint (throwError); real VmMapsStore/VmMapsQuery; captureUnhandledRxErrors.
     * Data: one row per loading method; store unloaded first so loading starts false; API error { status: 500 }.
     */
    it.each<[string, Partial<MapsApi>, (service: VmMapsService) => void]>([
      ['get()', { getAllMaps: failing }, (service) => service.get()],
      [
        'getTeamMap()',
        { getTeamMap: failing },
        (service) => service.getTeamMap('team-1'),
      ],
    ])(
      '%s leaves loading stuck when its request fails',
      async (_method, api, call) => {
        const unhandled = captureUnhandledRxErrors();
        const { service, query } = setup(api);
        service.unload();

        call(service);
        await flush();

        expect(query.getValue().loading).toBe(true);
        expect(unhandled).toEqual([{ status: 500 }]);
      },
    );
  });

  describe('add() / update() / remove()', () => {
    /**
     * Verifies: add creates the map through the API and stores the API's copy, not the payload.
     * Interacts with: stubbed VmsService.createMap; real store/query.
     * Data: payload named 'Draft'; API answers with the same id named 'Saved'.
     */
    it('add stores the map the API returns', () => {
      const { service, query, mapsApi } = setup({
        createMap: (_viewId, m) => of({ ...m, name: 'Saved' }),
      });
      const payload = makeMap('new', { name: 'Draft' });

      service.add('view-1', payload);

      expect(mapsApi.createMap).toHaveBeenCalledWith('view-1', payload);
      expect(query.getEntity('new').name).toBe('Saved');
    });

    /**
     * Verifies: update sends the changes and merges the API response into the stored map.
     * Interacts with: stubbed VmsService.updateMap; real store/query.
     * Data: stored map 'm1' named 'Before'; update to 'After'.
     */
    it('update merges the API response into the stored map', () => {
      const { service, store, query, mapsApi } = setup();
      store.set([makeMap('m1', { name: 'Before' })]);

      service.update('m1', { name: 'After' });

      expect(mapsApi.updateMap).toHaveBeenCalledWith('m1', { name: 'After' });
      expect(query.getEntity('m1')).toMatchObject({ id: 'm1', name: 'After' });
    });

    /**
     * Verifies: remove deletes the map from the store only after the API call succeeds.
     * Interacts with: stubbed VmsService.deleteMap (Subject); real store/query.
     * Data: stored maps 'm1' and 'm2'; delete m1, API completes afterwards.
     */
    it('remove drops the map once the API confirms the delete', () => {
      const response = new Subject<unknown>();
      const { service, store, query, mapsApi } = setup({
        deleteMap: () => response,
      });
      store.set([makeMap('m1'), makeMap('m2')]);

      service.remove('m1');
      expect(query.hasEntity('m1')).toBe(true);
      response.next(null);

      expect(mapsApi.deleteMap).toHaveBeenCalledWith('m1');
      expect(query.getAll().map((m) => m.id)).toEqual(['m2']);
    });

    /**
     * Verifies: a failed write leaves the store as it was and lets the error escape to the global handler.
     * Interacts with: stubbed VmsService createMap / updateMap / deleteMap (throwError 403); real store/query; captureUnhandledRxErrors.
     * Data: stored map 'm1' named 'Before'; one row per write method.
     */
    it.each<[string, Partial<MapsApi>, (service: VmMapsService) => void]>([
      [
        'add()',
        { createMap: () => throwError(() => ({ status: 403 })) },
        (service) => service.add('view-1', makeMap('new')),
      ],
      [
        'update()',
        { updateMap: () => throwError(() => ({ status: 403 })) },
        (service) => service.update('m1', { name: 'After' }),
      ],
      [
        'remove()',
        { deleteMap: () => throwError(() => ({ status: 403 })) },
        (service) => service.remove('m1'),
      ],
    ])(
      '%s keeps the store unchanged when the API rejects it',
      async (_method, api, call) => {
        const unhandled = captureUnhandledRxErrors();
        const { service, store, query } = setup(api);
        const before = makeMap('m1', { name: 'Before' });
        store.set([before]);

        call(service);
        await flush();

        expect(query.getAll()).toEqual([before]);
        // add(), update() and remove() subscribe with no error callback, so the error
        // escapes to ErrorService (the global ErrorHandler in main.ts), which shows it; no
        // loading flag is involved.
        expect(unhandled).toEqual([{ status: 403 }]);
      },
    );
  });

  /**
   * Verifies: unload empties the store.
   * Interacts with: real VmMapsStore via VmMapsService.unload.
   * Data: store seeded with two maps.
   */
  it('unload clears every map', () => {
    const { service, store, query } = setup();
    store.set([makeMap('a'), makeMap('b')]);

    service.unload();

    expect(query.getCount()).toBe(0);
  });
});
