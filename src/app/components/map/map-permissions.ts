// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  AppSystemPermission,
  AppTeamPermission,
  AppViewPermission,
} from '../../generated/vm-api';
import { EffectivePermissionRequirements } from '../../services/permissions/user-permissions.service';

// What vm.api takes to create, edit or delete a Map, checked on each team the Map is on.
export const MANAGE_MAPS: EffectivePermissionRequirements = {
  systemPermissions: [AppSystemPermission.ManageMaps],
  teamPermissions: [AppTeamPermission.ManageTeamMaps],
  viewPermissions: [AppViewPermission.ManageViewMaps],
};
