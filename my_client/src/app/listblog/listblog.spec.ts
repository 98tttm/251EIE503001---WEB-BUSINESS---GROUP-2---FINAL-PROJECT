import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Listblog } from './listblog';

describe('Listblog', () => {
  let component: Listblog;
  let fixture: ComponentFixture<Listblog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Listblog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Listblog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
