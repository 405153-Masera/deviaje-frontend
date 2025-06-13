import { inject, Injectable } from '@angular/core';
import { environment } from '../../../shared/enviroments/enviroment';
import { HttpClient } from '@angular/common/http';
import {
  BookingResponseDto,
  FlightBookingDto,
  FlightOfferDto,
  HotelBookingDto,
  PaymentDto,
} from '../models/bookings';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);

  private flightBookingUrl = `${environment.apiDeviajeBookings}/api/flights/book-and-pay`;
  private hotelBookingUrl = `${environment.apiDeviajeBookings}/api/hotels/book-and-pay`;
  private flightVerifyUrl = `${environment.apiDeviajeBookings}/api/flights/verify-price`;
  private hotelRateCheckUrl = `${environment.apiDeviajeBookings}/api/hotels/checkrates`;

  // Verificar disponibilidad y precio de vuelo
  verifyFlightOfferPrice(
    flightOffer: FlightOfferDto
  ): Observable<FlightOfferDto | null> {
    return this.http.post<any>(this.flightVerifyUrl, flightOffer).pipe(
      map((response) => {
        if (
          response &&
          response.data &&
          response.data.flightOffers &&
          response.data.flightOffers.length > 0
        ) {
          console.log(
            'Precio del vuelo verificado:',
            response.data.flightOffers[0]
          );
          return response.data.flightOffers[0];
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error al verificar precio del vuelo:', error);
        return of(null);
      })
    );
  }

  checkRates(rateKey: string): Observable<any> {
    // Encodear el rateKey para caracteres especiales
    const encodedRateKey = encodeURIComponent(rateKey);

    return this.http
      .get<any>(`${this.hotelRateCheckUrl}?rateKey=${encodedRateKey}`)
      .pipe(
        catchError((error) => {
          console.error('Error al verificar tarifa:', error);
          throw error;
        })
      );
  }

  // Crear una reserva de vuelo con pago
  createFlightBooking(
    bookingData: FlightBookingDto,
    paymentData: PaymentDto
  ): Observable<BookingResponseDto> {
    const bookAndPayRequest = {
      bookingRequest: bookingData,
      paymentRequest: paymentData,
    };

    return this.http
      .post<BookingResponseDto>(this.flightBookingUrl, bookAndPayRequest)
      .pipe(
        catchError((error) => {
          console.error('Error al crear reserva de vuelo:', error);
          return of({
            success: false,
            message: 'Error al procesar la reserva',
            detailedError: error.message || 'Error de conexión',
          });
        })
      );
  }

  // Crear una reserva de hotel con pago
  createHotelBooking(
    bookingData: HotelBookingDto,
    paymentData: PaymentDto
  ): Observable<BookingResponseDto> {
    const bookAndPayRequest = {
      bookingRequest: bookingData,
      paymentRequest: paymentData,
    };

    return this.http
      .post<BookingResponseDto>(this.hotelBookingUrl, bookAndPayRequest)
      .pipe(
        catchError((error) => {
          console.error('Error al crear reserva de hotel:', error);
          return of({
            success: false,
            message: 'Error al procesar la reserva',
            detailedError: error.message || 'Error de conexión',
          });
        })
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
}
