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
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CancelBookingRequest } from '../../models/cancellations';

@Component({
  selector: 'app-deviaje-booking-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-booking-detail.component.html',
  styleUrls: ['./deviaje-booking-detail.component.scss'],
})
export class DeviajeBookingDetailComponent implements OnInit, OnDestroy {
  bookingDetails: BookingDetails | null = null;
  loading = true;
  error = '';
  errorAlert = '';

  currentUser: any = null;
  userRole = '';

  // Para cancelación
  cancelForm!: FormGroup;
  showCancelModal = false;
  isProcessingCancel = false;
  calculatedRefund = 0;
  cancelErrorMessage = '';

  // Para mensajes de éxito
  showSuccessMessage = false;
  successMessage = '';

  // Para el envío del email
  isSending = false;
  isSent = false;

  cancellationReasons = [
    { value: 'cambio_planes', label: 'Cambio de planes' },
    { value: 'salud', label: 'Problemas de salud' },
    { value: 'emergencia', label: 'Emergencia familiar' },
    { value: 'economico', label: 'Problemas económicos' },
    { value: 'mejor_precio', label: 'Encontré mejor precio' },
    { value: 'cambio_fechas', label: 'Cambio de fechas' },
    { value: 'destino_no_interesa', label: 'Destino ya no es de interés' },
    { value: 'otro', label: 'Otro motivo' },
  ];

  private subscription = new Subscription();
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  hotelService = inject(HotelService);
  private authService = inject(AuthService);
  readonly countryService = inject(CountryService);
  readonly flightUtils = inject(FlightUtilsService);
  private fb = inject(FormBuilder);

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadBookingDetails();
    this.initCancelForm();
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

