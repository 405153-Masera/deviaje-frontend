import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeFlightDetailComponent } from './deviaje-flight-detail.component';

describe('DeviajeFlightDetailComponent', () => {
  let component: DeviajeFlightDetailComponent;
  let fixture: ComponentFixture<DeviajeFlightDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeFlightDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeFlightDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
