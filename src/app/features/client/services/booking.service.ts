import { inject, Injectable } from '@angular/core';
import { environment } from '../../../shared/enviroments/enviroment';
import { HttpClient } from '@angular/common/http';
import {
  BookingReferenceResponse,
  BookingResponseDto,
  FlightBookingDto,
  FlightOfferDto,
  HotelBookingDto,
  PaymentDto,
} from '../models/bookings';
import { catchError, Observable, of } from 'rxjs';
import { FlightVerifyResponse } from '../../../shared/models/flights';
import { BookingDetails } from '../../../shared/models/bookingsDetails';
import { CancelBookingRequest, CancelBookingResponse } from '../models/cancellations';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);

  private flightBookingUrl = `${environment.apiDeviajeBookings}/api/flights/book-and-pay`;
  private hotelBookingUrl = `${environment.apiDeviajeBookings}/api/hotels/book-and-pay`;
  private flightVerifyUrl = `${environment.apiDeviajeBookings}/api/flights/verify-price`;
  private hotelRateCheckUrl = `${environment.apiDeviajeBookings}/api/hotels/checkrates`;
  private packageBookingUrl = `${environment.apiDeviajeBookings}/api/packages/book-and-pay`;

  // Crear una reserva de paquete (vuelo + hotel) con pago
  createPackageBooking(
    flightBookingData: FlightBookingDto,
    hotelBookingData: HotelBookingDto,
    paymentData: PaymentDto,
    pricesDto?: any
  ): Observable<BookingReferenceResponse> {
    const bookAndPayRequest = {
      packageBookingRequest: {
        clientId: flightBookingData.clientId,
        agentId: flightBookingData.agentId,
        flightBooking: {
          clientId: flightBookingData.clientId,
          agentId: flightBookingData.agentId,
          origin: flightBookingData.origin,
          destination: flightBookingData.destination,
          carrier: flightBookingData.carrier,
          flightOffer: flightBookingData.flightOffer,
          travelers: flightBookingData.travelers,
        },
        hotelBooking: hotelBookingData,
      },
      paymentRequest: paymentData,
      prices: pricesDto,
    };

    return this.http.post<BookingReferenceResponse>(
      this.packageBookingUrl,
      bookAndPayRequest
    );
  }

  // Verificar disponibilidad y precio de vuelo
  verifyFlightOfferPrice(
    flightOffer: FlightOfferDto
  ): Observable<FlightVerifyResponse | null> {
    return this.http.post<any>(this.flightVerifyUrl, flightOffer);
  }

  checkRates(rateKey: string): Observable<any> {
    const encodedRateKey = encodeURIComponent(rateKey);
    return this.http.get<any>(
      `${this.hotelRateCheckUrl}?rateKey=${encodedRateKey}`
    );
  }

  createFlightBooking(
    bookingData: FlightBookingDto,
    paymentData: PaymentDto,
    pricesDto?: any // AGREGADO
  ): Observable<BookingReferenceResponse> {
    const bookAndPayRequest = {
      bookingRequest: bookingData,
      paymentRequest: paymentData,
      prices: pricesDto, // AGREGADO
    };

    return this.http.post<BookingReferenceResponse>(
      this.flightBookingUrl,
      bookAndPayRequest
    );
  }

  createHotelBooking(
    bookingData: HotelBookingDto,
    paymentData: PaymentDto,
    pricesDto?: any
  ): Observable<BookingReferenceResponse> {
    const bookAndPayRequest = {
      bookingRequest: bookingData,
      paymentRequest: paymentData,
      prices: pricesDto,
    };

    return this.http.post<BookingReferenceResponse>(
      this.hotelBookingUrl,
      bookAndPayRequest
    );
  }

  getBookingDetails(bookingReference: string): Observable<BookingDetails> {
    return this.http.get<BookingDetails>(
      `${environment.apiDeviajeBookings}/api/bookings/${bookingReference}/details`
    );
  }

  // Obtener reservas según el rol del usuario
  getBookingsByRole(userId: number, userRole: string): Observable<any[]> {
    let endpoint = '';

    switch (userRole) {
      case 'CLIENTE':
        endpoint = `${environment.apiDeviajeBookings}/api/bookings/client/${userId}`;
        break;
      case 'AGENTE':
        endpoint = `${environment.apiDeviajeBookings}/api/bookings/agent/${userId}`;
        break;
      case 'ADMINISTRADOR':
        endpoint = `${environment.apiDeviajeBookings}/api/bookings/admin/all`;
        break;
    }

    return this.http.get<any[]>(endpoint);
  }

  /**
   * Cancela una reserva.
   * @param bookingId ID de la reserva
   * @param request datos de cancelación (incluye refundAmount)
   */
  cancelBooking(
    bookingId: number,
    request: CancelBookingRequest
  ): Observable<CancelBookingResponse> {
    return this.http.post<CancelBookingResponse>(
      `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/cancel`,
      request
    );
  }

  /**
   * Reenvía el voucher por email.
   * Genera el voucher si no existe.
   * @param bookingId ID de la reserva
   * @returns mensaje de confirmación
   */
  resendVoucher(bookingId: number): Observable<string> {
    return this.http.post(
      `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/resend-voucher`,
      {},
      { responseType: 'text' } // ← IMPORTANTE: El backend devuelve String
    );
  }

  downloadVoucher(bookingId: number): Observable<Blob> {
    // Cambiamos de usar ID a usar bookingReference
    return this.http
      .get(
        `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/voucher/download`,
        { responseType: 'blob' }
      );
  }

  // Método helper para obtener el nombre del tipo de reserva
  getBookingTypeName(type: string): string {
    const typeNames: { [key: string]: string } = {
      FLIGHT: 'Vuelo',
      HOTEL: 'Hotel',
      PACKAGE: 'Paquete',
    };
    return typeNames[type] || type;
  }

  getTypeBadgeClass(tipo: string | number): string {
    switch (tipo) {
      case 'RESERVA':
        return 'bg-primary';
      case 'CANCELADA':
        return 'bg-danger';
      case 'PENDIENTE':
        return 'bg-warning';
      default:
        return 'bg-secondary-subtle text-dark';
    }
  }

  // Método helper para obtener el estado de la reserva en español
  getBookingStatusName(status: string): string {
    const statusNames: { [key: string]: string } = {
      CONFIRMED: 'Confirmada',
      CANCELLED: 'Cancelada',
      COMPLETED: 'Completada',
    };
    return statusNames[status] || status;
  }

  // Método helper para obtener la clase CSS según el estado
  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      CONFIRMED: 'bg-success',
      CANCELLED: 'bg-danger',
      COMPLETED: 'bg-info',
    };
    return statusClasses[status] || 'bg-secondary';
  }
}
