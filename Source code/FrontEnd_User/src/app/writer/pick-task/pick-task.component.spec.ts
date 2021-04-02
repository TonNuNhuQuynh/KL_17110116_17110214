import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickTaskComponent } from './pick-task.component';

describe('PickTaskComponent', () => {
  let component: PickTaskComponent;
  let fixture: ComponentFixture<PickTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PickTaskComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PickTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
