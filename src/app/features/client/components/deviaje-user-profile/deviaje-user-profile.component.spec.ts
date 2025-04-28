import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeUserProfileComponent } from './deviaje-user-profile.component';

describe('DeviajeUserProfileComponent', () => {
  let component: DeviajeUserProfileComponent;
  let fixture: ComponentFixture<DeviajeUserProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeUserProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeUserProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
