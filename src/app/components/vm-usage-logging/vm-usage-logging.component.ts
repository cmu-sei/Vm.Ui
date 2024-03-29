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
import {
  MatTableDataSource,
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
import { Clipboard } from '@angular/cdk/clipboard';
import {
  UntypedFormControl,
  UntypedFormGroup,
  FormGroupDirective,
  NgForm,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  ErrorStateMatcher,
  MatNativeDateModule,
  MatOption,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { TeamService, Team } from '../../generated/player-api';
import { saveAs } from 'file-saver-es';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { DialogService } from '../../services/dialog/dialog.service';
import { MatButton } from '@angular/material/button';
import {
  MatDateRangeInput,
  MatStartDate,
  MatEndDate,
  MatDatepickerToggle,
  MatDateRangePicker,
} from '@angular/material/datepicker';
import { MatSelect } from '@angular/material/select';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { MatInput } from '@angular/material/input';
import {
  MatFormField,
  MatLabel,
  MatHint,
  MatError,
  MatSuffix,
} from '@angular/material/form-field';

/** Error when invalid control is dirty, touched, or submitted. */
export class MyErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null,
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
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatHint,
    NgIf,
    MatError,
    MatSelect,
    NgFor,
    MatOption,
    MatDateRangeInput,
    MatStartDate,
    MatEndDate,
    MatDatepickerToggle,
    MatSuffix,
    MatDateRangePicker,
    MatButton,
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
    MatPaginator,
    DatePipe,
  ],
  providers: [provideNativeDateAdapter()],
})
export class VmUsageLoggingComponent implements AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('formDirective') private formDirective: NgForm;
  dataSource = new MatTableDataSource<VmUsageLoggingSession>(
    new Array<VmUsageLoggingSession>(),
  );
  systemTeams = new Array<Team>();
  unsubscribe$: Subject<null> = new Subject<null>();
  vmLoggingSessions$: Observable<VmUsageLoggingSession[]>;
  refreshSessions$ = new BehaviorSubject<boolean>(true);

  sessionNameFormControl = new UntypedFormControl('', [
    Validators.required,
    Validators.minLength(5),
  ]);
  sessionTeamsFormControl = new UntypedFormControl('', [Validators.required]);

  matcher = new MyErrorStateMatcher();

  viewId: string;

  CSHARP_MIN_DATE = '0001-01-01T00:00:00+00:00';

  public displayedColumns: string[] = [
    'id',
    'sessionName',
    'teamIds',
    'sessionStart',
    'sessionEnd',
  ];

  newLogName = '';
  selectedTeams = [];
  startDate = '';
  endDate = '';

  range = new UntypedFormGroup({
    start: new UntypedFormControl(),
    end: new UntypedFormControl(),
  });

  constructor(
    private vmUsageLoggingSessionService: VmUsageLoggingSessionService,
    private teamService: TeamService,
    private clipboard: Clipboard,
    private routerQuery: RouterQuery,
    private dialogService: DialogService,
  ) {
    this.viewId = this.routerQuery.getParams('viewId');

    this.vmLoggingSessions$ = this.refreshSessions$.pipe(
      switchMap((_) =>
        this.vmUsageLoggingSessionService.getAllSessions(this.viewId),
      ),
    );

    this.vmLoggingSessions$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((sessions) => {
        this.dataSource.data = sessions;
      });

    this.teamService
      .getViewTeams(this.viewId)
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
    this.vmUsageLoggingSessionService
      .getVmUsageCsvFile(id, 'body', false, {
        httpHeaderAccept: 'text/csv',
      })
      .pipe(take(1))
      .subscribe((csv) => {
        const blob = new Blob([csv], { type: 'text/csv' });
        saveAs(blob, name + '.csv');
      });
  }

  createNewSession() {
    if (
      !this.sessionNameFormControl.hasError('required') &&
      !this.sessionNameFormControl.hasError('minlength') &&
      !this.sessionTeamsFormControl.hasError('required') &&
      !this.range.controls.start.errors?.required &&
      !this.range.controls.end.errors?.required
    ) {
      // 2022-03-17T04:00:00.000Z is the required format for sessionStart
      const startDt = new Date(this.range.value.start);
      startDt.setHours(0, 0, 0, 0);
      const endDt = new Date(this.range.value.end);
      startDt.setHours(0, 0, 0, 0);
      const tmIds: string[] = [];
      for (const team of this.selectedTeams) {
        tmIds.push(team.id);
      }
      const session: VmUsageLoggingSession = {
        sessionName: this.newLogName,
        viewId: this.viewId,
        teamIds: tmIds,
        sessionStart: startDt.toISOString(),
        sessionEnd: endDt.toISOString(),
      };
      this.vmUsageLoggingSessionService
        .createSession(session)
        .pipe(take(1))
        .subscribe((_) => {
          this.refresh();
          this.sessionTeamsFormControl.reset();
          this.newLogName = '';
          this.formDirective.resetForm();
        });
    }
  }

  refresh() {
    this.refreshSessions$.next(true);
  }

  copyToClipboard(val: string) {
    this.clipboard.copy(val);
  }

  deleteSession(id: string, name: string) {
    this.dialogService
      .confirm(
        'Delete Logging Session:  ' + name,
        'Are you sure that you want to delete all previously logged data?',
        { buttonTrueText: 'Delete' },
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.vmUsageLoggingSessionService
            .deleteSession(id)
            .pipe(take(1))
            .subscribe((_) => {
              this.refresh();
            });
        }
      });
  }

  isSessionActive(endDt: string): Boolean {
    const sessionEnd = new Date(endDt);
    return (
      sessionEnd.getTime() <= new Date(this.CSHARP_MIN_DATE).getTime() ||
      sessionEnd.getTime() > new Date().getTime()
    );
  }

  getTeamName(id: string): string {
    const team = this.systemTeams.find((t) => t.id === id);
    return team?.name;
  }

  updateLogName(evt: any) {
    this.newLogName = evt.target.value;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
