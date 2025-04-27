import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeFlightResultsComponent } from './deviaje-flight-results.component';

describe('DeviajeFlightResultsComponent', () => {
  let component: DeviajeFlightResultsComponent;
  let fixture: ComponentFixture<DeviajeFlightResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeFlightResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeFlightResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
