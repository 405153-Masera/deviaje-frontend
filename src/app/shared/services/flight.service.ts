import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../enviroments/enviroment';
import { FlightOffer, FlightSearchRequest, FlightSearchResponse } from '../models/flights';
import { catchError, map, Observable, tap } from 'rxjs';
import { FlightUtilsService } from './flight-utils.service';

@Injectable({
  providedIn: 'root'
})
export class FlightService {

  private readonly http: HttpClient = inject(HttpClient);
  private readonly flightUtils: FlightUtilsService = inject(FlightUtilsService);

  private url = `${environment.apiDeviajeSearches}/flights`

  searchFlights(params: FlightSearchRequest): Observable<FlightOffer[]> {
    return this.http.post<FlightSearchResponse>(this.url, params)
    .pipe(
      tap(response => {
        if (response.dictionaries) {
          this.flightUtils.setDictionaries(response.dictionaries);
        }
      }),
      map(response => response.data || []),
      catchError(error => {
        console.error('Error buscando vuelos:', error)
        throw error;
      })
    );
  }

  getUpsellOffers(flightOffer: FlightOffer): Observable<FlightOffer[]> {

    const body = {
      data: {
        type: 'flight-offers-upselling',
        flightOffers: [flightOffer]
      }
    };

    return this.http.post<any>(`${this.url}/upsell`, body)
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error obteniendo tarifas alternativas:', error);
          throw error;
        })
      );
  }

  verifyPricing(flightOffer: FlightOffer): Observable<FlightOffer> {

    const body = {
      data: {
        type: 'flight-offers-pricing',
        flightOffers: [flightOffer]
      }
    };
    return this.http.post<any>(`${this.url}/pricing`, body)
      .pipe(
        map(response => response.data?.flightOffers?.[0] || flightOffer),
        catchError(error => {
          console.error('Error verificando precio:', error);
          throw error;
        })
      );
  }
}
