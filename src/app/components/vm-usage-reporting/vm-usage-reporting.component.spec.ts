/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VmUsageReportingComponent } from './vm-usage-reporting.component';

describe('VmUsageReportingComponent', () => {
  let component: VmUsageReportingComponent;
  let fixture: ComponentFixture<VmUsageReportingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VmUsageReportingComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VmUsageReportingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
