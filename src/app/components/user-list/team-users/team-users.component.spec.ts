/**
 * Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 * Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { TeamUsersComponent } from './team-users.component';

describe('TeamUsersComponent', () => {
  let component: TeamUsersComponent;
  let fixture: ComponentFixture<TeamUsersComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [TeamUsersComponent],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
