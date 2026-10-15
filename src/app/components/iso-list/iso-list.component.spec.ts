// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { TeamPermissionsClaim } from '../../generated/player-api';
import {
  AppSystemPermission,
  AppTeamPermission,
  AppViewPermission,
  FileService,
  IsoUploadResult,
  ManagedIsoResult,
} from '../../generated/vm-api';
import { ApiStub } from '../../test-utils/api-stub';
import { dialogRefStub } from '../../test-utils/dialog-refs';
import { permissionDataProviders } from '../../test-utils/mock-permission-data.service';
import { renderComponent } from '../../test-utils/render-component';
// iso-list.component first: the group components import their types from it,
// so loading a child first leaves IsoListComponent's imports undefined.
import {
  IsoGroup,
  IsoListComponent,
  IsoRow,
  IsoViewGroup,
} from './iso-list.component';
import { IsoUploadDialogComponent } from '../iso-upload-dialog/iso-upload-dialog.component';
import { IsoGroupComponent } from './iso-group/iso-group.component';
import { IsoViewGroupComponent } from './iso-view-group/iso-view-group.component';

const VIEW = 'view-1';

@Component({ selector: 'app-iso-group', template: '' })
class IsoGroupStubComponent {
  @Input() group: IsoGroup;
  @Input() deleting: ReadonlySet<string>;
  @Output() delete = new EventEmitter<IsoRow>();
}

@Component({ selector: 'app-iso-view-group', template: '' })
class IsoViewGroupStubComponent {
  @Input() viewGroup: IsoViewGroup;
  @Input() deleting: ReadonlySet<string>;
  @Output() delete = new EventEmitter<IsoRow>();
  openAll() {}
  closeAll() {}
}

const VIEW_ISOS: ManagedIsoResult = {
  viewId: VIEW,
  viewName: 'Exercise',
  isos: [{ filename: 'shared.iso' }],
  teamIsoResults: [
    { teamId: 'team-2', teamName: 'Red', isos: [{ filename: 'red.iso' }] },
    { teamId: 'team-1', teamName: 'Blue', isos: [{ filename: 'blue.iso' }] },
  ],
};

const ALL_ISOS: ManagedIsoResult[] = [
  VIEW_ISOS,
  {
    viewId: 'view-2',
    viewName: 'Another',
    isos: [{ filename: 'other.iso' }],
    teamIsoResults: [],
  },
];

// The caller's primary team-1 in the view with the given effective permissions, plus team-2 outside its context.
function claims(
  primary: string[],
  extra: Partial<TeamPermissionsClaim>[] = [],
): TeamPermissionsClaim[] {
  return [
    {
      viewId: VIEW,
      teamId: 'team-1',
      isPrimary: true,
      permissionValues: primary,
      directPermissionValues: [],
      sourceTeamIds: [],
    },
    ...extra.map((c) => ({
      viewId: VIEW,
      teamId: 'team-2',
      isPrimary: false,
      permissionValues: [],
      directPermissionValues: [],
      sourceTeamIds: [],
      ...c,
    })),
  ];
}

