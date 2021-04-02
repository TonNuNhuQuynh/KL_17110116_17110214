import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarWriterComponent } from './navbar-writer.component';

describe('NavbarWriterComponent', () => {
  let component: NavbarWriterComponent;
  let fixture: ComponentFixture<NavbarWriterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NavbarWriterComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NavbarWriterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
