// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, forkJoin, Observable, of, Subject } from 'rxjs';
import { filter, map, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import {
  AppTeamPermission,
  AppViewPermission,
  VmMap,
} from '../../../generated/vm-api';
import { VmMapsQuery } from '../../../state/vmMaps/vm-maps.query';
import { VmMapsService } from '../../../state/vmMaps/vm-maps.service';
import { MapTeamDisplayComponent } from '../map-team-display/map-team-display.component';
import { MapComponent } from '../map.component';
import { NewMapComponent } from '../new-map/new-map.component';
import { DialogService } from '../../../services/dialog/dialog.service';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatSelect } from '@angular/material/select';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { AsyncPipe } from '@angular/common';
import { UserPermissionsService } from '../../../services/permissions/user-permissions.service';

@Component({
    selector: 'app-map-main',
    templateUrl: './map-main.component.html',
    styleUrls: ['./map-main.component.scss'],
    imports: [
    MatFormField,
    MatLabel,
    MatSelect,
    ReactiveFormsModule,
    FormsModule,
    MatOption,
    MatButton,
    MapTeamDisplayComponent,
    MapComponent,
    NewMapComponent,
    AsyncPipe
]
})
export class MapMainComponent implements OnDestroy, OnInit, AfterViewChecked {
  selected: VmMap;
  editMode: boolean;
  readMap: boolean;
  mapInitialized: boolean;
  viewId: string;
  build: boolean;
  mapId: string;
  editProps: boolean;
  creatingMap: boolean;

  @ViewChild(MapTeamDisplayComponent) displayChild: MapTeamDisplayComponent;
  @ViewChild(MapComponent) buildChild: MapComponent;
  @ViewChild(NewMapComponent) propertiesDialog: NewMapComponent;

  @ViewChild('newMapDialog') newMapDialog: TemplateRef<NewMapComponent>;
  @ViewChild('editPropsDialog') editPropsDialog: TemplateRef<NewMapComponent>;
  private dialogRef: MatDialogRef<NewMapComponent>;
  private unsubscribe$ = new Subject();
  maps: VmMap[] = [];
  canEdit$: Observable<boolean>;

  constructor(
    private permissionsService: UserPermissionsService,
    private route: ActivatedRoute,
    private changeDetector: ChangeDetectorRef,
    private dialog: MatDialog,
    private vmMapsService: VmMapsService,
    private vmMapQuery: VmMapsQuery,
    private dialogService: DialogService,
  ) {
    this.mapInitialized = false;
    this.route.params
      .pipe(
        tap((params) => {
          this.vmMapsService.unload();
          this.viewId = params['viewId'];
        }),
        filter(() => !!this.viewId),
        tap(() => {
          this.vmMapsService.getViewMaps(this.viewId!);
          this.canEdit$ = this.permissionsService.can(
            null,
            null,
            true,
            AppTeamPermission.ManageTeam,
            AppViewPermission.ManageView,
          );
        }),
        switchMap(() =>
          forkJoin([
            this.permissionsService.load(),
            this.permissionsService.loadTeamPermissions(this.viewId!),
          ]),
        ),
        switchMap(() => this.getFilteredMaps(this.viewId!)),
        tap((filteredMaps) => {
          this.maps = filteredMaps;
          if (filteredMaps.length > 0) {
            this.selected = filteredMaps[0];
            this.goToMap();
          }
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe();
  }

  private getFilteredMaps(viewId: string): Observable<VmMap[]> {
    return this.vmMapQuery.selectAll().pipe(
      switchMap((maps) =>
        this.permissionsService.getPrimaryTeamId(viewId).pipe(
          switchMap((primaryTeamId) => {
            const checks$ = maps.map((x) => {
              const hasPrimaryTeam = x.teamIds?.includes(primaryTeamId);
              if (!hasPrimaryTeam) return of(null);
              return this.permissionsService
                .can(
                  null,
                  null,
                  true,
                  AppTeamPermission.ViewTeam,
                  AppViewPermission.ViewView,
                )
                .pipe(map((allowed) => (allowed ? x : null)));
            });

            return combineLatest(checks$).pipe(
              map((results): VmMap[] =>
                results.filter((x): x is VmMap => x !== null),
              ),
            );
          }),
        ),
      ),
    );
  }

  ngOnInit(): void {}

  ngAfterViewChecked() {
    this.changeDetector.detectChanges();
  }

  buildMap() {
    this.creatingMap = true;
    this.dialogRef = this.dialog.open(this.newMapDialog);
  }

  goToMap() {
    if (this.selected === undefined) {
      this.readMap = false;
    } else {
      this.mapId = this.selected.id;
      this.readMap = true;
    }
    this.build = false;
  }

  // Track changes in the map select by map IDs
  trackByMaps(index: number, item: VmMap): string {
    return item.id;
  }

  delete() {
    this.dialogService
      .confirm('Delete Map?', 'Are you sure you want to delete this Map?', {
        buttonTrueText: 'Confirm',
      })
      .pipe(take(1))
      .subscribe((result) => {
        if (!result.wasCancelled) {
          this.vmMapsService.remove(this.selected.id);
          this.selected = undefined;
          this.goToMap();
        }
      });
  }

  save() {
    this.buildChild.save();
    this.editMode = false;
  }

  mapInit(val: boolean) {
    this.mapInitialized = val;
  }

  editClicked() {
    this.editMode = !this.editMode;
  }

  mapCreated(id: string) {
    this.mapId = id;

    this.build = false;
    this.readMap = true;
    this.editMode = true;

    this.vmMapQuery.getById(id).subscribe((m) => {
      this.selected = m;

      this.goToMap();

      this.dialogRef.close();
    });
  }

  editProperties(): void {
    this.creatingMap = false;
    this.dialogRef = this.dialog.open(this.editPropsDialog);
  }

  propertiesChanged(tuple: [string, string, string[]]) {
    const name = tuple[0];
    const url = tuple[1];
    const ids = tuple[2];
    const id = this.selected.id;

    let payload = <VmMap>{
      coordinates: this.selected.coordinates,
      name: name,
      imageUrl: url,
      teamIds: ids,
    };

    this.vmMapsService.update(id, payload);

    this.vmMapQuery.getById(id).subscribe((m) => {
      this.selected = m;
      this.buildChild?.ngOnInit();
      this.dialogRef.close();
    });
  }

  // User clicked a clickpoint that points to a map
  redirectToMap(id: string) {
    this.vmMapQuery.getById(id).subscribe((m) => {
      this.selected = m;
      this.goToMap();
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