async function renderIsoList(
  grants: {
    system?: AppSystemPermission[];
    teams?: TeamPermissionsClaim[];
  } = {},
  options: {
    confirmAnswer?: boolean;
    deleteIso?: () => Observable<IsoUploadResult>;
    getViewIsos?: () => Observable<ManagedIsoResult>;
  } = {},
) {
  const fileApi = {
    getViewIsos: vi.fn(
      options.getViewIsos ?? (() => of(structuredClone(VIEW_ISOS))),
    ),
    getAllIsos: vi.fn(() => of(structuredClone(ALL_ISOS))),
    deleteIso: vi.fn(
      options.deleteIso ?? (() => of({ partialFailure: false })),
    ),
  } satisfies ApiStub<FileService>;
  const confirm = vi.fn(
    () =>
      dialogRefStub<unknown, boolean>(options.confirmAnswer ?? true).dialogRef,
  );
  const dialogService: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const open = vi.fn(
    () => dialogRefStub<IsoUploadDialogComponent>({ success: false }).dialogRef,
  );
  const dialog: Pick<MatDialog, 'open'> = { open };
  const rendered = await renderComponent(IsoListComponent, {
    inputs: { viewId: VIEW },
    childStubs: [
      { replace: IsoGroupComponent, with: IsoGroupStubComponent },
      { replace: IsoViewGroupComponent, with: IsoViewGroupStubComponent },
    ],
    providers: [
      { provide: FileService, useValue: fileApi },
      { provide: CrucibleDialogService, useValue: dialogService },
      { provide: MatDialog, useValue: dialog },
      ...permissionDataProviders({
        system: grants.system ?? [],
        teams: grants.teams ?? claims([]),
      }),
    ],
  });
  // Each group panel's title with [filename, canDelete] for its rows.
  const groups = () =>
    rendered.fixture.debugElement
      .queryAll(By.directive(IsoGroupStubComponent))
      .map((d) => d.componentInstance as IsoGroupStubComponent)
      .map((g) => [
        g.group.title,
        g.group.rows.map((r) => [r.filename, r.canDelete]),
      ]);
  const viewGroups = () =>
    rendered.fixture.debugElement
      .queryAll(By.directive(IsoViewGroupStubComponent))
      .map((d) => d.componentInstance as IsoViewGroupStubComponent);
  const groupStub = (title: string) =>
    rendered.fixture.debugElement
      .queryAll(By.directive(IsoGroupStubComponent))
      .map((d) => d.componentInstance as IsoGroupStubComponent)
      .find((g) => g.group.title === title)!;
  return { ...rendered, fileApi, confirm, open, groups, viewGroups, groupStub };
}

const uploadButton = () => screen.queryByRole('button', { name: 'Upload' });
const allViewsToggle = () =>
  screen.queryByRole('switch', { name: 'Show ISOs from all views' });

