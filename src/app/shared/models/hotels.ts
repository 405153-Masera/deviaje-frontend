export interface HotelSearchRequest {
  stay: {
    checkIn: Date;
    checkOut: Date;
  };
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age: number;
    }>;
  }>;
  destination: {
    code: string;
    zoneCode?: string;
  };
  filter?: {
    minCategory?: number;
    maxCategory?: number;
    minRate?: number;
    maxRate?: number;
  };
  currency?: string;
  language?: string;
}

export interface HotelSearchResponse {
  hotels: {
    hotels: HotelSearchResponse.Hotel[];
  };
}

export namespace HotelSearchResponse {
  export interface Hotel {
    code: string;
    name: string;
    categoryCode: string;
    categoryName: string;
    destinationCode: string;
    latitude: number;
    longitude: number;
    rooms: Room[];
    minRate: number;
    currency: string;
  }

  export interface Room {
    code: string;
    name: string;
    rates: Rate[];
  }

  export interface Rate {
    rateKey: string;
    rateClass: string;
    rateType: string;
    net: number;
    discount?: number;
    // Nuevas propiedades agregadas
    adults?: number;
    children?: number;
    childrenAges?: string; // Edades separadas por comas "10,8"
    rooms?: number;
    allotment?: number;
    rateCommentsId?: string;
    paymentType?: string;
    packaging?: boolean;
    offers?: Offer[];
    // Propiedades existentes
    cancellationPolicies?: CancellationPolicy[];
    boardCode?: string;
    boardName?: string;
    taxes?: Tax[];
  }

  export interface Offer {
    code: string;
    name: string;
    amount: string | number; // Puede venir como string negativo "-63.95"
  }

  export interface CancellationPolicy {
    amount: string;
    from: string; // ISO date string
  }

  export interface Tax {
    included: boolean;
    amount: number;
    currency: string;
  }
}

// Resto de interfaces existentes se mantienen igual...
export interface HotelResponseDto {
  code: string;
  name: string;
  description: string;
  country?: {
    code: string;
    name: string;
  };
  state?: string;
  destination?: string;
  zone?: string;
  categoryCode?: string;
  categoryGroupCode?: string;
  chainCode?: string;
  accommodationTypeCode?: string;
  address?: string;
  street?: string;
  number?: string;
  city?: string;
  email?: string;
  images: {
    imageTypeCode: string;
    path: string;
    roomCode?: string;
    roomType?: string;
    order?: number;
    visualOrder?: string;
  }[];
}
