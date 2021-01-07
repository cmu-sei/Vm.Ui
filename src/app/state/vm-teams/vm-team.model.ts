/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { VmUserTeam } from '../../generated/vm-api';

export interface VmTeam {
  id: string;
  name: string;
  viewId: string;
}

export function createVmTeam(params: VmUserTeam, viewId: string) {
  return {
    id: params.id,
    name: params.name,
    viewId: viewId,
  } as VmTeam;
}