describe('IsoListComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: stubbed FileService.getViewIsos; real UserPermissionsService; IsoGroup stubs.
   * Data: view-1 with shared.iso, Red with red.iso and Blue with blue.iso; primary team-1 with no ISO permission.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderIsoList();

    expect(fixture.componentInstance).toBeInstanceOf(IsoListComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: the list loads the view's ISOs and shows the view-wide group, then the team groups sorted by name.
   * Interacts with: stubbed FileService.getViewIsos; IsoGroup stubs.
   * Data: view-1 with shared.iso, Red with red.iso and Blue with blue.iso.
   */
  it('shows the view-wide group and the team groups sorted by name', async () => {
    const { fileApi, groups } = await renderIsoList();

    expect(fileApi.getViewIsos).toHaveBeenCalledWith(VIEW);
    expect(groups().map(([title]) => title)).toEqual([
      'View (All Teams)',
      'Blue',
      'Red',
    ]);
  });

  describe('upload gate', () => {
    /**
     * Verifies: UploadTeamIsos or UploadViewIsos on the primary team shows the Upload button.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForPrimaryContext (canUpload).
     * Data: one row per upload permission, held by primary team-1.
     */
    it.each([
      AppTeamPermission.UploadTeamIsos,
      AppViewPermission.UploadViewIsos,
    ])('shows Upload with %s', async (permission) => {
      await renderIsoList({ teams: claims([permission]) });

      expect(uploadButton()).toBeInTheDocument();
    });

    /**
     * Verifies: near misses of the upload permissions leave no Upload button.
     * Interacts with: real UserPermissionsService.hasEffectivePermissionsForPrimaryContext (canUpload).
     * Data: one row per near miss: Delete permissions on the primary team; UploadTeamIsos on a team outside the primary context.
     */
    it.each([
      {
        nearMiss: 'DeleteTeamIsos and DeleteViewIsos on the primary team',
        teams: claims([
          AppTeamPermission.DeleteTeamIsos,
          AppViewPermission.DeleteViewIsos,
        ]),
      },
      {
        nearMiss: 'UploadTeamIsos on a team outside the primary context',
        teams: claims(
          [],
          [{ permissionValues: [AppTeamPermission.UploadTeamIsos] }],
        ),
      },
    ])('hides Upload with $nearMiss', async ({ teams }) => {
      await renderIsoList({ teams });

      expect(uploadButton()).not.toBeInTheDocument();
    });

    /**
     * Verifies: the upload dialog is offered the view-wide target and the team targets the caller can upload to.
     * Interacts with: the Upload button (user-event); MatDialog.open stub; real UserPermissionsService (canUploadViewIsos$, canUploadTeamIsos$).
     * Data: one row per grant: UploadTeamIsos on primary team-1 only (Blue), or UploadViewIsos (every team and the view).
     */
    it.each([
      {
        grant: 'UploadTeamIsos on team-1',
        permission: AppTeamPermission.UploadTeamIsos,
        canUploadView: false,
        uploadableTeams: [{ id: 'team-1', name: 'Blue' }],
      },
      {
        grant: 'UploadViewIsos',
        permission: AppViewPermission.UploadViewIsos,
        canUploadView: true,
        uploadableTeams: [
          { id: 'team-1', name: 'Blue' },
          { id: 'team-2', name: 'Red' },
        ],
      },
    ])(
      'opens the upload dialog with the targets of $grant',
      async ({ permission, canUploadView, uploadableTeams }) => {
        const user = userEvent.setup();
        const { open } = await renderIsoList({ teams: claims([permission]) });

        await user.click(uploadButton()!);

        expect(open).toHaveBeenCalledExactlyOnceWith(IsoUploadDialogComponent, {
          data: { viewId: VIEW, canUploadView, uploadableTeams },
          width: '480px',
        });
      },
    );
  });

  describe('delete gates', () => {
    /**
     * Verifies: each row's canDelete follows the delete permission for its group.
     * Interacts with: real UserPermissionsService (canDeleteViewIsos$, canDeleteTeamIsos$); IsoGroup stub inputs.
     * Data: one row per grant: DeleteTeamIsos on primary team-1 (Blue only), DeleteViewIsos (every group).
     */
    it.each([
      {
        grant: 'DeleteTeamIsos on team-1',
        permission: AppTeamPermission.DeleteTeamIsos,
        expected: [
          ['View (All Teams)', [['shared.iso', false]]],
          ['Blue', [['blue.iso', true]]],
          ['Red', [['red.iso', false]]],
        ],
      },
      {
        grant: 'DeleteViewIsos',
        permission: AppViewPermission.DeleteViewIsos,
        expected: [
          ['View (All Teams)', [['shared.iso', true]]],
          ['Blue', [['blue.iso', true]]],
          ['Red', [['red.iso', true]]],
        ],
      },
    ])(
      'lets $grant delete the matching rows',
      async ({ permission, expected }) => {
        const { groups } = await renderIsoList({ teams: claims([permission]) });

        expect(groups()).toEqual(expected);
      },
    );

    /**
     * Verifies: near misses of the delete permissions leave every row without Delete.
     * Interacts with: real UserPermissionsService (canDeleteViewIsos$, canDeleteTeamIsos$); IsoGroup stub inputs.
     * Data: one row per near miss: both Upload permissions on the primary team; DeleteTeamIsos on a team outside the primary context.
     */
    it.each([
      {
        nearMiss: 'UploadTeamIsos and UploadViewIsos on the primary team',
        teams: claims([
          AppTeamPermission.UploadTeamIsos,
          AppViewPermission.UploadViewIsos,
        ]),
      },
      {
        nearMiss: 'DeleteTeamIsos on a team outside the primary context',
        teams: claims(
          [],
          [{ permissionValues: [AppTeamPermission.DeleteTeamIsos] }],
        ),
      },
    ])('offers no Delete with $nearMiss', async ({ teams }) => {
      const { groups } = await renderIsoList({ teams });

      expect(groups()).toEqual([
        ['View (All Teams)', [['shared.iso', false]]],
        ['Blue', [['blue.iso', false]]],
        ['Red', [['red.iso', false]]],
      ]);
    });

    /**
     * Verifies: in the single-view list the system DeleteIsos permission makes no row deletable (current behavior).
     * Interacts with: real UserPermissionsService (canDeleteViewIsos$, canDeleteTeamIsos$); IsoGroup stub inputs.
     * Data: system [DeleteIsos]; primary team-1 with no ISO permission.
     */
    it('offers no Delete in the single-view list for a system DeleteIsos holder', async () => {
      const { groups } = await renderIsoList({
        system: [AppSystemPermission.DeleteIsos],
      });

      // Current behavior; see agent-docs/ui-test-bugs/vm.ui.md.
      expect(groups()).toEqual([
        ['View (All Teams)', [['shared.iso', false]]],
        ['Blue', [['blue.iso', false]]],
        ['Red', [['red.iso', false]]],
      ]);
    });

    /**
     * Verifies: a confirmed Delete deletes the file through the API, removes its row at once and reloads the list.
     * Interacts with: IsoGroup stub's delete output and group input; CrucibleDialogService.confirm stub (true); stubbed deleteIso and getViewIsos.
     * Data: DeleteTeamIsos on team-1; blue.iso deleted; the reload stays pending (NEVER), so the rows shown are the component's own.
     */
    it('deletes a row after confirmation and reloads', async () => {
      const { fileApi, confirm, groupStub, groups, detectChanges } =
        await renderIsoList({
          teams: claims([AppTeamPermission.DeleteTeamIsos]),
        });
      // NEVER keeps the reload pending, so the list shows the row removal itself.
      fileApi.getViewIsos.mockClear().mockImplementation(() => NEVER);

      groupStub('Blue').delete.emit(groupStub('Blue').group.rows[0]);
      detectChanges();

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete ISO' }),
      );
      expect(fileApi.deleteIso).toHaveBeenCalledExactlyOnceWith(
        VIEW,
        'team',
        'blue.iso',
        'team-1',
      );
      expect(fileApi.getViewIsos).toHaveBeenCalledExactlyOnceWith(VIEW);
      expect(groups()).toEqual([
        ['View (All Teams)', [['shared.iso', false]]],
        ['Blue', []],
        ['Red', [['red.iso', false]]],
      ]);
    });

    /**
     * Verifies: a delete that only partly landed keeps the row, so the user can retry.
     * Interacts with: IsoGroup stub's delete output and group input; stubbed deleteIso (partialFailure true) and getViewIsos.
     * Data: DeleteTeamIsos on team-1; blue.iso deleted on some hypervisors only; the reload stays pending (NEVER).
     */
    it('keeps the row when the delete only partly landed', async () => {
      const { fileApi, groupStub, groups, detectChanges } = await renderIsoList(
        { teams: claims([AppTeamPermission.DeleteTeamIsos]) },
        {
          deleteIso: () =>
            of({ partialFailure: true, message: 'Deleted on 1 of 2 hosts.' }),
        },
      );
      // NEVER keeps the reload pending, so the list shows the component's own rows.
      fileApi.getViewIsos.mockImplementation(() => NEVER);

      groupStub('Blue').delete.emit(groupStub('Blue').group.rows[0]);
      detectChanges();

      expect(fileApi.deleteIso).toHaveBeenCalledOnce();
      expect(groups()).toContainEqual(['Blue', [['blue.iso', true]]]);
    });

    /**
     * Verifies: a failed Delete keeps the row and shows the API's message.
     * Interacts with: IsoGroup stub's delete output; CrucibleDialogService.confirm stub; stubbed deleteIso (403).
     * Data: DeleteTeamIsos on team-1; the API refuses with a ProblemDetails title.
     */
    it('shows the error when a delete fails', async () => {
      const failure = new HttpErrorResponse({
        status: 403,
        error: {
          title: 'You do not have permission to delete files for this Team',
        },
      });
      const { confirm, groupStub, groups } = await renderIsoList(
        { teams: claims([AppTeamPermission.DeleteTeamIsos]) },
        { deleteIso: () => throwError(() => failure) },
      );

      groupStub('Blue').delete.emit(groupStub('Blue').group.rows[0]);

      expect(confirm).toHaveBeenLastCalledWith({
        title: 'Delete Failed',
        message: 'You do not have permission to delete files for this Team',
        confirmText: 'OK',
        cancelText: '',
      });
      expect(groups()).toContainEqual(['Blue', [['blue.iso', true]]]);
    });
  });

  describe('all-views mode', () => {
    /**
     * Verifies: system ViewViews or ManageViews offers the all-views toggle.
     * Interacts with: real UserPermissionsService.hasSystemPermission (canViewAllViews).
     * Data: one row per system permission.
     */
    it.each([AppSystemPermission.ViewViews, AppSystemPermission.ManageViews])(
      'offers the all-views toggle with system %s',
      async (permission) => {
        await renderIsoList({ system: [permission] });

        expect(allViewsToggle()).toBeInTheDocument();
      },
    );

    /**
     * Verifies: near misses of the system view permissions hide the all-views toggle.
     * Interacts with: real UserPermissionsService.hasSystemPermission (canViewAllViews).
     * Data: system ViewVms and DeleteIsos; ViewView and ManageView on the primary team.
     */
    it('hides the all-views toggle without system ViewViews or ManageViews', async () => {
      await renderIsoList({
        system: [AppSystemPermission.ViewVms, AppSystemPermission.DeleteIsos],
        teams: claims([
          AppViewPermission.ViewView,
          AppViewPermission.ManageView,
        ]),
      });

      expect(allViewsToggle()).not.toBeInTheDocument();
    });

    /**
     * Verifies: the all-views listing makes every row deletable with system DeleteIsos, and hides Upload there.
     * Interacts with: the all-views toggle (user-event); stubbed getAllIsos; real hasSystemPermission (canDeleteAnyIso); IsoViewGroup stub inputs.
     * Data: system ViewViews and DeleteIsos; UploadTeamIsos on the primary team; views Exercise and Another.
     */
    it('lets system DeleteIsos delete every row in the all-views listing', async () => {
      const user = userEvent.setup();
      const { fileApi, viewGroups } = await renderIsoList({
        system: [AppSystemPermission.ViewViews, AppSystemPermission.DeleteIsos],
        teams: claims([AppTeamPermission.UploadTeamIsos]),
      });
      expect(uploadButton()).toBeInTheDocument();

      await user.click(allViewsToggle()!);

      expect(fileApi.getAllIsos).toHaveBeenCalledOnce();
      expect(uploadButton()).not.toBeInTheDocument();
      expect(
        viewGroups().map((v) => [
          v.viewGroup.viewName,
          [v.viewGroup.viewWideGroup, ...v.viewGroup.teamGroups].flatMap((g) =>
            g.rows.map((r) => [r.filename, r.canDelete]),
          ),
        ]),
      ).toEqual([
        ['Another', [['other.iso', true]]],
        [
          'Exercise',
          [
            ['shared.iso', true],
            ['blue.iso', true],
            ['red.iso', true],
          ],
        ],
      ]);
    });

    /**
     * Verifies: without system DeleteIsos no row of the all-views listing is deletable, even where the caller holds DeleteViewIsos.
     * Interacts with: the all-views toggle (user-event); real hasSystemPermission (canDeleteAnyIso false); IsoViewGroup stub inputs.
     * Data: system ViewViews; DeleteViewIsos on the primary team in view-1.
     */
    it('offers no Delete in the all-views listing without system DeleteIsos', async () => {
      const user = userEvent.setup();
      const { viewGroups } = await renderIsoList({
        system: [AppSystemPermission.ViewViews],
        teams: claims([AppViewPermission.DeleteViewIsos]),
      });

      await user.click(allViewsToggle()!);

      expect(
        viewGroups().flatMap((v) =>
          [v.viewGroup.viewWideGroup, ...v.viewGroup.teamGroups].flatMap((g) =>
            g.rows.filter((r) => r.canDelete).map((r) => r.filename),
          ),
        ),
      ).toEqual([]);
    });
  });

  /**
   * Verifies: a failed load shows the API's message instead of the list.
   * Interacts with: stubbed getViewIsos (500); CrucibleDialogService.confirm stub (message dialog).
   * Data: the API answers 500 with a plain-text body.
   */
  it('shows a message when the ISOs fail to load', async () => {
    const failure = new HttpErrorResponse({
      status: 500,
      error: 'Storage offline',
    });
    const { confirm, groups } = await renderIsoList(
      {},
      { getViewIsos: () => throwError(() => failure) },
    );

    expect(confirm).toHaveBeenCalledExactlyOnceWith({
      title: 'Failed to Load ISOs',
      message: 'Storage offline',
      confirmText: 'OK',
      cancelText: '',
    });
    expect(groups()).toEqual([]);
  });
});
