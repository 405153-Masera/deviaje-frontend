import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeHotelsSearchComponent } from './deviaje-hotels-search.component';

describe('DeviajeHotelsSearchComponent', () => {
  let component: DeviajeHotelsSearchComponent;
  let fixture: ComponentFixture<DeviajeHotelsSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeHotelsSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeHotelsSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
