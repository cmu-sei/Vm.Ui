// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { NEVER, of, ObjectUnsubscribedError, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Vm } from '../../generated/vm-api';
import { ThemeService } from '../../services/theme/theme.service';
import { WelderService } from '../../services/welder/welder.service';
import { VmService } from '../../state/vms/vms.service';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { renderComponent } from '../../test-utils/render-component';
import { WelderComponent } from './welder.component';

const POLL_MS = 30000;

async function renderWelder() {
  // Each GetTeamVms call answers once, when the test responds, like the HTTP call.
  const teamVms = new Subject<Vm[]>();
  const vmService = {
    GetTeamVms: vi.fn(() => teamVms.pipe(take(1))),
  } satisfies Pick<VmService, 'GetTeamVms'>;
  const welder = {
    deployToView: vi.fn(() => of({})),
    // NEVER keeps the queue check inert; the snack bar it opens is not under test.
    getQueueSize: vi.fn(() => NEVER),
  } satisfies Pick<WelderService, 'deployToView' | 'getQueueSize'>;
  const theme: Pick<ThemeService, 'addThemeQueryParam'> = {
    addThemeQueryParam: (url) => `${url}?theme=light-theme`,
  };
  const { route } = activatedRouteStub(
    {},
    { viewName: 'Exercise', teamId: 'team-1' },
  );
  const rendered = await renderComponent(WelderComponent, {
    providers: [
      { provide: VmService, useValue: vmService },
      { provide: WelderService, useValue: welder },
      { provide: ThemeService, useValue: theme },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  const respond = (vms: Vm[]) => {
    teamVms.next(structuredClone(vms));
    rendered.detectChanges();
  };
  return { ...rendered, vmService, welder, respond };
}

describe('WelderComponent', () => {
  // The component polls every 30 seconds; fake timers keep the interval out
  // of the zone (so the fixture can become stable) and let tests step it.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('page', () => {
    beforeEach(() => {
      // ngOnDestroy throws (see 'keeps polling and throws when destroyed');
      // stubbed here so the TestBed teardown of these tests stays clean.
      vi.spyOn(WelderComponent.prototype, 'ngOnDestroy').mockImplementation(
        () => {},
      );
    });

    /**
     * Verifies: the component mounts with the default test providers.
     * Interacts with: VmService.GetTeamVms stub (answers with no VMs); activatedRouteStub (viewName).
     * Data: no team VMs.
     */
    it('renders with the default test providers', async () => {
      const { fixture, respond } = await renderWelder();
      respond([]);

      expect(fixture.componentInstance).toBeInstanceOf(WelderComponent);
      expect(fixture.nativeElement).toBeInTheDocument();
    });

    /**
     * Verifies: with no team VMs yet, the page offers Request Workstations enabled.
     * Interacts with: VmService.GetTeamVms stub (answers with no VMs).
     * Data: no team VMs.
     */
    it('offers Request Workstations while the team has no VM', async () => {
      const { vmService, respond } = await renderWelder();
      respond([]);

      expect(vmService.GetTeamVms).toHaveBeenCalledWith(true, true);
      expect(
        screen.getByRole('button', { name: 'Request Workstations' }),
      ).toBeEnabled();
    });

    /**
     * Verifies: team VMs are listed as buttons and the request button is hidden.
     * Interacts with: VmService.GetTeamVms stub.
     * Data: two team VMs, kali and win10.
     */
    it('lists the team workstations instead of the request button', async () => {
      const { respond } = await renderWelder();
      respond([
        { id: 'a', name: 'kali', url: 'http://c.test/a' },
        { id: 'b', name: 'win10', url: 'http://c.test/b' },
      ]);

      expect(
        screen.getByRole('heading', { name: 'Workstations' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Request Workstations' }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'kali' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'win10' })).toBeInTheDocument();
    });

    /**
     * Verifies: Request Workstations asks Welder to deploy the routed view and disables itself.
     * Interacts with: the rendered button (user-event); WelderService.deployToView stub; MatSnackBar (real).
     * Data: viewName 'Exercise'; no team VMs.
     */
    it('requests workstations for the routed view', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { welder, respond } = await renderWelder();
      respond([]);
      const request = screen.getByRole('button', {
        name: 'Request Workstations',
      });

      await user.click(request);

      expect(welder.deployToView).toHaveBeenCalledExactlyOnceWith('Exercise');
      expect(request).toBeDisabled();
    });

    /**
     * Verifies: while no VM has arrived, each 30-second poll checks the team VMs and the Welder queue.
     * Interacts with: fake timers; VmService.GetTeamVms and WelderService.getQueueSize stubs.
     * Data: no team VMs; one poll interval elapses.
     */
    it('polls the team VMs and the queue every 30 seconds', async () => {
      const { vmService, welder, respond } = await renderWelder();
      respond([]);
      vmService.GetTeamVms.mockClear();

      vi.advanceTimersByTime(POLL_MS);

      expect(vmService.GetTeamVms).toHaveBeenCalledOnce();
      expect(welder.getQueueSize).toHaveBeenCalledOnce();
    });
  });

  /**
   * Verifies: destroying the page throws ObjectUnsubscribedError and the 30-second poll keeps running afterwards (current behavior).
   * Interacts with: fixture.destroy (ngOnDestroy); fake timers; VmService.GetTeamVms and WelderService.getQueueSize stubs.
   * Data: no team VMs; one poll interval elapses after the destroy.
   */
  it('keeps polling and throws when destroyed', async () => {
    const { fixture, vmService, welder, respond } = await renderWelder();
    respond([]);
    vmService.GetTeamVms.mockClear();

    // Current behavior; see agent-docs/ui-test-bugs/vm.ui.md.
    expect(() => fixture.destroy()).toThrow(ObjectUnsubscribedError);
    vi.advanceTimersByTime(POLL_MS);
    expect(vmService.GetTeamVms).toHaveBeenCalledOnce();
    expect(welder.getQueueSize).toHaveBeenCalledOnce();
  });
});
