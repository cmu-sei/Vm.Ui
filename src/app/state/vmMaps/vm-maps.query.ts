/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Injectable } from '@angular/core';
import { filterNil, QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Coordinate, VmMap } from '../../generated/vm-api';
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

  getAllWithName(param: string): Observable<VmMap[]> {
    return this.selectAll({
      filterBy: ({name}) => name.toLowerCase().includes(param.toLowerCase())
    });
  }

  getMapCoordinates(mapId: string): Observable<Coordinate[]> {
    return this.selectEntity(mapId).pipe(
      filterNil,
      map(m => m.coordinates)
    );
  }

}
