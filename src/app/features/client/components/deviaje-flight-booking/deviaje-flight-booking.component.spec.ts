import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeFlightBookingComponent } from './deviaje-flight-booking.component';

describe('DeviajeFlightBookingComponent', () => {
  let component: DeviajeFlightBookingComponent;
  let fixture: ComponentFixture<DeviajeFlightBookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeFlightBookingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeFlightBookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
