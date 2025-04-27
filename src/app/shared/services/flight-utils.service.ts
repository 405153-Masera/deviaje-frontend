import { Injectable } from '@angular/core';
import { FlightOffer, Itinerary, Segment } from '../models/flights';

@Injectable({
  providedIn: 'root'
})
export class FlightUtilsService {

   /**
   * Calcula la duración total de un vuelo en minutos
   * @param offer Oferta de vuelo
   * @param itineraryIndex Índice del itinerario (0 para ida, 1 para vuelta)
   * @returns Duración en minutos
   */
   getTotalDurationMinutes(offer: FlightOffer, itineraryIndex: number = 0): number {
    if (!offer.itineraries || !offer.itineraries[itineraryIndex]) {
      return 0;
    }
    
    return this.parseDuration(offer.itineraries[itineraryIndex].duration);
  }

  /**
   * Formatea la duración en formato legible (Xh Ym)
   * @param minutes Duración en minutos
   * @returns Formato legible de duración
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Analiza la duración en formato ISO 8601 y la convierte a minutos
   * @param duration Duración en formato PT2H30M
   * @returns Duración en minutos
   */
  parseDuration(duration: string): number {
    if (!duration) return 0;
    
    let totalMinutes = 0;
    // Formato PT2H30M (2 horas y 30 minutos)
    const hourMatch = duration.match(/(\d+)H/);
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
   * @param dateString Fecha en formato ISO
   * @returns Fecha formateada
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
   * Obtiene la hora de llegada del último segmento de un itinerario
   * @param itinerary Itinerario del vuelo
   * @returns Fecha de llegada
   */
  getArrivalTime(itinerary: Itinerary): Date {
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
      'AA': 'American Airlines',
      'DL': 'Delta Air Lines',
      'UA': 'United Airlines',
      'LH': 'Lufthansa',
      'BA': 'British Airways',
      'AF': 'Air France',
      'IB': 'Iberia',
      'AV': 'Avianca',
      'LA': 'LATAM Airlines',
      'AR': 'Aerolíneas Argentinas',
      // Añadir más aerolíneas según sea necesario
    };
    
    return airlines[code] || code;
  }
  
  /**
   * Obtiene el nombre de la clase de cabina
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
