import { Injectable } from '@angular/core';
import { filterNil, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { VmMap } from '../../generated/vm-api';
import { VmMapsStore, VmMapsState } from './vm-maps.store';

@Injectable({ providedIn: 'root' })
export class VmMapsQuery extends QueryEntity<VmMapsState> {

  constructor(protected store: VmMapsStore) {
    super(store);
  }

  getById(id: string): Observable<VmMap> {
    return this.selectEntity(id).pipe(filterNil);
  }

  getByViewId(id: string): Observable<VmMap[]> {
    return this.selectAll({
      filterBy: ({viewId}) => viewId === id
    });
  }

}
