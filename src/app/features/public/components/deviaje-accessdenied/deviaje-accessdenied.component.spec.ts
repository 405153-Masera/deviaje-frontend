import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeAccessdeniedComponent } from './deviaje-accessdenied.component';

describe('DeviajeAccessdeniedComponent', () => {
  let component: DeviajeAccessdeniedComponent;
  let fixture: ComponentFixture<DeviajeAccessdeniedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeAccessdeniedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeAccessdeniedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
