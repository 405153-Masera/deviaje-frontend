import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeRoomGuestSelectComponent } from './deviaje-room-guest-select.component';

describe('DeviajeRoomGuestSelectComponent', () => {
  let component: DeviajeRoomGuestSelectComponent;
  let fixture: ComponentFixture<DeviajeRoomGuestSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeRoomGuestSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeRoomGuestSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
