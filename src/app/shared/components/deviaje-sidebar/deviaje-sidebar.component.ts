import { Component, Input } from '@angular/core';
import { MenuItem } from '../../models/menu-item';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-deviaje-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-sidebar.component.html',
  styleUrl: './deviaje-sidebar.component.scss'
})
export class DeviajeSidebarComponent {

  @Input() isOpen = false;

  menuItems: MenuItem[] = [
    { icon: 'home', label: 'Inicio', route: '/home', isSelected: false },
    { icon: 'avion', label: 'Vuelos', route: '/flights', isSelected: false },
    { icon: 'hotel', label: 'Hoteles', route: '/hotels', isSelected: false },
    { icon: 'vacaciones', label: 'Paquetes', route: '/packages', isSelected: false },
    { icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
    { icon: 'perfil', label: 'Perfil', route: '/profile', isSelected: false },
    { icon: 'reserva', label: 'Reservas', route: '/bookings', isSelected: false },
  ];

  //#EDE4E4 color de los iconos
  constructor() { }

  selectMenuItem(item: MenuItem): void {
    this.menuItems.forEach(menuItem => menuItem.isSelected = false);
    item.isSelected = true;
  }
}
