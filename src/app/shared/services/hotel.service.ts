import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../shared/enviroments/enviroment';
import { catchError, map, Observable, throwError } from 'rxjs';
import { HotelSearchRequest, HotelOffersRequest, HotelOffer, HotelSearchResponse, HotelResponseDto } from '../models/hotels';

@Injectable({
  providedIn: 'root'
})
export class HotelService {

  private readonly http: HttpClient = inject(HttpClient);
  private url = `${environment.apiDeviajeSearches}/hotels`;

  /**
   * Busca hoteles por ciudad
   * @param params Parámetros de búsqueda
   * @returns Observable con los resultados de la búsqueda
   */
  findHotelsByCity(params: HotelSearchRequest): Observable<any> {
    return this.http.post<any>(`${this.url}/by-city`, params)
      .pipe(
        catchError(error => {
          console.error('Error buscando hoteles:', error);
          throw error;
        })
      );
  }
  /**
   * Obtiene los detalles de un hotel específico
   * @param hotelCode Código del hotel
   * @returns Observable con los detalles del hotel
   */
  getHotelOfferDetails(hotelCode: string): Observable<HotelResponseDto> {
    return this.http.get<HotelResponseDto>(`${this.url}/${hotelCode}`)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo detalles del hotel:', error);
          return throwError(() => new Error('Error al obtener detalles del hotel: ' + (error.message || 'Error desconocido')));
        })
      );
  }

  /**
   * Verifica la disponibilidad y precio de una tarifa
   * @param rateKey Clave de la tarifa a verificar
   * @returns Observable con la información actualizada de la tarifa
   */
  checkRates(rateKey: string): Observable<any> {
    return this.http.get<any>(`${this.url}/checkrates/${rateKey}`)
      .pipe(
        catchError(error => {
          console.error('Error al verificar tarifa:', error);
          return throwError(() => new Error('Error al verificar tarifa: ' + (error.message || 'Esta tarifa ya no está disponible')));
        })
      );
  }

  /**
   * Crea una reserva de hotel
   * @param bookingRequest Datos de la reserva
   * @returns Observable con la confirmación de la reserva
   */
  createBooking(bookingRequest: any): Observable<any> {
    return this.http.post<any>(`${this.url}/booking`, bookingRequest)
      .pipe(
        catchError(error => {
          console.error('Error al crear reserva:', error);
          return throwError(() => new Error('Error al crear reserva: ' + (error.message || 'Error desconocido')));
        })
      );
  }
}