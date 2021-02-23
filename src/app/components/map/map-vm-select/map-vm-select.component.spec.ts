import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapVmSelectComponent } from './map-vm-select.component';

describe('MapVmSelectComponent', () => {
  let component: MapVmSelectComponent;
  let fixture: ComponentFixture<MapVmSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapVmSelectComponent ]
    })
    .compileComponents();
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
