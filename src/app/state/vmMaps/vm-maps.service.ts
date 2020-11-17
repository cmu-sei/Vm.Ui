import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ID } from '@datorama/akita';
import { take, tap } from 'rxjs/operators';
import { VmMap, VmsService } from '../../generated/vm-api';
import { VmMapsStore } from './vm-maps.store';

@Injectable({ providedIn: 'root' })
export class VmMapsService {

  constructor(private vmMapsStore: VmMapsStore, private vmService: VmsService) {
  }


  get() {
    this.vmMapsStore.setLoading(true);
    this.vmService.getAllMaps().pipe(
      take(1)
    ).subscribe((maps) => this.vmMapsStore.set(maps));
  }

  add(vmMap: VmMap) {
    this.vmMapsStore.add(vmMap);
  }

  update(id, vmMap: Partial<VmMap>) {
    this.vmMapsStore.update(id, vmMap);
  }

  remove(id: ID) {
    this.vmService.deleteMap(id as string).pipe(
      take(1)
    ).subscribe(() => this.vmMapsStore.remove(id));
  }

}
