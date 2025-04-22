import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviajeSidebarComponent } from './deviaje-sidebar.component';

describe('DeviajeSidebarComponent', () => {
  let component: DeviajeSidebarComponent;
  let fixture: ComponentFixture<DeviajeSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviajeSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeviajeSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
