import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeSignupComponent } from './deviaje-signup.component';

describe('DeviajeSignupComponent', () => {
  let component: DeviajeSignupComponent;
  let fixture: ComponentFixture<DeviajeSignupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeSignupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeSignupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
