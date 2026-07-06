// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VmService } from '../../state/vms/vms.service';
import { ThemeService } from '../../services/theme/theme.service';
import { PageNotFoundComponent } from '../page-not-found/page-not-found.component';

@Component({
  selector: 'app-console',
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss'],
  standalone: true,
  imports: [PageNotFoundComponent],
})
export class ConsoleComponent implements OnInit {
  loading = signal(true);
  notFound = signal(false);
  name = signal('');

  constructor(
    private vmService: VmService,
    private route: ActivatedRoute,
    private themeService: ThemeService,
  ) {}

  ngOnInit() {
    const viewId = this.route.snapshot.params['viewId'];
    this.name.set(this.route.snapshot.params['name']);

    this.vmService.GetViewVmsByName(viewId, this.name()).subscribe(
      (vms) => {
        const vm = vms != null ? vms[0] : null;

        if (vm) {
          window.location.href = this.themeService.addThemeQueryParam(vm.url);
        } else {
          this.loading.set(false);
          this.notFound.set(true);
        }
      },
      (err) => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    );
  }
}
