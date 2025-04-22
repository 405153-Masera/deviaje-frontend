import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeNavbarComponent } from './deviaje-navbar.component';

describe('DeviajeNavbarComponent', () => {
  let component: DeviajeNavbarComponent;
  let fixture: ComponentFixture<DeviajeNavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeNavbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
