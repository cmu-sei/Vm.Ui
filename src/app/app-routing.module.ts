/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComnAuthGuardService } from '@cmusei/crucible-common';
import { AutoDeployComponent } from './components/auto-deploy/auto-deploy.component';
import { ConsoleComponent } from './components/console/console.component';
import { VmMainComponent } from './components/vm-main/vm-main.component';
import { AuthLogoutComponent } from './components/auth/auth-logout.component';
import { ConsoleComponent } from './components/console/console.component';
import { AutoDeployComponent } from './components/auto-deploy/auto-deploy.component';
import { AuthCallbackSilentComponent } from './components/auth/auth-callback-silent.component';
import { WelderComponent } from './components/welder/welder.component';
import { MapComponent } from './components/map/map.component';
import { MapTeamDisplayComponent } from './components/map/map-team-display/map-team-display.component';

export const ROUTES: Routes = [
  { path: 'auth-callback', component: AuthCallbackComponent },
  { path: 'auth-callback-silent', component: AuthCallbackSilentComponent },
  { path: 'logout', component: AuthLogoutComponent },
  { path: 'views/:viewId/auto-deploy', component: AutoDeployComponent, canActivate: [AuthGuard] },
  { path: 'views/:viewName/:teamId/welder', component: WelderComponent, canActivate: [AuthGuard] },
  { path: 'views/:viewId/vms/:name/console', component: ConsoleComponent, canActivate: [AuthGuard] },
  { path: 'views/:viewId', component: VmMainComponent, canActivate: [AuthGuard] },
  { path: 'views/:viewId/map', component: MapComponent, canActivate: [AuthGuard]},
  { path: 'views/:viewId/map/:teamId', component: MapTeamDisplayComponent, canActivate: [AuthGuard] },
  // TODO: deprecated, remove when safe to do so
  { path: 'exercises/:viewId/auto-deploy', component: AutoDeployComponent, canActivate: [AuthGuard] },
  { path: 'exercises/:viewName/:teamId/welder', component: WelderComponent, canActivate: [AuthGuard] },
  { path: 'exercises/:viewId/vms/:name/console', component: ConsoleComponent, canActivate: [AuthGuard] },
  { path: 'exercises/:viewId', component: VmMainComponent, canActivate: [AuthGuard] },
  // End depreceated routes
  { path: '**', component: VmMainComponent, canActivate: [AuthGuard] },
];

@NgModule({
  exports: [
    RouterModule
  ],
  imports: [
    CommonModule,
    RouterModule.forRoot(ROUTES)
  ]
})
export class AppRoutingModule { }
