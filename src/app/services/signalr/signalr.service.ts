// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Inject, Injectable } from '@angular/core';
import { ComnAuthService } from '@cmusei/crucible-common';
import * as signalR from '@microsoft/signalr';
import { BASE_PATH, Vm, VmUserTeam } from '../../generated/vm-api';
import { createVmTeam } from '../../state/vm-teams/vm-team.model';
import { VmTeamsService } from '../../state/vm-teams/vm-teams.service';
import { createVmUser, VmUser } from '../../state/vm-users/vm-user.model';
import { VmUsersService } from '../../state/vm-users/vm-users.service';
import { VmService } from '../../state/vms/vms.service';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection: signalR.HubConnection;
  private viewId: string;
  private joinUsers = false;
  private connectionPromise: Promise<void>;
  private apiUrl: string;

  constructor(
    private authService: ComnAuthService,
    private vmService: VmService,
    private vmUsersService: VmUsersService,
    private vmTeamsService: VmTeamsService,
    @Inject(BASE_PATH) basePath: string,
  ) {
    this.apiUrl = basePath;

    this.authService.user$.subscribe(() => {
      this.reconnect();
    });
  }

  public startConnection(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.apiUrl}/hubs/vm`, {
        accessTokenFactory: () => {
          return this.authService.getAuthorizationToken();
        },
      })
      .withAutomaticReconnect(new RetryPolicy(60, 0, 5))
      .build();

    this.hubConnection.onreconnected(() => {
      this.joinGroups();
    });

    this.addHandlers();
    this.connectionPromise = this.hubConnection.start();
    this.connectionPromise.then(() => this.joinGroups());

    return this.connectionPromise;
  }

  private reconnect() {
    if (this.hubConnection != null) {
      this.hubConnection.stop().then(() => {
        this.connectionPromise = this.hubConnection.start();
        this.connectionPromise.then(() => this.joinGroups());
      });
    }
  }

  private joinGroups() {
    if (this.viewId) {
      this.joinView(this.viewId);

      if (this.joinUsers) {
        this.joinViewUsers(this.viewId);
      }
    }
  }

  public joinView(viewId: string) {
    this.viewId = viewId;

    this.startConnection().then(() =>
      this.hubConnection.invoke('JoinView', viewId),
    );
  }

  public leaveView(viewId: string) {
    this.viewId = null;

    this.startConnection().then(() =>
      this.hubConnection.invoke('LeaveView', viewId),
    );
  }

  public joinViewUsers(viewId: string) {
    this.viewId = viewId;
    this.joinUsers = true;

    this.startConnection().then(() => {
      this.hubConnection
        .invoke('JoinViewUsers', viewId)
        .then((vmUserTeams: Array<VmUserTeam>) => {
          // intentionally normalizing the api data here by splitting the users into their own state
          // in order to optimize for the constant updates of individual users active consoles
          // rather than the initial loading of teams and users
          this.vmTeamsService.set(
            vmUserTeams.map((x) => createVmTeam(x, viewId)),
          );

          const users = new Map<string, VmUser>();

          vmUserTeams.forEach((t) => {
            t.users.forEach((u) => {
              const existing = users.get(u.userId);

              if (existing != null) {
                if (!existing.teamIds.includes(t.id)) {
                  existing.teamIds.push(t.id);
                }

                if (u.activeVmId != null) {
                  existing.activeVmId = u.activeVmId;
                }
              } else {
                const newUser = createVmUser(u, t.id);
                users.set(u.userId, newUser);
              }
            });
          });

          this.vmUsersService.set([...users.values()]);
        });
    });
  }

  public leaveViewUsers(viewId: string) {
    this.joinUsers = false;

    this.startConnection().then(() =>
      this.hubConnection.invoke('LeaveViewUsers', viewId),
    );
  }

  private addHandlers() {
    this.addVmHandlers();
    this.addUserHandlers();
  }

  private addVmHandlers() {
    this.hubConnection.on(
      'VmUpdated',
      (vm: Vm, modifiedProperties: string[]) => {
        let model: Partial<Vm> = vm;
        if (modifiedProperties != null) {
          model = {};

          modifiedProperties.forEach((x) => {
            model[x] = vm[x];
          });
        }

        this.vmService.update(vm.id, model);
      },
    );

    this.hubConnection.on('VmCreated', (vm: Vm) => {
      this.vmService.add(vm);
    });

    this.hubConnection.on('VmDeleted', (id: string) => {
      this.vmService.remove(id);
    });
  }

  private addUserHandlers() {
    this.hubConnection.on(
      'ActiveVirtualMachine',
      (vmId: string, userId: string) => {
        this.vmUsersService.update(userId, { activeVmId: vmId });
      },
    );
  }
}

class RetryPolicy {
  constructor(
    private maxSeconds: number,
    private minJitterSeconds: number,
    private maxJitterSeconds: number,
  ) {}

  nextRetryDelayInMilliseconds(
    retryContext: signalR.RetryContext,
  ): number | null {
    let nextRetrySeconds = Math.pow(2, retryContext.previousRetryCount + 1);

    if (nextRetrySeconds > this.maxSeconds) {
      nextRetrySeconds = this.maxSeconds;
    }

    nextRetrySeconds +=
      Math.floor(
        Math.random() * (this.maxJitterSeconds - this.minJitterSeconds + 1),
      ) + this.minJitterSeconds; // Add Jitter

    return nextRetrySeconds * 1000;
  }
}
