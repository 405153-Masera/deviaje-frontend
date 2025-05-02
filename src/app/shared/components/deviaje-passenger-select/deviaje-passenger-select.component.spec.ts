import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajePassengerSelectComponent } from './deviaje-passenger-select.component';

describe('DeviajePassengerSelectComponent', () => {
  let component: DeviajePassengerSelectComponent;
  let fixture: ComponentFixture<DeviajePassengerSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajePassengerSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajePassengerSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
