import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VmUsageLoggingComponent } from './vm-usage-logging.component';

describe('VmUsageLoggingComponent', () => {
  let component: VmUsageLoggingComponent;
  let fixture: ComponentFixture<VmUsageLoggingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VmUsageLoggingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VmUsageLoggingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
