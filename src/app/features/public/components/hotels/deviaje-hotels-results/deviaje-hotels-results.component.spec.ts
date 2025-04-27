import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeHotelsResultsComponent } from './deviaje-hotels-results.component';

describe('DeviajeHotelsResultsComponent', () => {
  let component: DeviajeHotelsResultsComponent;
  let fixture: ComponentFixture<DeviajeHotelsResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeHotelsResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeHotelsResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
