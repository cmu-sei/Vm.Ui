// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { renderComponent } from '../../test-utils/render-component';
import { PageNotFoundComponent } from './page-not-found.component';

describe('PageNotFoundComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers.
   * Interacts with: getDefaultProviders (placeholders and stubs only).
   * Data: no inputs.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderComponent(PageNotFoundComponent);

    expect(fixture.componentInstance).toBeInstanceOf(PageNotFoundComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
  });

  /**
   * Verifies: without inputs the page shows the View Not Found heading.
   * Interacts with: the component's default inputs.
   * Data: no inputs.
   */
  it('shows View Not Found by default', async () => {
    await renderComponent(PageNotFoundComponent);

    expect(
      screen.getByRole('heading', { name: 'View Not Found' }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: the heading and message inputs replace the defaults.
   * Interacts with: the component's inputs only.
   * Data: heading 'Virtual Machine Not Found', a custom message.
   */
  it('shows the heading and message it is given', async () => {
    await renderComponent(PageNotFoundComponent, {
      inputs: { heading: 'Virtual Machine Not Found', message: 'No such VM.' },
    });

    expect(
      screen.getByRole('heading', { name: 'Virtual Machine Not Found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No such VM.')).toBeInTheDocument();
  });
});
