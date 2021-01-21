/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import {
  Component,
  ChangeDetectionStrategy,
  Input,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { VmTeam } from '../../state/vm-teams/vm-team.model';
import { VmUser } from '../../state/vm-users/vm-user.model';
import { VmUsersQuery } from '../../state/vm-users/vm-users.query';
import { SignalRService } from '../../services/signalr/signalr.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent {
  @Input() viewId: string;
  @Input() set teams(val: Array<VmTeam>) {
    this._teams = val;
    this.userQueryMap.clear();

    val.forEach((t) => {
      this.userQueryMap.set(t.id, this.vmUsersQuery.selectByTeam(t.id));
    });
  }

  @Input() set isActive(val: boolean) {
    if (val) {
      this.setActive();
    } else {
      this.setInactive();
    }
  }

  @Output() openTab = new EventEmitter<{ [name: string]: string }>();

  public _teams: Array<VmTeam>;
  public hideInactive = false;

  @ViewChild(MatAccordion) accordion: MatAccordion;

  public searchTerm = '';
  public searchTermSubject = new BehaviorSubject('');
  public searchTerm$ = this.searchTermSubject
    .asObservable()
    .pipe(debounceTime(100));

  public userQueryMap = new Map<string, Observable<Array<VmUser>>>();

  constructor(
    private signalRService: SignalRService,
    private vmUsersQuery: VmUsersQuery
  ) {}

  private setActive(): void {
    this.signalRService.joinViewUsers(this.viewId);
  }

  private setInactive(): void {
    this.signalRService.leaveViewUsers(this.viewId);
  }

  public applyFilter(filterValue: string) {
    this.searchTerm = filterValue.toLowerCase();
    this.searchTermSubject.next(this.searchTerm);
  }

  public clearFilter() {
    this.applyFilter('');
  }

  public setHideInactive(value: boolean) {
    this.hideInactive = value;
  }

  public trackByTeamId(item: VmTeam) {
    return item.id;
  }

  public onOpenTab(val: { [name: string]: string }) {
    this.openTab.emit(val);
  }
}
