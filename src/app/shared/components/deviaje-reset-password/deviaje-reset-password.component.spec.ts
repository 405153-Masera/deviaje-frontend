import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeResetPasswordComponent } from './deviaje-reset-password.component';

describe('DeviajeResetPasswordComponent', () => {
  let component: DeviajeResetPasswordComponent;
  let fixture: ComponentFixture<DeviajeResetPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeResetPasswordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
