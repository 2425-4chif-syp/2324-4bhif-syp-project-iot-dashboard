import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PvInfoComponent } from './pv-info.component';

describe('PvInfoComponent', () => {
  let component: PvInfoComponent;
  let fixture: ComponentFixture<PvInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PvInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PvInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
