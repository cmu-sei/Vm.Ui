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

  // TODO: deprecated, remove when safe to do so
  {
    path: 'exercises/:viewId/auto-deploy',
    component: AutoDeployComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'exercises/:viewName/:teamId/welder',
    component: WelderComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'exercises/:viewId/vms/:name/console',
    component: ConsoleComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'exercises/:viewId',
    component: VmMainComponent,
    canActivate: [ComnAuthGuardService],
  },
  // End depreceated routes
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
