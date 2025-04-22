import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeMainLayoutComponent } from './deviaje-main-layout.component';

describe('DeviajeMainLayoutComponent', () => {
  let component: DeviajeMainLayoutComponent;
  let fixture: ComponentFixture<DeviajeMainLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeMainLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeMainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
