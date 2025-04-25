import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeFlightsSearchComponent } from './deviaje-flights-search.component';

describe('DeviajeFlightsSearchComponent', () => {
  let component: DeviajeFlightsSearchComponent;
  let fixture: ComponentFixture<DeviajeFlightsSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeFlightsSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeFlightsSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
