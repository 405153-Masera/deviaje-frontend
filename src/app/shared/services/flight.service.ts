import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../enviroments/enviroment';
import { FlightOffer, FlightSearchRequest, FlightSearchResponse } from '../models/flights';
import { catchError, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FlightService {

  private readonly http: HttpClient = inject(HttpClient);

  private url = `${environment.apiDeviajeSearches}/flights`

  searchFlights(params: FlightSearchRequest): Observable<FlightOffer[]> {
    return this.http.post<FlightSearchResponse>(this.url, params)
    .pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Error buscando vuelos:', error)
        throw error;
      })
    );
  }
}
