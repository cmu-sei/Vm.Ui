// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { EMPTY, of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  CrucibleDialogService,
} from '@cmusei/crucible-common';
import { AnyProvider, mergeProviders, unstubbed } from './unstubbed';

// 1. App services that components inject (SignalR, error, dialog, system
//    message, xAPI, ...). Stores, queries and data services stay REAL: they are
//    the state under test. Do not list them here. The exceptions are data
//    services whose constructor reads `router.routerState.snapshot.root.firstChild`:
//    VmService and the app FileService throw without navigation, and
//    VmUISessionService (`firstChild?.params`) silently ends up with viewId
//    undefined. They are placeholders here; their own specs use the real
//    service under RouterTestingHarness, and component specs pass a typed stub.
import { AutoDeployService } from '../services/auto-deploy/auto-deploy.service';
import { ErrorService } from '../services/error/error.service';
import { FileService as AppFileService } from '../services/file/file.service';
import { UserPermissionsService } from '../services/permissions/user-permissions.service';
import { SignalRService } from '../services/signalr/signalr.service';
import { SystemMessageService } from '../services/system-message/system-message.service';
import { TeamsService } from '../services/teams/teams.service';
import { ThemeService } from '../services/theme/theme.service';
import { WelderService } from '../services/welder/welder.service';
import { VmUISessionService } from '../state/vm-ui-session/vm-ui-session.service';
import { VmService } from '../state/vms/vms.service';

// 2. Every generated API service under src/app/generated/<app>-api.
//    vm.ui has two generated clients, and both define FileService and
//    HealthService, so those placeholders carry a label naming the client.
import {
  CallbacksService,
  FileService as VmApiFileService,
  HealthService as VmApiHealthService,
  NetworksService,
  ProxmoxService,
  VmUsageLoggingSessionService,
  VmsService,
  VsphereService,
} from '../generated/vm-api';
import {
  ApplicationService,
  FileService as PlayerApiFileService,
  HealthService as PlayerApiHealthService,
  PermissionService,
  RoleService,
  TeamMembershipService,
  TeamPermissionScopeService,
  TeamPermissionService,
  TeamRoleService,
  TeamService,
  UserService,
  ViewMembershipService,
  ViewService,
  WebhookService,
  XApiService,
} from '../generated/player-api';

// 3. RouterQuery, only if the app uses @datorama/akita-ng-router-store.
import { RouterQuery } from '@datorama/akita-ng-router-store';

export function getDefaultProviders(
  overrides?: readonly AnyProvider[],
): AnyProvider[] {
  const defaults: AnyProvider[] = [
    // App services
    unstubbed(AutoDeployService),
    { provide: ErrorService, useValue: { handleError: () => {} } },
    unstubbed(AppFileService, 'FileService (app, services/file)'),
    unstubbed(UserPermissionsService),
    unstubbed(SignalRService),
    unstubbed(SystemMessageService),
    unstubbed(TeamsService),
    unstubbed(ThemeService),
    unstubbed(WelderService),
    // Router-reading data services (see 1. above).
    unstubbed(VmService),
    unstubbed(VmUISessionService),

    // Generated API services: one `unstubbed(...)` per service. A test that
    // needs an endpoint passes `{ provide: XService, useValue: xApi }` built
    // with `satisfies ApiStub<XService>`.
    // vm-api
    unstubbed(CallbacksService),
    unstubbed(VmApiFileService, 'FileService (vm-api)'),
    unstubbed(VmApiHealthService, 'HealthService (vm-api)'),
    unstubbed(NetworksService),
    unstubbed(ProxmoxService),
    unstubbed(VmUsageLoggingSessionService),
    unstubbed(VmsService),
    unstubbed(VsphereService),
    // player-api
    unstubbed(ApplicationService),
    unstubbed(PlayerApiFileService, 'FileService (player-api)'),
    unstubbed(PlayerApiHealthService, 'HealthService (player-api)'),
    unstubbed(PermissionService),
    unstubbed(RoleService),
    unstubbed(TeamMembershipService),
    unstubbed(TeamPermissionScopeService),
    unstubbed(TeamPermissionService),
    unstubbed(TeamRoleService),
    unstubbed(TeamService),
    unstubbed(UserService),
    unstubbed(ViewMembershipService),
    unstubbed(ViewService),
    unstubbed(WebhookService),
    unstubbed(XApiService),

    // Akita router (only if used)
    {
      provide: RouterQuery,
      useValue: {
        selectQueryParams: () => of(null),
        select: () => of(null),
        getParams: () => null,
      },
    },

    // Common library
    {
      provide: ComnSettingsService,
      useValue: {
        settings: {
          ApiUrl: '',
          // 4. Add the keys this app reads from settings.json, with neutral values.
          ApiPlayerUrl: '',
          UserFollowUrl: '',
          AppTopBarText: '',
          AppTopBarHexColor: '#000000',
          AppTopBarHexTextColor: '#FFFFFF',
          AppLightModePrimaryHexColor: '#000000',
          AppLightModePrimaryHexTextColor: '#FFFFFF',
          AppDarkModePrimaryHexColor: '#000000',
          AppDarkModePrimaryHexTextColor: '#FFFFFF',
        },
      },
    },
    {
      provide: ComnAuthService,
      useValue: {
        isAuthenticated$: of(true),
        // Use `of({ profile: { sub: '' } })` if the app reads user.profile.
        user$: of({ profile: { sub: '' } }),
        logout: () => {},
      },
    },
    {
      provide: ComnAuthQuery,
      useValue: {
        userTheme$: of('light-theme'),
        isLoggedIn$: of(true),
      },
    },
    unstubbed(CrucibleDialogService),

    // Dialog tokens
    { provide: MAT_DIALOG_DATA, useValue: {} },
    {
      provide: MatDialogRef,
      useValue: {
        close: () => {},
        beforeClosed: () => EMPTY,
        afterClosed: () => EMPTY,
        keydownEvents: () => EMPTY,
      },
    },

    // Router
    {
      provide: ActivatedRoute,
      useValue: {
        params: of({}),
        paramMap: of(convertToParamMap({})),
        queryParams: of({}),
        queryParamMap: of(convertToParamMap({})),
        snapshot: {
          params: {},
          paramMap: convertToParamMap({}),
          queryParams: {},
          queryParamMap: convertToParamMap({}),
        },
      },
    },
  ];

  return mergeProviders(defaults, overrides);
}
