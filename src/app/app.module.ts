// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { CdkTableModule } from '@angular/cdk/table';
import { HttpClientModule } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import {
  MatTooltipDefaultOptions,
  MatTooltipModule,
  MAT_TOOLTIP_DEFAULT_OPTIONS,
} from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  ComnAuthModule,
  ComnSettingsModule,
  ComnSettingsService,
} from '@cmusei/crucible-common';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { DragToSelectModule } from 'ngx-drag-to-select';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AutoDeployComponent } from './components/auto-deploy/auto-deploy.component';
import { ConsoleComponent } from './components/console/console.component';
import { FocusedAppComponent } from './components/focused-app/focused-app.component';
import { MapComponent } from './components/map/map.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog.component';
import { SystemMessageComponent } from './components/shared/system-message/system-message.component';
import { VmListComponent } from './components/vm-list/vm-list.component';
import { VmMainComponent } from './components/vm-main/vm-main.component';
import { WelderComponent } from './components/welder/welder.component';
import { BASE_PATH } from './generated/vm-api';
import { BASE_PATH as PLAYER_BASE_PATH } from './generated/player-api';
import { AutoDeployService } from './services/auto-deploy/auto-deploy.service';
import { DialogService } from './services/dialog/dialog.service';
import { ErrorService } from './services/error/error.service';
import { FileService } from './services/file/file.service';
import { SystemMessageService } from './services/system-message/system-message.service';
import { TeamsService } from './services/teams/teams.service';
import { WelderService } from './services/welder/welder.service';
import { VmService } from './state/vms/vms.service';
import { AddPointComponent } from './components/map/add-point/add-point.component';
import { MapTeamDisplayComponent } from './components/map/map-team-display/map-team-display.component';
import { MapMainComponent } from './components/map/map-main/map-main.component';
import { MatSelectModule } from '@angular/material/select';
import { NewMapComponent } from './components/map/new-map/new-map.component';
import { VmMapsQuery } from './state/vmMaps/vm-maps.query';
import { VmMapsService } from './state/vmMaps/vm-maps.service';
import { UserListComponent } from './components/user-list/user-list.component';
import { TeamUsersComponent } from './components/user-list/team-users/team-users.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import { MapVmSelectComponent } from './components/map/map-vm-select/map-vm-select.component';
import { VmItemComponent } from './components/vm-list/vm-item/vm-item.component';
import { MessageDialogComponent } from './components/shared/message-dialog/message-dialog.component';
import { VmUsageLoggingComponent } from './components/vm-usage-logging/vm-usage-logging.component';
import { VmUsageReportingComponent } from './components/vm-usage-reporting/vm-usage-reporting.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

/** Custom options the configure the tooltip's default show/hide delays. */
export const myCustomTooltipDefaults: MatTooltipDefaultOptions = {
  showDelay: 1000,
  hideDelay: 0,
  touchendHideDelay: 1000,
};

@NgModule({
  exports: [
    CdkTableModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatListModule,
    MatTableModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatGridListModule,
    MatSlideToggleModule,
    MatCardModule,
    MatSnackBarModule,
    MatBottomSheetModule,
    MatDialogModule,
    MatTabsModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSelectModule,
    MatExpansionModule,
    ScrollingModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
})
export class AngularMaterialModule {}

@NgModule({
  declarations: [
    AppComponent,
    VmListComponent,
    VmMainComponent,
    FocusedAppComponent,
    AutoDeployComponent,
    ConsoleComponent,
    ConfirmDialogComponent,
    SystemMessageComponent,
    WelderComponent,
    MapMainComponent,
    MapComponent,
    MapTeamDisplayComponent,
    NewMapComponent,
    AddPointComponent,
    UserListComponent,
    TeamUsersComponent,
    MapVmSelectComponent,
    VmItemComponent,
    MessageDialogComponent,
    VmUsageLoggingComponent,
    VmUsageReportingComponent
  ],
  imports: [
    TableVirtualScrollModule,
    HttpClientModule,
    BrowserModule,
    BrowserAnimationsModule,
    AngularMaterialModule,
    ReactiveFormsModule,
    FormsModule,
    FlexLayoutModule,
    ComnSettingsModule.forRoot(),
    ComnAuthModule.forRoot(),
    [
      environment.production ? [] : AkitaNgDevtools.forRoot(),
      AkitaNgRouterStoreModule,
    ],
    DragToSelectModule.forRoot(),
    // App routing order matters; We must import the AppRoutingModule last in order to maintain the wildcard PageNotFoundComponent.
    AppRoutingModule,
  ],
  providers: [
    VmService,
    VmMapsService,
    VmMapsQuery,
    AutoDeployService,
    FileService,
    TeamsService,
    DialogService,
    SystemMessageService,
    WelderService,
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: myCustomTooltipDefaults },
    {
      provide: PLAYER_BASE_PATH,
      useFactory: getPlayerBasePath,
      deps: [ComnSettingsService],
    },
  ],
  bootstrap: [AppComponent],
  entryComponents: [ConfirmDialogComponent, SystemMessageComponent],
})
export class AppModule {}

export function getBasePath(settingsSvc: ComnSettingsService) {
  return sanitizeBasePath(settingsSvc.settings.ApiUrl);
}

export function getPlayerBasePath(settingsSvc: ComnSettingsService) {
  return sanitizeBasePath(settingsSvc.settings.ApiPlayerUrl);
}

function sanitizeBasePath(url: string) {
  if (url.endsWith('/')) {
    url = url.slice(0, url.length - 1);
  }

  return url.replace('/api', '');
}
