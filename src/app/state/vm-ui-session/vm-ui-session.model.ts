// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

export interface VmUISession {
  id?: string;
  viewId?: string;
  tabOpened: standardTabs | string;
  searchValue: string;
  isShowIPsSelected: boolean;
  isShowIPv4OnlySelected: boolean;
  itemsPerPage: number;
  pageNumber: number;
  openedVmIds: string[];
}

export enum standardTabs {
  VMList,
  UserList,
  UsageLogging,
}
