import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajePaymentsFormComponent } from './deviaje-payments-form.component';

describe('DeviajePaymentsFormComponent', () => {
  let component: DeviajePaymentsFormComponent;
  let fixture: ComponentFixture<DeviajePaymentsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajePaymentsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajePaymentsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
