// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { Team, TeamService } from '../../generated/player-api';
import { ApiStub } from '../../test-utils/api-stub';
import { recordEmissions } from '../../test-utils/record-emissions';
import { standardTabs, VmUISession } from './vm-ui-session.model';
import { VmUISessionQuery } from './vm-ui-session.query';
import { VmUISessionService } from './vm-ui-session.service';
import { initialVmUISession } from './vm-ui-session.store';

const VIEW_ID = '6f1c1c3e-2a0a-4d7e-9a35-0a7b8c1d2e3f';

@Component({ template: '' })
class BlankComponent {}

async function setup(
  overrides: { url?: string; myViewTeams?: () => Observable<Team[]> } = {},
) {
  const { url = `/views/${VIEW_ID}` } = overrides;
  const getMyViewTeams = vi.fn(
    overrides.myViewTeams ??
      (() =>
        of<Team[]>([
          { id: 'team-a', name: 'A', isPrimary: false },
          { id: 'team-b', name: 'B', isPrimary: true },
        ])),
  );
  TestBed.configureTestingModule({
    providers: [
      // The service reads viewId off the active child route when it is built.
      provideRouter([{ path: 'views/:viewId', component: BlankComponent }]),
      {
        provide: TeamService,
        useValue: { getMyViewTeams } satisfies ApiStub<TeamService>,
      },
    ],
  });
  await RouterTestingHarness.create(url);
  return {
    service: TestBed.inject(VmUISessionService),
    query: TestBed.inject(VmUISessionQuery),
    getMyViewTeams,
  };
}

function session(
  teamId: string,
  extra: Partial<VmUISession> = {},
): VmUISession {
  return { ...initialVmUISession, id: teamId, viewId: VIEW_ID, ...extra };
}

