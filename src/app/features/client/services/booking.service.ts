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
import { catchError, Observable, of} from 'rxjs';
import {  FlightVerifyResponse } from '../../../shared/models/flights';

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

    return this.http
      .post<BookingReferenceResponse>(this.packageBookingUrl, bookAndPayRequest);
  }

  // Verificar disponibilidad y precio de vuelo
  verifyFlightOfferPrice(
    flightOffer: FlightOfferDto
  ): Observable<FlightVerifyResponse | null> {
    return this.http.post<any>(this.flightVerifyUrl, flightOffer);
  }

  checkRates(rateKey: string): Observable<any> {
    const encodedRateKey = encodeURIComponent(rateKey);
    return this.http
      .get<any>(`${this.hotelRateCheckUrl}?rateKey=${encodedRateKey}`);
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

    return this.http
      .post<BookingReferenceResponse>(this.flightBookingUrl, bookAndPayRequest);
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

    return this.http
      .post<BookingReferenceResponse>(this.hotelBookingUrl, bookAndPayRequest);
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

  // Obtener detalles de una reserva específica
  getBookingDetails(bookingId: number): Observable<any> {
    return this.http
      .get<any>(`${environment.apiDeviajeBookings}/api/bookings/${bookingId}`)
      .pipe(
        catchError((error) => {
          console.error(
            `Error al obtener detalles de la reserva ${bookingId}:`,
            error
          );
          return of(null);
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
      default:
        console.error('Rol de usuario no válido:', userRole);
        return of([]);
    }

    return this.http.get<any[]>(endpoint).pipe(
      catchError((error) => {
        console.error('Error al obtener reservas:', error);
        return of([]);
      })
    );
  }

  // Obtener reservas de cliente por tipo
  getClientBookingsByType(clientId: number, type: string): Observable<any[]> {
    return this.http
      .get<any[]>(
        `${environment.apiDeviajeBookings}/api/bookings/client/${clientId}/type/${type}`
      )
      .pipe(
        catchError((error) => {
          console.error(`Error al obtener reservas de tipo ${type}:`, error);
          return of([]);
        })
      );
  }

  // Obtener reservas por estado (para administradores)
  getBookingsByStatus(status: string): Observable<any[]> {
    return this.http
      .get<any[]>(
        `${environment.apiDeviajeBookings}/api/bookings/admin/status/${status}`
      )
      .pipe(
        catchError((error) => {
          console.error(
            `Error al obtener reservas con estado ${status}:`,
            error
          );
          return of([]);
        })
      );
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

  // Método helper para obtener el nombre del tipo de reserva
  getBookingTypeName(type: string): string {
    const typeNames: { [key: string]: string } = {
      FLIGHT: 'Vuelo',
      HOTEL: 'Hotel',
      PACKAGE: 'Paquete',
      TOUR: 'Tour',
    };
    return typeNames[type] || type;
  }

  // Método helper para obtener el estado de la reserva en español
  getBookingStatusName(status: string): string {
    const statusNames: { [key: string]: string } = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmada',
      CANCELLED: 'Cancelada',
      COMPLETED: 'Completada',
    };
    return statusNames[status] || status;
  }

  // Método helper para obtener la clase CSS según el estado
  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      PENDING: 'bg-warning text-dark',
      CONFIRMED: 'bg-success',
      CANCELLED: 'bg-danger',
      COMPLETED: 'bg-primary',
    };
    return statusClasses[status] || 'bg-secondary';
  }
}
