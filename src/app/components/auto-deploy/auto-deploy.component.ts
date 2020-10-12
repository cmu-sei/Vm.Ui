/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AutoDeployService } from '../../services/auto-deploy/auto-deploy.service';
import { VmService } from '../../vms/state/vms.service';

@Component({
  selector: 'app-auto-deploy',
  templateUrl: './auto-deploy.component.html',
  styleUrls: ['./auto-deploy.component.scss'],
})
export class AutoDeployComponent implements OnInit, OnDestroy {
  public showDeployButton = false;
  public deployButtonDisabled = false;

  private viewId: string;
  private unsubscribe$ = new Subject();

  constructor(
    public autoDeployService: AutoDeployService,
    public vmService: VmService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.viewId = this.route.snapshot.params['viewId'];

    this.vmService.GetViewVms(true, true).subscribe(
      (vms) => {
        const vm = vms[0];

        if (vm) {
          window.location.href = vm.url;
        } else {
          this.autoDeployService
            .getDeploymentForView(this.viewId)
            .subscribe((result) => {
              if (!result.DefaultTemplateConfigured) {
                this.snackBar.open(
                  'A default workstation has not been configured for your Team.'
                );
                this.deployButtonDisabled = true;
                this.showDeployButton = true;
              } else if (result.RoomFull) {
                // tslint:disable-next-line:max-line-length
                this.snackBar.open(
                  "Your team's workstation allocation is full. Please contact an administrator to request additional capacity."
                );
                this.deployButtonDisabled = true;
                this.showDeployButton = true;
              } else {
                this.showDeployButton = true;
              }
            });
        }
      },
      (err) => {
        console.log(err);
      }
    );
  }

  public autoDeploy() {
    this.autoDeployService.deployToView(this.viewId).subscribe(
      () => {
        this.deployButtonDisabled = true;
        this.snackBar.open(
          'Request Received. Please wait while your workstation is provisioned.'
        );

        interval(5000)
          .pipe(takeUntil(this.unsubscribe$))
          .subscribe(() => this.checkForWorkstation());
      },
      (err) => {
        console.log(err);
        this.deployButtonDisabled = false;
      }
    );
    this.deployButtonDisabled = true;
  }

  private checkForWorkstation() {
    this.vmService.GetViewVms(true, true).subscribe((vms) => {
      const vm = vms[0];

      if (vm) {
        window.location.href = vm.url;
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe$.unsubscribe();
    this.unsubscribe$.complete();
  }
}
