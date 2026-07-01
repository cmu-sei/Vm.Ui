// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrls: ['./page-not-found.component.scss'],
  standalone: true,
})
export class PageNotFoundComponent {
  @Input() heading = 'View Not Found';
  @Input() message =
    'The view you are trying to access no longer exists or you do not have permission to access it.';
}
