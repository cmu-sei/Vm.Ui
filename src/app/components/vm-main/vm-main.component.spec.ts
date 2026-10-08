// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  Provider,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';
import { User as OidcUser } from 'oidc-client-ts';
import { ComnAuthService } from '@cmusei/crucible-common';
import {
  PermissionService,
  TeamPermissionsClaim,
  TeamPermissionService,
  User,
  UserService,
} from '../../generated/player-api';
import {
  AppSystemPermission,
  SimpleTeam,
  Vm,
  VmsService,
  VmUsageLoggingSession,
  VmUsageLoggingSessionService,
} from '../../generated/vm-api';
import { UserPermissionsService } from '../../services/permissions/user-permissions.service';
import { SignalRService } from '../../services/signalr/signalr.service';
import { VmUISession } from '../../state/vm-ui-session/vm-ui-session.model';
import { VmUISessionService } from '../../state/vm-ui-session/vm-ui-session.service';
import {
  initialVmUISession,
  VmUISessionStore,
} from '../../state/vm-ui-session/vm-ui-session.store';
import { VmTeam } from '../../state/vm-teams/vm-team.model';
import { VmsStore } from '../../state/vms/vms.store';
import { ApiStub } from '../../test-utils/api-stub';
import { permissionDataProviders } from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';
import { FocusedAppComponent } from '../focused-app/focused-app.component';
import { IsoListComponent } from '../iso-list/iso-list.component';
import { NetworkPermissionsComponent } from '../network-permissions/network-permissions.component';
import { PageNotFoundComponent } from '../page-not-found/page-not-found.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { UserListComponent } from '../user-list/user-list.component';
import { VmListComponent } from '../vm-list/vm-list.component';
import { VmUsageLoggingComponent } from '../vm-usage-logging/vm-usage-logging.component';
import { VmMainComponent } from './vm-main.component';

const VIEW = '6f1c1c3e-2a0a-4d7e-9a35-0a7b8c1d2e3f';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {}

@Component({ selector: 'app-vm-list', template: '' })
class VmListStubComponent {
  @Input() vms: Vm[];
  @Input() readOnly: boolean;
  @Input() uiSession: VmUISession;
  @Input() canManageView: boolean;
  @Input() canViewView: boolean;
  @Input() canRevertVms: boolean;
  @Output() openVmHere = new EventEmitter<{ [name: string]: string }>();
  @Output() errors = new EventEmitter<{ [key: string]: string }>();
  @Output() searchValueChanged = new EventEmitter<string>();
  @Output() showIPsSelectedChanged = new EventEmitter<boolean>();
  @Output() showIPv4OnlySelectedChanged = new EventEmitter<boolean>();
}

@Component({ selector: 'app-user-list', template: '' })
class UserListStubComponent {
  @Input() viewId: string;
  @Input() teams: VmTeam[];
  @Input() isActive: boolean;
  @Output() openTab = new EventEmitter<{ [name: string]: string }>();
}

@Component({ selector: 'app-vm-usage-logging', template: '' })
class VmUsageLoggingStubComponent {}

@Component({ selector: 'app-network-permissions', template: '' })
class NetworkPermissionsStubComponent {
  @Input() canManage: boolean;
}

@Component({ selector: 'app-iso-list', template: '' })
class IsoListStubComponent {
  @Input() viewId: string;
}

@Component({ selector: 'app-focused-app', template: '' })
class FocusedAppStubComponent {
  @Input() vmUrl: string;
}

@Component({ selector: 'app-page-not-found', template: '' })
class PageNotFoundStubComponent {
  @Input() heading: string;
  @Input() message: string;
}

function claim(
  teamId: string,
  extra: Partial<TeamPermissionsClaim> = {},
): TeamPermissionsClaim {
  return {
    viewId: VIEW,
    teamId,
    isPrimary: false,
    permissionValues: [],
    directPermissionValues: [],
    sourceTeamIds: [],
    ...extra,
  };
}

function makeVm(id: string, teamIds: string[]): Vm {
  return { id, name: `vm-${id}`, teamIds };
}

const tabNames = () =>
  screen.getAllByRole('tab').map((t) => t.textContent?.trim());

