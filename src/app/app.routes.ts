// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Routes } from '@angular/router';
import { ComnAuthGuardService } from '@cmusei/crucible-common';

export const routes: Routes = [
  {
    path: 'views/:viewId/auto-deploy',
    loadComponent: () =>
      import('./components/auto-deploy/auto-deploy.component').then(
        (mod) => mod.AutoDeployComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewName/:teamId/welder',
    loadComponent: () =>
      import('./components/welder/welder.component').then(
        (mod) => mod.WelderComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewId/vms/:name/console',
    loadComponent: () =>
      import('./components/console/console.component').then(
        (mod) => mod.ConsoleComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewId',
    loadComponent: () =>
      import('./components/vm-main/vm-main.component').then(
        (mod) => mod.VmMainComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewId/map',
    loadComponent: () =>
      import('./components/map/map-main/map-main.component').then(
        (mod) => mod.MapMainComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'usage',
    loadComponent: () =>
      import(
        './components/vm-usage-reporting/vm-usage-reporting.component'
      ).then((mod) => mod.VmUsageReportingComponent),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/vm-main/vm-main.component').then(
        (mod) => mod.VmMainComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
];
