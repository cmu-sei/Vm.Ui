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
} from '../../generated/vm-api';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { TeamService, Team } from '../../generated/player-api';
import { saveAs } from 'file-saver';

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
  selector: 'app-vm-usage-logging',
  templateUrl: './vm-usage-logging.component.html',
  styleUrls: ['./vm-usage-logging.component.scss'],
})
export class VmUsageLoggingComponent implements AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  dataSource = new MatTableDataSource<VmUsageLoggingSession>(
    new Array<VmUsageLoggingSession>()
  );
  systemTeams = new Array<Team>();
  unsubscribe$: Subject<null> = new Subject<null>();
  vmLoggingSessions$: Observable<VmUsageLoggingSession[]>;
  refreshSessions$ = new BehaviorSubject<boolean>(true);

  sessionNameFormControl = new FormControl('', [
    Validators.required,
    Validators.minLength(5),
  ]);
  sessionTeamsFormControl = new FormControl('', [Validators.required]);
  sessionDateFormControl = new FormControl('', [Validators.required]);

  matcher = new MyErrorStateMatcher();

  public displayedColumns: string[] = [
    'id',
    'sessionName',
    'teamIds',
    'sessionStart',
    'sessionEnd',
  ];

  timeValues: string[] = [
    '00:00',
    '01:00',
    '02:00',
    '03:00',
    '04:00',
    '05:00',
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
  ];

  newLogName = '';
  selectedTeams = [];
  selectedDate = '';
  selectedTime = '00:00';

  constructor(
    private vmUsageLoggingSessionService: VmUsageLoggingSessionService,
    private teamService: TeamService,
    private clipboard: Clipboard
  ) {
    this.vmLoggingSessions$ = this.refreshSessions$.pipe(
      switchMap((_) => this.vmUsageLoggingSessionService.getAllSessions())
    );

    this.vmLoggingSessions$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((sessions) => {
        this.dataSource.data = sessions;
      });

    this.teamService
      .getTeams()
      .pipe(take(1))
      .subscribe((tms) => {
        this.systemTeams = tms;
      });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  endSession(id: string) {
    console.log('end session ', id);
    this.vmUsageLoggingSessionService
      .endSession(id)
      .pipe(take(1))
      .subscribe((s) => {
        this.refresh();
      });
  }

  downloadCSV(id: string, name: string) {
    this.vmUsageLoggingSessionService.getVmUsageCsvFile(id).pipe(take(1)).subscribe(csv => {
      console.log('chad', csv);
      const blob = new Blob([csv], { type: 'text/csv' });
      saveAs(blob, name + '.csv');
    });
  }

  createNewSession() {
    if (
      !this.sessionNameFormControl.hasError('required') &&
      !this.sessionNameFormControl.hasError('minlength') &&
      !this.sessionDateFormControl.hasError('required') &&
      !this.sessionTeamsFormControl.hasError('required')
    ) {
      // 2022-03-17T04:00:00.000Z is the required format for sessionStart
      const hourVal = Number(this.selectedTime.replace(':00', ''));
      const startDt = new Date(this.selectedDate);
      startDt.setHours(hourVal, 0, 0, 0);
      const tmIds: string[] = [];
      for (const team of this.selectedTeams) {
        tmIds.push(team.id);
      }
      const session: VmUsageLoggingSession = {
        sessionName: this.newLogName,
        teamIds: tmIds,
        sessionStart: startDt.toISOString(),
      };
      console.log(session);
      this.vmUsageLoggingSessionService.createSession(session).pipe(take(1)).subscribe(_ => this.refresh());
    }
  }

  refresh() {
    this.refreshSessions$.next(true);
  }

  copyToClipboard(val: string) {
    this.clipboard.copy(val);
  }

  deleteSession(id: string) {}

  getTeamName(id: string): string {
    const team = this.systemTeams.find((t) => t.id === id);
    return team?.name;
  }

  dateChanged(evt: any) {
    this.selectedDate = evt.value;
  }

  updateLogName(evt: any) {
    this.newLogName = evt.target.value;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
