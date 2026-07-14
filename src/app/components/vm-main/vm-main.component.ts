// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { catchError, map, startWith, switchMap, takeUntil, take, tap } from 'rxjs/operators';
import { VmTeamsQuery } from '../../state/vm-teams/vm-teams.query';
import { VmTeamsService } from '../../state/vm-teams/vm-teams.service';
import { VmsQuery } from '../../state/vms/vms.query';
import { VmService } from '../../state/vms/vms.service';
import { SignalRService } from '../../services/signalr/signalr.service';
import {
  PermissionService,
  TeamPermissionService,
  User,
  UserService,
} from '../../generated/player-api';
import {
  AppSystemPermission,
  AppTeamPermission,
  AppViewPermission,
  Vm,
  VmUsageLoggingSessionService,
  VmsService,
} from '../../generated/vm-api';
import { VmUISessionService } from '../../state/vm-ui-session/vm-ui-session.service';
import { VmUISessionQuery } from '../../state/vm-ui-session/vm-ui-session.query';
import { VmUISession } from '../../state/vm-ui-session/vm-ui-session.model';
import {
  MatTabGroup,
  MatTab,
  MatTabContent,
  MatTabLabel,
} from '@angular/material/tabs';
import { FocusedAppComponent } from '../focused-app/focused-app.component';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { VmUsageLoggingComponent } from '../vm-usage-logging/vm-usage-logging.component';
import { NetworkPermissionsComponent } from '../network-permissions/network-permissions.component';
import { UserListComponent } from '../user-list/user-list.component';
import { VmListComponent } from '../vm-list/vm-list.component';
import { PageNotFoundComponent } from '../page-not-found/page-not-found.component';
import { AsyncPipe } from '@angular/common';
import { UserPermissionsService } from '../../services/permissions/user-permissions.service';
import { ThemeService } from '../../services/theme/theme.service';
import { TopbarComponent } from '../topbar/topbar.component';
import { validate as isUuid } from 'uuid';

@Component({
    selector: 'app-vm-main',
    templateUrl: './vm-main.component.html',
    styleUrls: ['./vm-main.component.scss'],
    imports: [
    TopbarComponent,
    MatTabGroup,
    MatTab,
    VmListComponent,
    MatTabContent,
    UserListComponent,
    VmUsageLoggingComponent,
    NetworkPermissionsComponent,
    MatTabLabel,
    MatIconButton,
    MatIcon,
    FocusedAppComponent,
    PageNotFoundComponent,
    AsyncPipe
]
})
export class VmMainComponent implements OnInit, OnDestroy {
  @ViewChild('vmTabGroup', { static: false }) tabGroup: MatTabGroup;

  unsubscribe$: Subject<null> = new Subject<null>();
  hideTopbar = false;

