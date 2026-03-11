// Copyright 2025 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { UserListComponent } from './user-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { MatAccordion } from '@angular/material/expansion';

async function renderUserList(overrides: Partial<UserListComponent> = {}) {
  return renderComponent(UserListComponent, {
    imports: [MatAccordion],
    componentProperties: {
      viewId: 'test-view-id',
      teams: [],
      isActive: false,
      ...overrides,
    } as any,
  });
}

describe('UserListComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderUserList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display search input with placeholder', async () => {
    await renderUserList();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('should show Hide Inactive checkbox', async () => {
    await renderUserList();
    expect(screen.getByText('Hide Inactive')).toBeInTheDocument();
  });

  it('should show Recent Only checkbox', async () => {
    await renderUserList();
    expect(screen.getByText('Recent Only')).toBeInTheDocument();
  });

  it('should show Expand All button', async () => {
    await renderUserList();
    expect(screen.getByText('Expand All')).toBeInTheDocument();
  });

  it('should show Collapse All button', async () => {
    await renderUserList();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });
});