  private initCancelForm(): void {
    this.cancelForm = this.fb.group({
      cancellationReason: ['',Validators.required],
      additionalDetails: [''],
    });

    // Validación condicional: si es "otro", additionalDetails es requerido
    this.cancelForm
      .get('cancellationReason')
      ?.valueChanges.subscribe((value) => {
        const additionalDetailsControl =
          this.cancelForm.get('additionalDetails');
        if (value === 'otro') {
          additionalDetailsControl?.setValidators([
            Validators.required,
            Validators.minLength(10),
            Validators.maxLength(50)
          ]);
        } else {
          additionalDetailsControl?.clearValidators();
        }
        additionalDetailsControl?.updateValueAndValidity();
      });
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
        this.errorAlert =
          'Error al descargar el voucher. Por favor, intenta nuevamente.';
      },
    });
  }

  resendVoucher(): void {
    if (!this.bookingDetails) return;

    this.isSending = true;
    this.bookingService.resendVoucher(this.bookingDetails.id).subscribe({
      next: () => {
        this.isSending = false;
        this.isSent = true;

        setTimeout(() => {
          this.isSent = false;
        }, 2000);
      },
      error: (error) => {
        console.error('Error al enviar voucher:', error);
        this.isSending = false;
        this.errorAlert =
          'Error al enviar el voucher. Por favor, intenta nuevamente.';
      },
    });
  }

  openCancelModal(): void {
    if (!this.bookingDetails) return;

    // Calcular monto de reembolso
    this.calculatedRefund = this.calculateRefundAmount();

    // Resetear formulario
    this.cancelForm.reset();
    this.cancelErrorMessage = '';
    this.showSuccessMessage = false;

    // Abrir modal
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelForm.reset();
    this.cancelErrorMessage = '';
    this.showSuccessMessage = false;
  }

  confirmCancelBooking(): void {
    if (!this.bookingDetails) return;

    // Marcar todos los campos como touched para mostrar errores
    this.cancelForm.markAllAsTouched();

    // Validar formulario
    if (this.cancelForm.invalid) {
      this.cancelErrorMessage =
        'Por favor completa todos los campos requeridos';
      return;
    }

    this.isProcessingCancel = true;
    this.cancelErrorMessage = '';

    const formValue = this.cancelForm.value;
    const request: CancelBookingRequest = {
      cancellationReason: formValue.cancellationReason,
      additionalDetails: formValue.additionalDetails || undefined,
      refundAmount:  Math.round(this.calculatedRefund * 100) / 100,
    };

    this.bookingService
      .cancelBooking(this.bookingDetails.id, request)
      .subscribe({
        next: (response) => {
          this.isProcessingCancel = false;

          // Construir mensaje de éxito
          this.successMessage =
            response.totalRefundAmount > 0
              ? `Reserva cancelada exitosamente. Monto a reembolsar: ${this.formatCurrency(
                  response.totalRefundAmount
                )}`
              : 'Reserva cancelada exitosamente. Esta reserva no es reembolsable.';

          this.showSuccessMessage = true;

          // Cerrar modal después de 3 segundos y recargar
          setTimeout(() => {
            this.closeCancelModal();
            this.loadBookingDetails();
          }, 3000);
        },
        error: (error) => {
          this.isProcessingCancel = false;
          console.error('Error al cancelar:', error);
          this.cancelErrorMessage =
            error.message ||
            'Error al cancelar la reserva. Por favor, intenta nuevamente.';
        },
      });
  }

  /**
   * Calcula el monto de reembolso según el tipo de reserva.
   */
  calculateRefundAmount(): number {
    if (!this.bookingDetails) return 0;

    switch (this.bookingDetails.type) {
      case 'FLIGHT':
        return this.calculateFlightRefund();
      case 'HOTEL':
        return this.calculateHotelRefund();
      case 'PACKAGE':
        return this.calculateFlightRefund() + this.calculateHotelRefund();
      default:
        return 0;
    }
  }

  /**
   * Calcula reembolso de vuelo según política de 24 horas.
   */
  private calculateFlightRefund(): number {
    if (!this.bookingDetails?.flightDetails) return 0;

    const bookingDate = new Date(this.bookingDetails.createdDatetime);
    const departureDate = new Date(
      this.bookingDetails.flightDetails.departureDate
    );
    const now = new Date();

    const hoursSinceBooking =
      (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);
    const hoursUntilDeparture =
      (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Política: Reembolso gratis si está dentro de 24hs de reserva Y faltan >24hs para vuelo
    if (hoursSinceBooking <= 24 && hoursUntilDeparture > 24) {
      return this.bookingDetails.flightDetails.totalPrice;
    }

    return 0; // No reembolsable
  }

  /**
   * Calcula reembolso de hotel según políticas de cancelación.
   */
  private calculateHotelRefund(): number {
    if (!this.bookingDetails?.hotelDetails?.cancellationPolicies) {
      return 0;
    }

    const now = new Date();
    const policies = this.bookingDetails.hotelDetails.cancellationPolicies;
    const netPrice = this.bookingDetails.hotelDetails.totalPrice;

    console.log('PRECIO DESDE EL RATE', netPrice);
    console.log(
      'PRECIO DESDE LA BASE DE DATOS',
      this.bookingDetails.hotelDetails.totalPrice
    );
    // Ordenar políticas por fecha 'from' de más reciente a más antigua
    const sortedPolicies = [...policies].sort(
      (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
    );

    // Buscar la política aplicable según la fecha actual
    for (const policy of sortedPolicies) {
      const fromDate = new Date(policy.from);
      
        console.log('NO SE SI APLICA LA PPOLITICA', now, fromDate);
      // Si la fecha actual es mayor o igual a 'from', esta política aplica
      if (now >= fromDate) {
        const penaltyAmount = this.hotelService.convertToArs(policy.amount) || 0;
        // Si la penalidad es mayor o igual al precio neto, no hay reembolso
        if (penaltyAmount >= netPrice) {
          return 0;
        }

        // Reembolso = netPrice - penalidad
        return netPrice - penaltyAmount;
      }
    }

    // Si ninguna política aplica aún (estamos antes de todas las fechas 'from'),
    // significa que hay cancelación gratuita
    return netPrice;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: this.bookingDetails?.currency || 'ARS',
    }).format(amount);
  }

  canCancelBooking(): boolean {
    return this.bookingDetails?.status === 'CONFIRMED';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.cancelForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.cancelForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) {
      return fieldName === 'cancellationReason'
        ? 'Debes seleccionar un motivo'
        : 'Este campo es requerido';
    }

    if (field.errors['minlength']) {
      return 'Mínimo 10 caracteres';
    }

    if (field.errors['maxlength']) {
      return 'Máximo 50 caracteres';
    }

    return '';
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

  // Calcula la duración del vuelo de IDA desde los itinerarios
  getOutboundFlightDuration(): string {
    const flight = this.bookingDetails?.flightDetails;
    if (!flight || !flight.itineraries || flight.itineraries.length === 0) {
      return 'N/A';
    }

    const outboundItinerary = flight.itineraries[0];
    return this.formatDuration(outboundItinerary.duration);
  }

  // Calcula la duración del vuelo de REGRESO desde los itinerarios (si existe)
  getInboundFlightDuration(): string | null{
    const flight = this.bookingDetails?.flightDetails;
    if (!flight || !flight.itineraries || flight.itineraries.length < 2) {
      return null; // No hay vuelo de regreso
    }

    const inboundItinerary = flight.itineraries[1];
    return this.formatDuration(inboundItinerary.duration);
  }

  // Verifica si es un vuelo de ida y vuelta
  isRoundTripFlight(): boolean {
    const flight = this.bookingDetails?.flightDetails;
    return flight?.returnDate != null;
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
