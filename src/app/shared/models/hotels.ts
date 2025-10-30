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
    checkIn: string; 
    checkOut: string;
    total: number;
  };
}

export namespace HotelSearchResponse {
  export interface Hotel {
    code: string;
    name: string;
    categoryCode: string;
    categoryName: string;
    destinationCode: string;
    destinationName: string;
    zoneCode: number;
    zoneName: string;
    latitude: number;
    longitude: number;
    rooms: Room[];
    minRate: number;
    maxRate: number;
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
    allotment?: number;
    rateCommentsId?: string;
    paymentType?: string;
    packaging?: boolean;
    boardCode?: string;
    boardName?: string;
    cancellationPolicies?: CancellationPolicy[];
    rooms?: number;
    adults?: number;
    children?: number;
    childrenAges?: string;
    offers?: Offer[];
  }

  export interface Promotion {
    code: string;
    name: string;
    remark: string;
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
