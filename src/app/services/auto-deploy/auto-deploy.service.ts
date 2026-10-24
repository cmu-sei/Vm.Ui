// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ComnSettingsService } from '@cmusei/crucible-common';

@Injectable()
export class AutoDeployService {
  private http = inject(HttpClient);
  private settings = inject(ComnSettingsService);
  private router = inject(Router);

  private deployUrl: string;

  constructor() {
    const settings = this.settings;

    this.deployUrl = `${settings.settings.DeployApiUrl}`;
  }

  getDeploymentForView(viewId: string) {
    return this.http.get<any>(`${this.deployUrl}/views/${viewId}/workstations`);
  }

  deployToView(viewId: string) {
    return this.http.post<any>(
      `${this.deployUrl}/views/${viewId}/workstations`,
      null,
    );
  }
}
