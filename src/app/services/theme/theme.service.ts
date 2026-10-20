/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Injectable, inject } from '@angular/core';
import { ComnAuthQuery } from '@cmusei/crucible-common';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private authQuery = inject(ComnAuthQuery);

  public addThemeQueryParam(url: string): string {
    const val = new URL(url, document.baseURI);
    val.searchParams.set('theme', this.authQuery.getValue().ui.theme);
    return val.toString();
  }
}
