// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  APP_INITIALIZER,
  enableProdMode,
  ErrorHandler,
  importProvidersFrom,
  provideZoneChangeDetection
} from '@angular/core';
import { environment } from './environments/environment';
import { enableAkitaProdMode, persistState } from '@datorama/akita';
import { AppComponent } from './app/app.component';
import { DragToSelectModule } from 'ngx-drag-to-select';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { provideAnimations } from '@angular/platform-browser/animations';
import { bootstrapApplication } from '@angular/platform-browser';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BASE_PATH as PLAYER_BASE_PATH } from './app/generated/player-api';
import {
  MAT_TOOLTIP_DEFAULT_OPTIONS,
  MatTooltipDefaultOptions,
} from '@angular/material/tooltip';
import {
  ComnSettingsService,
  ComnSettingsModule,
  ComnAuthModule,
} from '@cmusei/crucible-common';
import { BASE_PATH } from './app/generated/vm-api';
import { ErrorService } from './app/services/error/error.service';
import { WelderService } from './app/services/welder/welder.service';
import { SystemMessageService } from './app/services/system-message/system-message.service';
import { DialogService } from './app/services/dialog/dialog.service';
import { TeamsService } from './app/services/teams/teams.service';
import { FileService } from './app/services/file/file.service';
import { AutoDeployService } from './app/services/auto-deploy/auto-deploy.service';
import { VmMapsQuery } from './app/state/vmMaps/vm-maps.query';
import { VmMapsService } from './app/state/vmMaps/vm-maps.service';
import { VmService } from './app/state/vms/vms.service';
import { DynamicThemeService } from './app/services/dynamic-theme.service';
import { initializeTheme } from './app/services/theme-initializer.factory';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

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

export const storage = persistState({
  key: 'akita-vm-ui',
  include: ['vmUISession'],
});

const providers = [{ provide: 'persistStorage', useValue: storage }];

if (environment.production) {
  enableProdMode();
  enableAkitaProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),importProvidersFrom(
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
    DialogService,
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
    DynamicThemeService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTheme,
      deps: [ComnSettingsService, DynamicThemeService],
      multi: true,
    },
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
    provideAnimations(),
    provideRouter(routes),
  ],
}).catch((err) => console.log(err));
