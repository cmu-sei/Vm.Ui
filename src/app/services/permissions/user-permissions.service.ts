// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  PermissionService,
  TeamPermissionsClaim,
  TeamPermissionService,
} from '../../generated/player-api';
import {
  AppSystemPermission,
  AppTeamPermission,
  AppViewPermission,
} from '../../generated/vm-api';

@Injectable({
  providedIn: 'root',
})
export class UserPermissionsService {
  private permissionsSubject = new BehaviorSubject<string[]>([]);
  public permissions$ = this.permissionsSubject.asObservable();

  private teamPermissionsSubject = new BehaviorSubject<TeamPermissionsClaim[]>(
    [],
  );
  public teamPermissions$ = this.teamPermissionsSubject.asObservable();

  constructor(
    private permissionsApi: PermissionService,
    private teamPermissionsApi: TeamPermissionService,
  ) {}

  load(): Observable<string[]> {
    return this.permissionsApi
      .getMyPermissions()
      .pipe(tap((x) => this.permissionsSubject.next(x)));
  }

  loadTeamPermissions(
    viewId?: string,
    teamId?: string,
    includeAllViewTeams?: boolean,
  ) {
    return this.teamPermissionsApi
      .getMyTeamPermissions(viewId, teamId, includeAllViewTeams)
      .pipe(tap((x) => this.teamPermissionsSubject.next(x)));
  }

  hasPermission(permission: string) {
    return this.permissions$.pipe(map((x) => x.includes(permission)));
  }

  getPrimaryTeamId(viewId: string) {
    return this.teamPermissions$.pipe(
      map((x) => {
        const match = x.find(
          (team) => team.viewId === viewId && team.isPrimary,
        );
        return match?.teamId;
      }),
    );
  }

  can(
    permission: AppSystemPermission,
    teamId?: string,
    primaryTeam?: boolean,
    teamPermission?: AppTeamPermission,
    viewPermission?: AppViewPermission,
  ) {
    return combineLatest([this.permissions$, this.teamPermissions$]).pipe(
      map(([permissions, teamPermissionClaims]) => {
        if (permissions.includes(permission)) {
          return true;
        } else {
          let teamPermissions: AppTeamPermission[];
          let viewPermissions: AppViewPermission[];

          const teamPermissionClaim =
            teamId != null
              ? teamPermissionClaims.find((x) => x.teamId == teamId)
              : primaryTeam
                ? teamPermissionClaims.find((x) => x.isPrimary)
                : null;

          if (teamPermissionClaim) {
            teamPermissions = this.toTeamPermissions(
              teamPermissionClaim.permissionValues,
            );
            viewPermissions = this.toViewPermissions(
              teamPermissionClaim.permissionValues,
            );
          } else {
            const permissions = teamPermissionClaims.flatMap(
              (x) => x.permissionValues,
            );
            teamPermissions = this.toTeamPermissions(permissions);
            viewPermissions = this.toViewPermissions(permissions);
          }

          return (
            (teamPermission != null &&
              teamPermissions.includes(teamPermission)) ||
            (viewPermission != null && viewPermissions.includes(viewPermission))
          );
        }
      }),
    );
  }

  private toTeamPermissions(permissions: string[]): AppTeamPermission[] {
    return permissions.filter((permission): permission is AppTeamPermission =>
      Object.values(AppTeamPermission).includes(
        permission as AppTeamPermission,
      ),
    );
  }

  private toViewPermissions(permissions: string[]): AppViewPermission[] {
    return permissions.filter((permission): permission is AppViewPermission =>
      Object.values(AppViewPermission).includes(
        permission as AppViewPermission,
      ),
    );
  }
}
