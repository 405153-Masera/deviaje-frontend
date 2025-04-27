import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeCityInputComponent } from './deviaje-city-input.component';

describe('DeviajeCityInputComponent', () => {
  let component: DeviajeCityInputComponent;
  let fixture: ComponentFixture<DeviajeCityInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeCityInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeCityInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
