// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { VmMainComponent } from './vm-main.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { DragToSelectModule } from 'ngx-drag-to-select';

async function renderVmMain() {
  return renderComponent(VmMainComponent, {
    imports: [DragToSelectModule.forRoot()],
  });
}

describe('VmMainComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderVmMain();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have VM List tab', async () => {
    await renderVmMain();
    expect(screen.getByText('VM List')).toBeInTheDocument();
  });

  it('should have User Follow tab', async () => {
    await renderVmMain();
    expect(screen.getByText('User Follow')).toBeInTheDocument();
  });
});
