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

  // Obtener las reservas del usuario
  getUserBookings(): Observable<any[]> {
    return this.http
      .get<any[]>(`${environment.apiDeviajeBookings}/api/bookings/user`)
      .pipe(
        catchError((error) => {
          console.error('Error al obtener reservas del usuario:', error);
          return of([]);
        })
      );
  }

  getBookingDetails(bookingId: number): Observable<BookingDetails> {
    return this.http
      .get<BookingDetails>(
        `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/details`
      )
      .pipe(
        catchError((error) => {
          console.error('Error al obtener detalles de la reserva:', error);
          throw error;
        })
      );
  }

  // Enviar voucher por email
  resendVoucher(bookingId: number): Observable<any> {
    return this.http
      .post(
        `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/voucher/resend`,
        {}
      )
      .pipe(
        catchError((error) => {
          console.error('Error al reenviar voucher:', error);
          throw error;
        })
      );
  }

  // Cancelar una reserva
  cancelBooking(bookingId: number): Observable<BookingResponseDto> {
    return this.http
      .put<BookingResponseDto>(
        `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/cancel`,
        {}
      )
      .pipe(
        catchError((error) => {
          console.error(`Error al cancelar la reserva ${bookingId}:`, error);
          return of({
            success: false,
            message: 'Error al cancelar la reserva',
            detailedError: error.message || 'Error de conexión',
          });
        })
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

  // Actualizar estado de una reserva
  updateBookingStatus(bookingId: number, newStatus: string): Observable<any> {
    return this.http
      .put<any>(
        `${environment.apiDeviajeBookings}/api/bookings/${bookingId}/status`,
        {
          status: newStatus,
        }
      )
      .pipe(
        catchError((error) => {
          console.error(
            `Error al actualizar estado de reserva ${bookingId}:`,
            error
          );
          return of({
            success: false,
            message: 'Error al actualizar estado de la reserva',
          });
        })
      );
  }

  downloadVoucher(bookingReference: string): Observable<Blob> {
    // Cambiamos de usar ID a usar bookingReference
    return this.http
      .get(
        `${environment.apiDeviajeBookings}/api/bookings/${bookingReference}/voucher/download`,
        { responseType: 'blob' }
      )
      .pipe(
        catchError((error) => {
          console.error('Error al descargar voucher:', error);
          throw error;
        })
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
      COMPLETED: 'bg-primary',
    };
    return statusClasses[status] || 'bg-secondary';
  }
}
