import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { IdentityService } from '../../../core/services/identity.service';
import { NavbarComponent } from './navbar.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('NavbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: '', component: DummyComponent },
          { path: 'documents/:id', component: DummyComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('navigates back to the dashboard when switching users from an open document', async () => {
    const router = TestBed.inject(Router);
    const identity = TestBed.inject(IdentityService);
    const alice = { id: 1, name: 'Alice Johnson', email: 'alice@ajaia.dev', avatar_color: '#2563EB' };
    const bob = { id: 2, name: 'Bob Smith', email: 'bob@ajaia.dev', avatar_color: '#16A34A' };
    identity.users.set([alice, bob]);
    identity.currentUser.set(alice);

    await router.navigate(['/documents', 42]);
    expect(router.url).toBe('/documents/42');

    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSelectUser(bob);
    await fixture.whenStable();

    expect(router.url).toBe('/');
    expect(identity.currentUser()?.id).toBe(2);
  });
});

