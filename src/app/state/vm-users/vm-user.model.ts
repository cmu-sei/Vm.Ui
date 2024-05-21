/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { VmUser as User } from '../../generated/vm-api';

export class VmUser implements User {
  userId?: string;
  username?: string | null;
  activeVmId?: string | null;
  lastVmId?: string | null;
  lastSeen?: string | null;
  teamIds?: Array<string> | null;
}

export function createVmUser(params: Partial<User>, teamId: string) {
  const user = { ...params } as VmUser;
  user.teamIds = new Array<string>();
  user.teamIds.push(teamId);
  return user;
}
