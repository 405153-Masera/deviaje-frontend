import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { BookingDetails } from '../../../../shared/models/bookingsDetails';

@Component({
  selector: 'app-deviaje-booking-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-booking-detail.component.html',
  styleUrls: ['./deviaje-booking-detail.component.scss'],
})
export class DeviajeBookingDetailComponent implements OnInit, OnDestroy {
  bookingDetails: BookingDetails | null = null;
  loading = true;
  error = '';

  currentUser: any = null;
  userRole = '';

  private subscription = new Subscription();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadBookingDetails();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadCurrentUser(): void {
    this.subscription.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          this.currentUser = user;
          this.loadUserRole();
        },
        error: (error) => {
          console.error('Error al cargar usuario:', error);
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
        },
        error: (error) => {
          console.error('Error al obtener rol:', error);
          this.error = 'Error al obtener información del usuario';
          this.loading = false;
        },
      })
    );
  }

  private loadBookingDetails(): void {
    const bookingId = Number(this.route.snapshot.paramMap.get('id'));

    if (!bookingId || isNaN(bookingId)) {
      this.error = 'ID de reserva inválido';
      this.loading = false;
      return;
    }

    this.subscription.add(
      this.bookingService.getBookingDetails(bookingId).subscribe({
        next: (details) => {
          this.bookingDetails = details;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar detalles:', error);
          this.error = 'Error al cargar los detalles de la reserva';
          this.loading = false;
        },
      })
    );
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }

  downloadVoucher(): void {
    if (!this.bookingDetails) return;

    this.bookingService
      .downloadVoucher(this.bookingDetails.id)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `voucher-${
            this.bookingDetails!.bookingReference
          }.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error al descargar voucher:', error);
          alert(
            'Error al descargar el voucher. Por favor, intenta nuevamente.'
          );
        },
      });
  }

  resendVoucher(): void {
    if (!this.bookingDetails) return;

    if (confirm('¿Enviar voucher a ' + this.bookingDetails.email + '?')) {
      this.bookingService.resendVoucher(this.bookingDetails.id).subscribe({
        next: () => {
          alert('Voucher enviado exitosamente');
        },
        error: (error) => {
          console.error('Error al enviar voucher:', error);
          alert('Error al enviar el voucher. Por favor, intenta nuevamente.');
        },
      });
    }
  }

  cancelBooking(): void {
    if (!this.bookingDetails) return;

    // TODO: Implementar lógica de cancelación
    alert('Funcionalidad de cancelación en desarrollo');
  }

  // Métodos auxiliares
  getStatusBadgeClass(status: string): string {
    return this.bookingService.getStatusBadgeClass(status);
  }

  getBookingStatusName(status: string): string {
    return this.bookingService.getBookingStatusName(status);
  }

  getBookingTypeName(type: string): string {
    return this.bookingService.getBookingTypeName(type);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatSimpleDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : 'USD',
    }).format(amount);
  }

  getPaymentMethodName(method: string): string {
    const methods: { [key: string]: string } = {
      CREDIT_CARD: 'Tarjeta de Crédito',
      DEBIT_CARD: 'Tarjeta de Débito',
      TRANSFER: 'Transferencia',
      CASH: 'Efectivo',
    };
    return methods[method] || method;
  }

  getPaymentStatusName(status: string): string {
    const statuses: { [key: string]: string } = {
      APPROVED: 'Aprobado',
      PENDING: 'Pendiente',
      REJECTED: 'Rechazado',
      CANCELLED: 'Cancelado',
      REFUNDED: 'Reembolsado',
    };
    return statuses[status] || status;
  }

  getPaymentStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      APPROVED: 'bg-success',
      PENDING: 'bg-warning',
      REJECTED: 'bg-danger',
      CANCELLED: 'bg-secondary',
      REFUNDED: 'bg-info',
    };
    return classes[status] || 'bg-secondary';
  }

  // Métodos para vuelos
  getFlightDuration(departureDate: string, arrivalDate: string): string {
    const departure = new Date(departureDate);
    const arrival = new Date(arrivalDate);
    const diffMs = arrival.getTime() - departure.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getTotalPassengers(): number {
    const flight = this.bookingDetails?.flightDetails;
    if (!flight) return 0;
    return (
      (flight.adults || 0) + (flight.children || 0) + (flight.infants || 0)
    );
  }

  // Métodos para hoteles
  calculateNights(): number {
    const hotel = this.bookingDetails?.hotelDetails;
    if (!hotel) return 0;
    return hotel.numberOfNights;
  }

  getTotalGuests(): number {
    const hotel = this.bookingDetails?.hotelDetails;
    if (!hotel) return 0;
    return (hotel.adults || 0) + (hotel.children || 0);
  }
}
