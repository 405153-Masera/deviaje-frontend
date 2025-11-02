import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../shared/enviroments/enviroment';
import { Observable} from 'rxjs';
import {
  HotelSearchRequest,
  HotelResponseDto,
} from '../models/hotels';

@Injectable({
  providedIn: 'root',
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

  convertToArs(price: number): number {
    return price * 1250;
  }
}
