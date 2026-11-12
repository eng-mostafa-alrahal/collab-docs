import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdentityService } from './core/services/identity.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly identity = inject(IdentityService);
}
