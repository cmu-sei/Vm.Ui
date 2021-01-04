// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VmService } from '../../state/vms/vms.service';

@Component({
  selector: 'app-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss'],
})
export class ConsoleComponent implements OnInit {
  constructor(private vmService: VmService, private route: ActivatedRoute) {}

  ngOnInit() {
    const viewId = this.route.snapshot.params['viewId'];
    const name = this.route.snapshot.params['name'];

    this.vmService.GetViewVmsByName(viewId, name).subscribe(
      (vms) => {
        if (vms != null) {
          const vm = vms[0];

          if (vm) {
            window.location.href = vm.url;
          }
        }
      },
      (err) => {}
    );
  }
}
