import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeHotelBookingSummaryComponent } from './deviaje-hotel-booking-summary.component';

describe('DeviajeHotelBookingSummaryComponent', () => {
  let component: DeviajeHotelBookingSummaryComponent;
  let fixture: ComponentFixture<DeviajeHotelBookingSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeHotelBookingSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeHotelBookingSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
