import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { ExportService } from '../../../../shared/services/export.service';

export interface Booking {
  id: number;
  bookingReference: string;
  clientId: number;
  agentId: number;
  clientUserName?: string;
  agentUserName?: string;
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
  imports: [CommonModule, FormsModule, MatTooltipModule, TruncatePipe],
  templateUrl: './deviaje-bookings.component.html',
  styleUrls: ['./deviaje-bookings.component.scss'],
})
export class DeviajeBookingsComponent implements OnInit, OnDestroy {
  private readonly exportService: ExportService = inject(ExportService);

  // Estados de carga y datos
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  loading = true;
  error = '';

  // Información del usuario
  currentUser: any = null;
  userRole = '';
  isLoggedIn = false;

  // Ordenamiento
  sortColumn: 'date' | 'holderName' | '' = '';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Filtros
  selectedType = '';
  selectedStatus = '';
  searchTerm = '';
  filterUserName: string = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 8;
  totalPages = 0;

  // Opciones de filtros
  bookingTypes = [
    { value: '', label: 'Todos los tipos' },
    { value: 'FLIGHT', label: 'Vuelos' },
    { value: 'HOTEL', label: 'Hoteles' },
    { value: 'PACKAGE', label: 'Paquetes' },
  ];

  bookingStatuses = [
    { value: '', label: 'Todos los estados' },
    { value: 'CONFIRMED', label: 'Confirmada' },
    { value: 'CANCELLED', label: 'Cancelada' },
    { value: 'COMPLETED', label: 'Completada' },
  ];

  private readonly bookingService: BookingService = inject(BookingService);
  private readonly authService: AuthService = inject(AuthService);
  private subscription = new Subscription();
  router: Router = inject(Router);

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
        },
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
        },
      })
    );
  }

  loadBookings(): void {
    if (!this.currentUser || !this.userRole) {
      this.error = 'Información de usuario no disponible';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';

    this.subscription.add(
      this.bookingService
        .getBookingsByRole(this.currentUser.id, this.userRole)
        .subscribe({
          next: (bookings) => {
            this.bookings = bookings;
            this.applyFilters();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar reservas:', error);
            this.error = 'Error al cargar las reservas';
            this.loading = false;
          },
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

  applyFilters(): void {
    this.filteredBookings = this.bookings.filter((booking) => {
      const matchesType =
        !this.selectedType || booking.type === this.selectedType;
      const matchesStatus =
        !this.selectedStatus || booking.status === this.selectedStatus;

      // Búsqueda por booking reference, titular o email
      const matchesSearch =
        !this.searchTerm ||
        booking.bookingReference
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        booking.holderName
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        booking.email?.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Filtros específicos por rol
      let matchesUser = true;
      if (this.filterUserName) {
        const searchLower = this.filterUserName.toLowerCase().trim();

        // Obtener el texto mostrado para cliente y agente
        const clientDisplay =
          booking.clientUserName ||
          (booking.clientId ? `cliente #${booking.clientId}` : 'invitado');
        const agentDisplay =
          booking.agentUserName ||
          (booking.agentId ? `agente #${booking.agentId}` : 'sin agente');

        matchesUser =
          clientDisplay.toLowerCase().includes(searchLower) ||
          agentDisplay.toLowerCase().includes(searchLower);
      }

      return matchesType && matchesStatus && matchesSearch && matchesUser;
    });

    this.applySorting();

    this.totalPages = Math.ceil(
      this.filteredBookings.length / this.itemsPerPage
    );
    this.currentPage = 1; // Reset a la primera página
  }

  resetFilters() {
    this.selectedType = '';
    this.selectedStatus = '';
    this.searchTerm = '';
    this.filterUserName = '';
    this.sortColumn = '';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  downloadVoucher(booking: Booking): void {
    this.bookingService.downloadVoucher(booking.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `voucher-${booking.bookingReference}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al descargar voucher:', error);
        alert('Error al descargar el voucher. Por favor, intenta nuevamente.');
      },
    });
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
      minute: '2-digit',
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : 'USD',
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

  // Métodos de ordenamiento
  applySorting(): void {
    if (!this.sortColumn) {
      return;
    }

    this.filteredBookings.sort((a, b) => {
      let comparison = 0;

      if (this.sortColumn === 'date') {
        const dateA = new Date(a.createdDatetime).getTime();
        const dateB = new Date(b.createdDatetime).getTime();
        comparison = dateA - dateB;
      } else if (this.sortColumn === 'holderName') {
        comparison = (a.holderName || '').localeCompare(b.holderName || '');
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  toggleSort(column: 'date' | 'holderName'): void {
    if (this.sortColumn === column) {
      // Si ya estamos ordenando por esta columna, cambiar dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna, empezar con descendente
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.applyFilters();
  }

  getSortIcon(column: 'date' | 'holderName'): string {
    if (this.sortColumn !== column) {
      return 'bi-arrow-down-up'; // Sin ordenar
    }
    return this.sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  // Métodos de exportación
  exportToPDF(): void {
    const bookingsToExport = this.filteredBookings.map((booking) => ({
      bookingReference: booking.bookingReference,
      type: booking.type,
      status: booking.status,
      holderName: booking.holderName,
      email: booking.email,
      clientName:
        booking.clientUserName ||
        (booking.clientId ? `Cliente #${booking.clientId}` : 'Invitado'),
      agentName:
        booking.agentUserName ||
        (booking.agentId ? `Agente #${booking.agentId}` : 'Sin agente'),
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      createdDatetime: booking.createdDatetime,
    }));

    this.exportService.exportToPDF(
      bookingsToExport,
      this.userRole,
      'reservas_deviaje'
    );
  }

  exportToExcel(): void {
    const bookingsToExport = this.filteredBookings.map((booking) => ({
      bookingReference: booking.bookingReference,
      type: booking.type,
      status: booking.status,
      holderName: booking.holderName,
      email: booking.email,
      clientName:
        booking.clientUserName ||
        (booking.clientId ? `Cliente #${booking.clientId}` : 'Invitado'),
      agentName:
        booking.agentUserName ||
        (booking.agentId ? `Agente #${booking.agentId}` : 'Sin agente'),
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      createdDatetime: booking.createdDatetime,
    }));

    this.exportService.exportToExcel(
      bookingsToExport,
      this.userRole,
      'reservas_deviaje'
    );
  }

  // Getter para mostrar botones de exportación
  get canExport(): boolean {
    return this.userRole === 'ADMINISTRADOR' || this.userRole === 'AGENTE';
  }
}
