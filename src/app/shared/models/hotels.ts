export interface HotelSearchRequest {
  cityCode: string;
  radius?: number;
  radiusUnit?: string;
  ratings?: string[];
  amenities?: string[];
  chainCodes?: string[];
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
  data: HotelOffer[];
  meta: any;
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

// Modelo simplificado para la respuesta de hotel al cliente
export interface HotelResult {
  id: string;
  name: string;
  location: string;
  stars: number;
  rating: number;
  reviewCount: number;
  price: number;
  oldPrice?: number;
  mainImage?: string;
  amenities: string[];
  distanceFromCenter: number;
  isPromoted: boolean;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  rooms: RoomOffer[];
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
