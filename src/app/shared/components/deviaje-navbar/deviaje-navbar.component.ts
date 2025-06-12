import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-deviaje-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-navbar.component.html',
  styleUrl: './deviaje-navbar.component.scss',
})
export class DeviajeNavbarComponent implements OnInit, OnDestroy {
  private readonly authService: AuthService = inject(AuthService);
  private subscription = new Subscription();

  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('userMenuTrigger') userMenuTrigger!: ElementRef;
  @ViewChild('roleMenuTrigger') roleMenuTrigger!: ElementRef;

  isSidebarOpen: boolean = false;
  isUserMenuOpen: boolean = false;
  isRoleMenuOpen: boolean = false;

  // Estado reactivo
  isAuthenticated: boolean = false;
  currentUser: User | null = null;
  currentRole: string = '';
  userRoles: string[] = [];

  ngOnInit(): void {
    // Suscribirse a los cambios de estado de autenticación
    this.subscription.add(
      this.authService.isAuthenticated$.subscribe((isAuth) => {
        this.isAuthenticated = isAuth;
      })
    );

    // Suscribirse a los cambios del usuario actual
    this.subscription.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        this.userRoles = user?.roles || [];
      })
    );

    // Suscribirse a los cambios del rol activo
    this.subscription.add(
      this.authService.activeRole$.subscribe((role) => {
        this.currentRole = role || '';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get userAvatarUrl(): string | null {
    return this.currentUser?.avatar || null;
  }

  get userName(): string | null {
    return this.currentUser?.firstName || this.currentUser?.username || null;
  }

  get availableRoles(): string[] {
    return this.userRoles;
  }

  onToggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.toggleSidebar.emit();
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      this.isRoleMenuOpen = false;
    }
  }

  toggleRoleMenu(): void {
    this.isRoleMenuOpen = !this.isRoleMenuOpen;
    if (this.isRoleMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  switchRole(role: string): void {
    this.isRoleMenuOpen = false;
    this.authService.changeActiveRoleWithoutRedirect(role);

    // No hay navegación aquí - los componentes se actualizarán automáticamente
    console.log(`Cambiando a rol: ${role} sin redirección`);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.isUserMenuOpen = false;
    });
  }

  hasMultipleRoles(): boolean {
    return this.userRoles.length > 1;
  }

  // Obtener el nombre amigable del rol
  getRoleName(role: string): string {
    switch (role) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'AGENTE':
        return 'Agente de Viajes';
      case 'CLIENTE':
        return 'Cliente';
      default:
        return role;
    }
  }

  // Cerrar el menú de usuario al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.userMenuTrigger &&
      !this.userMenuTrigger.nativeElement.contains(event.target)
    ) {
      this.isUserMenuOpen = false;
    }

    // Cerrar menú de roles si se hace clic fuera
    if (
      this.roleMenuTrigger &&
      this.roleMenuTrigger.nativeElement &&
      !this.roleMenuTrigger.nativeElement.contains(event.target)
    ) {
      this.isRoleMenuOpen = false;
    }
  }
}