type SessionStub = Pick<
  VmUISessionService,
  | 'getCurrentViewId'
  | 'getCurrentTeamId'
  | 'loadCurrentView'
  | 'setOpenedTab'
  | 'setOpenedVm'
>;
type AuthStub = Pick<ComnAuthService, 'user$' | 'setUserTheme'>;
type SignalRStub = Pick<
  SignalRService,
  'startConnection' | 'joinView' | 'leaveView'
>;

async function renderVmMain(
  overrides: {
    viewId?: string;
    system?: AppSystemPermission[];
    claims?: TeamPermissionsClaim[];
    teams?: SimpleTeam[];
    vms?: Vm[];
    loggingEnabled?: boolean;
    usageSessions?: VmUsageLoggingSession[];
    teamsError?: unknown;
    sessions?: VmUISession[];
    permissionProviders?: Provider[];
  } = {},
) {
  const {
    viewId = VIEW,
    system = [],
    claims = [claim('team-1', { isPrimary: true })],
    teams = [
      { id: 'team-1', name: 'Blue' },
      { id: 'team-2', name: 'Red' },
    ],
    vms = [makeVm('a', ['team-1'])],
    loggingEnabled = false,
    usageSessions = [],
    teamsError,
    sessions,
    permissionProviders = permissionDataProviders({ system, teams: claims }),
  } = overrides;

  const vmsApi = {
    getTeams: vi.fn(() =>
      teamsError ? throwError(() => teamsError) : of(teams),
    ),
  } satisfies ApiStub<VmsService>;
  const user: User = { id: 'test-user', name: 'Test User' };
  const userApi = {
    getUser: vi.fn(() => of(user)),
  } satisfies ApiStub<UserService>;
  const loggingApi = {
    getIsLoggingEnabled: vi.fn(() => of(loggingEnabled)),
    getAllSessions: vi.fn(() => of(structuredClone(usageSessions))),
  } satisfies ApiStub<VmUsageLoggingSessionService>;
  const session = {
    getCurrentViewId: vi.fn(() => viewId),
    getCurrentTeamId: vi.fn(() => 'team-1'),
    loadCurrentView: vi.fn(),
    setOpenedTab: vi.fn(),
    setOpenedVm: vi.fn(),
  } satisfies SessionStub;
  // The component applies the ?theme query param and loads the signed-in user.
  const auth: AuthStub = {
    user$: of({ profile: { sub: 'test-user' } } as OidcUser),
    setUserTheme: vi.fn(),
  };
  const signalR: SignalRStub = {
    startConnection: vi.fn(() => Promise.resolve()),
    joinView: vi.fn(),
    leaveView: vi.fn(),
  };

  const rendered = await renderComponent(VmMainComponent, {
    childStubs: [
      { replace: TopbarComponent, with: TopbarStubComponent },
      { replace: VmListComponent, with: VmListStubComponent },
      { replace: UserListComponent, with: UserListStubComponent },
      { replace: VmUsageLoggingComponent, with: VmUsageLoggingStubComponent },
      {
        replace: NetworkPermissionsComponent,
        with: NetworkPermissionsStubComponent,
      },
      { replace: IsoListComponent, with: IsoListStubComponent },
      { replace: FocusedAppComponent, with: FocusedAppStubComponent },
      { replace: PageNotFoundComponent, with: PageNotFoundStubComponent },
    ],
    providers: [
      { provide: VmsService, useValue: vmsApi },
      { provide: UserService, useValue: userApi },
      { provide: VmUsageLoggingSessionService, useValue: loggingApi },
      { provide: VmUISessionService, useValue: session },
      { provide: SignalRService, useValue: signalR },
      { provide: ComnAuthService, useValue: auth },
      ...permissionProviders,
    ],
  });

  // The VM list's gates are derived from the VMs in the real store.
  TestBed.inject(VmsStore).set(vms);
  // Sessions restored by persistState live in the real VmUISessionStore.
  if (sessions) {
    TestBed.inject(VmUISessionStore).set(sessions);
  }
  rendered.detectChanges();
  await rendered.fixture.whenStable();

  const stub = <T>(type: new (...args: never[]) => T): T | undefined =>
    rendered.fixture.debugElement.query(By.directive(type))?.componentInstance;

  return {
    ...rendered,
    vmsApi,
    loggingApi,
    signalR,
    session,
    teamPermissionsApi: vi.mocked(TestBed.inject(TeamPermissionService)),
    vmList: () => stub(VmListStubComponent),
    pageNotFound: () => stub(PageNotFoundStubComponent),
    // The Networks tab renders its content only once the tab is selected.
    networkPermissions: () => stub(NetworkPermissionsStubComponent),
  };
}

