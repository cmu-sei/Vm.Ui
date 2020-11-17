import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { VmMap } from '../../generated/vm-api';

export interface VmMapsState extends EntityState<VmMap> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'vmMaps' })
export class VmMapsStore extends EntityStore<VmMapsState> {

  constructor() {
    super();
  }

}
