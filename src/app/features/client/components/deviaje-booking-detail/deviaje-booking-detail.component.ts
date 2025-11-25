import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { BookingDetails } from '../../../../shared/models/bookingsDetails';
import { HotelService } from '../../../../shared/services/hotel.service';
import { CountryService } from '../../../../shared/services/country.service';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';

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
  hotelService = inject(HotelService);
  private authService = inject(AuthService);
  readonly countryService = inject(CountryService);
  readonly flightUtils = inject(FlightUtilsService);

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
    const bookingReference = this.route.snapshot.paramMap.get('reference');

    if (!bookingReference) {
      this.error = 'Referencia de reserva inválida';
      this.loading = false;
      return;
    }

    this.subscription.add(
      this.bookingService.getBookingDetails(bookingReference).subscribe({
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

    this.bookingService.downloadVoucher(this.bookingDetails.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `voucher-${this.bookingDetails!.bookingReference}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al descargar voucher:', error);
        alert('Error al descargar el voucher. Por favor, intenta nuevamente.');
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

  calculateAge(dateOfBirth: string): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  // Formatear duración del vuelo
  formatDuration(duration: string): string {
    if (!duration) return '';
    // Duration viene como "PT2H30M"
    const hours = duration.match(/(\d+)H/);
    const minutes = duration.match(/(\d+)M/);
    let result = '';
    if (hours) result += `${hours[1]}h `;
    if (minutes) result += `${minutes[1]}m`;
    return result.trim();
  }

  // Formatear hora de vuelo
  formatFlightTime(dateTime: string): string {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Formatear fecha completa del vuelo
  formatFlightDate(dateTime: string): string {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  // Obtener política de cancelación de vuelos
  getFlightCancellationPolicy(): {
    canCancel: boolean;
    message: string;
    charge: number;
  } | null {
    if (!this.bookingDetails?.flightDetails) {
      return null;
    }
    const bookingDate = new Date(this.bookingDetails.createdDatetime);
    const departureDate = new Date(
      this.bookingDetails.flightDetails.departureDate
    );
    const now = new Date();

    const hoursSinceBooking =
      (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);
    const hoursUntilDeparture =
      (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    const totalPrice = this.bookingDetails.flightDetails.totalPrice;

    // ✔ Si cancelás dentro de 24 hs Y faltan más de 24 hs para el vuelo → reembolso total
    if (hoursSinceBooking <= 24 && hoursUntilDeparture > 24) {
      return {
        canCancel: true,
        message:
          'Cancelación gratuita disponible (dentro de las 24hs de la reserva y faltando más de 24hs para el vuelo)',
        charge: 0,
      };
    }

    return {
      canCancel: false,
      message: 'Tarifa no reembolsable',
      charge: totalPrice,
    };
  }

  // Obtiene el nombre completo del aeropuerto a partir del código IATA
  getAirportName(iataCode: string): string {
    return this.countryService.getAirportInfo(iataCode);
  }

  // Obtiene el nombre completo de la aerolínea a partir del código carrier
  getAirlineName(carrierCode: string): string {
    return this.flightUtils.getAirlineName(carrierCode);
  }
}
