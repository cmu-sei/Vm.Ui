// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

export interface VmUISession {
  id?: string;
  viewId?: string;
  tabOpened: standardTabs | number;
  searchValue: string;
  showIPsSelected: Boolean;
  showIPv4OnlySelected: Boolean;
  openedVms: Array<{ [name: string]: string }>;
}

export enum standardTabs {
  VMList,
  UserList,
  UsageLogging,
}
