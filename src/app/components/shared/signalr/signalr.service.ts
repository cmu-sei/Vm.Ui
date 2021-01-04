// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import * as signalR from '@microsoft/signalr';
import { VmModel } from '../../../state/vms/vm.model';
import { VmService } from '../../../state/vms/vms.service';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection: signalR.HubConnection;
  private viewId: string;
  private connectionPromise: Promise<void>;

  constructor(
    private authService: ComnAuthService,
    private settingsService: ComnSettingsService,
    private vmService: VmService
  ) {}

  public startConnection(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${this.settingsService.settings.ApiUrl.replace('/api', '')}/hubs/vm`,
        {
          accessTokenFactory: () => {
            return this.authService.getAuthorizationToken();
          },
        }
      )
      .withAutomaticReconnect(new RetryPolicy(60, 0, 5))
      .build();

    this.hubConnection.onreconnected(() => {
      this.JoinGroups();
    });

    this.addHandlers();
    this.connectionPromise = this.hubConnection.start();
    this.connectionPromise.then((x) => this.JoinGroups());

    return this.connectionPromise;
  }

  private JoinGroups() {
    if (this.viewId) {
      this.joinView(this.viewId);
    }
  }

  public joinView(viewId: string) {
    this.viewId = viewId;

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinView', viewId);
    }
  }

  public leaveView(viewId: string) {
    this.viewId = null;
    this.hubConnection.invoke('LeaveView', viewId);
  }

  private addHandlers() {
    this.addVmHandlers();
  }

  private addVmHandlers() {
    this.hubConnection.on(
      'VmUpdated',
      (vm: VmModel, modifiedProperties: string[]) => {
        let model: Partial<VmModel> = vm;
        if (modifiedProperties != null) {
          model = {};

          modifiedProperties.forEach((x) => {
            model[x] = vm[x];
          });
        }

        this.vmService.update(vm.id, model);
      }
    );

    this.hubConnection.on('VmCreated', (vm: VmModel) => {
      this.vmService.add(vm);
    });

    this.hubConnection.on('VmDeleted', (id: string) => {
      this.vmService.remove(id);
    });
  }
}

class RetryPolicy {
  constructor(
    private maxSeconds: number,
    private minJitterSeconds: number,
    private maxJitterSeconds: number
  ) {}

  nextRetryDelayInMilliseconds(
    retryContext: signalR.RetryContext
  ): number | null {
    let nextRetrySeconds = Math.pow(2, retryContext.previousRetryCount + 1);

    if (nextRetrySeconds > this.maxSeconds) {
      nextRetrySeconds = this.maxSeconds;
    }

    nextRetrySeconds +=
      Math.floor(
        Math.random() * (this.maxJitterSeconds - this.minJitterSeconds + 1)
      ) + this.minJitterSeconds; // Add Jitter

    return nextRetrySeconds * 1000;
  }
}
