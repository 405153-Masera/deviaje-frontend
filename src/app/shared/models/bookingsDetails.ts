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
  itinerariesJson?: any; // JSON del itinerario completo
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
  hotelBookingJson?: any; // JSON con detalles adicionales (rateComment, etc.)
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