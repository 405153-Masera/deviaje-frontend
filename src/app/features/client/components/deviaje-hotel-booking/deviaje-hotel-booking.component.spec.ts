import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeHotelBookingComponent } from './deviaje-hotel-booking.component';

describe('DeviajeHotelBookingComponent', () => {
  let component: DeviajeHotelBookingComponent;
  let fixture: ComponentFixture<DeviajeHotelBookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeHotelBookingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeHotelBookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
