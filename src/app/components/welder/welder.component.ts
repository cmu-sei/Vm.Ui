// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WelderService } from '../../services/welder/welder.service';
import { VmService } from '../../state/vms/vms.service';
import { MatButton } from '@angular/material/button';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-welder',
  templateUrl: './welder.component.html',
  styleUrls: ['./welder.component.scss'],
  standalone: true,
  imports: [NgIf, MatButton, NgFor],
})
export class WelderComponent implements OnInit, OnDestroy {
  public showDeployButton = false;
  public deployButtonDisabled = false;
  public readyVMs = new Set();
  private viewName: string;
  private previousWSResults = [0, 0, 0];

  private unsubscribe$ = new Subject();

  constructor(
    public welderService: WelderService,
    public vmService: VmService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.viewName = this.route.snapshot.params['viewName'];
    this.checkForWorkstations();
    interval(30000)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => {
        const firstValue = this.previousWSResults[0];
        const allSame = this.previousWSResults.every((v) => v === firstValue);
        // If the values are all zeroes, then I still want to poll for VMs - if they're all non-zero, but still not equal, then I also
        // want to continue polling. If they're all non-zero and also all equal, then it's time to stop polling.
        if (!(firstValue > 0 && allSame)) {
          this.checkForWorkstations();
        }

        // Once we start getting VMs back, that means our request is done or almost done.
        if (this.readyVMs.size === 0) {
          this.welderService.getQueueSize().subscribe(
            (response) => {
              if (response != null) {
                this.snackBar.open(response.toString());
              }
            },
            (err) => console.log(err),
          );
        }
      });
    this.showDeployButton = true;
  }

  public autoDeploy() {
    this.deployButtonDisabled = true;
    this.welderService.deployToView(this.viewName).subscribe(
      (response) => {
        console.log(response);
        this.snackBar.open(
          'Request received. Please wait while your workstations are provisioned.',
        );
      },
      (err) => {
        console.log(err);
        this.deployButtonDisabled = false;
      },
    );
  }

  private checkForWorkstations() {
    this.vmService.GetTeamVms(true, true).subscribe(
      (vms) => {
        this.readyVMs.clear();
        vms.forEach((vm) => {
          // If we're getting VMs back, then there's no point in letting the user click the deploy button again because it's a waste of
          // network resources.
          this.showDeployButton = false;
          this.readyVMs.add(vm);
        });
        if (this.readyVMs.size === 0) {
          this.showDeployButton = true;
          this.deployButtonDisabled = false;
        } else {
          // Snackbar will likely be open from queue checks, so let's just dismiss that to mitigate confusion.
          this.snackBar.dismiss();
        }
        this.previousWSResults.shift();
        this.previousWSResults.push(this.readyVMs.size);
      },
      (err) => {
        console.log(err);
      },
    );
  }

  public openVMConsoleTab(vm) {
    window.open(vm.url, '_blank');
  }

  ngOnDestroy() {
    this.unsubscribe$.unsubscribe();
    this.unsubscribe$.complete();
  }
}
