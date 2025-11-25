import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { MenuItem } from '../../models/menu-item';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-deviaje-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-sidebar.component.html',
  styleUrl: './deviaje-sidebar.component.scss',
})
export class DeviajeSidebarComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
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
      route: '/home/packages/search',
      isSelected: false,
    },
    //{ icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
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
      route: '/home/packages/search',
      isSelected: false,
    },
    //{ icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
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
      route: '/home/packages/search',
      isSelected: false,
    },
    //{ icon: 'tours', label: 'Tours', route: '/tours', isSelected: false },
    {
      icon: 'usuarios',
      label: 'Mis Clientes',
      route: '/bookings',
      isSelected: false,
    },
  ];

  adminMenuItems: MenuItem[] = [
    {
      icon: 'home',
      label: 'Inicio',
      route: '/home',
      isSelected: false,
    },
    {
      icon: 'anadir-grupo',
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
          icon: 'cliente',
          label: 'Ver Usuarios',
          route: '/admin/users/list',
        },
      ],
    },
    {
      icon: 'agencia-de-viajes',
      label: 'Consultas de Viaje',
      route: '/admin/bookings',
      isSelected: false,
      subItems: [
        { icon: 'avion', label: 'Buscar vuelos', route: '/home/flight/search' },
        { icon: 'hotel', label: 'Buscar hoteles', route: '/home/hotels/search' },
        {
          icon: 'vacaciones',
          label: 'Buscar paquetes',
          route: '/home/packages/search',
        },
        {
          icon: 'reserva',
          label: 'Todas las Reservas',
          route: '/bookings',
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

    this.subscription.add(
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => {
          this.updateMenuSelection();
        })
    );
    this.updateMenuSelection();
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

  private updateMenuSelection(): void {
    const currentUrl = this.router.url;
    const currentItems = this.getCurrentMenuItems();

    // Deseleccionar todos primero
    currentItems.forEach(item => {
      item.isSelected = false;
      
      // Si tiene subitems, verificar si alguno coincide
      if (this.hasSubItems(item) && item.subItems) {
        const hasActiveSubitem = item.subItems.some(subItem => 
          subItem.route && currentUrl.startsWith(subItem.route)
        );
        
        // Expandir automáticamente si hay un subitem activo
        if (hasActiveSubitem) {
          item.isExpanded = true;
          item.isSelected = true;
        }
      } else if (item.route) {
        // Para items sin subitems, verificar si la ruta coincide
        if (currentUrl === item.route || (currentUrl.startsWith(item.route + '/') && item.route !== '/home')) {
          item.isSelected = true;
        }
      }
    });
  }

   selectMenuItem(item: MenuItem): void {
    // No hacer nada si el item tiene subitems (se maneja en toggleSubMenu)
    if (this.hasSubItems(item)) {
      return;
    }

    const currentItems = this.getCurrentMenuItems();
    
    // Deseleccionar todos
    currentItems.forEach((menuItem) => {
      menuItem.isSelected = false;
    });
    
    // Seleccionar el item clickeado
    item.isSelected = true;
  }

  // Verificar si un ítem del menú tiene subitems
  hasSubItems(item: MenuItem): boolean {
    return !!item.subItems && item.subItems.length > 0;
  }

  toggleSubMenu(item: MenuItem): void {
    // Alternar el estado de expansión
    item.isExpanded = !item.isExpanded;
    
    // Si se está expandiendo, marcar como seleccionado
    if (item.isExpanded) {
      const currentItems = this.getCurrentMenuItems();
      currentItems.forEach((menuItem) => {
        if (menuItem !== item) {
          menuItem.isSelected = false;
        }
      });
      item.isSelected = true;
    }
    // Si se está colapsando, mantener seleccionado solo si hay una ruta activa dentro
    else {
      const currentUrl = this.router.url;
      const hasActiveSubitem = item.subItems?.some(subItem => 
        subItem.route && currentUrl.startsWith(subItem.route)
      );
      
      if (!hasActiveSubitem) {
        item.isSelected = false;
      }
    }
  }
}