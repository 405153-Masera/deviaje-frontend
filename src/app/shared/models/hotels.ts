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
    taxes?: Taxes;
    rooms?: number;
    adults?: number;
    children?: number;
    childrenAges?: string;
    promotions?: Promotion[];
    offers?: Offer[];
  }

  export interface Promotion {
    code: string;
    name: string;
    remark?: string;
  }

  export interface Offer {
    code: string;
    name: string;
    amount: string | number; // Puede venir como string negativo "-63.95"
  }

  export interface Taxes {
    taxes: TaxDetail[];
    allIncluded: boolean;
  }

  export interface TaxDetail {
    included: boolean;
    amount: number;
    currency: string;
    type: string;
    clientAmount?: number;
    clientCurrency?: string;
    subType?: string; // Ej: "City Tax"
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

export interface HotelResponseDto {
  code: string;
  name: string;
  description: string;
  country?: {
    code: string;
    name: string;
    isoCode?: string;
  };
  stateCode?: string;
  destination?: string;
  zoneCode?: number;
  zone?: string; //GUARDA ACA TUVE QUE PONERLO POR UN ERROR EN DEVIAJE HOTEL SUMMARY
  category?: string;
  chain?: string;
  accommodationType?: string;
  address?: string;
  street?: string;
  number?: string;
  city?: string;
  email?: string;
  web?: string;
  phones?: Array<{
    phoneNumber: string;
    phoneType: string;
  }>;
  facilities?: HotelFacility[];
  rooms?: HotelRoom[];
  images: {
    imageTypeCode: string;
    path: string;
    roomCode?: string;
    roomType?: string;
    order?: number;
    visualOrder?: string;
  }[];
  interestPoints?: Array<{
    facilityCode?: number;
    facilityGroupCode?: number;
    order?: number;
    poiName?: string;
    distance?: string;
  }>;
  segments?: Array<{
    code: number;
    content?: string;
  }>;
  terminals?: Array<{
    terminalCode: string;
    distance?: number;
    description?: {
      content: string;
    };
  }>;
  wildcards?: Array<{
    roomCode?: string;
    roomType?: string;
    characteristicCode?: string;
    hotelRoomDescription?: {
      content: string;
    };
  }>;
  issues?: Array<{
    issueCode?: string;
    issueType?: string;
    dateFrom?: string;
    dateTo?: string;
    order?: number;
    alternative?: boolean;
    description?: {
      content: string;
    };
  }>;
  ranking?: number;
  s2c?: string;
}

export interface HotelFacility {
  facilityCode: number;
  facilityGroupCode: number;
  facilityName?: string;
  facilityGroupName?: string;
  order?: number;
  distance?: number;
  indLogic?: boolean;
  number?: number;
  indFee?: boolean;
  indYesOrNo?: boolean;
  voucher?: boolean;
  ageFrom?: number;
  ageTo?: number;
  amount?: number;
  applicationType?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
  description?: {
    content: string;
  };
}

export interface HotelRoom {
  roomCode: string;
  isParentRoom?: boolean;
  minPax?: number;
  maxPax?: number;
  maxAdults?: number;
  maxChildren?: number;
  minAdults?: number;
  roomType?: string;
  characteristicCode?: string;
  description?: string;
  roomFacilities?: HotelFacility[];
}
