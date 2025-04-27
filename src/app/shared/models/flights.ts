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
    data: FlightOffer[];
    meta: any;
  }
  
  export interface FlightOffer {
    type: string;
    id: string;
    source: string;
    instantTicketingRequired: boolean;
    nonHomogeneous: boolean;
    oneWay: boolean;
    lastTicketingDate: string;
    numberOfBookableSeats: number;
    itineraries: Itinerary[];
    price: Price;
    pricingOptions: PricingOptions;
    validatingAirlineCodes: string[];
    travelerPricings: TravelerPricing[];
  }
  
  export interface Itinerary {
    duration: string;
    segments: Segment[];
  }
  
  export interface Segment {
    departure: FlightEndpoint;
    arrival: FlightEndpoint;
    carrierCode: string;
    number: string;
    aircraft: {
      code: string;
    };
    operating: {
      carrierCode: string;
    };
    duration: string;
    id: string;
    numberOfStops: number;
    blacklistedInEU: boolean;
  }
  
  export interface FlightEndpoint {
    iataCode: string;
    terminal?: string;
    at: string; // ISO date string
  }
  
  export interface Price {
    currency: string;
    total: string;
    base: string;
    fees: {
      amount: string;
      type: string;
    }[];
    grandTotal: string;
  }
  
  export interface PricingOptions {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  }
  
  export interface TravelerPricing {
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
    fareDetailsBySegment: {
      segmentId: string;
      cabin: string;
      fareBasis: string;
      class: string;
      includedCheckedBags: {
        quantity: number;
      };
    }[];
  }