// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Provider } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, EMPTY, ReplaySubject } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Crucible common
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
} from '@cmusei/crucible-common';

// Akita
import { RouterQuery } from '@datorama/akita-ng-router-store';

// Akita stores
import { VmsStore } from '../state/vms/vms.store';
import { VmTeamsStore } from '../state/vm-teams/vm-teams.store';
import { VmUsersStore } from '../state/vm-users/vm-users.store';
import { VmMapsStore } from '../state/vmMaps/vm-maps.store';
import { VmUISessionStore } from '../state/vm-ui-session/vm-ui-session.store';

// Akita queries
import { VmsQuery } from '../state/vms/vms.query';
import { VmTeamsQuery } from '../state/vm-teams/vm-teams.query';
import { VmUsersQuery } from '../state/vm-users/vm-users.query';
import { VmMapsQuery } from '../state/vmMaps/vm-maps.query';
import { VmUISessionQuery } from '../state/vm-ui-session/vm-ui-session.query';

// App services
import { VmService } from '../state/vms/vms.service';
import { VmTeamsService } from '../state/vm-teams/vm-teams.service';
import { VmUsersService } from '../state/vm-users/vm-users.service';
import { VmMapsService } from '../state/vmMaps/vm-maps.service';
import { VmUISessionService } from '../state/vm-ui-session/vm-ui-session.service';
import { DialogService } from '../services/dialog/dialog.service';
import { FileService } from '../services/file/file.service';
import { TeamsService } from '../services/teams/teams.service';
import { SignalRService } from '../services/signalr/signalr.service';
import { SystemMessageService } from '../services/system-message/system-message.service';
import { ErrorService } from '../services/error/error.service';
import { AutoDeployService } from '../services/auto-deploy/auto-deploy.service';
import { WelderService } from '../services/welder/welder.service';
import { ThemeService } from '../services/theme/theme.service';
import { DynamicThemeService } from '../services/dynamic-theme.service';
import { UserPermissionsService } from '../services/permissions/user-permissions.service';

// Generated VM API services
import {
  VmsService as VmApiVmsService,
  CallbacksService,
  FileService as VmApiFileService,
  HealthService as VmApiHealthService,
  ProxmoxService,
  VmUsageLoggingSessionService,
  VsphereService,
  BASE_PATH as VM_BASE_PATH,
} from '../generated/vm-api';

// Generated Player API services
import {
  ApplicationService,
  FileService as PlayerApiFileService,
  HealthService as PlayerApiHealthService,
  PermissionService,
  RoleService,
  TeamService,
  TeamMembershipService,
  TeamPermissionService,
  TeamRoleService,
  UserService,
  ViewService,
  ViewMembershipService,
  WebhookService,
  BASE_PATH as PLAYER_BASE_PATH,
} from '../generated/player-api';

/** Stub that returns empty observable for any method call */
function createStub(methods: string[] = []): any {
  const stub: any = {};
  for (const m of methods) {
    stub[m] = (..._args: any[]) => of(undefined);
  }
  return stub;
}

/** Creates a mock store */
function createMockStore(): any {
  return {
    set: () => {},
    add: () => {},
    update: () => {},
    remove: () => {},
    setLoading: () => {},
    getValue: () => ({ entities: {}, ids: [] }),
  };
}

/** Creates a mock query */
function createMockQuery(): any {
  return {
    selectAll: () => of([]),
    selectEntity: () => of(undefined),
    select: () => of(undefined),
    getAll: () => [],
    getEntity: () => undefined,
    getValue: () => ({ entities: {}, ids: [] }),
    selectActive: () => of(undefined),
    getActive: () => undefined,
  };
}

const mockRouter = {
  navigate: () => Promise.resolve(true),
  navigateByUrl: () => Promise.resolve(true),
  routerState: {
    snapshot: {
      root: {
        firstChild: {
          params: { viewId: 'test-view-id', teamId: 'test-team-id' },
        },
      },
    },
  },
  events: EMPTY,
};

const mockActivatedRoute = {
  params: of({}),
  queryParams: of({}),
  queryParamMap: of({
    get: () => null,
    has: () => false,
    getAll: () => [],
    keys: [],
  }),
  snapshot: {
    params: { viewId: 'test-view-id', teamId: 'test-team-id' },
    queryParams: {},
  },
  parent: { params: of({}) },
};

