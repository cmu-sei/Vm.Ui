/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VmItemComponent } from './vm-item.component';

describe('VmItemComponent', () => {
  let component: VmItemComponent;
  let fixture: ComponentFixture<VmItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VmItemComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VmItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