describe('VmUISessionService', () => {
  describe('construction', () => {
    /**
     * Verifies: on a view route with a UUID, the service looks up the caller's teams and keeps the primary team id.
     * Interacts with: real Router (RouterTestingHarness); stubbed player TeamService.getMyViewTeams.
     * Data: route /views/<uuid>; teams team-a (not primary) and team-b (primary).
     */
    it('picks the primary team of the routed view', async () => {
      const { service, getMyViewTeams } = await setup();

      expect(getMyViewTeams).toHaveBeenCalledWith(VIEW_ID);
      expect(service.getCurrentViewId()).toBe(VIEW_ID);
      expect(service.getCurrentTeamId()).toBe('team-b');
    });

    /**
     * Verifies: a malformed (non-UUID) view id is never sent to the API.
     * Interacts with: stubbed TeamService.getMyViewTeams.
     * Data: route /views/not-a-guid.
     */
    it('skips the team lookup when the view id is not a UUID', async () => {
      const { service, getMyViewTeams } = await setup({
        url: '/views/not-a-guid',
      });

      expect(getMyViewTeams).not.toHaveBeenCalled();
      expect(service.getCurrentViewId()).toBe('not-a-guid');
      expect(service.getCurrentTeamId()).toBeUndefined();
    });

    /**
     * Verifies: a failing team lookup is swallowed and leaves no team selected.
     * Interacts with: stubbed TeamService.getMyViewTeams (throwError 404).
     * Data: route /views/<uuid>; API error { status: 404 }.
     */
    it('leaves teamId unset when the team lookup fails', async () => {
      const { service } = await setup({
        myViewTeams: () => throwError(() => ({ status: 404 })),
      });

      expect(service.getCurrentTeamId()).toBeUndefined();
    });

    /**
     * Verifies: when none of the caller's teams is primary, no team is selected.
     * Interacts with: stubbed TeamService.getMyViewTeams.
     * Data: one non-primary team.
     */
    it('leaves teamId unset when no team is primary', async () => {
      const { service } = await setup({
        myViewTeams: () => of([{ id: 'team-a', isPrimary: false }]),
      });

      expect(service.getCurrentTeamId()).toBeUndefined();
    });
  });

  describe('loadCurrentView()', () => {
    /**
     * Verifies: the first load creates a default session for the primary team.
     * Interacts with: real VmUISessionStore/Query through the service.
     * Data: primary team team-b; empty store.
     */
    it('adds a default session for the current team', async () => {
      const { service, query } = await setup();

      service.loadCurrentView();

      expect(query.getAll()).toEqual([session('team-b')]);
    });

    /**
     * Verifies: an existing session (for example one restored by persistState) is not reset.
     * Interacts with: real store/query through the service.
     * Data: session for team-b already on the User Follow tab.
     */
    it('keeps an existing session untouched', async () => {
      const { service, query } = await setup();
      service.add(session('team-b', { tabOpened: standardTabs.UserList }));

      service.loadCurrentView();

      expect(query.getEntity('team-b').tabOpened).toBe(standardTabs.UserList);
      expect(query.getCount()).toBe(1);
    });

    /**
     * Verifies: without a primary team there is nothing to load.
     * Interacts with: real store/query through the service.
     * Data: route with a non-UUID view id, so no team is resolved.
     */
    it('does nothing when there is no current team', async () => {
      const { service, query } = await setup({ url: '/views/not-a-guid' });

      service.loadCurrentView();

      expect(query.getCount()).toBe(0);
    });
  });

  describe('setOpenedVm()', () => {
    /**
     * Verifies: opening a VM appends it once, and closing removes it, emitting each change.
     * Interacts with: real store/query (selectEntity stream) through the service.
     * Data: loaded session for team-b; open vm1 twice, open vm2, close vm1.
     */
    it('tracks opened VMs without duplicates', async () => {
      const { service, query } = await setup();
      service.loadCurrentView();
      const opened = recordEmissions(query.selectEntity('team-b'));
      const vm1 = { name: 'vm1', url: 'http://console.test/vm1' };
      const vm2 = { name: 'vm2', url: 'http://console.test/vm2' };

      service.setOpenedVm(vm1, true);
      service.setOpenedVm(vm1, true);
      service.setOpenedVm(vm2, true);
      service.setOpenedVm(vm1, false);

      expect(opened.map((s) => s.openedVms.map((v) => v.name))).toEqual([
        [],
        ['vm1'],
        ['vm1', 'vm2'],
        ['vm2'],
      ]);
    });

    /**
     * Verifies: closing a VM that is not open leaves the session unchanged.
     * Interacts with: real store/query through the service.
     * Data: loaded session with no opened VMs; close 'ghost'.
     */
    it('ignores closing a VM that is not open', async () => {
      const { service, query } = await setup();
      service.loadCurrentView();

      service.setOpenedVm({ name: 'ghost' }, false);

      expect(query.getEntity('team-b').openedVms).toEqual([]);
    });
  });

  describe('session field setters', () => {
    /**
     * Verifies: the tab, search and IP-filter setters write to the given session.
     * Interacts with: real store/query through the service.
     * Data: loaded session for team-b; tab 2, search 'web', show IPs true, IPv4-only false.
     */
    it('update the tab, search value and IP filters', async () => {
      const { service, query } = await setup();
      service.loadCurrentView();
      const current = query.getEntity('team-b');

      service.setOpenedTab(current, standardTabs.UsageLogging);
      service.setSearchValueChanged(current, 'web');
      service.setShowIPsSelectedChanged(current, true);
      service.setShowIPv4OnlySelected(current, false);

      expect(query.getEntity('team-b')).toMatchObject({
        tabOpened: standardTabs.UsageLogging,
        searchValue: 'web',
        showIPsSelected: true,
        showIPv4OnlySelected: false,
      });
    });

    /**
     * Verifies: each guarded setter ignores a missing session instead of throwing.
     * Interacts with: the service setter in the row; real store/query.
     * Data: undefined session passed to setSearchValueChanged, setShowIPsSelectedChanged and setShowIPv4OnlySelected.
     */
    it.each<[string, (service: VmUISessionService) => void]>([
      [
        'setSearchValueChanged',
        (service) => service.setSearchValueChanged(undefined, 'web'),
      ],
      [
        'setShowIPsSelectedChanged',
        (service) => service.setShowIPsSelectedChanged(undefined, true),
      ],
      [
        'setShowIPv4OnlySelected',
        (service) => service.setShowIPv4OnlySelected(undefined, false),
      ],
    ])('%s ignores a missing session', async (_method, call) => {
      const { service, query } = await setup();

      expect(() => call(service)).not.toThrow();
      expect(query.getCount()).toBe(0);
    });

    /**
     * Verifies: the unguarded session writers throw a TypeError when there is no session, unlike the guarded setters.
     * Interacts with: the service method in the row; real store/query.
     * Data: non-UUID route, so there is no team and no session; setOpenedVm opens vm1, setOpenedTab gets the undefined session VmMainComponent passes.
     */
    it.each<[string, (service: VmUISessionService) => void]>([
      ['setOpenedVm', (service) => service.setOpenedVm({ name: 'vm1' }, true)],
      [
        'setOpenedTab',
        (service) => service.setOpenedTab(undefined, standardTabs.UsageLogging),
      ],
    ])('%s throws when there is no session', async (_method, call) => {
      const { service, query } = await setup({ url: '/views/not-a-guid' });

      expect(() => call(service)).toThrow(TypeError);
      expect(query.getCount()).toBe(0);
    });

    /**
     * Verifies: remove deletes the session from the store.
     * Interacts with: real store/query through the service.
     * Data: loaded session for team-b.
     */
    it('remove deletes the session', async () => {
      const { service, query } = await setup();
      service.loadCurrentView();

      service.remove('team-b');

      expect(query.getCount()).toBe(0);
    });
  });
});