const mockSettingsService = {
  settings: {
    ApiUrl: 'http://localhost:4302',
    DeployApiUrl: 'http://localhost:4300',
    WelderUrl: 'http://localhost:4300',
    AppTopBarHexColor: '#C41230',
    AppTopBarHexTextColor: '#FFFFFF',
    AppPrimaryThemeColor: '#BB0000',
  },
};

const mockAuthService = {
  user$: of({
    profile: { sub: 'test-user-id', name: 'Test User' },
  }),
  getAuthorizationToken: () => 'mock-token',
  setUserTheme: () => {},
  isAuthenticated: () => of(true),
  login: () => {},
  logout: () => {},
};

const mockAuthQuery = {
  userTheme$: of('LIGHT'),
  user$: of({
    profile: { sub: 'test-user-id', name: 'Test User' },
  }),
  getValue: () => ({ ui: { theme: 'LIGHT' } }),
  isLoggedIn$: of(true),
};

const mockRouterQuery = {
  selectQueryParams: () => of(undefined),
  selectParams: () => of({}),
};

const mockUserPermissionsService = {
  permissions$: of([]),
  teamPermissions$: of([]),
  load: () => of([]),
  loadTeamPermissions: () => of([]),
  hasPermission: () => of(false),
  getPrimaryTeamId: () => of('test-team-id'),
  can: () => of(false),
};

const mockSignalRService = {
  startConnection: () => Promise.resolve(),
  joinView: () => {},
  leaveView: () => {},
  joinViewUsers: () => {},
  leaveViewUsers: () => {},
};

const mockVmService = {
  viewId: 'test-view-id',
  teamId: 'test-team-id',
  add: () => {},
  update: () => {},
  remove: () => {},
  GetViewVms: () => of([]),
  GetTeamVms: () => of([]),
  GetViewVmsByName: () => of([]),
  powerOn: () => of({ errors: {} }),
  powerOff: () => of({ errors: {} }),
  shutdown: () => of({ errors: {} }),
  reboot: () => of({ errors: {} }),
  revert: () => of({ errors: {} }),
};

const mockVmUISessionService = {
  viewId: 'test-view-id',
  teamId: 'test-team-id',
  add: () => {},
  update: () => {},
  remove: () => {},
  loadCurrentView: () => {},
  setOpenedVm: () => {},
  getCurrentViewId: () => 'test-view-id',
  getCurrentTeamId: () => 'test-team-id',
  setOpenedTab: () => {},
  setSearchValueChanged: () => {},
  setShowIPsSelectedChanged: () => {},
  setShowIPv4OnlySelected: () => {},
};

const mockDialogService = {
  confirm: () => of({ wasCancelled: true, confirm: false }),
  message: () => of(undefined),
};

