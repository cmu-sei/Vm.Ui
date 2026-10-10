// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { VmUser } from '../../generated/vm-api';
import { SignalRService } from '../../services/signalr/signalr.service';
import { VmTeam } from '../../state/vm-teams/vm-team.model';
import { VmUsersStore } from '../../state/vm-users/vm-users.store';
import { renderComponent } from '../../test-utils/render-component';
import { TeamUsersComponent } from './team-users/team-users.component';
import { UserListComponent } from './user-list.component';

@Component({ selector: 'app-team-users', template: '' })
class TeamUsersStubComponent {
  @Input() team: VmTeam;
  @Input() users: VmUser[];
  @Input() searchTerm: string;
  @Input() hideInactive: boolean;
  @Input() recentOnly: boolean;
  @Input() recentMinutes: number;
  @Output() openTab = new EventEmitter<{ [name: string]: string }>();
  filteredCount() {
    return this.users?.length ?? 0;
  }
}

const TEAMS: VmTeam[] = [
  { id: 'team-2', name: 'Red', viewId: 'view-1' },
  { id: 'team-1', name: 'Blue', viewId: 'view-1' },
];

async function renderUserList(isActive: boolean) {
  const signalR = {
    joinViewUsers: vi.fn(),
    leaveViewUsers: vi.fn(),
  } satisfies Pick<SignalRService, 'joinViewUsers' | 'leaveViewUsers'>;
  const rendered = await renderComponent(UserListComponent, {
    inputs: { viewId: 'view-1', teams: structuredClone(TEAMS), isActive },
    childStubs: [{ replace: TeamUsersComponent, with: TeamUsersStubComponent }],
    providers: [{ provide: SignalRService, useValue: signalR }],
  });
  const teamUsers = () =>
    rendered.fixture.debugElement
      .queryAll(By.directive(TeamUsersStubComponent))
      .map((d) => d.componentInstance as TeamUsersStubComponent);
  return { ...rendered, signalR, teamUsers };
}

describe('UserListComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: SignalRService stub; TeamUsers stub; real VmUsersQuery.
   * Data: teams Red and Blue; isActive false.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderUserList(false);

    expect(fixture.componentInstance).toBeInstanceOf(UserListComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: an inactive list shows one team panel per team, sorted by name, and leaves the user hub group.
   * Interacts with: SignalRService stub (leaveViewUsers, joinViewUsers); TeamUsers stub inputs.
   * Data: teams Red and Blue; isActive false.
   */
  it('lists the teams by name and leaves the user hub while inactive', async () => {
    const { signalR, teamUsers } = await renderUserList(false);

    expect(teamUsers().map((t) => t.team.name)).toEqual(['Blue', 'Red']);
    expect(signalR.leaveViewUsers).toHaveBeenCalledWith('view-1');
    expect(signalR.joinViewUsers).not.toHaveBeenCalled();
  });

  /**
   * Verifies: an active User Follow tab joins the view's user hub group and each team panel gets its own team's users.
   * Interacts with: SignalRService stub (joinViewUsers); real VmUsersStore/Query (selectByTeam); TeamUsers stub inputs.
   * Data: isActive true; one user on team-1 and one on team-2.
   */
  it('joins the user hub and passes each team its users', async () => {
    const { signalR, teamUsers, detectChanges } = await renderUserList(true);

    TestBed.inject(VmUsersStore).set([
      { userId: 'u1', username: 'alice', teamId: 'team-1' },
      { userId: 'u2', username: 'bob', teamId: 'team-2' },
    ]);
    detectChanges();

    expect(signalR.joinViewUsers).toHaveBeenCalledWith('view-1');
    expect(
      teamUsers().map((t) => [t.team.name, t.users.map((u) => u.username)]),
    ).toEqual([
      ['Blue', ['alice']],
      ['Red', ['bob']],
    ]);
  });
});
