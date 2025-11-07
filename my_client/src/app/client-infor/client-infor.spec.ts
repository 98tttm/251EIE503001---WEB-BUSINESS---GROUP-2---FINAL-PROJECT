import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientInfor } from './client-infor';

describe('ClientInfor', () => {
  let component: ClientInfor;
  let fixture: ComponentFixture<ClientInfor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientInfor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientInfor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
