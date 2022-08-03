/**
 * Copyright 2022 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { Component, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';
import {
  VmUsageLoggingSession,
  VmUsageLoggingSessionService,
  VmUsageReport
} from '../../generated/vm-api';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { TeamService, Team } from '../../generated/player-api';
import { saveAs } from 'file-saver';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { DialogService } from '../../services/dialog/dialog.service';
import { HttpHeaders } from '@angular/common/http';

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || isSubmitted)
    );
  }
}

@Component({
  selector: 'app-vm-usage-reporting',
  templateUrl: './vm-usage-reporting.component.html',
  styleUrls: ['./vm-usage-reporting.component.scss'],
})
export class VmUsageReportingComponent implements AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('formDirective') private formDirective: NgForm;
  unsubscribe$: Subject<null> = new Subject<null>();
  dataSource = new MatTableDataSource<VmUsageReport>(
    new Array<VmUsageReport>()
  );
  rawVmUsageList = new Array<VmUsageReport>();
  sortedVmUsageList = new Array<VmUsageReport>();
  matcher = new MyErrorStateMatcher();
  reportFormatIndex = 0;
  reportFormatList = ['By User', 'By Session'];
  displayedColumns: string[][] = [
    [
      'userName',
      'sessionName',
      'sessionDuration',
      'vmName',
      'minutesActive'
    ],
    [
      'sessionName',
      'sessionDuration',
      'userName',
      'vmName',
      'minutesActive'
    ]
  ];
  startDate = new Date();
  endDate = new Date();
  range = new FormGroup({
    start: new FormControl(),
    end: new FormControl(),
  });

  constructor(
    private vmUsageLoggingSessionService: VmUsageLoggingSessionService,
    private teamService: TeamService,
    private clipboard: Clipboard,
    private routerQuery: RouterQuery,
    private dialogService: DialogService
  ) {
  }

  ngAfterViewInit(): void {
  }

  setReportFormat(index: number) {
    this.reportFormatIndex = index;
    this.prepareReportDataSource();
  }

  prepareReportDataSource() {
    this.sortedVmUsageList = [];
    this.rawVmUsageList.forEach(u => this.sortedVmUsageList.push(Object.assign({}, u)));
    this.sortedVmUsageList = this.sortedVmUsageList.sort((a, b) => {
      if (this.reportFormatIndex === 0) {
        // sort usernames first
        if (a.userName > b.userName) return 1;
        if (a.userName < b.userName) return -1;
        // usernames are the same, sort session names
        if (a.sessionName > b.sessionName) return 1;
        if (a.sessionName < b.sessionName) return -1;
        // session names are the same, sort session starts
        if (a.sessionStart > b.sessionStart) return 1;
        if (a.sessionStart < b.sessionStart) return -1;
        // sessions are the same, sort VM names
        if (a.vmName > b.vmName) return 1;
        return -1;
      }
      else {
        // sort session names first
        if (a.sessionName > b.sessionName) return 1;
        if (a.sessionName < b.sessionName) return -1;
        // session names are the same, sort session starts
        if (a.sessionStart > b.sessionStart) return 1;
        if (a.sessionStart < b.sessionStart) return -1;
        // sessions are the same, sort usernames
        if (a.userName > b.userName) return 1;
        if (a.userName < b.userName) return -1;
        // user names are the same, sort VM names
        if (a.vmName > b.vmName) return 1;
        return -1;
      }
    });
    // Only display grouped values when they change
    this.blankRepeatValues();
    // set the displayed values
    this.dataSource = new MatTableDataSource<VmUsageReport>(this.sortedVmUsageList);
    this.dataSource.paginator = this.paginator;
}

  blankRepeatValues() {
    var previousUserName = '';
    var previousSessionName = '';
    var previousSessionStart = '';
    if (this.reportFormatIndex === 0) {
      for (var i = 0; i < this.sortedVmUsageList.length; i++) {
        if (this.sortedVmUsageList[i].userName === previousUserName) {
          this.sortedVmUsageList[i].userName = ' ';
          if (this.sortedVmUsageList[i].sessionName === previousSessionName && this.sortedVmUsageList[i].sessionStart === previousSessionStart) {
            this.sortedVmUsageList[i].sessionName = ' ';
          } else {
            previousSessionName = this.sortedVmUsageList[i].sessionName;
            previousSessionStart = this.sortedVmUsageList[i].sessionStart;
          }
        } else {
          previousUserName = this.sortedVmUsageList[i].userName;
          previousSessionName = this.sortedVmUsageList[i].sessionName;
          previousSessionStart = this.sortedVmUsageList[i].sessionStart;
        }
      }
    }
    else {
      for (var i = 0; i < this.sortedVmUsageList.length; i++) {
        if (this.sortedVmUsageList[i].sessionName === previousSessionName && this.sortedVmUsageList[i].sessionStart === previousSessionStart) {
          this.sortedVmUsageList[i].sessionName = ' ';
          if (this.sortedVmUsageList[i].userName === previousUserName) {
            this.sortedVmUsageList[i].userName = ' ';
          } else {
            previousUserName = this.sortedVmUsageList[i].userName;
          }
        } else {
          previousSessionName = this.sortedVmUsageList[i].sessionName;
          previousSessionStart = this.sortedVmUsageList[i].sessionStart;
          previousUserName = this.sortedVmUsageList[i].userName;
        }
      }
    }
  }

  readyToGet() {
    if ((this.range.value.start && this.range.value.end) &&
        (this.range.value.start.valueOf() !== this.startDate.valueOf() ||
         this.range.value.end.valueOf() !== this.endDate.valueOf())) {
      return true;
    }
    return false;
  }

  getReport() {
    if (!this.range.controls.start.errors?.required &&
        !this.range.controls.end.errors?.required) {
      this.dataSource.data = [];
      this.rawVmUsageList = [];
      // 2022-03-17T04:00:00.000Z is the required format for sessionStart
      const startDt = new Date(this.range.value.start);
      this.startDate = new Date(startDt.valueOf());
      startDt.setHours(0, 0, 0, 0);
      const endDt = new Date(this.range.value.end);
      this.endDate = new Date(endDt.valueOf());
      endDt.setHours(23, 59, 59,999);
      this.vmUsageLoggingSessionService
        .getVmUsageReport(startDt.toISOString(), endDt.toISOString())
        .pipe(take(1))
        .subscribe((vmUsage) => {
          this.rawVmUsageList = vmUsage;
          this.prepareReportDataSource();
        });
    }

  }

  downloadCSV() {
    if (!this.rawVmUsageList || !this.rawVmUsageList.length) {
      return;
    }
    const filename = 'VmUsageData.csv';
    const separator = ',';
    const keys = Object.keys(this.rawVmUsageList[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      this.rawVmUsageList.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell instanceof Date
            ? cell.toLocaleString()
            : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const link = document.createElement('a');
      if (link.download !== undefined) {
        // Browsers that support HTML5 download attribute
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
