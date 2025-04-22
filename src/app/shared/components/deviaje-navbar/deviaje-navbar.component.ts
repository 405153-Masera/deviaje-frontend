import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-deviaje-navbar',
  standalone: true,
  imports: [],
  templateUrl: './deviaje-navbar.component.html',
  styleUrl: './deviaje-navbar.component.scss',
})
export class DeviajeNavbarComponent {
  
  @Output() toggleSidebar = new EventEmitter<void>();
  isAutenticated: boolean = false;
  isSidebarOpen: boolean = false;

  onToggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.toggleSidebar.emit();
  }

}
