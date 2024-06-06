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
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { ComnSettingsService } from '@cmusei/crucible-common';
import {
  TableVirtualScrollDataSource,
  TableVirtualScrollModule,
} from 'ng-table-virtual-scroll';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmTeam } from '../../../state/vm-teams/vm-team.model';
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
import { NgStyle, NgIf, AsyncPipe, DatePipe } from '@angular/common';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { VmUser } from '../../../generated/vm-api';

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
    DatePipe,
    MatSortModule,
  ],
})
export class TeamUsersComponent implements AfterViewInit {
  @Input() team: VmTeam = null;

  @Input() set hideInactive(val: boolean) {
    this.hideInactiveInternal = val;
    this.updateDataSource();
  }

  @Input() set recentOnly(val: boolean) {
    this.recentOnlyInternal = val;
    this.updateDataSource();
  }

  @Input() set recentMinutes(val: number) {
    this.recentMinutesInternal = val;
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
  private recentOnlyInternal = false;
  private recentMinutesInternal = 0;

  public userDatasource = new TableVirtualScrollDataSource<VmUser>(
    new Array<VmUser>(),
  );
  public displayedColumns: string[] = [
    'username',
    'activeVmId',
    'lastVmId',
    'lastSeen',
  ];
  public itemSize = 48;
  public headerSize = 56;
  public maxSize = this.itemSize * 7;
  public tableHeight = '0px';

  @ViewChild(MatSort) sort: MatSort;

  constructor(
    public vmsQuery: VmsQuery,
    private settingsService: ComnSettingsService,
    private themeService: ThemeService,
  ) {
    this.userDatasource.filterPredicate = (data: VmUser, filter: string) => {
      return data.username.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
    };
  }

  ngAfterViewInit() {
    this.userDatasource.sort = this.sort;
  }

  public openUserInTab(user: VmUser) {
    window.open(this.getFollowUrl(user), '_blank');
  }

  public openUserHere(event: MouseEvent, user: VmUser) {
    if (!event.ctrlKey) {
      event.preventDefault();
      const url = this.getFollowUrl(user);
      const val = <{ [name: string]: string }>{ name: user.username, url };
      this.openTab.emit(val);
    }
  }

  public openInTab(url: string) {
    window.open(this.getThemedUrl(url), '_blank');
  }

  public openVmHere(event: MouseEvent, url: string, tabName: string) {
    if (!event.ctrlKey) {
      event.preventDefault();
      const vmUrl = this.getVmUrl(url);
      const val = <{ [name: string]: string }>{ name: tabName, url: vmUrl };
      this.openTab.emit(val);
    }
  }

  public getFollowUrl(user: VmUser) {
    return this.themeService.addThemeQueryParam(
      this.settingsService.settings.UserFollowUrl.replace(
        '{userId}',
        user.userId,
      )
        .replace('{viewId}', this.team.viewId)
        .concat(`?teamId=${this.team.id}`),
    );
  }

  public getVmUrl(url: string) {
    const val = new URL(url);
    val.searchParams.set('readOnly', 'true');
    return this.getThemedUrl(val.toString());
  }

  public getThemedUrl(url: string) {
    return this.themeService.addThemeQueryParam(url);
  }

  private updateDataSource() {
    const recent = new Date();
    recent.setMinutes(recent.getMinutes() - this.recentMinutesInternal);

    this.userDatasource.data = this.userList.filter((x) => {
      let filter = true;

      if (this.hideInactiveInternal) {
        filter = x.activeVmId != null;
      }

      if (this.recentOnlyInternal) {
        if (!x.lastSeen) {
          return false;
        }
        const time = new Date(x.lastSeen);
        filter = filter && time > recent;
      }

      return filter;
    });

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
