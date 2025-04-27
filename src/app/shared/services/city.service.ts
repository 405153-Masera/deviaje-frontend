import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../enviroments/enviroment';
import { catchError, map, Observable, of } from 'rxjs';
import { LocationResult, Location, CityDto } from '../models/locations';

@Injectable({
  providedIn: 'root',
})
export class CityService {
  private readonly http: HttpClient = inject(HttpClient);
  private url = `${environment.apiDeviajeSearches}/flights/cities`;

  
  searchCities(keyword: string): Observable<CityDto[]> {
    let params: any = {keyword};
    return this.http.get<CityDto[]>(`${this.url}`, {params});
  }
  
  searchLocations(keyword: string): Observable<Location[]> {
    if (!keyword || keyword.length < 2) {
      return of([]);
    }

    let params: any = { keyword };

    return this.http.get<LocationResult>(`${this.url}`, { params }).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Error buscando ciudades:', error);
        return of([]);
      })
    );
  }

  formatLocation(location: Location): string {
    if (!location) return '';

    let result = location.name || '';

    // Añadir código IATA si está disponible
    if (location.iataCode) {
      result += ` (${location.iataCode})`;
    }

    // Añadir país si está disponible
    if (location.address && location.address.countryName) {
      result += `, ${location.address.countryName}`;
    }

    return result;
  }
}
