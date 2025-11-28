import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeRevenueOverTimeComponent } from './deviaje-revenue-over-time.component';

describe('DeviajeRevenueOverTimeComponent', () => {
  let component: DeviajeRevenueOverTimeComponent;
  let fixture: ComponentFixture<DeviajeRevenueOverTimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeRevenueOverTimeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeRevenueOverTimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
