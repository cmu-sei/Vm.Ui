// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { map, switchMap, takeUntil, take, tap } from 'rxjs/operators';
import { VmTeamsQuery } from '../../state/vm-teams/vm-teams.query';
import { VmsQuery } from '../../state/vms/vms.query';
import { VmService } from '../../state/vms/vms.service';
import { SignalRService } from '../../services/signalr/signalr.service';
import {
  PermissionService,
  User,
  UserService,
} from '../../generated/player-api';
import { Vm, VmUsageLoggingSessionService } from '../../generated/vm-api';
import { VmUISessionService } from '../../state/vm-ui-session/vm-ui-session.service';
import { VmUISessionQuery } from '../../state/vm-ui-session/vm-ui-session.query';
import { VmUISession } from '../../state/vm-ui-session/vm-ui-session.model';
import { MatTabGroup } from '@angular/material/tabs';

@Component({
  selector: 'app-vm-main',
  templateUrl: './vm-main.component.html',
  styleUrls: ['./vm-main.component.scss'],
})
export class VmMainComponent implements OnInit, OnDestroy {
  @ViewChild('vmTabGroup', { static: false }) tabGroup: MatTabGroup;

  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private vmQuery: VmsQuery,
    private signalRService: SignalRService,
    private activatedRoute: ActivatedRoute,
    private authService: ComnAuthService,
    public vmService: VmService,
    private teamsQuery: VmTeamsQuery,
    private userService: UserService,
    private vmUsageLoggingSessionService: VmUsageLoggingSessionService,
    private permissionsService: PermissionService,
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

  public openVms: Array<{ [name: string]: string }>;
  public selectedTab: number;
  public vms$: Observable<Vm[]>;
  public vmErrors$ = new BehaviorSubject<Record<string, string>>({});
  public readOnly$: Observable<boolean>;
  public teams$ = this.teamsQuery.selectAll();
  public currentUser$: Observable<User>;
  public canManageTeam = false;
  public currentUserId: Observable<string>;
  public vms: Observable<Vm[]>;
  public currentSession: VmUISession;
  public currentSession$: Observable<VmUISession>;
  public usageLoggingEnabled = false;
  public showUsageLogging = false;

  ngOnInit() {
    this.openVms = new Array<{ [name: string]: string }>();
    this.selectedTab = 0;

    this.vms$ = combineLatest([this.vmQuery.selectAll(), this.vmErrors$]).pipe(
      map(([vms, errors]) => {
        return vms.map((y) => ({
          ...y,
          lastError: errors[y.id],
        }));
      }),
      tap(() => {
        this.vmUISessionService.loadCurrentView();
      })
    );

    this.signalRService
      .startConnection()
      .then(() => {
        this.signalRService.joinView(
          this.vmUISessionService.getCurrentViewId()
        );
      })
      .catch((err) => {
        console.log(err);
      });

    this.readOnly$ = this.vmService.GetReadOnly(
      this.vmUISessionService.getCurrentViewId()
    );

    this.currentUser$ = this.authService.user$.pipe(
      switchMap((u) => {
        this.permissionsService
          .getUserViewPermissions(
            this.vmUISessionService.getCurrentViewId(),
            u.profile.sub
          )
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

    combineLatest([
      this.vmQuery.selectAll(),
      this.vmUISessionQuery.selectAll(),
      this.currentUser$,
      this.vmUsageLoggingSessionService.getIsLoggingEnabled(),
    ])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(([vms, sessions, user, logging]) => {
        if (vms && sessions && user && logging != null) {
          // Determine if Usage Logging tab is enabled
          this.usageLoggingEnabled = logging;
          this.showUsageLogging = user.isSystemAdmin || this.canManageTeam;

          const session = sessions.find(
            (s) => s.id === this.vmUISessionService.getCurrentTeamId()
          );

          if (session) {
            this.currentSession$ = this.vmUISessionQuery.selectEntity(
              (s) => s.id === session.id
            );
            this.currentSession = session;
            session.openedVms.forEach((vm) => {
              if (vm) {
                this.onOpenVmHere(vm, true);
              }
            });
            this.selectedTab = session.tabOpened;
          }
        }
      });
  }

  setSelectedTab(index: number) {
    this.vmUISessionService.setOpenedTab(this.currentSession, index);
  }

  getCurrentViewId(): string {
    return this.vmUISessionService.getCurrentViewId();
  }

  onOpenVmHere(vmObj: { [name: string]: string }, onLoading: boolean = false) {
    const adminIndex = this.currentUser$.pipe(
      take(1),
      map((u) => u.isSystemAdmin)
    )
      ? 1
      : 0;

    // Only open if not already
    const index = this.openVms.findIndex((v) => v.name === vmObj.name);
    if (index === -1) {
      // Not opened
      this.openVms.push(vmObj);
      this.vmUISessionService.setOpenedVm(vmObj, true);
      if (!onLoading) {
        this.setSelectedTab(this.openVms.length + 1 + adminIndex);
      }
    } else {
      // Already opened
      if (!onLoading) {
        this.setSelectedTab(index + 2 + adminIndex);
      }
    }
  }

  remove(name: string) {
    const index = this.openVms.findIndex((vm) => vm.name === name);
    if (index !== -1) {
      this.setSelectedTab(0);
      this.vmUISessionService.setOpenedVm(this.openVms[index], false);
      this.openVms.splice(index, 1);
    }
  }

  openInNewTab(vmObj: { [name: string]: string }) {
    const index = this.openVms.findIndex((vm) => vm.name === vmObj.name);
    if (index !== -1) {
      this.setSelectedTab(0);
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

  searchValueChanged(value: string) {
    if (this.currentSession.searchValue !== value) {
      this.vmUISessionService.setSearchValueChanged(this.currentSession, value);
    }
  }

  showIPsSelectedChanged(value: Boolean) {
    if (this.currentSession.showIPsSelected !== value) {
      this.vmUISessionService.setShowIPsSelectedChanged(
        this.currentSession,
        value
      );
    }
  }

  showIPv4OnlySelectedChanged(value: Boolean) {
    if (this.currentSession.showIPv4OnlySelected !== value) {
      this.vmUISessionService.setShowIPv4OnlySelected(
        this.currentSession,
        value
      );
    }
  }
}
