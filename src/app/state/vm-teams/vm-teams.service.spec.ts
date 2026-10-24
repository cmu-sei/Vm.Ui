// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { recordEmissions } from '../../test-utils/record-emissions';
import { VmTeam } from './vm-team.model';
import { VmTeamsQuery } from './vm-teams.query';
import { VmTeamsService } from './vm-teams.service';
import { VmTeamsStore } from './vm-teams.store';

function createState() {
  const store = new VmTeamsStore();
  const injector = Injector.create({
    providers: [{ provide: VmTeamsStore, useValue: store }],
  });
  return {
    store,
    query: runInInjectionContext(injector, () => new VmTeamsQuery()),
    service: runInInjectionContext(injector, () => new VmTeamsService()),
  };
}

function team(id: string, name: string, viewId = 'view-1'): VmTeam {
  return { id, name, viewId };
}

describe('VmTeamsService', () => {
  /**
   * Verifies: set/add/update/remove on the service are reflected by the query.
   * Interacts with: real VmTeamsStore and VmTeamsQuery via VmTeamsService.
   * Data: set Blue, add Red, rename Blue, remove Red.
   */
  it('service writes are visible through the query', () => {
    const { service, query } = createState();

    service.set([{ id: 'team-1', name: 'Blue', viewId: 'view-1' }]);
    service.add({ id: 'team-2', name: 'Red', viewId: 'view-1' });
    service.update('team-1', { name: 'Navy' });
    service.remove('team-2');

    expect(query.getAll()).toEqual([
      { id: 'team-1', name: 'Navy', viewId: 'view-1' },
    ]);
  });

  /**
   * Verifies: the root-provided service and query share one store, so a set through the service reaches the query the components inject.
   * Interacts with: TestBed root injector; real VmTeamsService, VmTeamsStore and VmTeamsQuery.
   * Data: set Blue and Red on view-1.
   */
  it('set through the injected service reaches the injected query', () => {
    const service = TestBed.inject(VmTeamsService);
    const query = TestBed.inject(VmTeamsQuery);

    service.set([team('team-1', 'Blue'), team('team-2', 'Red')]);

    expect(query.getAll()).toEqual([
      team('team-1', 'Blue'),
      team('team-2', 'Red'),
    ]);
  });

  /**
   * Verifies: set replaces the stored teams instead of merging, and each set emits once on selectAll.
   * Interacts with: real VmTeamsStore and VmTeamsQuery.selectAll via VmTeamsService.set.
   * Data: set Blue and Red on view-1, then only Green on view-2, then an empty list.
   */
  it('set replaces every stored team', () => {
    const { service, query } = createState();
    const emissions = recordEmissions(query.selectAll());

    service.set([team('team-1', 'Blue'), team('team-2', 'Red')]);
    service.set([team('team-3', 'Green', 'view-2')]);
    service.set([]);

    expect(emissions).toEqual([
      [],
      [team('team-1', 'Blue'), team('team-2', 'Red')],
      [team('team-3', 'Green', 'view-2')],
      [],
    ]);
  });

  /**
   * Verifies: add appends a team after the ones already stored.
   * Interacts with: real VmTeamsStore and VmTeamsQuery via VmTeamsService.add.
   * Data: Blue stored; add Red.
   */
  it('add appends a team to the stored list', () => {
    const { service, query } = createState();
    service.set([team('team-1', 'Blue')]);

    service.add(team('team-2', 'Red'));

    expect(query.getAll()).toEqual([
      team('team-1', 'Blue'),
      team('team-2', 'Red'),
    ]);
  });

  /**
   * Verifies: add with an id already stored keeps the stored team as it was (current behavior).
   * Interacts with: real VmTeamsStore (Akita add skips existing ids) via VmTeamsService.add.
   * Data: Blue stored as team-1; add team-1 named Navy.
   */
  it('add leaves a team already stored under the same id unchanged', () => {
    const { service, query } = createState();
    service.set([team('team-1', 'Blue')]);

    service.add(team('team-1', 'Navy'));

    expect(query.getAll()).toEqual([team('team-1', 'Blue')]);
  });

  /**
   * Verifies: update merges the given fields into one team and leaves the other teams as they were.
   * Interacts with: real VmTeamsStore and VmTeamsQuery.selectEntity via VmTeamsService.update.
   * Data: Blue and Red stored; rename team-1 to Navy.
   */
  it('update renames one team and keeps its other fields', () => {
    const { service, query } = createState();
    service.set([team('team-1', 'Blue'), team('team-2', 'Red')]);
    const blue = recordEmissions(query.selectEntity('team-1'));

    service.update('team-1', { name: 'Navy' });

    expect(blue).toEqual([team('team-1', 'Blue'), team('team-1', 'Navy')]);
    expect(query.getEntity('team-2')).toEqual(team('team-2', 'Red'));
  });

  /**
   * Verifies: update of an id that is not stored adds no team and changes none; selectAll emits the same list again (current behavior).
   * Interacts with: real VmTeamsStore and VmTeamsQuery.selectAll via VmTeamsService.update.
   * Data: Blue stored; update team-9.
   */
  it('update of an unknown team id leaves the store unchanged', () => {
    const { service, query } = createState();
    service.set([team('team-1', 'Blue')]);
    const emissions = recordEmissions(query.selectAll());

    service.update('team-9', { name: 'Ghost' });

    expect(emissions).toEqual([
      [team('team-1', 'Blue')],
      [team('team-1', 'Blue')],
    ]);
    expect(query.hasEntity('team-9')).toBe(false);
  });

  /**
   * Verifies: remove deletes only the team with the given id.
   * Interacts with: real VmTeamsStore and VmTeamsQuery via VmTeamsService.remove.
   * Data: Blue and Red stored; remove team-1.
   */
  it('remove deletes one team by id', () => {
    const { service, query } = createState();
    service.set([team('team-1', 'Blue'), team('team-2', 'Red')]);

    service.remove('team-1');

    expect(query.getAll()).toEqual([team('team-2', 'Red')]);
  });

  /**
   * Verifies: remove of an id that is not stored keeps every stored team.
   * Interacts with: real VmTeamsStore and VmTeamsQuery via VmTeamsService.remove.
   * Data: Blue and Red stored; remove team-9.
   */
  it('remove of an unknown team id keeps every team', () => {
    const { service, query } = createState();
    service.set([team('team-1', 'Blue'), team('team-2', 'Red')]);

    service.remove('team-9');

    expect(query.getAll()).toEqual([
      team('team-1', 'Blue'),
      team('team-2', 'Red'),
    ]);
  });
});