describe('VmMainComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('VM list read-only gate', () => {
    const CONTROL_TEAM_1 = [
      claim('team-1', {
        isPrimary: true,
        permissionValues: ['ControlTeamVms'],
      }),
      claim('team-2'),
    ];

    /**
     * Verifies: View-level Vm permissions (the near miss of each Control permission) leave the VM list read-only.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForTeams; real VmsStore; VmList stub.
     * Data: system [ViewVms]; primary team-1 with ViewTeamVms and ViewViewVms, and direct ViewViewVms; VM a on team-1.
     */
    it('makes the VM list read-only with View Vm permissions only', async () => {
      const { vmList } = await renderVmMain({
        system: [AppSystemPermission.ViewVms],
        claims: [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ViewTeamVms', 'ViewViewVms'],
            directPermissionValues: ['ViewViewVms'],
          }),
        ],
      });

      expect(vmList()?.readOnly).toBe(true);
    });

    /**
     * Verifies: the ControlVms system permission makes the VM list editable.
     * Interacts with: real UserPermissionsService; VmList stub.
     * Data: system [ControlVms]; VM a on team-1.
     */
    it('enables the VM list with the ControlVms system permission', async () => {
      const { vmList } = await renderVmMain({
        system: [AppSystemPermission.ControlVms],
      });

      expect(vmList()?.readOnly).toBe(false);
    });

    /**
     * Verifies: ControlTeamVms on the team that owns a visible VM enables the list.
     * Interacts with: real UserPermissionsService; real VmsStore (teamIds of the VMs); VmList stub.
     * Data: primary team-1 with ControlTeamVms, team-2 with no grant; VM a on team-1.
     */
    it("enables the VM list with ControlTeamVms on a VM's team", async () => {
      const { vmList } = await renderVmMain({
        claims: CONTROL_TEAM_1,
        vms: [makeVm('a', ['team-1'])],
      });

      expect(vmList()?.readOnly).toBe(false);
    });

    /**
     * Verifies: ControlTeamVms on a team that owns none of the visible VMs leaves the list read-only.
     * Interacts with: real UserPermissionsService; real VmsStore (teamIds of the VMs); VmList stub.
     * Data: primary team-1 with ControlTeamVms, team-2 with no grant; VM b on team-2 only.
     */
    it('keeps the VM list read-only with ControlTeamVms on another team', async () => {
      const { vmList } = await renderVmMain({
        claims: CONTROL_TEAM_1,
        vms: [makeVm('b', ['team-2'])],
      });

      expect(vmList()?.readOnly).toBe(true);
    });

    /**
     * Verifies: ControlViewVms held directly by the primary team enables the list for any team's VMs.
     * Interacts with: real UserPermissionsService (direct view fallback); VmList stub.
     * Data: primary team-1 with direct ControlViewVms; VM b on team-2.
     */
    it('enables the VM list with ControlViewVms held directly by the primary team', async () => {
      const { vmList } = await renderVmMain({
        claims: [
          claim('team-1', {
            isPrimary: true,
            directPermissionValues: ['ControlViewVms'],
          }),
        ],
        vms: [makeVm('b', ['team-2'])],
      });

      expect(vmList()?.readOnly).toBe(false);
    });

    /**
     * Verifies: an empty VM list stays read-only even for a ControlVms holder, because there are no teams to check.
     * Interacts with: real hasEffectivePermissionsForTeams (empty team list).
     * Data: system [ControlVms]; no VMs.
     */
    it('keeps an empty VM list read-only even with ControlVms', async () => {
      const { vmList } = await renderVmMain({
        system: [AppSystemPermission.ControlVms],
        vms: [],
      });

      expect(vmList()?.readOnly).toBe(true);
    });

    /**
     * Verifies: RevertVms on the team of a visible VM is passed to the VM list as canRevertVms true.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForTeams; VmList stub.
     * Data: primary team-1 with RevertVms; VM a on team-1.
     */
    it('passes canRevertVms true with the RevertVms permission', async () => {
      const { vmList } = await renderVmMain({
        claims: [
          claim('team-1', { isPrimary: true, permissionValues: ['RevertVms'] }),
        ],
      });

      expect(vmList()?.canRevertVms).toBe(true);
    });

    /**
     * Verifies: RevertVms on a team that owns none of the visible VMs gives the VM list canRevertVms false.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForTeams; VmList stub.
     * Data: primary team-1 with ControlTeamVms; non-primary team-2 with RevertVms; VM a on team-1 only.
     */
    it('passes canRevertVms false with RevertVms only on another team', async () => {
      const { vmList } = await renderVmMain({
        claims: [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ControlTeamVms'],
          }),
          claim('team-2', { permissionValues: ['RevertVms'] }),
        ],
      });

      expect(vmList()?.canRevertVms).toBe(false);
    });
  });

  describe('VM list view gates', () => {
    /**
     * Verifies: a ManageView or ViewView held directly by the primary team reaches the VM list input of the same name.
     * Interacts with: real UserPermissionsService.can (primary claim's direct permissions); VmList stub.
     * Data: primary team-1 with one direct view permission; the matching input is true, the other false.
     */
    it.each([
      {
        grant: 'ManageView',
        expected: { canManageView: true, canViewView: false },
      },
      {
        grant: 'ViewView',
        expected: { canManageView: false, canViewView: true },
      },
    ])(
      'passes the direct $grant permission to the VM list',
      async ({ grant, expected }) => {
        const { vmList } = await renderVmMain({
          claims: [
            claim('team-1', {
              isPrimary: true,
              directPermissionValues: [grant],
            }),
          ],
        });

        expect(vmList()).toMatchObject(expected);
      },
    );

    /**
     * Verifies: ManageView and ViewView that are not held directly by the primary team give the VM list canManageView and canViewView false.
     * Interacts with: real UserPermissionsService.can (primary claim's direct permissions only); VmList stub.
     * Data: either both permissions effective but not direct on primary team-1, or both direct on non-primary team-2.
     */
    it.each([
      {
        source: 'effective, not direct, on the primary team',
        claims: [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ManageView', 'ViewView'],
          }),
        ],
      },
      {
        source: 'direct on a non-primary team',
        claims: [
          claim('team-1', { isPrimary: true }),
          claim('team-2', {
            directPermissionValues: ['ManageView', 'ViewView'],
          }),
        ],
      },
    ])(
      'passes canManageView and canViewView false with the view grants $source',
      async ({ claims }) => {
        const { vmList } = await renderVmMain({ claims });

        expect(vmList()).toMatchObject({
          canManageView: false,
          canViewView: false,
        });
      },
    );

    /**
     * Verifies: the system ManageViews permission does not reach the VM list as canManageView (current behavior).
     * Interacts with: real UserPermissionsService.can (canManageView$); VmList stub.
     * Data: system [ManageViews]; primary team-1 with no direct permission.
     */
    it('passes canManageView false to the VM list for a system ManageViews holder', async () => {
      const { vmList } = await renderVmMain({
        system: [AppSystemPermission.ManageViews],
      });

      // Current behavior; see agent-docs/ui-test-bugs/vm.ui.md.
      expect(vmList()?.canManageView).toBe(false);
    });
  });

  describe('Networks gate', () => {
    /**
     * Verifies: the ManageNetworks system permission, or ManageNetworks on the primary team, lets the Networks tab manage networks.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForTeams over the view's teams; Networks tab (user-event); NetworkPermissions stub.
     * Data: teams team-1 and team-2; either system [ManageNetworks] or primary team-1 with ManageNetworks.
     */
    it.each([
      {
        source: 'system',
        system: [AppSystemPermission.ManageNetworks],
        teamGrants: [],
      },
      { source: 'primary team', system: [], teamGrants: ['ManageNetworks'] },
    ])(
      'passes canManage true with ManageNetworks from the $source',
      async ({ system, teamGrants }) => {
        const user = userEvent.setup();
        const { networkPermissions } = await renderVmMain({
          system,
          claims: [
            claim('team-1', { isPrimary: true, permissionValues: teamGrants }),
          ],
        });

        await user.click(screen.getByRole('tab', { name: 'Networks' }));

        expect(networkPermissions()?.canManage).toBe(true);
      },
    );

    /**
     * Verifies: ViewNetworks alone opens the Networks tab read-only.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForTeams; Networks tab (user-event); NetworkPermissions stub.
     * Data: primary team-1 with ViewNetworks only.
     */
    it('passes canManage false with ViewNetworks only', async () => {
      const user = userEvent.setup();
      const { networkPermissions } = await renderVmMain({
        claims: [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ViewNetworks'],
          }),
        ],
      });

      await user.click(screen.getByRole('tab', { name: 'Networks' }));

      expect(networkPermissions()?.canManage).toBe(false);
    });
  });

  describe('tabs', () => {
    // Each gated tab with the grant that opens it and a near miss that must not.
    const TAB_GATES = [
      {
        tab: 'Usage Logging',
        allowed: 'system ViewViews',
        allowedGrants: { system: [AppSystemPermission.ViewViews] },
        nearMiss:
          'ViewView effective but not direct on the primary team, plus system ViewVms',
        nearMissGrants: {
          system: [AppSystemPermission.ViewVms],
          claims: [
            claim('team-1', {
              isPrimary: true,
              permissionValues: ['ViewView'],
            }),
          ],
        },
      },
      {
        tab: 'Networks',
        allowed: 'ViewNetworks on a team of the view',
        allowedGrants: {
          claims: [
            claim('team-1', {
              isPrimary: true,
              permissionValues: ['ViewNetworks'],
            }),
          ],
        },
        nearMiss:
          'ViewNetworks held directly by a team outside the primary context',
        nearMissGrants: {
          claims: [
            claim('team-1', { isPrimary: true }),
            claim('team-3', { directPermissionValues: ['ViewNetworks'] }),
          ],
        },
      },
      {
        tab: 'ISOs',
        allowed: 'UploadTeamIsos on the primary team',
        allowedGrants: {
          claims: [
            claim('team-1', {
              isPrimary: true,
              permissionValues: ['UploadTeamIsos'],
            }),
          ],
        },
        nearMiss: 'UploadTeamIsos on a team outside the primary context',
        nearMissGrants: {
          claims: [
            claim('team-1', { isPrimary: true }),
            claim('team-2', { permissionValues: ['UploadTeamIsos'] }),
          ],
        },
      },
    ];

    /**
     * Verifies: each gated tab appears with the grant that opens it.
     * Interacts with: mat-tab-group rendering; real UserPermissionsService gates (showUsageLogging$, showNetworks$, showIsos$).
     * Data: one row per tab with its allowing grant.
     */
    it.each(TAB_GATES)(
      'shows the $tab tab with $allowed',
      async ({ tab, allowedGrants }) => {
        await renderVmMain(allowedGrants);

        expect(tabNames()).toEqual(['VM List', 'User Follow', tab]);
      },
    );

    /**
     * Verifies: each gated tab stays hidden with a close but wrong grant, leaving only VM List and User Follow.
     * Interacts with: mat-tab-group rendering; real UserPermissionsService gates.
     * Data: one row per tab with its near-miss grant.
     */
    it.each(TAB_GATES)(
      'hides the $tab tab with $nearMiss',
      async ({ nearMissGrants }) => {
        await renderVmMain(nearMissGrants);

        expect(tabNames()).toEqual(['VM List', 'User Follow']);
      },
    );

    /**
     * Verifies: each permission that showIsos$ accepts opens the ISOs tab on its own.
     * Interacts with: mat-tab-group rendering; real UserPermissionsService.hasEffectivePermissionsForPrimaryContext (showIsos$).
     * Data: one row per permission: system DeleteIsos, or one team or View ISO permission on primary team-1.
     */
    it.each([
      {
        grant: 'system DeleteIsos',
        system: [AppSystemPermission.DeleteIsos],
        values: [],
      },
      { grant: 'UploadTeamIsos', system: [], values: ['UploadTeamIsos'] },
      { grant: 'DeleteTeamIsos', system: [], values: ['DeleteTeamIsos'] },
      { grant: 'UploadViewIsos', system: [], values: ['UploadViewIsos'] },
      { grant: 'DeleteViewIsos', system: [], values: ['DeleteViewIsos'] },
    ])('shows the ISOs tab with $grant', async ({ system, values }) => {
      await renderVmMain({
        system,
        claims: [
          claim('team-1', { isPrimary: true, permissionValues: values }),
        ],
      });

      expect(tabNames()).toEqual(['VM List', 'User Follow', 'ISOs']);
    });

    /**
     * Verifies: ViewView held directly by the primary team opens the Usage Logging tab without system ViewViews.
     * Interacts with: mat-tab-group rendering; real UserPermissionsService.can (showUsageLogging$).
     * Data: primary team-1 with direct ViewView; no system permission.
     */
    it('shows the Usage Logging tab with ViewView held directly by the primary team', async () => {
      await renderVmMain({
        claims: [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ViewView'],
            directPermissionValues: ['ViewView'],
          }),
        ],
      });

      expect(tabNames()).toEqual(['VM List', 'User Follow', 'Usage Logging']);
    });

    /**
     * Verifies: the Networks, ISOs and Usage Logging tabs follow their permissions, in that order after the static tabs.
     * Interacts with: mat-tab-group rendering; real UserPermissionsService gates.
     * Data: system [ViewViews]; primary team-1 with ViewNetworks and UploadTeamIsos.
     */
    it('adds Usage Logging, Networks and ISOs with their permissions', async () => {
      await renderVmMain({
        system: [AppSystemPermission.ViewViews],
        claims: [
          claim('team-1', {
            isPrimary: true,
            permissionValues: ['ViewNetworks', 'UploadTeamIsos'],
          }),
        ],
      });

      expect(tabNames()).toEqual([
        'VM List',
        'User Follow',
        'Usage Logging',
        'Networks',
        'ISOs',
      ]);
    });
  });

  describe('view loading', () => {
    /**
     * Verifies: the view's teams, the caller's permissions, the UI session and the hub are loaded for the routed view.
     * Interacts with: VmUISessionService stub (getCurrentViewId, loadCurrentView); stubbed VmsService.getTeams, stubbed TeamPermissionService.getMyTeamPermissions, SignalRService stub.
     * Data: UUID view id.
     */
    it('loads teams and permissions and joins the view hub', async () => {
      const { vmsApi, teamPermissionsApi, signalR, session } =
        await renderVmMain();

      expect(session.getCurrentViewId).toHaveBeenCalled();
      expect(vmsApi.getTeams).toHaveBeenCalledWith(VIEW);
      expect(teamPermissionsApi.getMyTeamPermissions).toHaveBeenCalledWith(
        VIEW,
        undefined,
        true,
      );
      expect(signalR.startConnection).toHaveBeenCalled();
      expect(signalR.joinView).toHaveBeenCalledWith(VIEW);
      expect(session.loadCurrentView).toHaveBeenCalled();
    });

    /**
     * Verifies: a failed teams request falls back to no teams and shows View Not Found.
     * Interacts with: stubbed VmsService.getTeams (throwError); the getTeams catchError branch; PageNotFound stub.
     * Data: getTeams fails with { status: 500 }.
     */
    it('shows View Not Found when the teams request fails', async () => {
      const { pageNotFound, vmList } = await renderVmMain({
        teamsError: { status: 500 },
      });

      expect(pageNotFound()).toBeDefined();
      expect(vmList()).toBeUndefined();
    });

    /**
     * Verifies: failed permission requests are caught, so the page still renders with the ungated tabs only.
     * Interacts with: the real UserPermissionsService (plain class, loaded by the component) over failing player PermissionService and TeamPermissionService stubs; the permission catchError branches.
     * Data: getMyPermissions and getMyTeamPermissions fail with { status: 503 }.
     */
    it('keeps the page up when the permission requests fail', async () => {
      const failing = () => throwError(() => ({ status: 503 }));
      const permissionsApi = {
        getMyPermissions: vi.fn(failing),
      } satisfies ApiStub<PermissionService>;
      const teamPermissionsApi = {
        getMyTeamPermissions: vi.fn(failing),
      } satisfies ApiStub<TeamPermissionService>;
      const { pageNotFound } = await renderVmMain({
        permissionProviders: [
          { provide: PermissionService, useValue: permissionsApi },
          { provide: TeamPermissionService, useValue: teamPermissionsApi },
          UserPermissionsService,
        ],
      });

      expect(permissionsApi.getMyPermissions).toHaveBeenCalled();
      expect(teamPermissionsApi.getMyTeamPermissions).toHaveBeenCalledWith(
        VIEW,
        undefined,
        true,
      );
      expect(pageNotFound()).toBeUndefined();
      expect(tabNames()).toEqual(['VM List', 'User Follow']);
    });

    /**
     * Verifies: a view with no teams shows View Not Found instead of the tabs.
     * Interacts with: stubbed VmsService.getTeams (empty); PageNotFound stub.
     * Data: getTeams returns [].
     */
    it('shows View Not Found when the view has no teams', async () => {
      const { pageNotFound, vmList } = await renderVmMain({ teams: [] });

      expect(pageNotFound()).toBeDefined();
      expect(vmList()).toBeUndefined();
    });

    /**
     * Verifies: a malformed view id is not sent to the API and shows View Not Found.
     * Interacts with: stubbed VmsService.getTeams; PageNotFound stub.
     * Data: view id 'not-a-guid'.
     */
    it('does not load a malformed view id', async () => {
      const { vmsApi, pageNotFound } = await renderVmMain({
        viewId: 'not-a-guid',
      });

      expect(vmsApi.getTeams).not.toHaveBeenCalled();
      expect(pageNotFound()).toBeDefined();
    });

    /**
     * Verifies: leaving the page leaves the view's hub group.
     * Interacts with: SignalRService.leaveView stub.
     * Data: UUID view id; fixture destroyed.
     */
    it('leaves the view hub on destroy', async () => {
      const { fixture, signalR } = await renderVmMain();

      fixture.destroy();

      expect(signalR.leaveView).toHaveBeenCalledWith(VIEW);
    });
  });

  describe('UI session', () => {
    const SESSION: VmUISession = {
      ...initialVmUISession,
      id: 'team-1',
      viewId: VIEW,
    };
    const VM_TAB = { name: 'vm-a', url: 'http://console.test/vm-a' };

    /**
     * Verifies: selecting a tab records it in the current team's saved session.
     * Interacts with: VmUISessionService stub (getCurrentTeamId, setOpenedTab); real VmUISessionStore/Query; tab click (user-event).
     * Data: saved session for team-1 on the VM List tab; User Follow tab clicked.
     */
    it('records a tab change in the saved session', async () => {
      const user = userEvent.setup();
      const { session } = await renderVmMain({ sessions: [SESSION] });

      await user.click(screen.getByRole('tab', { name: 'User Follow' }));

      expect(session.getCurrentTeamId).toHaveBeenCalled();
      expect(session.setOpenedTab).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'team-1' }),
        1,
      );
    });

    /**
     * Verifies: a VM opened from the VM list gets its own selected tab and is saved, and closing the tab removes it again.
     * Interacts with: VmList stub openVmHere output; VmUISessionService stub (setOpenedVm, setOpenedTab); the tab's Close button (user-event).
     * Data: saved session for team-1; no gated tabs, so the VM tab is index 2; VM vm-a.
     */
    it('opens a VM from the VM list in a tab and closes it', async () => {
      const user = userEvent.setup();
      const { session, vmList, detectChanges } = await renderVmMain({
        sessions: [SESSION],
      });

      vmList()!.openVmHere.emit(VM_TAB);
      detectChanges();

      expect(session.setOpenedVm).toHaveBeenCalledWith(VM_TAB, true);
      expect(session.setOpenedTab).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'team-1' }),
        2,
      );
      expect(tabNames()).toEqual(['VM List', 'User Follow', 'vm-a']);

      session.setOpenedVm.mockClear();
      session.setOpenedTab.mockClear();
      await user.click(screen.getByRole('button', { name: 'Close vm-a' }));

      // remove() goes back to the VM List tab; the tab group may then report its own
      // re-selection, so the explicit call is asserted rather than the last one.
      expect(session.setOpenedVm).toHaveBeenCalledExactlyOnceWith(
        VM_TAB,
        false,
      );
      expect(session.setOpenedTab).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'team-1' }),
        0,
      );
      expect(tabNames()).toEqual(['VM List', 'User Follow']);
    });

    /**
     * Verifies: VMs saved in the session are reopened as tabs on load.
     * Interacts with: real VmUISessionStore/Query (seeded session); VmUISessionService stub setOpenedVm.
     * Data: saved session for team-1 with vm-a open.
     */
    it('reopens the VMs saved in the session', async () => {
      const { session, detectChanges } = await renderVmMain({
        sessions: [{ ...SESSION, openedVms: [VM_TAB] }],
      });
      detectChanges();

      expect(session.setOpenedVm).toHaveBeenCalledWith(VM_TAB, true);
      expect(tabNames()).toEqual(['VM List', 'User Follow', 'vm-a']);
    });
  });

  describe('usage data on a view with no teams', () => {
    const SESSION: VmUsageLoggingSession = {
      id: 'session-1',
      viewId: VIEW,
      sessionName: 'Exercise day 1',
    };

    /**
     * Verifies: a ViewViews holder still gets the page, with Usage Logging, for a view that has no teams but has logging sessions.
     * Interacts with: real UserPermissionsService.hasSystemPermission; stubbed VmUsageLoggingSessionService (logging on, getAllSessions); PageNotFound stub.
     * Data: getTeams returns []; system [ViewViews]; logging enabled; one session.
     */
    it('keeps the page up for ViewViews when the view has usage sessions', async () => {
      const { loggingApi, pageNotFound } = await renderVmMain({
        teams: [],
        system: [AppSystemPermission.ViewViews],
        loggingEnabled: true,
        usageSessions: [SESSION],
      });

      expect(loggingApi.getAllSessions).toHaveBeenCalledWith(VIEW);
      expect(pageNotFound()).toBeUndefined();
      expect(tabNames()).toEqual(['Usage Logging']);
    });

    /**
     * Verifies: without system ViewViews the usage sessions are not looked up and the teamless view shows View Not Found.
     * Interacts with: real UserPermissionsService.hasSystemPermission; stubbed VmUsageLoggingSessionService; PageNotFound stub.
     * Data: getTeams returns []; system [ViewVms] and direct ViewView on the primary team (near misses of system ViewViews); logging enabled; one session.
     */
    it('shows View Not Found without system ViewViews even when sessions exist', async () => {
      const { loggingApi, pageNotFound } = await renderVmMain({
        teams: [],
        system: [AppSystemPermission.ViewVms],
        claims: [
          claim('team-1', {
            isPrimary: true,
            directPermissionValues: ['ViewView'],
          }),
        ],
        loggingEnabled: true,
        usageSessions: [SESSION],
      });

      expect(loggingApi.getAllSessions).not.toHaveBeenCalled();
      expect(pageNotFound()).toBeDefined();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    /**
     * Verifies: with ViewViews but no logging sessions the teamless view shows View Not Found.
     * Interacts with: real UserPermissionsService.hasSystemPermission; stubbed VmUsageLoggingSessionService (empty getAllSessions); PageNotFound stub.
     * Data: getTeams returns []; system [ViewViews]; logging enabled; no sessions.
     */
    it('shows View Not Found for ViewViews when the view has no sessions', async () => {
      const { pageNotFound } = await renderVmMain({
        teams: [],
        system: [AppSystemPermission.ViewViews],
        loggingEnabled: true,
      });

      expect(pageNotFound()).toBeDefined();
    });
  });
});
