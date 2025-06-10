import { Component, Input, OnInit, inject } from '@angular/core';
import { MenuItem } from '../../models/menu-item';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-deviaje-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-sidebar.component.html',
  styleUrl: './deviaje-sidebar.component.scss',
})
export class DeviajeSidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  @Input() isOpen = false;

  guestMenuItems: MenuItem[] = [
    { icon: 'home', label: 'Inicio', route: '/home', isSelected: false },
    {
      icon: 'avion',
      label: 'Vuelos',
      route: '/home/flight/search',
      isSelected: false,
    },
    {
      icon: 'hotel',
      label: 'Hoteles',
      route: '/home/hotels/search',
      isSelected: false,
    },
    {
      icon: 'vacaciones',
      label: 'Paquetes',
      route: '/packages',
      isSelected: false,
    },
    { icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
  ];

  clientMenuItems: MenuItem[] = [
    { icon: 'home', label: 'Inicio', route: '/home', isSelected: false },
    {
      icon: 'avion',
      label: 'Vuelos',
      route: '/home/flight/search',
      isSelected: false,
    },
    {
      icon: 'hotel',
      label: 'Hoteles',
      route: '/home/hotels/search',
      isSelected: false,
    },
    {
      icon: 'vacaciones',
      label: 'Paquetes',
      route: '/packages',
      isSelected: false,
    },
    { icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
    {
      icon: 'reserva',
      label: 'Mis Reservas',
      route: '/bookings',
      isSelected: false,
    },
  ];

  agentMenuItems: MenuItem[] = [
    { icon: 'home', label: 'Inicio', route: '/home', isSelected: false },
    {
      icon: 'avion',
      label: 'Vuelos',
      route: '/home/flight/search',
      isSelected: false,
    },
    {
      icon: 'hotel',
      label: 'Hoteles',
      route: '/home/hotels/search',
      isSelected: false,
    },
    {
      icon: 'vacaciones',
      label: 'Paquetes',
      route: '/packages',
      isSelected: false,
    },
    { icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
    {
      icon: 'usuarios',
      label: 'Mis Clientes',
      route: '/agent/clients',
      isSelected: false,
    },
  ];

  adminMenuItems: MenuItem[] = [
    {
      icon: 'home',
      label: 'Inicio',
      route: '/admin/dashboard',
      isSelected: false,
    },
    {
      icon: 'usuarios',
      label: 'Usuarios',
      route: '/admin/users',
      isSelected: false,
      subItems: [
        {
          icon: 'agregar-usuario',
          label: 'Registrar Usuarios',
          route: '/admin/users/register',
        },
        {
          icon: 'lista-usuarios',
          label: 'Ver Usuarios',
          route: '/admin/users/list',
        },
      ],
    },
    {
      icon: 'reservas',
      label: 'Reservas',
      route: '/admin/bookings',
      isSelected: false,
      subItems: [
        { icon: 'avion', label: 'Vuelos', route: '/admin/bookings/flights' },
        { icon: 'hotel', label: 'Hoteles', route: '/admin/bookings/hotels' },
        {
          icon: 'vacaciones',
          label: 'Paquetes',
          route: '/admin/bookings/packages',
        },
        { icon: 'tours', label: 'Tours', route: '/admin/bookings/tours' },
        {
          icon: 'lista',
          label: 'Todas las Reservas',
          route: '/admin/bookings/all',
        },
      ],
    },
    {
      icon: 'dashboard',
      label: 'Dashboards',
      route: '/admin/analytics',
      isSelected: false,
    },
  ];
  //#EDE4E4 color de los iconos

  constructor() {}

  ngOnInit(): void {
    // Inicializar con el menú correcto
    this.updateMenuItems();
  }

  get menuItems(): MenuItem[] {
    this.updateMenuItems(); // Actualizar en cada acceso
    return this.getCurrentMenuItems();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get currentUserRole(): string {
    if (!this.isAuthenticated) {
      return 'GUEST';
    }

    const activeRole = this.authService.getActiveRole();
    return activeRole || this.getHighestPriorityRole();
  }

  private updateMenuItems(): void {
    // Este método se llama en el getter para asegurar que siempre esté actualizado
  }

  private getCurrentMenuItems(): MenuItem[] {
    switch (this.currentUserRole) {
      case 'ADMINISTRADOR':
        return this.adminMenuItems;
      case 'AGENTE':
        return this.agentMenuItems;
      case 'CLIENTE':
        return this.clientMenuItems;
      default:
        return this.guestMenuItems;
    }
  }

  private getHighestPriorityRole(): string {
    const user = this.authService.getUser();
    if (!user || !user.roles) {
      return 'GUEST';
    }

    const priorityOrder = ['ADMINISTRADOR', 'AGENTE', 'CLIENTE'];

    for (const role of priorityOrder) {
      if (user.roles.includes(role)) {
        return role;
      }
    }

    return user.roles[0] || 'GUEST';
  }

  selectMenuItem(item: MenuItem): void {
    const currentItems = this.getCurrentMenuItems();
    currentItems.forEach((menuItem) => (menuItem.isSelected = false));
    item.isSelected = true;
  }
  // Verificar si un ítem del menú tiene subitems
  hasSubItems(item: MenuItem): boolean {
    return !!item.subItems && item.subItems.length > 0;
  }

  // Método para manejar el estado de despliegue del submenú
  toggleSubMenu(item: MenuItem): void {
    // Usar el operador de nullish coalescing para manejar el caso undefined
    item.isExpanded = !(item.isExpanded ?? false);
  }
}
