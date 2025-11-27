import { Injectable } from '@angular/core';
import { FlightDictionaries, FlightOffer, Itinerary, Segment } from '../models/flights';

@Injectable({
  providedIn: 'root'
})
export class FlightUtilsService {

  //Datos de Amadeus para manejoar los codigos
  private carriers: { [code: string]: string } = {};
  private aircraft: { [code: string]: string } = {};

  // Mapa para almacenar los pares de códigos de tarifa y sus etiquetas
  private brandedFareLabels: Map<string, string> = new Map();

  /**
   * Establece los diccionarios desde la respuesta de Amadeus
   * @param dictionaries Diccionarios recibidos desde Amadeus
   */
  setDictionaries(dictionaries: FlightDictionaries): void {
    if (dictionaries.carriers) {
      this.carriers = dictionaries.carriers;
    }
    
    if (dictionaries.aircraft) {
      this.aircraft = dictionaries.aircraft;
    }
  }

  /**
   * Extrae y almacena las etiquetas de tarifas de una oferta de vuelo
   * @param offer Oferta de vuelo recibida de la API
   */
  extractBrandedFares(offer: FlightOffer): void {
    if (!offer || !offer.travelerPricings) return;
    
    for (const pricing of offer.travelerPricings) {
      if (!pricing.fareDetailsBySegment) continue;
      
      for (const segment of pricing.fareDetailsBySegment) {
        if (segment.brandedFare && segment.brandedFareLabel) {
          this.brandedFareLabels.set(segment.brandedFare, segment.brandedFareLabel);
        }
      }
    }
  }

   /**
   * Extrae y almacena las etiquetas de tarifas de múltiples ofertas
   * @param offers Lista de ofertas de vuelo
   */
   extractBrandedFaresFromOffers(offers: FlightOffer[]): void {
    if (!offers || !offers.length) return;
    
    offers.forEach(offer => this.extractBrandedFares(offer));
  }

   /**
   * Obtiene el nombre de una tarifa a partir de su código
   * @param code Código de la tarifa brandedFare
   * @returns Nombre legible de la tarifa
   */
   getBrandedFareName(code: string): string {
    if (!code) return 'Tarifa Estándar';
    
    return this.brandedFareLabels.get(code) || `Tarifa ${code}`;
  }

