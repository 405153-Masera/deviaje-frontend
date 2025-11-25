import { TravelerDto } from "../../features/client/models/bookings";
import { Itinerary } from "./flights";

// Modelo para los detalles completos de una reserva
export interface BookingDetails {
  id: number;
  bookingReference: string;
  externalReference?: string;
  clientId: number;
  agentId: number;
  status: string;
  type: string;
  totalAmount: number;
  commission: number;
  discount: number;
  taxes: number;
  currency: string;
  holderName: string;
  countryCallingCode: string;
  phone: string;
  email: string;
  createdDatetime: string;
  flightDetails?: FlightBookingDetails;
  hotelDetails?: HotelBookingDetails;
  payments?: PaymentInfo[];
}

export interface FlightBookingDetails {
  externalId: string;
  origin: string;
  destination: string;
  carrier: string;
  departureDate: string;
  arrivalDate: string;
  adults: number;
  children: number;
  infants: number;
  totalPrice: number;
  currency: string;
  itineraries?: Itinerary[];  
  travelers?: TravelerDto[];
}

export interface HotelBookingDetails {
  externalId: string;
  hotelName: string;
  destinationName: string;
  countryName: string;
  roomName: string;
  boardName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  numberOfRooms: number;
  adults: number;
  children: number;
  totalPrice: number;
  taxes: number;
  currency: string;
  hotelBooking?: HotelBookingApi;
}

// Interface para la respuesta completa de HotelBeds API
export interface HotelBookingApi {
  reference: string;
  clientReference: string;
  creationDate: string;
  status: string;
  modificationPolicies?: {
    cancellation: boolean;
    modification: boolean;
  };
  creationUser?: string;
  holder: {
    name: string;
    surname: string;
  };
  hotel: {
    checkOut: string;
    checkIn: string;
    code: number;
    name: string;
    categoryCode: string;
    categoryName: string;
    destinationCode: string;
    destinationName: string;
    zoneCode: number;
    zoneName: string;
    latitude: string;
    longitude: string;
    rooms: HotelBookingRoom[];
    totalNet: number;
    currency: string;
    supplier?: {
      name: string;
      vatNumber: string;
    };
  };
  remark?: string;
  invoiceCompany?: {
    code: string;
    company: string;
    registrationNumber: string;
  };
  totalNet: number;
  pendingAmount: number;
  currency: string;
}

export interface HotelBookingRoom {
  status: string;
  id: number;
  code: string;
  name: string;
  paxes: HotelBookingPax[];
  rates: HotelBookingRate[];
}

export interface HotelBookingPax {
  roomId: number;
  type: string; // "AD", "CH", "IN"
  name: string;
  surname: string;
}

export interface HotelBookingRate {
  rateClass: string;
  net: number;
  rateComments?: string;
  paymentType: string;
  packaging: boolean;
  boardCode: string;
  boardName: string;
  cancellationPolicies?: HotelCancellationPolicy[];
  rateBreakDown?: {
    rateDiscounts: Array<{
      code: string;
      name: string;
      amount: number;
    }>;
  };
  rooms: number;
  adults: number;
  children: number;
}

export interface HotelCancellationPolicy {
  amount: number;
  from: string; // ISO date string
}

export interface PaymentInfo {
  id: number;
  paymentType: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  externalId: number;
  createdDatetime: string;
}