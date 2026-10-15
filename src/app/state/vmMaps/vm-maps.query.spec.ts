// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { VmMap } from '../../generated/vm-api';
import { recordEmissions } from '../../test-utils/record-emissions';
import { VmMapsQuery } from './vm-maps.query';
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

function createQuery() {
  const store = new VmMapsStore();
  return { store, query: new VmMapsQuery(store) };
}

describe('VmMapsQuery', () => {
  /**
   * Verifies: getById stays silent while the map is missing and emits once it is added.
   * Interacts with: real VmMapsStore.add and VmMapsQuery.getById (filterNil).
   * Data: empty store; map 'm1' added after subscribing.
   */
  it('getById waits for the map to exist before emitting', () => {
    const { store, query } = createQuery();
    const emissions = recordEmissions(query.getById('m1'));
    expect(emissions).toEqual([]);

    store.add(makeMap('m1'));

    expect(emissions.map((m) => m.id)).toEqual(['m1']);
  });

  /**
   * Verifies: getByViewId returns only the maps that belong to the requested view.
   * Interacts with: real VmMapsStore and VmMapsQuery.getByViewId.
   * Data: two maps in view-1 and one in view-2.
   */
  it('getByViewId filters maps to one view', async () => {
    const { store, query } = createQuery();
    store.set([makeMap('a'), makeMap('b', { viewId: 'view-2' }), makeMap('c')]);

    const ids = (await firstValueFrom(query.getByViewId('view-1'))).map(
      (m) => m.id,
    );

    expect(ids).toEqual(['a', 'c']);
  });

  /**
   * Verifies: getAllWithName matches names case-insensitively and skips unnamed maps.
   * Interacts with: real VmMapsStore and VmMapsQuery.getAllWithName.
   * Data: maps named 'North Site', 'south site' and null; term 'SITE'.
   */
  it('getAllWithName matches case-insensitively and skips maps without a name', async () => {
    const { store, query } = createQuery();
    store.set([
      makeMap('a', { name: 'North Site' }),
      makeMap('b', { name: 'south site' }),
      makeMap('c', { name: null }),
    ]);

    const ids = (await firstValueFrom(query.getAllWithName('SITE'))).map(
      (m) => m.id,
    );

    expect(ids).toEqual(['a', 'b']);
  });

  /**
   * Verifies: getMapCoordinates emits the coordinates of the map and follows updates.
   * Interacts with: real VmMapsStore.update and VmMapsQuery.getMapCoordinates.
   * Data: map 'm1' with one coordinate, then updated to two.
   */
  it('getMapCoordinates emits the coordinates and re-emits on update', () => {
    const { store, query } = createQuery();
    const first = { xPosition: 1, yPosition: 2, radius: 3, urls: [] };
    const second = { xPosition: 4, yPosition: 5, radius: 6, urls: [] };
    store.set([makeMap('m1', { coordinates: [first] })]);
    const emissions = recordEmissions(query.getMapCoordinates('m1'));

    store.update('m1', { coordinates: [first, second] });

    expect(emissions).toEqual([[first], [first, second]]);
  });
});
