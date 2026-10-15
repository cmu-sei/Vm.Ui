// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { renderComponent } from '../../test-utils/render-component';
import { VmUsageReportingComponent } from './vm-usage-reporting.component';

describe('VmUsageReportingComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: getDefaultProviders (VmUsageLoggingSessionService and RouterQuery are not called while mounting).
   * Data: no date range chosen.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderComponent(VmUsageReportingComponent);

    expect(fixture.componentInstance).toBeInstanceOf(VmUsageReportingComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: with no report loaded, Get and CSV start disabled.
   * Interacts with: the report form's buttons.
   * Data: no date range chosen.
   */
  it('disables Get and CSV before a date range is chosen', async () => {
    await renderComponent(VmUsageReportingComponent);

    expect(screen.getByRole('button', { name: 'Get' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'CSV' })).toBeDisabled();
  });
});
