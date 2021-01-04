// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

export interface VmModel {
  name: string;
  url: string;
  id: string;
  viewId: string;
  state: string;
  powerState: PowerState;
  ipAddresses: string[];
  hasPendingTasks: boolean;
  lastError: string;
}

export enum PowerState {
  Unknown,
  On,
  Off,
  Suspended,
}

export function createVm(params: Partial<VmModel>) {
  return {} as VmModel;
}
