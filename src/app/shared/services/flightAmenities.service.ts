import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FlightAmenitiesService {
  private translations: { [key: string]: string } = {
    // BAGGAGE
    'BAGGAGE UP TO 50 LB 23 KG': 'Equipaje de hasta 23 KG',
    'BAGGAGE UP TO 44 LB 20 KG': 'Equipaje de hasta 20 KG',
    'BAGGAGE UP TO 33 LB 15 KG': 'Equipaje de hasta 15 KG',
    'BAGGAGE DELIVERY AIRPORT': 'Entrega de equipaje en el aeropuerto',
    'CARRY ON UP TO 22LB 10KG': 'Equipaje de mano de hasta 10 KG',
    'CARRY ON UP TO 18LB 8KG': 'Equipaje de mano de hasta 8 KG',
    'CARRY ON UP TO 15LB 7KG': 'Equipaje de mano de hasta 7 KG',
    'CARRY ON HAND BAGGAGE': 'Equipaje de mano',
    'CHECKED BAG': 'Equipaje facturado',
    'CABIN BAG': 'Equipaje de mano',
    'NO BAGGAGE': 'Sin equipaje incluido',
    'ADDITIONAL BAGGAGE': 'Equipaje adicional',
    'FIRST CHECKED BAGGAGE': 'Primera maleta facturada',
    'SECOND CHECKED BAGGAGE': 'Segunda maleta facturada',
    'THIRD CHECKED BAGGAGE': 'Tercera maleta facturada',
    'FOURTH CHECKED BAGGAGE': 'Cuarta maleta facturada',
    'FIFTH CHECKED BAGGAGE': 'Quinta maleta facturada',
    'SECOND BAG UP TO 23KG': 'Segunda maleta de hasta 23 KG',
    'THIRD BAG 23KG': 'Tercera maleta de 23 KG',
    'FIRST EXCESS BAG': 'Primera maleta adicional',
    'SECOND EXCESS BAG': 'Segunda maleta adicional',

    // 🔥 NUEVOS BAGGAGE
    'FIRST BAG': 'Primera maleta',
    '1ST BAG UPTO50LB23KG 62LI158CM': 'Primera maleta hasta 23 KG y 158 cm lineales',
    '1 CHECKED BAG UP TO 23KG': '1 equipaje facturado de hasta 23 KG',
    'CHECKED BAG FIRST': 'Primera maleta facturada',
    'SECOND BAG': 'Segunda maleta',
    'FIRST PREPAID BAG': 'Primera maleta prepagada',
    'PREPAID BAG': 'Maleta prepagada',
    'UP TO 50LB 23KG 62LI 158LCM': 'Hasta 23 KG y 158 cm lineales',
    'PREPAID TO 23KG OR EXC DIM': 'Equipaje prepagado hasta 23 KG o dimensiones excedidas',

    // MEALS
    SNACK: 'Refrigerio',
    MEAL: 'Comida',
    BREAKFAST: 'Desayuno',
    LUNCH: 'Almuerzo',
    DINNER: 'Cena',
    REFRESHMENTS: 'Bebidas y refrigerios',
    'HOT MEAL': 'Comida caliente',
    'COLD MEAL': 'Comida fría',

    // 🔥 NUEVAS COMIDAS
    'FOOD AND BEVERAGE': 'Comida y bebida',
    'CATERING ON EUROPE FLTS': 'Catering en vuelos europeos',
    'CATERING ON INTERCONT FLTS': 'Catering en vuelos intercontinentales',
    'COMPLIMENTARY FOOD AND BEV': 'Comida y bebida de cortesía',

    // SEATS
    'BASIC SEAT': 'Asiento básico',
    'COMFORT SEAT': 'Asiento confort',
    'SEAT SELECTION': 'Selección de asiento',
    'PREFERRED SEAT': 'Asiento preferente',
    'PREMIUM SEAT SELECTION': 'Selección de asiento premium',
    'PREMIUM SEAT RESERVATION': 'Reserva de asiento premium',
    'EXTRA LEGROOM': 'Espacio extra para piernas',

    // 🔥 NUEVOS SEATS
    'PRE RESERVED SEAT ASSIGNMENT': 'Asignación de asiento pre-reservado',
    'ADVANCE SEAT RESERVATION': 'Reserva anticipada de asiento',
    'STANDARD SEAT RESERVATION': 'Reserva de asiento estándar',

    // BRANDED FARES
    'CHANGEABLE TICKET': 'Ticket modificable',
    'REFUNDABLE TICKET': 'Ticket reembolsable',
    'NON REFUNDABLE': 'No reembolsable',
    'MILEAGE ACCRUAL': 'Acumulación de millas',
    'PRIORITY BOARDING': 'Embarque prioritario',
    'PRIORITY CHECK IN': 'Check-in prioritario',
    'FAST TRACK SECURITY': 'Seguridad rápida',
    'BOOKING CHANGES': 'Cambios de reserva',
    '100 PERCENT MILES EARN': '100% acumulación de millas',
    'CHANGE BEFORE DEPARTURE': 'Cambio antes de la salida',
    'CHANGE AFTER DEPARTURE': 'Cambio después de la salida',
    'REFUND BEFORE DEPARTURE': 'Reembolso antes de la salida',

    // 🔥 NUEVOS BRANDED FARES
    'PRIORITY SECURITY': 'Seguridad prioritaria',
    'TICKET MODIFICABLE': 'Ticket modificable',
    'UPGRADE ELIGIBILITY': 'Elegible para upgrade',

    // LOUNGE
    'LOUNGE ACCESS': 'Acceso a sala VIP',
    'LOUNGE ACCESS SALON CONDOR EZE': 'Acceso a Salón Cóndor en EZE',
    'LOUNGE ACCESS BUSINESS': 'Acceso a sala Business',

    // ENTERTAINMENT
    'IN FLIGHT ENTERTAINMENT': 'Entretenimiento a bordo',
    WIFI: 'WiFi',
    'USB POWER': 'Puerto USB',

    // UPGRADES
    'UPGRADE FLYUP': 'Mejora FlyUp',
};


  /**
   * Traduce una amenidad al español
   */
  translateAmenity(description: string): string {
    const upperDesc = description?.trim().toUpperCase() || '';

    // Buscar traducción exacta
    if (this.translations[upperDesc]) {
      return this.translations[upperDesc];
    }

    // Buscar traducción parcial
    for (const [key, value] of Object.entries(this.translations)) {
      if (upperDesc.includes(key)) {
        return value;
      }
    }

    // Si no encuentra, formatear
    return this.formatText(description);
  }

  /**
   * Obtiene el icono para un tipo de amenidad
   */
  getAmenityIcon(amenityType: string): string {
    const icons: { [key: string]: string } = {
      BAGGAGE: 'bi-luggage',
      MEAL: 'bi-cup-hot',
      BRANDED_FARES: 'bi-star',
      LOUNGE: 'bi-door-open',
      ENTERTAINMENT: 'bi-tv',
      PRE_RESERVED_SEAT: 'bi-person-check',
    };

    return icons[amenityType] || 'bi-info-circle';
  }

  /**
   * Obtiene la clase CSS para una amenidad según si es pago o incluida
   */
  getAmenityClass(isChargeable: boolean): string {
    return isChargeable ? 'amenity-paid' : 'amenity-included';
  }

  /**
   * Obtiene el texto del badge (Incluido/Pago)
   */
  getAmenityBadgeText(isChargeable: boolean): string {
    return isChargeable ? 'Pago' : 'Incluido';
  }

  private formatText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
