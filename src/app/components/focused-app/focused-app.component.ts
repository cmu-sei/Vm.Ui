// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ThemeService } from '../../services/theme/theme.service';

@Component({
  selector: 'app-focused-app',
  templateUrl: './focused-app.component.html',
  styleUrls: ['./focused-app.component.scss'],
  standalone: true,
})
export class FocusedAppComponent implements OnInit {
  @Input() vmUrl: string;

  public currentUrl: SafeUrl;

  constructor(
    private sanitizer: DomSanitizer,
    private themeService: ThemeService,
  ) {}

  ngOnInit() {
    const themedUrl = this.themeService.addThemeQueryParam(this.vmUrl);
    this.currentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(themedUrl);
    // this.currentUrl = this.sanitizer.bypassSecurityTrustResourceUrl('https://www.google.com/maps');
  }
}
