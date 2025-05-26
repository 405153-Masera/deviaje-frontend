import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeTravelerFormComponent } from './deviaje-traveler-form.component';

describe('DeviajeTravelerFormComponent', () => {
  let component: DeviajeTravelerFormComponent;
  let fixture: ComponentFixture<DeviajeTravelerFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeTravelerFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeTravelerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
