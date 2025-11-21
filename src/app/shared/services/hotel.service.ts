import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../shared/enviroments/enviroment';
import { Observable } from 'rxjs';
import { HotelSearchRequest, HotelResponseDto, HotelSearchResponse } from '../models/hotels';
import { Price } from '../models/flights';

@Injectable({
  providedIn: 'root',
})
export class HotelService {
  private readonly http: HttpClient = inject(HttpClient);
  private url = `${environment.apiDeviajeSearches}/hotels`;

  //Esto mas adelante se podria hacer dinamico segun el usuario administre sus comisiones
  private commisionHotel = 1.2;
  private commisionFlight = 1.15;

  /**
   * Busca hoteles por ciudad
   * @param params Parámetros de búsqueda
   * @returns Observable con los resultados de la búsqueda
   */
  findHotelsByCity(params: HotelSearchRequest): Observable<any> {
    return this.http.post<any>(`${this.url}`, params);
  }

  /**
   * Obtiene los detalles de un hotel específico
   * @param hotelCode Código del hotel
   * @returns Observable con los detalles del hotel
   */
  getHotelOfferDetails(hotelCode: string): Observable<HotelResponseDto> {
    return this.http.get<HotelResponseDto>(`${this.url}/${hotelCode}`);
  }

   /**
   * Convierte un precio a ARS y redondea a 2 decimales para evitar 
   * errores de precisión de punto flotante.
   *
   * @param price Precio en moneda original
   * @returns precio convertido a ARS redondeado a 2 decimales
   */
  convertToArs(price: number): number {
    const result = price * 1440;
    return Math.round(result * 100) / 100; 
  }

   /**
   * Calcula el precio total con comisión del 20% para hoteles.
   */
  getRateTotalWithCommission(net: number) {
    const priceInArs = this.convertToArs(net);
    return Math.round(priceInArs * this.commisionHotel * 100) / 100; 
  }

  getTotelFlightWithCommission(price: Price) {

    const total = parseFloat(price.grandTotal);
    const base = parseFloat(price.base);
    const commision = base * 0.15;

    return Math.round((total + commision) * 100) / 100; 
  }
}
