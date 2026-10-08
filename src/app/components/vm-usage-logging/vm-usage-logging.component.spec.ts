// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  Team,
  TeamPermissionsClaim,
  TeamService,
} from '../../generated/player-api';
import {
  VmUsageLoggingSession,
  VmUsageLoggingSessionService,
} from '../../generated/vm-api';
import { ApiStub } from '../../test-utils/api-stub';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { permissionDataProviders } from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';
import { VmUsageLoggingComponent } from './vm-usage-logging.component';

const VIEW = 'view-1';
// The API's "no end date" value, which the component treats as still running.
const OPEN_ENDED = '0001-01-01T00:00:00+00:00';

const SESSIONS: VmUsageLoggingSession[] = [
  {
    id: 's1',
    viewId: VIEW,
    sessionName: 'Day one',
    teamIds: ['team-1'],
    sessionStart: '2026-01-05T00:00:00Z',
    sessionEnd: OPEN_ENDED,
  },
];

const TEAMS: Team[] = [{ id: 'team-1', name: 'Blue' }];

// The direct ViewView grant that opens the Usage Logging tab (VmMainComponent's showUsageLogging$).
const VIEW_VIEW_ONLY: TeamPermissionsClaim[] = [
  {
    viewId: VIEW,
    teamId: 'team-1',
    isPrimary: true,
    permissionValues: ['ViewView'],
    directPermissionValues: ['ViewView'],
    sourceTeamIds: [],
  },
];

async function renderUsageLogging(confirmDelete = true) {
  const loggingApi = {
    getAllSessions: vi.fn(() => of(structuredClone(SESSIONS))),
    deleteSession: vi.fn(() => of({})),
    endSession: vi.fn(() => of(structuredClone(SESSIONS[0]))),
  } satisfies ApiStub<VmUsageLoggingSessionService>;
  const teamApi = {
    getViewTeams: vi.fn(() => of(structuredClone(TEAMS))),
  } satisfies ApiStub<TeamService>;
  // getParams is overloaded (one key or the whole map); the component reads 'viewId'.
  const routerQuery = {
    getParams: vi.fn(() => VIEW),
  } as unknown as Pick<RouterQuery, 'getParams'>;
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(confirmDelete).dialogRef,
  );
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const rendered = await renderComponent(VmUsageLoggingComponent, {
    providers: [
      { provide: VmUsageLoggingSessionService, useValue: loggingApi },
      { provide: TeamService, useValue: teamApi },
      { provide: RouterQuery, useValue: routerQuery },
      { provide: CrucibleDialogService, useValue: dialogService },
      ...permissionDataProviders({ teams: VIEW_VIEW_ONLY }),
    ],
  });
  // Scoped to the table element: a role lookup over the whole page is slow under coverage.
  const table = () =>
    within(
      rendered.container.querySelector('[role=table], table') as HTMLElement,
    );
  const form = () =>
    within(rendered.container.querySelector('form') as HTMLElement);
  return { ...rendered, loggingApi, teamApi, confirm, table, form };
}

describe('VmUsageLoggingComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: RouterQuery.getParams stub; stubbed VmUsageLoggingSessionService.getAllSessions and TeamService.getViewTeams.
   * Data: view-1 with one open-ended session on team Blue.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderUsageLogging();

    expect(fixture.componentInstance).toBeInstanceOf(VmUsageLoggingComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the routed view's logging sessions are listed with the view's team names.
   * Interacts with: RouterQuery.getParams stub; stubbed VmUsageLoggingSessionService.getAllSessions and TeamService.getViewTeams.
   * Data: view-1 with one open-ended session on team Blue.
   */
  it("lists the view's logging sessions with their teams", async () => {
    const { loggingApi, teamApi, table } = await renderUsageLogging();

    expect(loggingApi.getAllSessions).toHaveBeenCalledWith(VIEW);
    expect(teamApi.getViewTeams).toHaveBeenCalledWith(VIEW);
    expect(table().getByText('Day one')).toBeInTheDocument();
    expect(table().getByText('Blue')).toBeInTheDocument();
  });

  /**
   * Verifies: the create form and the Delete and End buttons render for a caller whose only grant is the ViewView that opens the tab (current behavior).
   * Interacts with: the rendered form and table (the component injects no permission service; the grant only documents the caller).
   * Data: primary team-1 with ViewView only, provided through permissionDataProviders; one open-ended session.
   */
  it('renders Add, Delete and End to a caller with only ViewView', async () => {
    const { table, form } = await renderUsageLogging();

    // Current behavior; see agent-docs/ui-test-bugs/vm.ui.md.
    expect(form().getByText('Add').closest('button')).toBeInTheDocument();
    expect(table().getByText('Delete').closest('button')).toBeInTheDocument();
    expect(table().getByText('End').closest('button')).toBeInTheDocument();
  });

  /**
   * Verifies: confirming Delete deletes the session through the API and reloads the list.
   * Interacts with: the row's Delete button (user-event); CrucibleDialogService.confirm stub (true); stubbed deleteSession and getAllSessions.
   * Data: one session s1.
   */
  it('deletes a session after confirmation and reloads', async () => {
    const user = userEvent.setup();
    const { loggingApi, confirm, table } = await renderUsageLogging();
    loggingApi.getAllSessions.mockClear();

    await user.click(table().getByText('Delete'));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete Logging Session: Day one' }),
    );
    expect(loggingApi.deleteSession).toHaveBeenCalledExactlyOnceWith('s1');
    expect(loggingApi.getAllSessions).toHaveBeenCalledExactlyOnceWith(VIEW);
  });

  /**
   * Verifies: cancelling the Delete dialog keeps the session.
   * Interacts with: the row's Delete button (user-event); CrucibleDialogService.confirm stub (false); stubbed deleteSession.
   * Data: one session s1.
   */
  it('keeps the session when the delete is cancelled', async () => {
    const user = userEvent.setup();
    const { loggingApi, table } = await renderUsageLogging(false);

    await user.click(table().getByText('Delete'));

    expect(loggingApi.deleteSession).not.toHaveBeenCalled();
    expect(table().getByText('Day one')).toBeInTheDocument();
  });
});
