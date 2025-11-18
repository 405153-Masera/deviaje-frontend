import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Subdivision {
  country_code: string;
  state_code: string;
  name: string;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationFormatterService {
  /**
   * Mapa global ISO‑3166‑2: "US-DC" → "District of Columbia".
   */
  private isoMap = new Map<string, string>();

  /**
   * Mapa abreviado para estados de EE.UU. (códigos de dos letras):
   * "DC" → "District of Columbia".
   */
  private usShortMap = new Map<string, string>();

  constructor(private http: HttpClient) {
    this.loadSubdivisions();
  }

  /**
   * Carga el archivo de subdivisiones ISO‑3166‑2 desde assets y pobla
   * los mapas de búsqueda.  Este método se ejecuta una única vez al
   * instanciar el servicio.
   */
  private loadSubdivisions() {
    this.http.get<any>('/assets/json/subdivisions.json').subscribe((data) => {
      Object.keys(data).forEach((countryCode) => {
        const country = data[countryCode];

        if (!country.divisions) return;

        Object.keys(country.divisions).forEach((fullCode) => {
          const stateName = country.divisions[fullCode];

          this.isoMap.set(fullCode, stateName);

          if (countryCode === 'US' || countryCode === 'BR') {
            const parts = fullCode.split('-');
            if (parts.length === 2) {
              this.usShortMap.set(parts[1], stateName);
            }
          }
        });
      });
    });
  }

  /**
   * Formatea la presentación de una ciudad para mostrar el estado en el UI.
   * Acepta tanto objetos provenientes de Amadeus (con stateCode) como
   * de HotelBeds (donde el estado puede estar incrustado en el nombre).
   *
   * @param city objeto resultante del API
   */
  getStateName(city: any): string {
    if (!city) return '';

    const name = (city.name?.content || city.name || '').trim(); // HotelBeds/Amadeus
    let stateCode: string | undefined =
      city.stateCode || city.state_code || city.address?.stateCode;

    // HotelBeds: descompone "Memphis - TN" → estado abreviado
    let cityName = name;
    if (!stateCode && typeof name === 'string' && name.includes('-')) {
      const parts = name.split('-').map((p) => p.trim());
      if (parts.length === 2) {
        cityName = parts[0];
        stateCode = parts[1];
      }
    }

    // Resolve state name
    let stateName: string | undefined;
    if (stateCode) {
      // Format may be full ISO or short code
      if (stateCode.includes('-')) {
        stateName = this.isoMap.get(stateCode);
      } else if (this.usShortMap.has(stateCode)) {
        stateName = this.usShortMap.get(stateCode);
      }
    }

    if (stateName) {
      return `, ${stateName}`;
    }
    return ``;
  }
}
