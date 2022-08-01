// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComnAuthGuardService } from '@cmusei/crucible-common';
import { AutoDeployComponent } from './components/auto-deploy/auto-deploy.component';
import { ConsoleComponent } from './components/console/console.component';
import { VmMainComponent } from './components/vm-main/vm-main.component';
import { WelderComponent } from './components/welder/welder.component';
import { MapMainComponent } from './components/map/map-main/map-main.component';
import { VmUsageReportingComponent } from './components/vm-usage-reporting/vm-usage-reporting.component';

export const ROUTES: Routes = [
  {
    path: 'views/:viewId/auto-deploy',
    component: AutoDeployComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewName/:teamId/welder',
    component: WelderComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewId/vms/:name/console',
    component: ConsoleComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewId',
    component: VmMainComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'views/:viewId/map',
    component: MapMainComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'usage',
    component: VmUsageReportingComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: '**',
    component: VmMainComponent,
    canActivate: [ComnAuthGuardService],
  },
];

@NgModule({
  exports: [RouterModule],
  imports: [
    CommonModule,
    RouterModule.forRoot(ROUTES, { relativeLinkResolution: 'legacy' }),
  ],
})
export class AppRoutingModule {}
