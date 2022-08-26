// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { map, switchMap, takeUntil, take } from 'rxjs/operators';
import { VmTeamsQuery } from '../../state/vm-teams/vm-teams.query';
import { VmModel } from '../../state/vms/vm.model';
import { VmsQuery } from '../../state/vms/vms.query';
import { VmService } from '../../state/vms/vms.service';
import { SignalRService } from '../../services/signalr/signalr.service';
import {
  PermissionService,
  User,
  UserService,
} from '../../generated/player-api';
import { VmUsageLoggingSessionService } from '../../generated/vm-api';
import { ThemeService } from '../../services/theme/theme.service';
import { VmUISessionService } from '../../state/vm-ui-session/vm-ui-session.service';
import { VmUISessionQuery } from '../../state/vm-ui-session/vm-ui-session.query';

@Component({
  selector: 'app-vm-main',
  templateUrl: './vm-main.component.html',
  styleUrls: ['./vm-main.component.scss'],
})
export class VmMainComponent implements OnInit, OnDestroy {
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private vmQuery: VmsQuery,
    private signalRService: SignalRService,
    private routerQuery: RouterQuery,
    private activatedRoute: ActivatedRoute,
    private authService: ComnAuthService,
    public vmService: VmService,
    private teamsQuery: VmTeamsQuery,
    private userService: UserService,
    private vmUsageLoggingSessionService: VmUsageLoggingSessionService,
    private permissionsService: PermissionService,
    private themeService: ThemeService,
    private vmUISessionService: VmUISessionService,
    private vmUISessionQuery: VmUISessionQuery
  ) {
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        const selectedTheme = params.get('theme');
        const theme = selectedTheme === Theme.DARK ? Theme.DARK : Theme.LIGHT;
        this.authService.setUserTheme(theme);
      });
  }

  public openVms: Array<VmModel>;
  public selectedTab: number;
  public vms$: Observable<VmModel[]>;
  public vmErrors$ = new BehaviorSubject<Record<string, string>>({});
  public readOnly$: Observable<boolean>;
  public teams$ = this.teamsQuery.selectAll();
  public currentUser$: Observable<User>;
  public loggingEnabled$: Observable<Boolean>;
  public canManageTeam: Boolean = false;
  public currentUserId: Observable<string>;
  public vms: Observable<VmModel[]>;

  ngOnInit() {
    this.openVms = new Array<VmModel>();
    this.selectedTab = 0;

    this.vms$ = combineLatest([this.vmQuery.selectAll(), this.vmErrors$]).pipe(
      map(([vms, errors]) => {
        return vms.map((y) => ({
          ...y,
          lastError: errors[y.id],
        }));
      })
    );

    this.vmQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe((vms) => {
      if (vms.length > 0) {
        this.vmUISessionService.getCurrentView();
      }
    });

    combineLatest([this.vmQuery.selectAll(), this.vmUISessionQuery.selectAll()])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(([vms, sessions]) => {
        if (vms.length > 0 && sessions) {
          console.log('sessions', sessions);
          console.log('vms', vms);
          const session = sessions.find((s) => s.id === this.vmUISessionService.getCurrentTeamId());
          session.openedVmIds.forEach((vm) => {
            console.log('open', vms.find((v) => v.id === vm));
            this.onOpenVmHere(vms.find((v) => v.id === vm));
          });
        }
      });

    this.signalRService
      .startConnection()
      .then(() => {
        this.signalRService.joinView(this.vmUISessionService.getCurrentViewId());
      })
      .catch((err) => {
        console.log(err);
      });

    this.readOnly$ = this.vmService.GetReadOnly(this.vmUISessionService.getCurrentViewId());

    this.currentUser$ = this.authService.user$.pipe(
      switchMap((u) => {
        this.permissionsService
          .getUserViewPermissions(this.vmUISessionService.getCurrentViewId(), u.profile.sub)
          .pipe(take(1))
          .subscribe((pms) => {
            if (pms.find((pm) => pm.key === 'ViewAdmin')) {
              this.canManageTeam = true;
            } else {
              this.canManageTeam = false;
            }
          });
        return this.userService.getUser(u.profile.sub);
      })
    );

    this.loggingEnabled$ =
      this.vmUsageLoggingSessionService.getIsLoggingEnabled();
  }

  getCurrentViewId(): string {
    return this.vmUISessionService.getCurrentViewId();
  }

  onOpenVmHere(vm: VmModel) {
    const adminIndex = this.currentUser$.pipe(
      take(1),
      map((u) => u.isSystemAdmin)
    )
      ? 1
      : 0;
    // Only open if not already
    const index = this.openVms.findIndex((v) => v.id === vm.id);
    if (index === -1) {
      this.openVms.push(vm);
      this.selectedTab = this.openVms.length + 1 + adminIndex;
      this.vmUISessionService.setOpenedVm(vm, true);
    } else {
      this.selectedTab = index + 2 + adminIndex;
    }
  }

  remove(id: string) {
    const index = this.openVms.findIndex((vm) => vm.id === id);
    if (index !== -1 && this.selectedTab > 1) {
      this.selectedTab = 0;
      this.vmUISessionService.setOpenedVm(this.openVms[index], false);
      this.openVms.splice(index, 1);
    }
  }

  openInNewTab(vmObj: { [name: string]: string }) {
    const index = this.openVms.findIndex((vm) => vm.name === vmObj.name);
    if (index !== -1) {
      this.selectedTab = 0;
      this.openVms.splice(index, 1);
      window.open(vmObj.url, '_blank');
    }
  }

  ngOnDestroy() {
    this.signalRService.leaveView(this.vmUISessionService.getCurrentViewId());
    this.vmErrors$.complete();
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  onErrors(errors: { [key: string]: string }) {
    this.vmErrors$.next(errors);
  }
}
