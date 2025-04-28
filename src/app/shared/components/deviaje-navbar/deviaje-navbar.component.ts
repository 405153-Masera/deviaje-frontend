import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, inject, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
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

  isAuthenticated: boolean = false;
  userAvatarUrl: string | null = null;
  isSidebarOpen: boolean = false;
  isUserMenuOpen: boolean = false;

  ngOnInit(): void {
    this.subscription.add(
      this.authService.currentUser.subscribe(user => {
        this.isAuthenticated = !!user;
        this.userAvatarUrl = user?.avatar || null;
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
  }

  logout(): void {
    this.subscription.add(this.authService.logout().subscribe(() => {
      this.isUserMenuOpen = false;
    }));
  }

  // Cerrar el menú de usuario al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.userMenuTrigger && !this.userMenuTrigger.nativeElement.contains(event.target)) {
      this.isUserMenuOpen = false;
    }
  }
}
