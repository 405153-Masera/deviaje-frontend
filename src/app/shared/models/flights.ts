export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass?: string;
  currency?: string;
  nonStop?: boolean;
}

export interface FlightSearchResponse {
  meta: any;
  data: FlightOffer[];
  dictionaries: FlightDictionaries;
}

export interface FlightVerifyResponse {
  data: {
    flightOffers: FlightOffer[]
  }
  included?: FlightIncluded;
}

  

export interface FlightIncluded {
  ['detailed-fare-rules']?: DetailedFareRules;
}

export interface DetailedFareRules {
  [segmentId: string]: DetailedFareRule;
}

export interface DetailedFareRule {
  fareBasis: string;
  name: string;
  fareNotes: {
    descriptions: FareRuleDescription[];
  };
  segmentId: string;
}

export interface FareRuleDescription {
  descriptionType: string;
  text: string;
}

export interface FlightDictionaries {
  carriers?: { [code: string]: string }; // Aerolíneas (ej. 'IB': 'Iberia')
  aircraft?: { [code: string]: string }; // Aviones (ej. '320': 'Airbus A320')
  currencies?: { [code: string]: string }; // Monedas
  locations?: { [code: string]: Location }; // Aeropuertos/Ciudades
}

export interface FlightOffer {
  type: string; //"flight-offer"
  id: string;
  source: string; //Indica la fuente de la oferta (Global Distribution System). "GDS"
  instantTicketingRequired: boolean; //Indica si se requiere emisión inmediata del boleto.
  nonHomogeneous: boolean; //Indica si la oferta combina tarifas de diferentes tipos.
  oneWay: boolean; //Indica si es un vuelo de ida
  lastTicketingDate: string; //Fecha límite para emitir el boleto. SE PODRIA MOSTRAR
  numberOfBookableSeats: number; //Número de asientos disponibles. SE PODRIA MOSTRAR
  itineraries: Itinerary[];
  price: Price;
  pricingOptions: PricingOptions;
  validatingAirlineCodes: string[]; //Códigos de aerolíneas validadoras (que emiten el boleto).
  travelerPricings: TravelerPricing[];
}

export interface Itinerary {
  duration: string; //Duracion total
  segments: Segment[]; //Lista de vuelos individuales
}

export interface Segment {
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  carrierCode: string; //aerolinea
  number: string; //nuemro de vuelo
  aircraft: {
    code: string; //tipo de avion
  };
  operating: {
    carrierCode: string; //aerolinea operadora
  };
  duration: string; //duracion del segmento
  id: string; //indetificador del segmento
  numberOfStops: number; //escalas
  blacklistedInEU: boolean; //Indica si la aerolínea está en lista negra de la UE.
}

export interface FlightEndpoint {
  iataCode: string; //Aeropuerto
  terminal?: string;
  at: string; // ISO date string. Horario
}

export interface Price {
  currency: string;
  total: string; //precio total para todos los pasjeros
  base: string; //base sin impuestos
  fees: {
    //tarifas adicionales
    amount: string;
    type: string;
  }[];
  grandTotal: string; //total final
  additionalServices?: {
    amount: string;
    type: string;
  }[];
}

export interface PricingOptions {
  fareType: string[]; //Tipo de tarifa (publicada, negociada, etc.)
  includedCheckedBagsOnly: boolean; // Indica si la oferta incluye solo tarifas con equipaje facturado.
}

export interface TravelerPricing {
  travelerId: string;
  fareOption: string; //Tipo de tarifa (estándar, etc.).
  travelerType: string; //Tipo de pasajero (ADULT, CHILD, HELD_INFANT).
  price: {
    currency: string;
    total: string;
    base: string;
  };
  fareDetailsBySegment: {
    segmentId: string;
    cabin: string; //travel class
    fareBasis: string; //Códigos de tarifa.
    brandedFare: string; //Códigos de tarifa.
    brandedFareLabel: string;
    class: string;
    includedCheckedBags: {
      //Equipaje facturado incluido.
      quantity: number;
    };
    includedCabinBags: {
      //Equipaje de mano incluido.
      weight?: number;
      weightUnit?: string;
      quantity?: number;
    };
    amenities?: Amenity[];
  }[];
  amenities?: Amenity[];
}

export interface Amenity {
  description: string;
  isChargeable: boolean;
  amenityType: string;
  amenityProvider: {
    name: string;
  };
}
