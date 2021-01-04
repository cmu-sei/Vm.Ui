// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ComnSettingsService } from '@cmusei/crucible-common';

@Injectable()
export class WelderService {
  private readonly deployUrl: string;

  constructor(private http: HttpClient, private settings: ComnSettingsService) {
    this.deployUrl = `${settings.settings.WelderUrl}`;
  }

  getDeploymentForView(viewName: string) {
    const requestUrl = `${this.deployUrl}/api/${viewName}`;
    return this.http.get<any>(requestUrl);
  }

  deployToView(viewName: string) {
    const requestUrl = `${this.deployUrl}/api/${viewName}`;
    return this.http.post<any>(requestUrl, null);
  }

  getQueueSize() {
    const requestUrl = `${this.deployUrl}/queue`;
    return this.http.get<any>(requestUrl);
  }
}
