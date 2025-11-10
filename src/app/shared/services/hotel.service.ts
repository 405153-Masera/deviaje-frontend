import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../shared/enviroments/enviroment';
import { Observable } from 'rxjs';
import { HotelSearchRequest, HotelResponseDto, HotelSearchResponse } from '../models/hotels';

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
   * Convierte un precio a ARS.
   *
   * @param price Precio en moneda original
   * @returns precio convertido a ARS
   */
  convertToArs(price: number): number {
    return price * 1440;
  }

  /**
   * Calcula el precio total con comisión del 20% para hoteles.
   */
  getRateTotalWithCommission(net: number) {
    const priceInArs = this.convertToArs(net);
    return priceInArs * this.commisionHotel;
  }
}
