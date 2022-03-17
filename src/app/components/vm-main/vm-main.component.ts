// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { VmTeamsQuery } from '../../state/vm-teams/vm-teams.query';
import { VmModel } from '../../state/vms/vm.model';
import { VmsQuery } from '../../state/vms/vms.query';
import { VmService } from '../../state/vms/vms.service';
import { SignalRService } from '../../services/signalr/signalr.service';

@Component({
  selector: 'app-vm-main',
  templateUrl: './vm-main.component.html',
  styleUrls: ['./vm-main.component.scss'],
})
export class VmMainComponent implements OnInit, OnDestroy {
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private vmQuery: VmsQuery,
    private signalRService: SignalRService,
    private routerQuery: RouterQuery,
    private activatedRoute: ActivatedRoute,
    private authService: ComnAuthService,
    public vmService: VmService,
    private teamsQuery: VmTeamsQuery
  ) {
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        const selectedTheme = params.get('theme');
        const theme = selectedTheme === Theme.DARK ? Theme.DARK : Theme.LIGHT;
        this.authService.setUserTheme(theme);
      });
  }

  public openVms: Array<{ [name: string]: string }>;
  public selectedTab: number;
  public vms$: Observable<VmModel[]>;
  public vmErrors$ = new BehaviorSubject<Record<string, string>>({});
  public readOnly$: Observable<boolean>;
  public viewId: string;
  public teams$ = this.teamsQuery.selectAll();

  ngOnInit() {
    this.viewId = this.routerQuery.getParams('viewId');
    this.openVms = new Array<{ [name: string]: string }>();
    this.selectedTab = 0;

    this.vms$ = combineLatest([this.vmQuery.selectAll(), this.vmErrors$]).pipe(
      map(([vms, errors]) => {
        return vms.map((y) => ({
          ...y,
          lastError: errors[y.id],
        }));
      })
    );

    this.signalRService
      .startConnection()
      .then(() => {
        this.signalRService.joinView(this.viewId);
      })
      .catch((err) => {
        console.log(err);
      });

    this.readOnly$ = this.vmService.GetReadOnly(this.viewId);
  }

  onOpenVmHere(vmObj: { [name: string]: string }) {
    console.log('Chad:  ', vmObj.name);
    // Only open if not already
    const index = this.openVms.findIndex((vm) => vm.name === vmObj.name);
    // if (this.authService.)
    if (index === -1) {
      this.openVms.push(vmObj);
      this.selectedTab = this.openVms.length + 2;
    } else {
      this.selectedTab = index + 3;
    }
  }

  remove(name: string) {
    const index = this.openVms.findIndex((vm) => vm.name === name);
    if (index !== -1 && this.selectedTab > 1) {
      this.selectedTab = 0;
      this.openVms.splice(index, 1);
    }
  }

  openInNewTab(vmObj: { [name: string]: string }) {
    const index = this.openVms.findIndex((vm) => vm.name === vmObj.name);
    if (index !== -1) {
      this.selectedTab = 0;
      this.openVms.splice(index, 1);
      window.open(vmObj.url, '_blank');
    }
  }

  ngOnDestroy() {
    this.signalRService.leaveView(this.viewId);
    this.vmErrors$.complete();
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  onErrors(errors: { [key: string]: string }) {
    this.vmErrors$.next(errors);
  }
}
