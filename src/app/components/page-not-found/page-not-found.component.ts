// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrls: ['./page-not-found.component.scss'],
  standalone: true,
  imports: [MatButton],
})
export class PageNotFoundComponent {
  returnToPlayer() {
    // Navigate to Player UI root - adjust port/URL based on your setup
    window.location.href = window.location.origin.replace(':4303', ':4301');
  }
}
