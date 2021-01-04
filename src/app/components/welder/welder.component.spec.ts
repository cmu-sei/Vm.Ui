// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WelderComponent } from './welder.component';

describe('WelderComponent', () => {
  let component: WelderComponent;
  let fixture: ComponentFixture<WelderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WelderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WelderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

