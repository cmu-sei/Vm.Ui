// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Vm } from '../../generated/vm-api';

// Use declaration merging to extend the workspace model for the Entity state.
declare module '../../generated/vm-api/model/vm' {
  interface Vm {
    lastError: string;
  }
}

export enum PowerState {
  Unknown,
  On,
  Off,
  Suspended,
}

export function createVm(params: Partial<Vm>) {
  return {} as Vm;
}
