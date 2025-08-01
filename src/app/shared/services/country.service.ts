import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CountryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:9061/api/iata';
  private readonly restCountriesUrl = 'https://restcountries.com/v3.1';

  // Cache simple
  private readonly cache = new Map<string, string>();
  private readonly countryCache = new Map<string, string>(); // Cache para países
  private readonly loading = new Set<string>(); // Para evitar múltiples llamadas al mismo código

  /**
   * Obtiene info del aeropuerto. Si está en cache lo devuelve,
   * si no, devuelve el código y carga en background.
   */
  getAirportInfo(iataCode: string): string {
    if (!iataCode || iataCode.length !== 3) {
      return iataCode;
    }

    const cleanCode = iataCode.toUpperCase();

    // Si está en cache, devolverlo
    if (this.cache.has(cleanCode)) {
      return this.cache.get(cleanCode)!;
    }

    // Si no está en cache y no se está cargando, cargar en background
    if (!this.loading.has(cleanCode)) {
      this.loadAirportInBackground(cleanCode);
    }

    // Mientras tanto, devolver el código original
    return cleanCode;
  }

  /**
   * Carga la información del aeropuerto en background
   */
  private loadAirportInBackground(iataCode: string): void {
    this.loading.add(iataCode);

    // Primero obtener datos del aeropuerto
    this.http.get<any>(`${this.apiUrl}/${iataCode}`).subscribe({
      next: (airportResponse) => {
        if (
          airportResponse &&
          airportResponse.city &&
          airportResponse.country
        ) {
          // Obtener nombre del país en español
          this.getCountryNameInSpanish(airportResponse.country).subscribe({
            next: (countryName: string) => {
              const displayText = `${airportResponse.city}, ${countryName}`;
              this.cache.set(iataCode, displayText);
              console.log(`✅ Aeropuerto ${iataCode} cargado: ${displayText}`);
              this.loading.delete(iataCode);
            },
            error: () => {
              const displayText = `${airportResponse.city}, ${airportResponse.country}`;
              this.cache.set(iataCode, displayText);

              this.loading.delete(iataCode);
            },
          });
        } else {
          this.cache.set(iataCode, iataCode);
          this.loading.delete(iataCode);
        }
      },
      error: (error) => {
        this.cache.set(iataCode, iataCode);
        this.loading.delete(iataCode);
      },
    });
  }

  /**
   * Obtiene el nombre del país en español usando REST Countries
   */
  private getCountryNameInSpanish(countryCode: string): any {
    if (!countryCode || countryCode.length !== 2) {
      return of(countryCode);
    }

    const cleanCode = countryCode.toUpperCase();

    // Si está en cache de países, devolverlo
    if (this.countryCache.has(cleanCode)) {
      return of(this.countryCache.get(cleanCode)!);
    }

    // Obtener de REST Countries con traducción en español
    return this.http
      .get<any>(
        `${this.restCountriesUrl}/alpha/${cleanCode}?fields=name,translations`
      )
      .pipe(
        map((response) => {
          console.log(
            `🔍 Respuesta REST Countries para ${cleanCode}:`,
            response
          );

          // REST Countries puede devolver array o objeto individual
          const country = Array.isArray(response) ? response[0] : response;

          if (!country) {
            console.warn(`⚠️ No se encontró país para ${cleanCode}`);
            return countryCode;
          }

          // Buscar nombre en español con múltiples opciones
          let spanishName = '';

          // Opción 1: translations.spa
          if (country.translations?.spa?.common) {
            spanishName = country.translations.spa.common;
          } else if (country.translations?.spa?.official) {
            spanishName = country.translations.spa.official;
          }
          // Opción 2: name.common como fallback
          else if (country.name?.common) {
            spanishName = country.name.common;
          }
          // Opción 3: name.official como último recurso
          else if (country.name?.official) {
            spanishName = country.name.official;
          }
          // Opción 4: código original si nada funciona
          else {
            spanishName = countryCode;
          }

          console.log(`🌍 País encontrado: ${cleanCode} -> ${spanishName}`);

          // Guardar en cache de países
          this.countryCache.set(cleanCode, spanishName);

          return spanishName;
        }),
        catchError((error) => {
          console.error(`❌ Error obteniendo país ${cleanCode}:`, error);
          console.log(`🔧 Usando fallback para ${cleanCode}`);

          // Fallback manual para países comunes en español
          const fallbackCountries: Record<string, string> = {
            AR: 'Argentina',
            US: 'Estados Unidos',
            FR: 'Francia',
            ES: 'España',
            CL: 'Chile',
            BR: 'Brasil',
            MX: 'México',
            CO: 'Colombia',
            PE: 'Perú',
            UY: 'Uruguay',
            PY: 'Paraguay',
            BO: 'Bolivia',
            EC: 'Ecuador',
            VE: 'Venezuela',
            GB: 'Reino Unido',
            DE: 'Alemania',
            IT: 'Italia',
            PT: 'Portugal',
            CA: 'Canadá',
            AU: 'Australia',
            JP: 'Japón',
            CN: 'China',
            IN: 'India',
            RU: 'Rusia',
            ZA: 'Sudáfrica',
            EG: 'Egipto',
            MA: 'Marruecos',
            NG: 'Nigeria',
            KE: 'Kenia',
            TH: 'Tailandia',
            SG: 'Singapur',
            MY: 'Malasia',
            ID: 'Indonesia',
            PH: 'Filipinas',
            KR: 'Corea del Sur',
            TR: 'Turquía',
            GR: 'Grecia',
            NL: 'Países Bajos',
            BE: 'Bélgica',
            CH: 'Suiza',
            AT: 'Austria',
            SE: 'Suecia',
            NO: 'Noruega',
            DK: 'Dinamarca',
            FI: 'Finlandia',
            IE: 'Irlanda',
            IS: 'Islandia',
            PL: 'Polonia',
            CZ: 'República Checa',
            HU: 'Hungría',
            RO: 'Rumania',
            BG: 'Bulgaria',
            HR: 'Croacia',
            SI: 'Eslovenia',
            SK: 'Eslovaquia',
            LT: 'Lituania',
            LV: 'Letonia',
            EE: 'Estonia',
          };

          const fallbackName = fallbackCountries[cleanCode] || cleanCode;
          console.log(`🔧 Fallback aplicado: ${cleanCode} -> ${fallbackName}`);

          this.countryCache.set(cleanCode, fallbackName);
          return of(fallbackName);
        })
      );
  }

  /**
   * Pre-cargar códigos específicos de manera más eficiente
   */
  preloadAirports(iataCodes: string[]): void {
    const uniqueCodes = [
      ...new Set(
        iataCodes.filter(
          (code) =>
            code &&
            code.length === 3 &&
            !this.cache.has(code.toUpperCase()) &&
            !this.loading.has(code.toUpperCase())
        )
      ),
    ];

    // Cargar todos en paralelo con un pequeño delay para no saturar
    uniqueCodes.forEach((code, index) => {
      setTimeout(() => {
        this.loadAirportInBackground(code.toUpperCase());
      }, index * 100); // 100ms entre cada llamada
    });
  }

  /**
   * Estadísticas del cache
   */
  getCacheStats(): { airports: number; countries: number } {
    return {
      airports: this.cache.size,
      countries: this.countryCache.size,
    };
  }

  /**
   * Limpiar cache
   */
  clearCache(): void {
    this.cache.clear();
    this.countryCache.clear();
  }
}
