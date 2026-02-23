// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ComnAuthQuery, ComnAuthService, ComnSettingsService, Theme } from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet]
})
export class AppComponent implements OnDestroy {
  theme$: Observable<Theme> = this.authQuery.userTheme$;
  unsubscribe$: Subject<null> = new Subject<null>();
  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private authQuery: ComnAuthQuery,
    private routerQuery: RouterQuery,
    private authService: ComnAuthService,
    private settingsService: ComnSettingsService,
  ) {
    iconRegistry.addSvgIcon(
      'monitor',
      sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/monitor.svg'),
    );
    iconRegistry.addSvgIcon(
      'ic_clear_black_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_clear_black_24px.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'ic_chevron_right_black_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_chevron_right_black_24px.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'ic_open_tab',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_open_tab.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'ic_cancel_circle',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_cancel_circle.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'ic_magnify_search',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_magnify_glass_48px.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'power_icon',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_power_settings_new_black_48px.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'ic_expand_more_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_expand_more_24px.svg',
      ),
    );
    iconRegistry.addSvgIcon(
      'ic_gear',
      sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/ic_gear.svg'),
    );

    this.theme$.pipe(takeUntil(this.unsubscribe$)).subscribe((theme) => {
      this.setTheme(theme);
    });

    this.routerQuery
      .selectQueryParams('theme')
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((theme) => {
        this.authService.setUserTheme(theme);
      });
  }

  setTheme(theme: Theme) {
    document.body.classList.toggle('darkMode', theme === Theme.DARK);
    const topBarColor = this.settingsService.settings?.AppTopBarHexColor || '#C41230';
    const topBarTextColor = this.settingsService.settings?.AppTopBarHexTextColor || '#FFFFFF';
    if (topBarColor) {
      document.documentElement.style.setProperty('--mat-sys-primary', topBarColor);
      document.body.style.setProperty('--mat-sys-primary', topBarColor);
    }
    if (topBarTextColor) {
      document.documentElement.style.setProperty('--mat-sys-on-primary', topBarTextColor);
      document.body.style.setProperty('--mat-sys-on-primary', topBarTextColor);
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