  /**
   * Verifica si una oferta tiene diferentes tarifas para ida y vuelta
   * @param offer Oferta de vuelo
   * @returns true si hay diferentes tarifas en ida y vuelta
   */
  hasDifferentFaresInTrip(offer: FlightOffer): boolean {
    if (!offer.travelerPricings || !offer.itineraries || offer.itineraries.length <= 1) {
      return false;
    }
    
    const faresByItinerary = new Map<number, Set<string>>();
    
    for (const pricing of offer.travelerPricings) {
      if (!pricing.fareDetailsBySegment) continue;
      
      for (const detail of pricing.fareDetailsBySegment) {
        // Encontrar a qué itinerario pertenece este segmento
        let itineraryIndex = -1;
        
        for (let i = 0; i < offer.itineraries.length; i++) {
          if (offer.itineraries[i].segments.some(seg => seg.id === detail.segmentId)) {
            itineraryIndex = i;
            break;
          }
        }
        
        if (itineraryIndex !== -1) {
          if (!faresByItinerary.has(itineraryIndex)) {
            faresByItinerary.set(itineraryIndex, new Set<string>());
          }
          
          if (detail.brandedFare) {
            faresByItinerary.get(itineraryIndex)!.add(detail.brandedFare);
          }
        }
      }
    }
    
    // Verificar si hay diferencias entre las tarifas de ida y vuelta
    if (faresByItinerary.size >= 2) {
      const fares0 = faresByItinerary.get(0);
      const fares1 = faresByItinerary.get(1);
      
      if (fares0 && fares1) {
        // Convertir a arrays para comparar
        const array0 = Array.from(fares0);
        const array1 = Array.from(fares1);
        
        if (array0.length !== array1.length) return true;
        
        for (const fare of array0) {
          if (!array1.includes(fare)) return true;
        }
        
        for (const fare of array1) {
          if (!array0.includes(fare)) return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Obtiene las tarifas de un itinerario específico
   * @param offer Oferta de vuelo
   * @param itineraryIndex Índice del itinerario (0 para ida, 1 para vuelta)
   * @returns Array de nombres de tarifas
   */
  getItineraryFares(offer: FlightOffer, itineraryIndex: number): string[] {
    const fares: string[] = [];
    
    if (!offer.travelerPricings) return fares;
    
    for (const pricing of offer.travelerPricings) {
      if (!pricing.fareDetailsBySegment) continue;
      
      for (const detail of pricing.fareDetailsBySegment) {
        // Verificar si este detalle pertenece al itinerario solicitado
        let belongsToItinerary = false;
        
        if (offer.itineraries && offer.itineraries[itineraryIndex]) {
          belongsToItinerary = offer.itineraries[itineraryIndex].segments.some(
            seg => seg.id === detail.segmentId
          );
        }
        
        if (belongsToItinerary && detail.brandedFare) {
          const fareName = this.getBrandedFareName(detail.brandedFare);
          if (!fares.includes(fareName)) {
            fares.push(fareName);
          }
        }
      }
    }
    
    return fares;
  }

  /**
   * Obtiene todas las amenidades de una oferta
   * @param offer Oferta de vuelo
   * @returns Lista de amenidades con sus detalles
   */
  getDetailedAmenities(offer: FlightOffer): any[] {
    const amenitiesList: any[] = [];
    
    if (!offer.travelerPricings) return amenitiesList;
    
    for (const pricing of offer.travelerPricings) {
      if (pricing.amenities) {
        for (const amenity of pricing.amenities) {
          if (!amenitiesList.some(a => a.description === amenity.description)) {
            amenitiesList.push({
              description: amenity.description,
              isChargeable: amenity.isChargeable,
              type: amenity.amenityType,
              provider: amenity.amenityProvider?.name
            });
          }
        }
      }
    }
    
    return amenitiesList;
  }

  /**
   * Obtiene los beneficios de una tarifa
   * @param offer Oferta de vuelo
   * @returns Lista de beneficios en formato legible
   */
  getFareBenefits(offer: FlightOffer): string[] {
    const benefits: string[] = [];
    
    if (!offer.travelerPricings || offer.travelerPricings.length === 0) {
      return ['Tarifa básica'];
    }
    
    // Encontrar todos los tipos de cabina en la oferta
    const cabins = new Set<string>();
    const baggage = new Set<string>();
    
    for (const pricing of offer.travelerPricings) {
      if (!pricing.fareDetailsBySegment) continue;
      
      for (const segment of pricing.fareDetailsBySegment) {
        // Agregar cabina
        if (segment.cabin) {
          cabins.add(`Clase ${this.getCabinClass(segment.cabin)}`);
        }
        
        // Agregar equipaje
        if (segment.includedCheckedBags && segment.includedCheckedBags.quantity > 0) {
          baggage.add(`${segment.includedCheckedBags.quantity} maleta(s) incluida(s)`);
        } else {
          baggage.add('Sin equipaje incluido');
        }
        
        // Agregar tipo de tarifa si existe
        if (segment.brandedFare) {
          const fareLabel = this.getBrandedFareName(segment.brandedFare);
          benefits.push(`Tarifa ${fareLabel}`);
        }
      }
      
      // Agregar amenidades si existen
      if (pricing.amenities) {
        for (const amenity of pricing.amenities) {
          if (amenity.description) {
            const description = amenity.isChargeable 
              ? `${amenity.description} (con costo adicional)` 
              : amenity.description;
            benefits.push(description);
          }
        }
      }
    }
    
    // Agregar los sets a la lista de beneficios
    cabins.forEach(cabin => benefits.push(cabin));
    baggage.forEach(bag => benefits.push(bag));
    
    // Si no hay beneficios específicos, agregar uno genérico
    if (benefits.length === 0) {
      benefits.push('Tarifa básica');
    }
    
    // Eliminar duplicados
    return [...new Set(benefits)];
  }
  
   /**
   * Calcula la duración total de un itinerario
   * @param offer Oferta de vuelo
   * @param itineraryIndex Índice del itinerario (0 para ida, 1 para vuelta)
   * @returns Duración en minutos
   */
   getItineraryDurationMinutes(offer: FlightOffer, itineraryIndex: number = 0): number {
    if (!offer.itineraries || !offer.itineraries[itineraryIndex]) {
      return 0;
    }

    return this.durationToMinutes(offer.itineraries[itineraryIndex].duration);
  }

  /**
   * Formatea la duración de minutos a un formato legible hh:mm
   * @param minutes Duración en minutos
   * @returns Formato legible de duración
   */
  minutesToString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Analiza la duración en formato ISO 8601 y la convierte a minutos
   * @param duration Duración en formato PT2H30M
   * @returns Duración en minutos
   */
  durationToMinutes(duration: string): number {
    if (!duration) return 0;
    
    let totalMinutes = 0;
    // Formato PT2H30M (2 horas y 30 minutos)
    const hourMatch = duration.match(/(\d+)H/); // match captura la expresión regular ["2H", "2"] 
    const minuteMatch = duration.match(/(\d+)M/);
    
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    }
    
    return totalMinutes;
  }

  /**
   * Formatea una fecha en formato corto (día, mes)
   * @param dateString Fecha en formato ISO "2025-05-05T00:00:00Z"
   * @returns Fecha formateada "lun., 05 may."
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }

  /**
   * Formatea la hora de una fecha
   * @param dateString Fecha en formato ISO
   * @returns Hora formateada (HH:MM)
   */
  formatTime(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtiene la fecha de llegada del último segmento de un itinerario
   * @param itinerary Itinerario del vuelo
   * @returns Fecha de llegada
   */
  getArrivalDate(itinerary: Itinerary): Date {
    if (!itinerary || !itinerary.segments || itinerary.segments.length === 0) {
      return new Date();
    }
    
    const segments = itinerary.segments;
    const lastSegment = segments[segments.length - 1];
    return new Date(lastSegment.arrival.at);
  }

  /**
   * Obtiene un texto que describe el número de escalas
   * @param segments Segmentos del vuelo
   * @returns Texto descriptivo de escalas
   */
  getStopsLabel(segments: Segment[]): string {
    if (!segments || segments.length === 0) {
      return 'Sin información';
    }
    
    if (segments.length === 1) {
      return 'Directo';
    } else {
      return `${segments.length - 1} ${segments.length - 1 === 1 ? 'escala' : 'escalas'}`;
    }
  }

  /**
   * Calcula la duración de una escala entre dos segmentos
   * @param currentSegment Segmento actual
   * @param nextSegment Siguiente segmento
   * @returns Duración en minutos
   */
  getLayoverDuration(currentSegment: Segment, nextSegment: Segment): number {
    if (!currentSegment || !nextSegment) {
      return 0;
    }
    
    const arrivalTime = new Date(currentSegment.arrival.at).getTime();
    const departureTime = new Date(nextSegment.departure.at).getTime();
    return Math.floor((departureTime - arrivalTime) / 60000); // Convertir a minutos
  }

  /**
   * Calcula el precio por pasajero
   * @param offer Oferta de vuelo
   * @returns Precio por pasajero
   */
  getPricePerPerson(offer: FlightOffer): number {
    if (!offer || !offer.price || !offer.price.total) {
      return 0;
    }
    
    return parseFloat(offer.price.total);
  }
  
  /**
   * Obtiene el nombre de una aerolínea a partir de su código IATA
   * @param code Código IATA de la aerolínea
   * @returns Nombre de la aerolínea
   */
  getAirlineName(code: string): string {
    const airlines: Record<string, string> = {
    // 🇺🇸 Norteamérica
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'B6': 'JetBlue Airways',
    'AS': 'Alaska Airlines',
    'WN': 'Southwest Airlines',
    'F9': 'Frontier Airlines',
    'NK': 'Spirit Airlines',
    'G4': 'Allegiant Air',
    'SY': 'Sun Country Airlines',
    'AC': 'Air Canada',
    'WS': 'WestJet',

    // 🇲🇽 México
    'AM': 'Aeroméxico',
    'VB': 'VivaAerobus',
    'Y4': 'Volaris',

    // 🇧🇷 Brasil
    'G3': 'Gol Linhas Aéreas',
    'AD': 'Azul Brazilian Airlines',
    'JJ': 'LATAM Airlines Brasil',

    // 🇦🇷 Argentina
    'AR': 'Aerolíneas Argentinas',
    'FO': 'Flybondi',
    'JY': 'JetSmart Argentina',

    // 🇨🇱 Chile / Perú / Colombia
    'LA': 'LATAM Airlines',
    'LP': 'LATAM Perú',
    '4C': 'Avianca Colombia',
    'AV': 'Avianca',
    'H2': 'Sky Airline',
    'JA': 'JetSmart Chile',
    'P5': 'Wingo',
    'VE': 'EasyFly',

    // 🇪🇺 Europa (grandes)
    'LH': 'Lufthansa',
    'BA': 'British Airways',
    'AF': 'Air France',
    'KL': 'KLM',
    'IB': 'Iberia',
    'UX': 'Air Europa',
    'AZ': 'ITA Airways',
    'SK': 'Scandinavian Airlines (SAS)',
    'LX': 'Swiss International Air Lines',
    'OS': 'Austrian Airlines',
    'SN': 'Brussels Airlines',
    'TP': 'TAP Air Portugal',

    // 🇵🇱 Polonia (TU PEDIDO)
    'LO': 'LOT Polish Airlines',

    // Low-cost Europa
    'FR': 'Ryanair',
    'U2': 'easyJet',
    'VY': 'Vueling',
    'W6': 'Wizz Air',
    'DY': 'Norwegian Air Shuttle',
    'EI': 'Aer Lingus',
    'HV': 'Transavia',
    'X3': 'TUI fly',
    'U6': 'Ural Airlines',

    // 🇬🇧 Reino Unido & Irlanda
    'VS': 'Virgin Atlantic',
    'BY': 'TUI Airways',

    // Medio Oriente
    'QR': 'Qatar Airways',
    'EK': 'Emirates',
    'EY': 'Etihad Airways',
    'WY': 'Oman Air',
    'GF': 'Gulf Air',
    'SV': 'Saudia',
    'RJ': 'Royal Jordanian',
    'KU': 'Kuwait Airways',
    'ME': 'Middle East Airlines',
    'FZ': 'Flydubai',

    // Asia
    'SQ': 'Singapore Airlines',
    'CX': 'Cathay Pacific',
    'JL': 'Japan Airlines',
    'NH': 'All Nippon Airways (ANA)',
    'KE': 'Korean Air',
    'OZ': 'Asiana Airlines',
    'BR': 'EVA Air',
    'CI': 'China Airlines',
    'CA': 'Air China',
    'MU': 'China Eastern',
    'CZ': 'China Southern',
    'AI': 'Air India',
    'TG': 'Thai Airways',
    'MH': 'Malaysia Airlines',
    'VN': 'Vietnam Airlines',

    // Low-cost Asia
    'AK': 'AirAsia',
    'FD': 'Thai AirAsia',
    'TR': 'Scoot',
    '5J': 'Cebu Pacific',
    '7C': 'Jeju Air',
    'MM': 'Peach Aviation',

    //  África
    'ET': 'Ethiopian Airlines',
    'KQ': 'Kenya Airways',
    'MS': 'EgyptAir',
    'PW': 'Precision Air',
    'SA': 'South African Airways',
    'AT': 'Royal Air Maroc',

    //  Oceanía
    'QF': 'Qantas',
    'NZ': 'Air New Zealand',
    'VA': 'Virgin Australia',
    'JQ': 'Jetstar Airways',

    // Aerolíneas especiales (Comunes en Amadeus)
    'GP': 'APG Airlines',
    'HR': 'Hahn Air Lines',  
    'X5': 'Afrique Airlines',
    '3O': 'Air Arabia Maroc',
    '2Z': 'Passaredo Airlines',

    // Charter / Regional / Misc
    'PS': 'Ukraine International Airlines',
    'BT': 'Air Baltic',
    'RO': 'TAROM',
    'HY': 'Uzbekistan Airways',
    'KC': 'Air Astana',
    'PK': 'Pakistan International Airlines',
    'IR': 'Iran Air'
};

    
    let name = this.carriers[code];

    if (!name && airlines[code]) {
      name = airlines[code];
    }

    if (!name) {
      return code;
    }

    return name
      .toLowerCase() // primero lo pasamos todo a minúsculas
      .split(' ')     // separamos por espacio
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // capitalizamos cada palabra
      .join(' ');     // volvemos a unirlo
  }
  
  /**
   * Obtiene el nombre del modelo de avión a partir de su código
   * @param code Código del avión
   * @returns Nombre del modelo de avión
   */
  getAircraftName(code: string): string {
    return this.aircraft[code];
  }
  
  /**
   * Obtiene el nombre de la clase de cabina.
   * @param classCode Código de clase
   * @returns Nombre legible de la clase
   */
  getCabinClass(classCode: string): string {
    const cabinClasses: Record<string, string> = {
      'ECONOMY': 'Turista',
      'PREMIUM_ECONOMY': 'Premium Economy',
      'BUSINESS': 'Business',
      'FIRST': 'Primera'
    };
    
    return cabinClasses[classCode] || classCode;
  }
}
