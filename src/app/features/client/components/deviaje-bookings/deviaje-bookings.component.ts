import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Router } from '@angular/router';

export interface Booking {
  id: number;
  clientId: number;
  agentId: number;
  status: string;
  type: string;
  totalAmount: number;
  commission: number;
  discount: number;
  taxes: number;
  currency: string;
  holderName: string;
  phone: string;
  email: string;
  createdDatetime: string;
  createdUser: number;
}

@Component({
  selector: 'app-mis-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deviaje-bookings.component.html',
  styleUrls: ['./deviaje-bookings.component.scss']
})
export class DeviajeBookingsComponent implements OnInit, OnDestroy {
  // Estados de carga y datos
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  loading = true;
  error = '';

  // Información del usuario
  currentUser: any = null;
  userRole = '';
  isLoggedIn = false;

  // Filtros
  selectedType = '';
  selectedStatus = '';
  searchTerm = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  // Opciones de filtros
  bookingTypes = [
    { value: '', label: 'Todos los tipos' },
    { value: 'FLIGHT', label: 'Vuelos' },
    { value: 'HOTEL', label: 'Hoteles' },
    { value: 'PACKAGE', label: 'Paquetes' },
    { value: 'TOUR', label: 'Tours' }
  ];

  bookingStatuses = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'CONFIRMED', label: 'Confirmada' },
    { value: 'CANCELLED', label: 'Cancelada' },
    { value: 'COMPLETED', label: 'Completada' }
  ];

  private subscription = new Subscription();
  router: Router = inject(Router);

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadCurrentUser(): void {
    // Obtener usuario actual
    this.subscription.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoggedIn = !!user;
          
          if (!this.isLoggedIn) {
            this.router.navigate(['/auth/login']);
            return;
          }
          
          this.loadUserRole();
        },
        error: (error) => {
          console.error('Error al obtener usuario:', error);
          this.router.navigate(['/auth/login']);
        }
      })
    );
  }

  private loadUserRole(): void {
    // Obtener rol activo
    this.subscription.add(
      this.authService.activeRole$.subscribe({
        next: (role) => {
          this.userRole = role || '';
          this.loadBookings();
        },
        error: (error) => {
          console.error('Error al obtener rol:', error);
          this.error = 'Error al obtener información del usuario';
          this.loading = false;
        }
      })
    );
  }

  private loadBookings(): void {
    if (!this.currentUser || !this.userRole) {
      this.error = 'Información de usuario no disponible';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';

    this.subscription.add(
      this.bookingService.getBookingsByRole(this.currentUser.id, this.userRole).subscribe({
        next: (bookings) => {
          this.bookings = bookings;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar reservas:', error);
          this.error = 'Error al cargar las reservas';
          this.loading = false;
        }
      })
    );
  }

  // Filtros y búsqueda
  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.bookings];

    // Filtrar por tipo
    if (this.selectedType) {
      filtered = filtered.filter(booking => booking.type === this.selectedType);
    }

    // Filtrar por estado
    if (this.selectedStatus) {
      filtered = filtered.filter(booking => booking.status === this.selectedStatus);
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.holderName?.toLowerCase().includes(term) ||
        booking.email?.toLowerCase().includes(term) ||
        booking.id.toString().includes(term)
      );
    }

    this.filteredBookings = filtered;
    this.calculatePagination();
  }

  // Paginación
  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredBookings.length / this.itemsPerPage);
  }

  get paginatedBookings(): Booking[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredBookings.slice(startIndex, endIndex);
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Métodos auxiliares
  getBookingTypeName(type: string): string {
    return this.bookingService.getBookingTypeName(type);
  }

  getBookingStatusName(status: string): string {
    return this.bookingService.getBookingStatusName(status);
  }

  getStatusBadgeClass(status: string): string {
    return this.bookingService.getStatusBadgeClass(status);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : 'USD'
    }).format(amount);
  }

  // Acciones
  viewBookingDetails(booking: Booking): void {
    // Navegar a detalles de la reserva
    this.router.navigate(['/bookings', booking.id]);
  }

  reloadBookings(): void {
    this.loadBookings();
  }

  // Getter para mostrar información específica según el rol
  get showClientInfo(): boolean {
    return this.userRole === 'ADMINISTRADOR' || this.userRole === 'AGENTE';
  }

  get showAgentInfo(): boolean {
    return this.userRole === 'ADMINISTRADOR';
  }

  get pageTitle(): string {
    switch (this.userRole) {
      case 'CLIENTE':
        return 'Mis Reservas';
      case 'AGENTE':
        return 'Reservas de mis Clientes';
      case 'ADMINISTRADOR':
        return 'Todas las Reservas';
      default:
        return 'Reservas';
    }
  }
}