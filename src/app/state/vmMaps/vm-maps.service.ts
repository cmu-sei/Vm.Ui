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
import { ID } from '@datorama/akita';
import { take } from 'rxjs/operators';
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

  add(viewId: string, vmMap: VmMap) {
    this.vmService.createMap(viewId, vmMap).pipe(
      take(1)
    ).subscribe(m => this.vmMapsStore.add(m));
  }

  update(id: string, vmMap: Partial<VmMap>) {
    this.vmService.updateMap(id, vmMap).pipe(
      take(1)
    ).subscribe((m) => this.vmMapsStore.update(id, m));
  }

  remove(id: ID) {
    this.vmService.deleteMap(id as string).pipe(
      take(1)
    ).subscribe(() => this.vmMapsStore.remove(id));
  }

}