function buildDefaultProviders(): Provider[] {
  return [
    // Angular
    { provide: Router, useValue: mockRouter },
    { provide: ActivatedRoute, useValue: mockActivatedRoute },
    { provide: HttpClient, useValue: createStub(['get', 'post', 'put', 'delete', 'patch', 'request']) },
    { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: (v: string) => v, sanitize: () => '' } },

    // Material
    { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined), componentInstance: {} }) } },
    { provide: MatDialogRef, useValue: { close: () => {}, disableClose: false, componentInstance: {} } },
    { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatBottomSheet, useValue: { open: () => {} } },
    { provide: MatSnackBar, useValue: { open: () => {} } },

    // Crucible common
    { provide: ComnAuthService, useValue: mockAuthService },
    { provide: ComnAuthQuery, useValue: mockAuthQuery },
    { provide: ComnSettingsService, useValue: mockSettingsService },

    // Akita
    { provide: RouterQuery, useValue: mockRouterQuery },

    // Akita stores
    { provide: VmsStore, useValue: createMockStore() },
    { provide: VmTeamsStore, useValue: createMockStore() },
    { provide: VmUsersStore, useValue: createMockStore() },
    { provide: VmMapsStore, useValue: createMockStore() },
    { provide: VmUISessionStore, useValue: createMockStore() },

    // Akita queries
    { provide: VmsQuery, useValue: createMockQuery() },
    { provide: VmTeamsQuery, useValue: createMockQuery() },
    { provide: VmUsersQuery, useValue: { ...createMockQuery(), selectByTeam: () => of([]) } },
    { provide: VmMapsQuery, useValue: { ...createMockQuery(), getById: () => of(undefined), getByViewId: () => of([]), getMapCoordinates: () => of([]) } },
    { provide: VmUISessionQuery, useValue: createMockQuery() },

    // App services
    { provide: VmService, useValue: mockVmService },
    { provide: VmTeamsService, useValue: createStub(['set', 'add', 'update', 'remove']) },
    { provide: VmUsersService, useValue: createStub(['set', 'get', 'add', 'update', 'remove']) },
    { provide: VmMapsService, useValue: createStub(['get', 'getViewMaps', 'getTeamMap', 'add', 'update', 'remove', 'unload']) },
    { provide: VmUISessionService, useValue: mockVmUISessionService },
    { provide: DialogService, useValue: mockDialogService },
    { provide: FileService, useValue: createStub(['uploadIso']) },
    { provide: TeamsService, useValue: { GetAllMyTeams: () => of([]) } },
    { provide: SignalRService, useValue: mockSignalRService },
    { provide: SystemMessageService, useValue: { displayMessage: () => {} } },
    { provide: ErrorService, useValue: { handleError: () => {} } },
    { provide: AutoDeployService, useValue: createStub(['getDeploymentForView', 'deployToView']) },
    { provide: WelderService, useValue: createStub(['getDeploymentForView', 'deployToView', 'getQueueSize']) },
    { provide: ThemeService, useValue: { addThemeQueryParam: (url: string) => url } },
    { provide: DynamicThemeService, useValue: { generateThemeFromHex: () => ({ light: {}, dark: {} }), applyThemeToDocument: () => {}, applyLightTheme: () => {}, applyDarkTheme: () => {} } },
    { provide: UserPermissionsService, useValue: mockUserPermissionsService },

    // Generated VM API services
    { provide: VmApiVmsService, useValue: createStub(['getTeamVms', 'getAllMaps', 'getViewMaps', 'getTeamMap', 'createMap', 'updateMap', 'deleteMap', 'bulkPowerOn', 'bulkPowerOff', 'bulkShutdown', 'bulkReboot', 'bulkRevert']) },
    { provide: CallbacksService, useValue: createStub([]) },
    { provide: VmApiFileService, useValue: createStub([]) },
    { provide: VmApiHealthService, useValue: createStub(['healthCheck']) },
    { provide: ProxmoxService, useValue: createStub([]) },
    { provide: VmUsageLoggingSessionService, useValue: { getIsLoggingEnabled: () => of(false), ...createStub([]) } },
    { provide: VsphereService, useValue: createStub([]) },
    { provide: VM_BASE_PATH, useValue: 'http://localhost:4302' },

    // Generated Player API services
    { provide: ApplicationService, useValue: createStub([]) },
    { provide: PlayerApiFileService, useValue: createStub([]) },
    { provide: PlayerApiHealthService, useValue: createStub([]) },
    { provide: PermissionService, useValue: { getMyPermissions: () => of([]) } },
    { provide: RoleService, useValue: createStub([]) },
    { provide: TeamService, useValue: { getViewTeams: () => of([]), getMyViewTeams: () => of([]) } },
    { provide: TeamMembershipService, useValue: createStub([]) },
    { provide: TeamPermissionService, useValue: { getMyTeamPermissions: () => of([]) } },
    { provide: TeamRoleService, useValue: createStub([]) },
    { provide: UserService, useValue: { getUser: () => of({ id: 'test-user-id', name: 'Test User' }) } },
    { provide: ViewService, useValue: createStub([]) },
    { provide: ViewMembershipService, useValue: createStub([]) },
    { provide: WebhookService, useValue: createStub([]) },
    { provide: PLAYER_BASE_PATH, useValue: 'http://localhost:4300' },
  ];
}

/**
 * Returns the default set of mock providers for Vitest component tests.
 * If `overrides` are provided, any provider with a matching `provide` token
 * replaces the default for that token.
 */
export function getDefaultProviders(overrides?: Provider[]): Provider[] {
  const defaults = buildDefaultProviders();
  if (!overrides || overrides.length === 0) {
    return defaults;
  }

  const overrideTokens = new Set(
    overrides.map((p: any) => p.provide ?? p)
  );

  return [
    ...defaults.filter((p: any) => !overrideTokens.has(p.provide ?? p)),
    ...overrides,
  ];
}
