import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { MenuItem } from '../../models/menu-item';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-deviaje-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-sidebar.component.html',
  styleUrl: './deviaje-sidebar.component.scss',
})
export class DeviajeSidebarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private subscription = new Subscription();
  
  @Input() isOpen = false;

  // Estado reactivo
  isAuthenticated: boolean = false;
  currentUserRole: string = 'GUEST';

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

  ngOnInit(): void {
    // Suscribirse a los cambios de estado de autenticación
    this.subscription.add(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isAuthenticated = isAuth;
        this.updateCurrentRole();
      })
    );

    // Suscribirse a los cambios del rol activo
    this.subscription.add(
      this.authService.activeRole$.subscribe(role => {
        this.updateCurrentRole();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get menuItems(): MenuItem[] {
    return this.getCurrentMenuItems();
  }

  private updateCurrentRole(): void {
    if (!this.isAuthenticated) {
      this.currentUserRole = 'GUEST';
      return;
    }

    const activeRole = this.authService.getActiveRole();
    this.currentUserRole = activeRole || this.getHighestPriorityRole();
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