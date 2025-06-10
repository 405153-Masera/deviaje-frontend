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
import { AuthService } from '../../../core/auth/services/auth.service';

@Component({
  selector: 'app-deviaje-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-navbar.component.html',
  styleUrl: './deviaje-navbar.component.scss',
})
export class DeviajeNavbarComponent implements OnInit {

  private readonly authService: AuthService = inject(AuthService);

  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('userMenuTrigger') userMenuTrigger!: ElementRef;
  @ViewChild('roleMenuTrigger') roleMenuTrigger!: ElementRef;

  isSidebarOpen: boolean = false;
  isUserMenuOpen: boolean = false;
  isRoleMenuOpen: boolean = false;

  ngOnInit(): void {

  }

   get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userAvatarUrl(): string | null {
    const user = this.authService.getUser();
    return user?.avatar || null;
  }

  get userName(): string | null {
    const user = this.authService.getUser();
    return user?.firstName || user?.username || null;
  }

  get userRoles(): string[] {
    const user = this.authService.getUser();
    return user?.roles || [];
  }

  get currentRole(): string {
    return this.authService.getActiveRole() || '';
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
    this.authService.switchActiveRole(role);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.isUserMenuOpen = false;
      // Forzar actualización del componente
      this.forceUpdate();
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

   // Método para forzar actualización del componente después de cambios
  private forceUpdate(): void {
    // Pequeño truco para forzar la detección de cambios
    setTimeout(() => {}, 0);
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
