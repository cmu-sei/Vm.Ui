/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { of } from 'rxjs';

import { VmUser } from '../../../generated/vm-api';
import { ThemeService } from '../../../services/theme/theme.service';
import { VmsQuery } from '../../../state/vms/vms.query';
import { TeamUsersComponent } from './team-users.component';

describe('TeamUsersComponent', () => {
  let component: TeamUsersComponent;
  let fixture: ComponentFixture<TeamUsersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TeamUsersComponent],
      providers: [
        {
          provide: VmsQuery,
          useValue: {
            selectEntity: () => of(null),
          },
        },
        {
          provide: ComnSettingsService,
          useValue: {
            settings: {
              UserFollowUrl:
                'http://example.test/user/{userId}/view/{viewId}/console',
            },
          },
        },
        {
          provide: ThemeService,
          useValue: {
            addThemeQueryParam: (url: string) => url,
          },
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamUsersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('keeps the last user visible when scrolling a 15-user list to the bottom', fakeAsync(() => {
    const users = Array.from(
      { length: 15 },
      (_, index) =>
        ({
          userId: `user-${index + 1}`,
          username: `User ${index + 1}`,
        }) as VmUser,
    );

    fixture.componentRef.setInput('team', {
      id: 'team-1',
      name: 'Team 1',
      viewId: 'view-1',
    });
    fixture.componentRef.setInput('users', users);
    fixture.detectChanges();
    flush();

    const viewport = fixture.nativeElement.querySelector(
      '.user-table-viewport',
    ) as HTMLElement;
    expect(viewport.textContent)
      .withContext('the viewport should render users before it is scrolled')
      .toContain('User 1');

    viewport.scrollTop = viewport.scrollHeight;
    viewport.dispatchEvent(new Event('scroll'));
    flush();
    fixture.detectChanges();

    const renderedRows = Array.from(
      viewport.querySelectorAll('mat-row'),
    ) as HTMLElement[];
    const renderedText = renderedRows.map((row) => row.textContent?.trim());
    const lastRow = renderedRows.find((row) =>
      row.textContent?.includes('User 15'),
    );

    expect(lastRow)
      .withContext(
        `the bottom of the viewport should render the final user; ` +
          `scrollTop=${viewport.scrollTop}, scrollHeight=${viewport.scrollHeight}, ` +
          `clientHeight=${viewport.clientHeight}, rows=${JSON.stringify(renderedText)}`,
      )
      .toBeTruthy();
    const viewportBounds = viewport.getBoundingClientRect();
    const lastRowBounds = lastRow.getBoundingClientRect();
    expect(lastRowBounds.top)
      .withContext('the final user should be inside the scrolled viewport')
      .toBeLessThan(viewportBounds.bottom);
    expect(lastRowBounds.bottom)
      .withContext('the final user should not be above the scrolled viewport')
      .toBeGreaterThan(viewportBounds.top);
    expect(viewport.clientHeight)
      .withContext('scrolling should not shrink the user list viewport')
      .toBe(component.maxSize);
  }));
});
