// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { enableAkitaProdMode, persistState } from '@datorama/akita';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { bootstrapApplication } from '@angular/platform-browser';

export const storage = persistState({
  key: 'akita-vm-ui',
  include: ['vmUISession'],
});

const providers = [{ provide: 'persistStorage', useValue: storage }];

if (environment.production) {
  enableProdMode();
  enableAkitaProdMode();
}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.log(err));