  constructor(
    private vmQuery: VmsQuery,
    private signalRService: SignalRService,
    private activatedRoute: ActivatedRoute,
    private authService: ComnAuthService,
    public vmService: VmService,
    private teamsQuery: VmTeamsQuery,
    private teamsService: VmTeamsService,
    private vmsService: VmsService,
    private userService: UserService,
    private vmUsageLoggingSessionService: VmUsageLoggingSessionService,
    private permissionsService: PermissionService,
    private vmUISessionService: VmUISessionService,
    private vmUISessionQuery: VmUISessionQuery,
    private teamPermissionsService: TeamPermissionService,
    private userPermissionsService: UserPermissionsService,
    private themeService: ThemeService,
  ) {
    this.hideTopbar = this.inIframe();
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        const selectedTheme = params.get('theme');
        const theme = selectedTheme === Theme.DARK ? Theme.DARK : Theme.LIGHT;
        this.authService.setUserTheme(theme);
      });
  }

  inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  public openVms: Array<{ [name: string]: string }>;
  public selectedTab: number;
  public vms$: Observable<Vm[]>;
  public vmErrors$ = new BehaviorSubject<Record<string, string>>({});
  public teams$ = this.teamsQuery.selectAll();
  private visibleVmTeamIds$ = this.vmQuery.selectAll().pipe(
    map((vms) =>
      Array.from(new Set(vms.flatMap((vm) => vm.teamIds ?? []))),
    ),
  );
  private visibleTeamIds$ = this.teams$.pipe(
    map((teams) =>
      teams
        .map((team) => team.id)
        .filter((teamId): teamId is string => !!teamId),
    ),
  );
  public currentUser$: Observable<User>;
  public canManageTeam = false;
  public currentUserId: Observable<string>;
  public vms: Observable<Vm[]>;
  public currentSession: VmUISession;
  public currentSession$: Observable<VmUISession>;
  public usageLoggingEnabled = false;

  public canViewViews$ = this.userPermissionsService.hasSystemPermission(
    AppSystemPermission.ViewViews,
  );

  public canViewView$ = this.userPermissionsService.can(
    undefined,
    AppViewPermission.ViewView,
  );

  public canManageView$ = this.userPermissionsService.can(
    undefined,
    AppViewPermission.ManageView,
  );

  public readOnly$ = this.visibleVmTeamIds$.pipe(
    switchMap((teamIds) =>
      this.userPermissionsService.hasEffectivePermissionsForTeams(
        this.vmUISessionService.getCurrentViewId(),
        teamIds,
        {
          systemPermissions: [AppSystemPermission.EditViews],
          teamPermissions: [AppTeamPermission.EditTeam],
          viewPermissions: [AppViewPermission.EditView],
        },
      ),
    ),
    map((canEdit) => !canEdit),
  );

  public canRevertVms$ = this.visibleVmTeamIds$.pipe(
    switchMap((teamIds) =>
      this.userPermissionsService.hasEffectivePermissionsForTeams(
        this.vmUISessionService.getCurrentViewId(),
        teamIds,
        {
          viewPermissions: [AppViewPermission.RevertVms],
        },
      ),
    ),
  );

  public canManageNetworks$ = this.visibleTeamIds$.pipe(
    switchMap((teamIds) =>
      this.userPermissionsService.hasEffectivePermissionsForTeams(
        this.vmUISessionService.getCurrentViewId(),
        teamIds,
        {
          systemPermissions: [AppSystemPermission.ManageNetworks],
          viewPermissions: [AppViewPermission.ManageNetworks],
        },
      ),
    ),
  );

  public canViewNetworks$ = this.visibleTeamIds$.pipe(
    switchMap((teamIds) =>
      this.userPermissionsService.hasEffectivePermissionsForTeams(
        this.vmUISessionService.getCurrentViewId(),
        teamIds,
        {
          systemPermissions: [
            AppSystemPermission.ViewNetworks,
            AppSystemPermission.ManageNetworks,
          ],
          viewPermissions: [
            AppViewPermission.ViewNetworks,
            AppViewPermission.ManageNetworks,
          ],
        },
      ),
    ),
  );

  public showUsageLogging$ = combineLatest([
    this.canViewViews$,
    this.canViewView$,
  ]).pipe(map(([x, y]) => x || y));

  public showNetworks$ = this.canViewNetworks$;

  public viewExists$ = this.teams$.pipe(
    map((teams) => teams && teams.length > 0),
    // Start with true to avoid flash of "view not found" while loading
    startWith(true),
  );

  public hasUsageData$ = this.userPermissionsService
    .hasSystemPermission(AppSystemPermission.ViewViews)
    .pipe(
      switchMap((canViewViews) => {
        if (!canViewViews || !this.usageLoggingEnabled) {
          return of(false);
        }
        return this.vmUsageLoggingSessionService
          .getAllSessions(this.vmUISessionService.getCurrentViewId())
          .pipe(
            map((sessions) => sessions && sessions.length > 0),
            catchError(() => of(false)),
          );
      }),
    );

  ngOnInit() {
    const viewId = this.vmUISessionService.getCurrentViewId();

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
      }),
    );

    // Set up the current user regardless of view validity so the
    // page-not-found display can render (template gates on currentUser$).
    this.currentUser$ = this.authService.user$.pipe(
      switchMap((u) => {
        return this.userService.getUser(u.profile.sub);
      }),
    );

    // Don't attempt to load a view with a malformed id; the page-not-found
    // display will show since no teams will be loaded.
    if (!isUuid(viewId)) {
      return;
    }

    forkJoin([
      // Load teams into the store
      this.vmsService.getTeams(viewId).pipe(
        take(1),
        tap((teams) => {
          this.teamsService.set(
            teams.map((t) => ({ id: t.id, name: t.name, viewId: viewId })),
          );
        }),
        catchError(() => of([])),
      ),
      this.userPermissionsService.load().pipe(catchError(() => of([]))),
      this.userPermissionsService
        .loadTeamPermissions(viewId, undefined, true)
        .pipe(catchError(() => of([]))),
    ]).subscribe();

    this.signalRService
      .startConnection()
      .then(() => {
        this.signalRService.joinView(
          this.vmUISessionService.getCurrentViewId(),
        );
      })
      .catch((err) => {
        console.log(err);
      });

    combineLatest([
      this.vmQuery.selectAll(),
      this.vmUISessionQuery.selectAll(),
      this.currentUser$,
      this.vmUsageLoggingSessionService
        .getIsLoggingEnabled()
        .pipe(catchError(() => of(false))),
      this.teams$,
    ])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(([vms, sessions, user, logging, teams]) => {
        if (vms && sessions && user && logging != null) {
          // Determine if Usage Logging tab is enabled
          this.usageLoggingEnabled = logging;

          const session = sessions.find(
            (s) => s.id === this.vmUISessionService.getCurrentTeamId(),
          );

          if (session) {
            this.currentSession$ = this.vmUISessionQuery.selectEntity(
              (s) => s.id === session.id,
            );
            this.currentSession = session;
            session.openedVms.forEach((vm) => {
              if (vm) {
                this.onOpenVmHere(vm, true);
              }
            });
            // If view doesn't exist but we have a saved tab, make sure it's valid
            if (teams && teams.length === 0 && session.tabOpened <= 1) {
              // VM List and User Follow are disabled, skip to Usage Logging if enabled
              if (logging) {
                this.selectedTab = 2;
              }
            } else {
              this.selectedTab = session.tabOpened;
            }
          } else if (teams && teams.length === 0 && logging) {
            // View doesn't exist (no teams loaded), but usage logging is enabled
            // Auto-select Usage Logging tab (index 2: VM List=0, User Follow=1, Usage Logging=2)
            this.selectedTab = 2;
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
    combineLatest([this.showUsageLogging$, this.showNetworks$])
      .pipe(take(1))
      .subscribe(([hasLogging, hasNetworks]) => {
        // 2 static tabs (VM List + User Follow) + conditional tabs
        const staticCount =
          2 + (hasLogging ? 1 : 0) + (hasNetworks ? 1 : 0);

        const index = this.openVms.findIndex((v) => v.name === vmObj.name);
        if (index === -1) {
          this.openVms.push(vmObj);
          this.vmUISessionService.setOpenedVm(vmObj, true);
          if (!onLoading) {
            this.setSelectedTab(this.openVms.length - 1 + staticCount);
          }
        } else {
          if (!onLoading) {
            this.setSelectedTab(index + staticCount);
          }
        }
      });
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
      window.open(this.themeService.addThemeQueryParam(vmObj.url), '_blank');
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
        value,
      );
    }
  }

  showIPv4OnlySelectedChanged(value: Boolean) {
    if (this.currentSession.showIPv4OnlySelected !== value) {
      this.vmUISessionService.setShowIPv4OnlySelected(
        this.currentSession,
        value,
      );
    }
  }
}
