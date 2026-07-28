// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { combineLatest, Observable, ReplaySubject } from 'rxjs';
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

interface EffectivePermissionRequirements {
  systemPermissions?: AppSystemPermission[];
  teamPermissions?: AppTeamPermission[];
  viewPermissions?: AppViewPermission[];
}

@Injectable({
  providedIn: 'root',
})
export class UserPermissionsService {
  private permissionsSubject = new ReplaySubject<string[]>(1);
  public permissions$ = this.permissionsSubject.asObservable();

  private teamPermissionsSubject = new ReplaySubject<TeamPermissionsClaim[]>(1);
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

  // Use for primary-context UI. Only permissions granted directly by the
  // selected primary team are considered.
  can(
    teamPermission?: AppTeamPermission,
    viewPermission?: AppViewPermission,
  ) {
    return this.teamPermissions$.pipe(
      map((teamPermissionClaims) => {
        const primaryClaim = teamPermissionClaims.find(
          (claim) => claim.isPrimary,
        );
        const directPermissions = primaryClaim?.directPermissionValues ?? [];
        const teamPermissions = this.toTeamPermissions(directPermissions);
        const viewPermissions = this.toViewPermissions(directPermissions);

        return (
          (teamPermission != null &&
            teamPermissions.includes(teamPermission)) ||
          (viewPermission != null && viewPermissions.includes(viewPermission))
        );
      }),
    );
  }

  // Use only for features that are explicitly system-scoped.
  hasSystemPermission(permission: AppSystemPermission) {
    return this.permissions$.pipe(
      map((permissions) => permissions.includes(permission)),
    );
  }

  // Use for UI rooted in the active team. The context contains the primary team and each target
  // team reached by a scope from that primary team; permissions are the effective values on those
  // claims, including scoped grants.
  hasEffectivePermissionsForPrimaryContext(
    viewId: string | undefined,
    requirements: EffectivePermissionRequirements,
    teamIds?: string[],
  ) {
    return combineLatest([this.permissions$, this.teamPermissions$]).pipe(
      map(([permissions, teamPermissionClaims]) => {
        if (
          requirements.systemPermissions?.some((permission) =>
            permissions.includes(permission),
          )
        ) {
          return true;
        }

        const viewClaims = viewId
          ? teamPermissionClaims.filter((claim) => claim.viewId === viewId)
          : teamPermissionClaims;
        const primaryClaim = viewClaims.find((claim) => claim.isPrimary);
        if (!primaryClaim?.teamId) {
          return false;
        }

        const contextClaims = viewClaims.filter(
          (claim) =>
            claim.teamId === primaryClaim.teamId ||
            claim.sourceTeamIds?.includes(primaryClaim.teamId),
        );
        const targetTeamIds = new Set((teamIds ?? []).filter((id) => !!id));
        const targetClaims =
          targetTeamIds.size > 0
            ? contextClaims.filter(
                (claim) =>
                  claim.teamId != null && targetTeamIds.has(claim.teamId),
              )
            : contextClaims;

        const teamPermissions = this.toTeamPermissions(
          targetClaims.flatMap((claim) => claim.permissionValues ?? []),
        );
        const viewPermissions = this.toViewPermissions(
          contextClaims.flatMap((claim) => claim.permissionValues ?? []),
        );

        return (
          requirements.teamPermissions?.some((permission) =>
            teamPermissions.includes(permission),
          ) ||
          requirements.viewPermissions?.some((permission) =>
            viewPermissions.includes(permission),
          ) ||
          false
        );
      }),
    );
  }

  // Use for actions on known teams. This mirrors API authorization by
  // considering system, target effective, and same-view direct permissions.
  hasEffectivePermissionsForTeams(
    viewId: string,
    teamIds: string[],
    requirements: EffectivePermissionRequirements,
  ) {
    return combineLatest([this.permissions$, this.teamPermissions$]).pipe(
      map(([permissions, teamPermissionClaims]) => {
        const targetTeamIds = new Set(teamIds.filter((id) => !!id));
        if (targetTeamIds.size === 0) {
          return false;
        }

        if (
          requirements.systemPermissions?.some((permission) =>
            permissions.includes(permission),
          )
        ) {
          return true;
        }

        const viewClaims = teamPermissionClaims.filter(
          (claim) => claim.viewId === viewId,
        );
        const targetPermissionValues = viewClaims
          .filter(
            (claim) =>
              claim.teamId != null && targetTeamIds.has(claim.teamId),
          )
          .flatMap((claim) => claim.permissionValues ?? []);
        const directPermissionValues = viewClaims.flatMap(
          (claim) => claim.directPermissionValues ?? [],
        );

        const targetTeamPermissions = this.toTeamPermissions(
          targetPermissionValues,
        );
        const targetViewPermissions =
          this.toViewPermissions(targetPermissionValues);
        const directViewPermissions =
          this.toViewPermissions(directPermissionValues);

        return (
          requirements.teamPermissions?.some((permission) =>
            targetTeamPermissions.includes(permission),
          ) ||
          requirements.viewPermissions?.some(
            (permission) =>
              targetViewPermissions.includes(permission) ||
              directViewPermissions.includes(permission),
          ) ||
          false
        );
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
