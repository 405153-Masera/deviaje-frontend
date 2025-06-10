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

  menuItems: MenuItem[] = [];
  currentUserRole: string = '';
  isAuthenticated: boolean = false;

  constructor() {}

  ngOnInit(): void {
    // Suscribirse a cambios en el usuario actual
    this.authService.currentUser.subscribe((user) => {
      this.isAuthenticated = !!user;

      // Determinar el rol del usuario
      if (this.isAuthenticated) {
        const activeRole =
          user.activeRole || this.getHighestPriorityRole(user.roles);

        if (activeRole === 'ADMINISTRADOR') {
          this.currentUserRole = 'ADMINISTRADOR';
          this.menuItems = this.adminMenuItems;
        } else if (activeRole === 'AGENTE') {
          this.currentUserRole = 'AGENTE';
          this.menuItems = this.agentMenuItems;
        } else {
          this.currentUserRole = 'CLIENTE';
          this.menuItems = this.clientMenuItems;
        }
      } else {
        this.currentUserRole = 'GUEST';
        this.menuItems = this.guestMenuItems;
      }
    });
  }

  // Agregar este método al final de la clase
  private getHighestPriorityRole(roles: string[]): string {
    const priorityOrder = ['ADMINISTRADOR', 'AGENTE', 'CLIENTE'];

    for (const role of priorityOrder) {
      if (roles.includes(role)) {
        return role;
      }
    }

    return roles[0];
  }

  selectMenuItem(item: MenuItem): void {
    this.menuItems.forEach((menuItem) => (menuItem.isSelected = false));
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
