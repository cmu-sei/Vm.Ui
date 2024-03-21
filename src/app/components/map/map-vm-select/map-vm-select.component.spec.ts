/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapVmSelectComponent } from './map-vm-select.component';

describe('MapVmSelectComponent', () => {
  let component: MapVmSelectComponent;
  let fixture: ComponentFixture<MapVmSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapVmSelectComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MapVmSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
