// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ComnAuthQuery, ComnAuthService, ComnSettingsService, Theme } from '@cmusei/crucible-common';
import { User as AuthUser } from 'oidc-client-ts';
import { Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
})
export class TopbarComponent implements OnInit, OnDestroy {
  currentUser$: Observable<AuthUser>;
  theme$: Observable<Theme>;
  unsubscribe$: Subject<null> = new Subject<null>();

  // Classification banner properties
  bannerBackgroundColor: string = '';
  classificationText: string = '';
  classificationTextColor: string = '';
  classificationTextFontSize: string = '';
  messageText: string = '';
  messageTextColor: string = '';
  messageTextFontSize: string = '';
  bannerEnabled: boolean = false;

  constructor(
    private authService: ComnAuthService,
    private authQuery: ComnAuthQuery,
    private settingsService: ComnSettingsService,
  ) {
    this.loadBannerSettings();
  }

  ngOnInit() {
    this.currentUser$ = this.authService.user$.pipe(
      filter((user) => user !== null),
      takeUntil(this.unsubscribe$),
    );
    this.theme$ = this.authQuery.userTheme$;
  }

  themeFn(event) {
    const theme = event.checked ? Theme.DARK : Theme.LIGHT;
    this.authService.setUserTheme(theme);
  }

  logout(): void {
    this.authService.logout();
  }

  private loadBannerSettings(): void {
    try {
      const settings = this.settingsService.settings?.HeaderBarSettings;
      if (settings) {
        this.bannerBackgroundColor = settings.banner_background_color?.trim() || '#d40000ff';
        this.classificationText = settings.classification_text?.trim() || '';
        this.classificationTextColor = settings.classification_text_color?.trim() || '#ffffff';
        this.classificationTextFontSize = settings.classification_text_fontsize?.trim() || '22';
        this.messageText = settings.message_text?.trim() || '';
        this.messageTextColor = settings.message_text_color?.trim() || '#ffffff';
        this.messageTextFontSize = settings.message_text_fontsize?.trim() || '18';
        this.bannerEnabled = settings.enabled || false;

        // Disable banner when embedded in iframe - parent should handle it
        if (this.isInIframe()) {
          this.bannerEnabled = false;
        }
      } else {
        this.setDefaultBannerSettings();
      }
    } catch (e) {
      this.setDefaultBannerSettings();
    }
  }

  private isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  private setDefaultBannerSettings(): void {
    this.bannerBackgroundColor = '#d40000ff';
    this.classificationText = '';
    this.classificationTextColor = '#ffffff';
    this.classificationTextFontSize = '22';
    this.messageText = '';
    this.messageTextColor = '#ffffff';
    this.messageTextFontSize = '18';
    this.bannerEnabled = false;
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
