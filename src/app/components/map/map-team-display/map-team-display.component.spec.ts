import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapTeamDisplayComponent } from './map-team-display.component';

describe('MapTeamDisplayComponent', () => {
  let component: MapTeamDisplayComponent;
  let fixture: ComponentFixture<MapTeamDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapTeamDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapTeamDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
