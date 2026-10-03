// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { User } from 'oidc-client-ts';
import * as signalR from '@microsoft/signalr';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import {
  BASE_PATH,
  PowerState,
  Vm,
  VmsService,
  VmUserTeam,
} from '../../generated/vm-api';
import {
  mockHubConnectionBuilder,
  rejectInvokes,
} from '../../test-utils/fake-hub-connection';
import {
  captureUnhandledRejections,
  flush,
} from '../../test-utils/unhandled-rx-errors';
import { unstubbed } from '../../test-utils/unstubbed';
import { VmsQuery } from '../../state/vms/vms.query';
import { VmsStore } from '../../state/vms/vms.store';
import { VmTeamsQuery } from '../../state/vm-teams/vm-teams.query';
import { VmUsersQuery } from '../../state/vm-users/vm-users.query';
import { VmUsersStore } from '../../state/vm-users/vm-users.store';
import { SignalRService } from './signalr.service';

const BASE_URL = 'http://vm.test';

type StartBehavior = () => Promise<void>;

/**
 * Builds the shared builder mock so each built connection takes the next queued
 * start() behavior (an empty queue lets start resolve), and JoinViewUsers
 * resolves to an empty team list unless a test says otherwise.
 */
function mockSignalRBuilder() {
  const startBehaviors: StartBehavior[] = [];
  const builder = mockHubConnectionBuilder({
    onBuild: (connection) => {
      const behavior = startBehaviors.shift();
      if (behavior) connection.start.mockImplementationOnce(behavior);
      connection.invoke.mockImplementation((method: string) =>
        Promise.resolve(method === 'JoinViewUsers' ? [] : undefined),
      );
    },
  });
  return { ...builder, startBehaviors };
}

@Component({ template: '' })
class BlankComponent {}

type AuthStub = Pick<ComnAuthService, 'user$' | 'getAuthorizationToken'>;

async function setup() {
  const user$ = new Subject<User>();
  const auth: AuthStub = {
    user$,
    getAuthorizationToken: () => 'auth-token',
  };
  TestBed.configureTestingModule({
    providers: [
      // SignalRService writes through the real VmService, which reads the route when built.
      provideRouter([{ path: 'views/:viewId', component: BlankComponent }]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ComnSettingsService,
        useValue: { settings: { ApiUrl: `${BASE_URL}/api` } },
      },
      unstubbed(VmsService),
      { provide: ComnAuthService, useValue: auth },
      { provide: BASE_PATH, useValue: BASE_URL },
    ],
  });
  await RouterTestingHarness.create('/views/view-1');
  return {
    service: TestBed.inject(SignalRService),
    vmsStore: TestBed.inject(VmsStore),
    vmsQuery: TestBed.inject(VmsQuery),
    usersStore: TestBed.inject(VmUsersStore),
    usersQuery: TestBed.inject(VmUsersQuery),
    teamsQuery: TestBed.inject(VmTeamsQuery),
    user$,
  };
}

async function connected() {
  const ctx = await setup();
  ctx.service.startConnection();
  await flush();
  return { ...ctx, hub: builder.connections[0] };
}

function makeVm(id: string, extra: Partial<Vm> = {}): Vm {
  return {
    id,
    name: `vm-${id}`,
    powerState: PowerState.Off,
    teamIds: ['team-1'],
    ...extra,
  };
}

let builder: ReturnType<typeof mockSignalRBuilder>;

