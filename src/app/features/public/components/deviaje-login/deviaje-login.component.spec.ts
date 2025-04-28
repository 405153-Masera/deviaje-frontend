import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeLoginComponent } from './deviaje-login.component';

describe('DeviajeLoginComponent', () => {
  let component: DeviajeLoginComponent;
  let fixture: ComponentFixture<DeviajeLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeLoginComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
