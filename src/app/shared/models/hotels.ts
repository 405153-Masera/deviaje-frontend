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

export interface HotelOffersRequest {
  hotelIds: string[];
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  roomQuantity?: number;
  currency?: string;
  priceRange?: string;
  boardType?: string[];
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
    cancellationPolicies?: CancellationPolicy[];
    boardCode?: string;
    boardName?: string;
    taxes?: Tax[];
  }

  export interface CancellationPolicy {
    amount: string;
    from: string;
  }

  export interface Tax {
    included: boolean;
    amount: number;
    currency: string;
  }
}

export interface HotelOffer {
  type: string;
  hotel: Hotel;
  available: boolean;
  offers: Offer[];
  self: string;
}

export interface Hotel {
  type: string;
  hotelId: string;
  chainCode: string;
  dupeId: string;
  name: string;
  rating: string;
  cityCode: string;
  latitude: number;
  longitude: number;
  address: HotelAddress;
  contact: HotelContact;
  description: HotelDescription;
  amenities: string[];
  media: HotelMedia[];
}

export interface HotelAddress {
  lines: string[];
  postalCode: string;
  cityName: string;
  countryCode: string;
  stateCode?: string;
}

export interface HotelContact {
  phone: string;
  fax: string;
  email: string;
}

export interface HotelDescription {
  text: string;
  lang: string;
}

export interface HotelMedia {
  uri: string;
  category: string;
}

export interface Offer {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  rateCode: string;
  rateFamilyEstimated: RateFamily;
  room: Room;
  guests: Guests;
  price: Price;
  policies: Policies;
  self: string;
}

export interface RateFamily {
  code: string;
  type: string;
}

export interface Room {
  name?: string;
  type: string;
  typeEstimated: RoomTypeEstimated;
  description: RoomDescription;
}

export interface RoomTypeEstimated {
  category: string;
  beds: number;
  bedType: string;
}

export interface RoomDescription {
  text: string;
  lang: string;
}

export interface Guests {
  adults: number;
  childAges: number[];
}

export interface Price {
  currency: string;
  base: string;
  total: string;
  taxes: Tax[];
  variations: PriceVariation;
}

export interface Tax {
  code: string;
  amount: string;
  currency: string;
  included: boolean;
}

export interface PriceVariation {
  average: PriceDetail;
  changes: PriceChange[];
}

export interface PriceDetail {
  base: string;
  total: string;
}

export interface PriceChange {
  startDate: string;
  endDate: string;
  base: string;
  total: string;
}

export interface Policies {
  guarantee: GuaranteePolicy;
  paymentType: string;
  cancellation: CancellationPolicy;
  refundable: Refundable;
}

export interface Refundable {
  cancellationRefund: string;
}

export interface GuaranteePolicy {
  acceptedPayments: AcceptedPayment;
}

export interface AcceptedPayment {
  creditCards: string[];
  methods: string[];
}

export interface CancellationPolicy {
  type: string;
  amount: string;
  deadline: string;
}

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

export interface RoomOffer {
  id: string;
  roomType: string;
  description: string;
  bedType: string;
  price: number;
  currency: string;
  cancellationPolicy: string;
  boardType: string;
  maxOccupancy: number;
}