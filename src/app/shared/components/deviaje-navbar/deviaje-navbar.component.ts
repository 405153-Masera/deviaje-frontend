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
export class DeviajeNavbarComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  private readonly authService: AuthService = inject(AuthService);

  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('userMenuTrigger') userMenuTrigger!: ElementRef;
  @ViewChild('roleMenuTrigger') roleMenuTrigger!: ElementRef;

  isAuthenticated: boolean = false;
  userAvatarUrl: string | null = null;
  userName: string | null = null;
  userRoles: string[] = [];
  isSidebarOpen: boolean = false;
  isUserMenuOpen: boolean = false;
  isRoleMenuOpen: boolean = false;
  currentRole: string = '';
  availableRoles: string[] = [];

  ngOnInit(): void {
    this.subscription.add(
      this.authService.currentUser.subscribe((user) => {
        this.isAuthenticated = !!user;
        this.userAvatarUrl = user?.avatar || null;
        this.userName = user?.firstName || user?.username || null;

        if (user && user.roles) {
          this.userRoles = user.roles;
          this.availableRoles = [...user.roles];

          // Establecer rol por defecto
          if (this.userRoles.includes('ADMINISTRADOR')) {
            this.currentRole = 'ADMINISTRADOR';
          } else if (this.userRoles.includes('AGENTE')) {
            this.currentRole = 'AGENTE';
          } else if (this.userRoles.includes('CLIENTE')) {
            this.currentRole = 'CLIENTE';
          }
        } else {
          this.userRoles = [];
          this.availableRoles = [];
          this.currentRole = '';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
    this.currentRole = role;
    this.isRoleMenuOpen = false;
    // Aquí podrías implementar la lógica para cambiar la vista según el rol
    // Por ejemplo, navegar a diferentes dashboards
  }

  logout(): void {
    this.subscription.add(
      this.authService.logout().subscribe(() => {
        this.isUserMenuOpen = false;
      })
    );
  }

  hasMultipleRoles(): boolean {
    return this.userRoles.length > 1;
  }

  // Obtener el nombre amigable del rol
  getRoleName(role: string): string {
    switch(role) {
      case 'ADMINISTRADOR': return 'Administrador';
      case 'AGENTE': return 'Agente de Viajes';
      case 'CLIENTE': return 'Cliente';
      default: return role;
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
    if (this.roleMenuTrigger && this.roleMenuTrigger.nativeElement && 
        !this.roleMenuTrigger.nativeElement.contains(event.target)) {
      this.isRoleMenuOpen = false;
    }
  }
}