describe('SignalRService', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    builder = mockSignalRBuilder();
    // The service logs suppressed hub errors; keep test output clean.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('startConnection()', () => {
    /**
     * Verifies: the hub connection targets /hubs/vm on the API base path and sends the bearer token.
     * Interacts with: mocked HubConnectionBuilder (withUrl options), stubbed ComnAuthService.getAuthorizationToken.
     * Data: BASE_PATH http://vm.test; token 'auth-token'.
     */
    it('connects to the vm hub with the access token', async () => {
      const { service } = await setup();

      service.startConnection();

      const [url, options] = builder.withUrl.mock.calls[0] as [
        string,
        signalR.IHttpConnectionOptions,
      ];
      expect(url).toBe(`${BASE_URL}/hubs/vm`);
      expect(options.accessTokenFactory?.()).toBe('auth-token');
      expect(builder.connections).toHaveLength(1);
      expect(builder.connections[0].start).toHaveBeenCalledOnce();
    });

    /**
     * Verifies: a second call while connecting reuses the same connection and promise.
     * Interacts with: mocked HubConnectionBuilder.build.
     * Data: two back-to-back startConnection() calls.
     */
    it('returns the pending connection instead of building another', async () => {
      const { service } = await setup();

      const first = service.startConnection();
      const second = service.startConnection();

      expect(second).toBe(first);
      expect(builder.connections).toHaveLength(1);
    });

    /**
     * Verifies: the reconnect policy doubles the delay per attempt, caps it at 60s, and adds 0-5s of jitter.
     * Interacts with: the RetryPolicy passed to withAutomaticReconnect; Math.random spy.
     * Data: previousRetryCount 0, 3 and 10 with random 0, then count 0 with random 0.999.
     */
    it('backs off exponentially up to 60 seconds plus jitter', async () => {
      const { service } = await setup();
      service.startConnection();
      const policy = builder.retryPolicy()!;
      const context = (previousRetryCount: number): signalR.RetryContext => ({
        previousRetryCount,
        elapsedMilliseconds: 0,
        retryReason: new Error('lost'),
      });

      vi.spyOn(Math, 'random').mockReturnValue(0);
      expect(policy.nextRetryDelayInMilliseconds(context(0))).toBe(2000);
      expect(policy.nextRetryDelayInMilliseconds(context(3))).toBe(16000);
      expect(policy.nextRetryDelayInMilliseconds(context(10))).toBe(60000);

      vi.spyOn(Math, 'random').mockReturnValue(0.999);
      expect(policy.nextRetryDelayInMilliseconds(context(0))).toBe(7000);
    });

    /**
     * Verifies: a failed start is logged, does not reject, and lets the next call build a fresh connection.
     * Interacts with: FakeHubConnection.start (rejects once); console.warn spy.
     * Data: first start rejects with 'negotiation failed'.
     */
    it('swallows a failed start and retries on the next call', async () => {
      builder.startBehaviors.push(() =>
        Promise.reject(new Error('negotiation failed')),
      );
      const { service } = await setup();

      await expect(service.startConnection()).resolves.toBeUndefined();
      service.startConnection();

      expect(warn).toHaveBeenCalledWith(
        'VM Hub connection failed:',
        'negotiation failed',
      );
      expect(builder.connections).toHaveLength(2);
    });

    /**
     * Verifies: once a view is joined, every failed start immediately builds and starts another connection.
     * Interacts with: FakeHubConnection.start (rejects three times, then never settles); console.warn spy.
     * Data: the VmMainComponent sequence - startConnection().then(() => joinView('view-1')).
     */
    it('retries a failed start in a loop once a view is joined', async () => {
      const pending = () => new Promise<void>(() => undefined);
      const fail = () => Promise.reject(new Error('negotiation failed'));
      builder.startBehaviors.push(fail, fail, fail, pending);
      const { service } = await setup();

      service.startConnection().then(() => service.joinView('view-1'));
      await flush();

      expect(builder.connections).toHaveLength(4);
      expect(warn).toHaveBeenCalledTimes(3);
    });
  });

  describe('VM events', () => {
    /**
     * Verifies: VmUpdated applies only the listed modified properties to a stored VM.
     * Interacts with: FakeHubConnection.trigger; real VmService/VmsStore; VmsQuery.getEntity.
     * Data: stored VM 'a' (name 'old', Off); event payload renamed and On, modifiedProperties ['powerState'].
     */
    it('VmUpdated applies only the modified properties', async () => {
      const { hub, vmsStore, vmsQuery } = await connected();
      vmsStore.set([makeVm('a', { name: 'old' })]);

      hub.trigger(
        'VmUpdated',
        makeVm('a', { name: 'new', powerState: PowerState.On }),
        ['powerState'],
      );

      expect(vmsQuery.getEntity('a')).toMatchObject({
        name: 'old',
        powerState: PowerState.On,
      });
    });

    /**
     * Verifies: VmUpdated without a property list applies the whole payload.
     * Interacts with: FakeHubConnection.trigger; real VmsStore/VmsQuery.
     * Data: stored VM 'a'; payload renamed and On; modifiedProperties null.
     */
    it('VmUpdated without a property list applies the whole VM', async () => {
      const { hub, vmsStore, vmsQuery } = await connected();
      vmsStore.set([makeVm('a', { name: 'old' })]);

      hub.trigger(
        'VmUpdated',
        makeVm('a', { name: 'new', powerState: PowerState.On }),
        null,
      );

      expect(vmsQuery.getEntity('a')).toMatchObject({
        name: 'new',
        powerState: PowerState.On,
      });
    });

    /**
     * Verifies: a VmUpdated that arrives before VmCreated inserts the full VM, and the late VmCreated is ignored.
     * Interacts with: FakeHubConnection.trigger; real VmService.upsert/add; VmsQuery.
     * Data: empty store; VmUpdated for 'b' (On, modifiedProperties ['powerState']), then VmCreated for 'b' (Off).
     */
    it('VmUpdated before VmCreated inserts the VM and keeps the newer state', async () => {
      const { hub, vmsQuery } = await connected();
      const updated = makeVm('b', { powerState: PowerState.On });

      hub.trigger('VmUpdated', updated, ['powerState']);
      hub.trigger('VmCreated', makeVm('b', { powerState: PowerState.Off }));

      expect(vmsQuery.getAll()).toEqual([updated]);
    });

    /**
     * Verifies: VmCreated adds a VM and VmDeleted removes it.
     * Interacts with: FakeHubConnection.trigger; real VmsStore/VmsQuery.
     * Data: VmCreated for 'a' and 'b', then VmDeleted for 'a'.
     */
    it('VmCreated adds and VmDeleted removes', async () => {
      const { hub, vmsQuery } = await connected();

      hub.trigger('VmCreated', makeVm('a'));
      hub.trigger('VmCreated', makeVm('b'));
      hub.trigger('VmDeleted', 'a');

      expect(vmsQuery.getAll().map((v) => v.id)).toEqual(['b']);
    });

    /**
     * Verifies: a VmUpdated that arrives after VmDeleted brings the deleted VM back.
     * Interacts with: FakeHubConnection.trigger; real VmsStore/VmsQuery.
     * Data: stored VM 'a'; VmDeleted 'a' then VmUpdated 'a'.
     */
    it('VmUpdated after VmDeleted re-inserts the VM', async () => {
      const { hub, vmsStore, vmsQuery } = await connected();
      vmsStore.set([makeVm('a')]);

      hub.trigger('VmDeleted', 'a');
      hub.trigger('VmUpdated', makeVm('a', { powerState: PowerState.On }), [
        'powerState',
      ]);

      expect(vmsQuery.hasEntity('a')).toBe(true);
    });
  });

  describe('ActiveVirtualMachine', () => {
    /**
     * Verifies: the event updates the user's active VM, last VM and last-seen time on every listed team.
     * Interacts with: FakeHubConnection.trigger; real VmUsersService/VmUsersStore; VmUsersQuery.
     * Data: u1 on team-1 and team-2; event (vm-7, u1, lastSeen, [team-1, team-2]).
     */
    it("records the active VM on each of the user's teams", async () => {
      const { hub, usersStore, usersQuery } = await connected();
      usersStore.set([
        { userId: 'u1', teamId: 'team-1', username: 'alice' },
        { userId: 'u1', teamId: 'team-2', username: 'alice' },
      ]);

      hub.trigger(
        'ActiveVirtualMachine',
        'vm-7',
        'u1',
        '2026-10-01T12:00:00Z',
        ['team-1', 'team-2'],
      );

      for (const id of ['u1:team-1', 'u1:team-2']) {
        expect(usersQuery.getEntity(id)).toMatchObject({
          activeVmId: 'vm-7',
          lastVmId: 'vm-7',
          lastSeen: '2026-10-01T12:00:00Z',
        });
      }
    });

    /**
     * Verifies: when the user leaves a console (null vmId), only activeVmId is cleared.
     * Interacts with: FakeHubConnection.trigger; real VmUsersStore/VmUsersQuery.
     * Data: u1 on team-1 last seen on vm-7; event (null, u1, null, [team-1]).
     */
    it('clears only the active VM when the user leaves a console', async () => {
      const { hub, usersStore, usersQuery } = await connected();
      usersStore.set([
        {
          userId: 'u1',
          teamId: 'team-1',
          activeVmId: 'vm-7',
          lastVmId: 'vm-7',
          lastSeen: '2026-10-01T12:00:00Z',
        },
      ]);

      hub.trigger('ActiveVirtualMachine', null, 'u1', null, ['team-1']);

      expect(usersQuery.getEntity('u1:team-1')).toMatchObject({
        activeVmId: null,
        lastVmId: 'vm-7',
        lastSeen: '2026-10-01T12:00:00Z',
      });
    });
  });

  describe('view groups', () => {
    /**
     * Verifies: joining a view after the connection is up invokes JoinView once.
     * Interacts with: FakeHubConnection.invoke spy.
     * Data: connected service; joinView('view-1').
     */
    it('joinView invokes JoinView on the hub', async () => {
      const { service, hub } = await connected();

      service.joinView('view-1');
      await flush();

      expect(hub.invoke).toHaveBeenCalledExactlyOnceWith('JoinView', 'view-1');
    });

    /**
     * Verifies: joining a view before any connection exists invokes JoinView twice.
     * Interacts with: FakeHubConnection.invoke spy.
     * Data: fresh service; joinView('view-1') is the first call.
     */
    it('joinView on a fresh service joins the view twice', async () => {
      const { service } = await setup();

      service.joinView('view-1');
      await flush();

      expect(builder.connections[0].invoke.mock.calls).toEqual([
        ['JoinView', 'view-1'],
        ['JoinView', 'view-1'],
      ]);
    });

    /**
     * Verifies: a rejected JoinView (for example a deleted view) is logged and not re-thrown.
     * Interacts with: FakeHubConnection.invoke (rejects); console.log spy.
     * Data: connected service; JoinView rejects with 'View not found'.
     */
    it('suppresses a JoinView failure', async () => {
      const { service, hub } = await connected();
      const error = new Error('View not found');
      hub.invoke.mockImplementation(() => Promise.reject(error));

      service.joinView('view-1');
      await flush();

      expect(console.log).toHaveBeenCalledWith(
        'SignalR JoinView error (suppressed):',
        error,
      );
    });

    /**
     * Verifies: joinViewUsers splits the hub's team list into the teams and users stores.
     * Interacts with: FakeHubConnection.invoke (JoinViewUsers result); real VmTeamsQuery and VmUsersQuery.
     * Data: two teams, Blue with alice and Red with bob.
     */
    it('joinViewUsers loads the teams and users stores', async () => {
      const { service, hub, teamsQuery, usersQuery } = await connected();
      const teams: VmUserTeam[] = [
        {
          id: 'team-1',
          name: 'Blue',
          users: [{ userId: 'u1', teamId: 'team-1', username: 'alice' }],
        },
        {
          id: 'team-2',
          name: 'Red',
          users: [{ userId: 'u2', teamId: 'team-2', username: 'bob' }],
        },
      ];
      hub.invoke.mockImplementation((method: string) =>
        Promise.resolve(method === 'JoinViewUsers' ? teams : undefined),
      );

      service.joinViewUsers('view-1');
      await flush();

      expect(hub.invoke).toHaveBeenCalledWith('JoinViewUsers', 'view-1');
      expect(teamsQuery.getAll()).toEqual([
        { id: 'team-1', name: 'Blue', viewId: 'view-1' },
        { id: 'team-2', name: 'Red', viewId: 'view-1' },
      ]);
      expect(usersQuery.getValue().ids).toEqual(['u1:team-1', 'u2:team-2']);
    });

    /**
     * Verifies: after an automatic reconnect the service rejoins the view and the view-users group.
     * Interacts with: FakeHubConnection.reconnect and invoke spy.
     * Data: joined view-1 and its users; invoke spy cleared before the reconnect.
     */
    it('rejoins the view and its users after a reconnect', async () => {
      const { service, hub } = await connected();
      service.joinViewUsers('view-1');
      await flush();
      hub.invoke.mockClear();

      hub.reconnect();
      await flush();

      expect(hub.invoke).toHaveBeenCalledWith('JoinView', 'view-1');
      expect(hub.invoke).toHaveBeenCalledWith('JoinViewUsers', 'view-1');
    });

    /**
     * Verifies: leaving the view and its users stops both from being rejoined on reconnect.
     * Interacts with: FakeHubConnection.invoke and reconnectedCallbacks.
     * Data: joined view-1 users; leaveViewUsers then leaveView; reconnect afterwards.
     */
    it('leaveView and leaveViewUsers stop rejoining', async () => {
      const { service, hub } = await connected();
      service.joinViewUsers('view-1');
      await flush();

      service.leaveViewUsers('view-1');
      service.leaveView('view-1');
      await flush();
      expect(hub.invoke).toHaveBeenCalledWith('LeaveViewUsers', 'view-1');
      expect(hub.invoke).toHaveBeenCalledWith('LeaveView', 'view-1');

      hub.invoke.mockClear();
      hub.reconnect();
      await flush();
      expect(hub.invoke).not.toHaveBeenCalled();
    });

    type Ctx = Awaited<ReturnType<typeof connected>>;

    /**
     * Verifies: a hub promise chain with no .catch lets its rejection escape unhandled, unlike the group calls that log and suppress.
     * Interacts with: rejectInvokes (plain rejecting hub.invoke for LeaveViewUsers only) or a rejecting FakeHubConnection.stop; stubbed ComnAuthService.user$; captureUnhandledRejections (zone.js logs unhandled rejections to console.error).
     * Data: connected service; one row per method; the hub call rejects with 'connection lost'.
     */
    it.each<
      [string, (hub: Ctx['hub'], error: Error) => void, (ctx: Ctx) => void]
    >([
      [
        'leaveViewUsers()',
        (hub, error) => rejectInvokes(hub, error, ['LeaveViewUsers']),
        ({ service }) => service.leaveViewUsers('view-1'),
      ],
      [
        'the token-refresh reconnect',
        (hub, error) =>
          hub.stop.mockImplementation(() => Promise.reject(error)),
        ({ user$ }) => user$.next({ profile: { sub: 'u1' } } as User),
      ],
    ])(
      'lets a failure in %s escape unhandled',
      async (_method, arrange, act) => {
        const ctx = await connected();
        const error = new Error('connection lost');
        arrange(ctx.hub, error);
        const rejections = captureUnhandledRejections();

        act(ctx);
        await flush();

        expect(rejections).toEqual([error]);
      },
    );
  });

  describe('token refresh', () => {
    /**
     * Verifies: a new user (token refresh) restarts the existing connection and rejoins the view.
     * Interacts with: stubbed ComnAuthService.user$ Subject; FakeHubConnection.stop/start/invoke.
     * Data: connected and joined to view-1; user$ emits once.
     */
    it('restarts the connection and rejoins when the user changes', async () => {
      const { service, hub, user$ } = await connected();
      service.joinView('view-1');
      await flush();
      hub.invoke.mockClear();

      user$.next({ profile: { sub: 'u1' } } as User);
      await flush();

      expect(hub.stop).toHaveBeenCalledOnce();
      expect(hub.start).toHaveBeenCalledTimes(2);
      expect(hub.invoke).toHaveBeenCalledWith('JoinView', 'view-1');
      expect(builder.connections).toHaveLength(1);
    });

    /**
     * Verifies: a user emission before any connection exists does not build one.
     * Interacts with: stubbed ComnAuthService.user$ Subject; mocked HubConnectionBuilder.
     * Data: fresh service; user$ emits once.
     */
    it('ignores a user change before connecting', async () => {
      const { user$ } = await setup();

      user$.next({ profile: { sub: 'u1' } } as User);
      await flush();

      expect(builder.connections).toHaveLength(0);
    });
  });
});
