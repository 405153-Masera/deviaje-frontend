import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeHotelDetailComponent } from './deviaje-hotel-detail.component';

describe('DeviajeHotelDetailComponent', () => {
  let component: DeviajeHotelDetailComponent;
  let fixture: ComponentFixture<DeviajeHotelDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeHotelDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeHotelDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
