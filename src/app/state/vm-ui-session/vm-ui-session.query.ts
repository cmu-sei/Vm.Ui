// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { QueryEntity, QueryConfig } from '@datorama/akita';
import { VmUISessionStore, VmUISessionState } from './vm-ui-session.store';

@QueryConfig({})
@Injectable({ providedIn: 'root' })
export class VmUISessionQuery extends QueryEntity<VmUISessionState> {
  constructor(protected store: VmUISessionStore) {
    super(store);
  }
}
