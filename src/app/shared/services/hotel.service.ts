import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../shared/enviroments/enviroment';
import { catchError, map, Observable } from 'rxjs';
import { HotelSearchRequest, HotelOffersRequest, HotelOffer, HotelSearchResponse } from '../models/hotels';

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
   * Busca ofertas de hoteles
   * @param params Parámetros de búsqueda de ofertas
   * @returns Observable con las ofertas de hoteles
   */
  findHotelOffers(params: HotelOffersRequest): Observable<HotelOffer[]> {
    return this.http.post<HotelSearchResponse>(`${this.url}/offers`, params)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error buscando ofertas de hoteles:', error);
          throw error;
        })
      );
  }

  /**
   * Obtiene los detalles de una oferta de hotel específica
   * @param offerId ID de la oferta
   * @returns Observable con los detalles de la oferta
   */
  getHotelOfferDetails(offerId: string): Observable<any> {
    return this.http.get<any>(`${this.url}/offers/${offerId}`)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo detalles de la oferta:', error);
          throw error;
        })
      );
  }

  /**
   * Obtiene la disponibilidad de habitaciones de un hotel
   * @param hotelId ID del hotel
   * @param params Parámetros de búsqueda
   * @returns Observable con la disponibilidad de habitaciones
   */
  getHotelRoomsAvailability(hotelId: string, params: any): Observable<any> {
    return this.http.post<any>(`${this.url}/${hotelId}/rooms`, params)
      .pipe(
        catchError(error => {
          console.error('Error obteniendo disponibilidad de habitaciones:', error);
          throw error;
        })
      );
  }
}