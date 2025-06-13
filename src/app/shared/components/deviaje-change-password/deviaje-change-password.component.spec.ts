import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeChangePasswordComponent } from './deviaje-change-password.component';

describe('DeviajeChangePasswordComponent', () => {
  let component: DeviajeChangePasswordComponent;
  let fixture: ComponentFixture<DeviajeChangePasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeChangePasswordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
