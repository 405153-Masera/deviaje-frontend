import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeCalendarComponent } from './deviaje-calendar.component';

describe('DeviajeCalendarComponent', () => {
  let component: DeviajeCalendarComponent;
  let fixture: ComponentFixture<DeviajeCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeCalendarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
