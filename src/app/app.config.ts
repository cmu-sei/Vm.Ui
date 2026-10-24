// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { environment } from '../environments/environment';
import { DragToSelectModule } from 'ngx-drag-to-select';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import {
  withInterceptorsFromDi,
  provideHttpClient,
} from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BASE_PATH as PLAYER_BASE_PATH } from './generated/player-api';
import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MatTooltipDefaultOptions,
} from '@angular/material/tooltip';
import {
  ComnSettingsService,
  ComnSettingsModule,
  ComnAuthModule,
  provideCrucibleTheme,
} from '@cmusei/crucible-common';
import { BASE_PATH } from './generated/vm-api';
import { ErrorService } from './services/error/error.service';
import { WelderService } from './services/welder/welder.service';
import { SystemMessageService } from './services/system-message/system-message.service';
import { TeamsService } from './services/teams/teams.service';
import { FileService } from './services/file/file.service';
import { AutoDeployService } from './services/auto-deploy/auto-deploy.service';
import { VmMapsQuery } from './state/vmMaps/vm-maps.query';
import { VmMapsService } from './state/vmMaps/vm-maps.service';
import { VmService } from './state/vms/vms.service';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

/** Custom options the configure the tooltip's default show/hide delays. */
export const myCustomTooltipDefaults: MatTooltipDefaultOptions = {
  showDelay: 1000,
  hideDelay: 0,
  touchendHideDelay: 1000,
};

export function getBasePath(settingsSvc: ComnSettingsService) {
  return sanitizeBasePath(settingsSvc.settings.ApiUrl);
}

export function getPlayerBasePath(settingsSvc: ComnSettingsService) {
  return sanitizeBasePath(settingsSvc.settings.ApiPlayerUrl);
}

function sanitizeBasePath(url: string) {
  if (url.endsWith('/')) {
    url = url.slice(0, url.length - 1);
  }

  return url.replace('/api', '');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    importProvidersFrom(
      ComnSettingsModule.forRoot(),
      ComnAuthModule.forRoot(),
      [
        environment.production ? [] : AkitaNgDevtools.forRoot(),
        AkitaNgRouterStoreModule,
      ],
      DragToSelectModule.forRoot(),
    ),
    VmService,
    VmMapsService,
    VmMapsQuery,
    AutoDeployService,
    FileService,
    TeamsService,
    SystemMessageService,
    WelderService,
    {
      provide: ErrorHandler,
      useClass: ErrorService,
    },
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myCustomTooltipDefaults },
    {
      provide: PLAYER_BASE_PATH,
      useFactory: getPlayerBasePath,
      deps: [ComnSettingsService],
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideCrucibleTheme({ brand: { color: '#3B62A5', text: '#FFFFFF' } }),
  ],
};
