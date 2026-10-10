// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { of, ObjectUnsubscribedError, Subject } from 'rxjs';
import { take } from 'rxjs/operators';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Vm } from '../../generated/vm-api';
import { AutoDeployService } from '../../services/auto-deploy/auto-deploy.service';
import { ThemeService } from '../../services/theme/theme.service';
import { VmService } from '../../state/vms/vms.service';
import { activatedRouteStub } from '../../test-utils/activated-route';
import { renderComponent } from '../../test-utils/render-component';
import { AutoDeployComponent } from './auto-deploy.component';

const POLL_MS = 5000;

interface Deployment {
  DefaultTemplateConfigured: boolean;
  RoomFull: boolean;
}

async function renderAutoDeploy(
  deployment: Deployment = { DefaultTemplateConfigured: true, RoomFull: false },
) {
  // Each GetViewVms call answers once, when the test responds, like the HTTP call.
  const viewVms = new Subject<Vm[]>();
  const vmService = {
    GetViewVms: vi.fn(() => viewVms.pipe(take(1))),
  } satisfies Pick<VmService, 'GetViewVms'>;
  const autoDeploy = {
    getDeploymentForView: vi.fn(() => of(deployment)),
    deployToView: vi.fn(() => of({})),
  } satisfies Pick<AutoDeployService, 'getDeploymentForView' | 'deployToView'>;
  const theme: Pick<ThemeService, 'addThemeQueryParam'> = {
    addThemeQueryParam: (url) => `${url}?theme=light-theme`,
  };
  const { route } = activatedRouteStub({}, { viewId: 'view-1' });
  const rendered = await renderComponent(AutoDeployComponent, {
    providers: [
      { provide: VmService, useValue: vmService },
      { provide: AutoDeployService, useValue: autoDeploy },
      { provide: ThemeService, useValue: theme },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  const respond = (vms: Vm[]) => {
    viewVms.next(vms);
    rendered.detectChanges();
  };
  return { ...rendered, vmService, autoDeploy, respond };
}

const requestButton = () =>
  screen.getByRole('button', { name: 'Request Workstation' });

describe('AutoDeployComponent', () => {
  // After a request the component polls every 5 seconds; fake timers keep the
  // interval out of the zone and let tests step it.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('page', () => {
    beforeEach(() => {
      // ngOnDestroy throws (see 'keeps polling and throws when destroyed
      // after a request'); stubbed here so the TestBed teardown stays clean.
      vi.spyOn(AutoDeployComponent.prototype, 'ngOnDestroy').mockImplementation(
        () => {},
      );
    });

    /**
     * Verifies: the component mounts with the default test providers.
     * Interacts with: VmService.GetViewVms stub (answers with no VMs); AutoDeployService.getDeploymentForView stub.
     * Data: route viewId 'view-1'; DefaultTemplateConfigured true, RoomFull false.
     */
    it('renders with the default test providers', async () => {
      const { fixture, respond } = await renderAutoDeploy();
      respond([]);

      expect(fixture.componentInstance).toBeInstanceOf(AutoDeployComponent);
      expect(fixture.nativeElement).toBeInTheDocument();
    });

    /**
     * Verifies: with no VM in the view and a configured template, the page offers Request Workstation enabled.
     * Interacts with: VmService.GetViewVms stub (answers with no VMs); AutoDeployService.getDeploymentForView stub.
     * Data: route viewId 'view-1'; DefaultTemplateConfigured true, RoomFull false.
     */
    it('offers Request Workstation when the view has no VM yet', async () => {
      const { vmService, autoDeploy, respond } = await renderAutoDeploy();
      respond([]);

      expect(vmService.GetViewVms).toHaveBeenCalledWith(true, true);
      expect(autoDeploy.getDeploymentForView).toHaveBeenCalledWith('view-1');
      expect(requestButton()).toBeEnabled();
    });

    /**
     * Verifies: without a default template, or with the room full, the request button is shown disabled with an explanation.
     * Interacts with: AutoDeployService.getDeploymentForView stub; MatSnackBar (real).
     * Data: one row per refusal reason and its snack bar message.
     */
    it.each([
      {
        reason: 'no default template is configured',
        deployment: { DefaultTemplateConfigured: false, RoomFull: false },
        message: 'A default workstation has not been configured for your Team.',
      },
      {
        reason: 'the room is full',
        deployment: { DefaultTemplateConfigured: true, RoomFull: true },
        message:
          "Your team's workstation allocation is full. Please contact an administrator to request additional capacity.",
      },
    ])(
      'disables the request button when $reason',
      async ({ deployment, message }) => {
        const { respond } = await renderAutoDeploy(deployment);
        respond([]);

        expect(requestButton()).toBeDisabled();
        expect(screen.getByText(message)).toBeInTheDocument();
      },
    );

    /**
     * Verifies: Request Workstation deploys to the routed view, disables itself, and then polls the view's VMs every 5 seconds.
     * Interacts with: the rendered button (user-event); AutoDeployService.deployToView stub; VmService.GetViewVms stub; fake timers.
     * Data: route viewId 'view-1'; no VM yet; one poll interval elapses.
     */
    it('requests a workstation and polls for it', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const { autoDeploy, vmService, respond } = await renderAutoDeploy();
      respond([]);

      await user.click(requestButton());
      vmService.GetViewVms.mockClear();
      vi.advanceTimersByTime(POLL_MS);

      expect(autoDeploy.deployToView).toHaveBeenCalledExactlyOnceWith('view-1');
      expect(requestButton()).toBeDisabled();
      expect(vmService.GetViewVms).toHaveBeenCalledExactlyOnceWith(true, true);
    });
  });

  /**
   * Verifies: destroying the page after a request throws ObjectUnsubscribedError and the 5-second poll keeps running (current behavior).
   * Interacts with: the rendered button (user-event); fixture.destroy (ngOnDestroy); fake timers; VmService.GetViewVms stub.
   * Data: no VM yet; one poll interval elapses after the destroy.
   */
  it('keeps polling and throws when destroyed after a request', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { fixture, vmService, respond } = await renderAutoDeploy();
    respond([]);
    await user.click(requestButton());
    vmService.GetViewVms.mockClear();

    // Current behavior; see agent-docs/ui-test-bugs/vm.ui.md.
    expect(() => fixture.destroy()).toThrow(ObjectUnsubscribedError);
    vi.advanceTimersByTime(POLL_MS);
    expect(vmService.GetViewVms).toHaveBeenCalledOnce();
  });
});
