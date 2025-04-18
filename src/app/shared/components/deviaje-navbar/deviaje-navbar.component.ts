import { Component } from '@angular/core';

@Component({
  selector: 'app-deviaje-navbar',
  standalone: true,
  imports: [],
  templateUrl: './deviaje-navbar.component.html',
  styleUrl: './deviaje-navbar.component.css',
})
export class DeviajeNavbarComponent {
  toggleSidebar() {
    throw new Error('Method not implemented.');
  }

  isAutenticated: boolean = false;
}
