/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { ComnSettingsService } from '@cmusei/crucible-common';
import {
  TableVirtualScrollDataSource,
  TableVirtualScrollModule,
} from 'ng-table-virtual-scroll';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmTeam } from '../../../state/vm-teams/vm-team.model';
import { VmUser } from '../../../state/vm-users/vm-user.model';
import { VmsQuery } from '../../../state/vms/vms.query';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import { NgStyle, NgIf, AsyncPipe } from '@angular/common';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';

@Component({
  selector: 'app-team-users',
  templateUrl: './team-users.component.html',
  styleUrls: ['./team-users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    CdkVirtualScrollViewport,
    TableVirtualScrollModule,
    NgStyle,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatIconButton,
    MatTooltip,
    MatIcon,
    NgIf,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    AsyncPipe,
  ],
})
export class TeamUsersComponent {
  @Input() team: VmTeam = null;

  @Input() set hideInactive(val: boolean) {
    this.hideInactiveInternal = val;
    this.updateDataSource();
  }

  @Input() set users(val: Array<VmUser>) {
    this.userList = val;
    this.updateDataSource();
  }

  @Input() set searchTerm(val: string) {
    this.userDatasource.filter = val;
    this.calculateTableHeight();
  }

  @Output() openTab = new EventEmitter<{ [name: string]: string }>();

  private userList: Array<VmUser>;
  private hideInactiveInternal = false;

  public userDatasource = new TableVirtualScrollDataSource<VmUser>(
    new Array<VmUser>(),
  );
  public displayedColumns: string[] = ['name', 'vm'];
  public itemSize = 48;
  public headerSize = 56;
  public maxSize = this.itemSize * 7;
  public tableHeight = '0px';

  constructor(
    public vmsQuery: VmsQuery,
    private settingsService: ComnSettingsService,
    private themeService: ThemeService,
  ) {
    this.userDatasource.filterPredicate = (data: VmUser, filter: string) => {
      return data.username.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    };
  }

  public openInTab(user: VmUser) {
    window.open(this.getUrl(user), '_blank');
  }

  public openHere($event, user: VmUser) {
    $event.preventDefault();
    const url = this.getUrl(user);
    const val = <{ [name: string]: string }>{ name: user.username, url };
    this.openTab.emit(val);
  }

  private getUrl(user: VmUser) {
    return this.themeService.addThemeQueryParam(
      this.settingsService.settings.UserFollowUrl.replace(
        '{userId}',
        user.userId,
      ).replace('{viewId}', this.team.viewId),
    );
  }

  private updateDataSource() {
    if (this.hideInactiveInternal) {
      this.userDatasource.data = this.userList.filter(
        (x) => x.activeVmId != null,
      );
    } else {
      this.userDatasource.data = this.userList;
    }

    this.calculateTableHeight();
  }

  calculateTableHeight() {
    const count = this.userDatasource.filteredData.length;
    let height: number;
    height = this.headerSize * 1.2 + count * this.itemSize;

    if (height > this.maxSize) {
      height = this.maxSize;
    }

    this.tableHeight = `${height}px`;
  }
}
