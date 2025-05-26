import { FlightOffer } from "../../../shared/models/flights";

// DTOs para reserva de vuelos
export interface FlightBookingDto {
  clientId: number;
  agentId?: number;
  branchId?: number;
  flightOffer: FlightOfferDto;
  travelers: TravelerDto[];
  ticketingAgreement: TicketingAgreementDto;
}

export interface FlightOfferDto extends FlightOffer {
  // Extiende el modelo existente para mantener compatibilidad
}

export interface TicketingAgreementDto {
  option: string;
  delay: string;
}

export interface TravelerDto {
  id: string;
  dateOfBirth: string;
  name: {
    firstName: string;
    lastName: string;
  };
  gender: string;
  contact?: {
    emailAddress: string;
    phones: PhoneDto[];
  };
  documents?: DocumentDto[];
}

export interface PhoneDto {
  deviceType: string;
  countryCallingCode: string;
  number: string;
}

export interface DocumentDto {
  documentType: string;
  number: string;
  expiryDate: string;
  issuanceCountry: string;
  nationality: string;
  holder: boolean;
}

// DTOs para pago
export interface PaymentDto {
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentToken: string;
  installments: number;
  description?: string;
  payer?: PayerDto;
}

export interface PayerDto {
  email: string;
  firstName: string;
  lastName: string;
  identification?: string;
  identificationType?: string;
}

// DTOs para reserva de hoteles
export interface HotelBookingDto {
  clientId: number;
  agentId?: number;
  branchId?: number;
  holder: HolderDto;
  rooms: RoomBookingDto[];
  clientReference?: string;
  remark?: string;
  tolerance?: number;
}

export interface HolderDto {
  name: string;
  surname: string;
}

export interface RoomBookingDto {
  rateKey: string;
  paxes: PaxDto[];
}

export interface PaxDto {
  roomId: number;
  type: string; // "AD" (adulto), "CH" (niño), "IN" (infante)
  name: string;
  surname: string;
}

// DTOs para respuestas
export interface BookingResponseDto {
  success: boolean;
  message: string;
  booking?: {
    id: number;
    reference?: string;
    status: string;
    totalAmount: number;
    currency: string;
  };
  detailedError?: string;
  failureReason?: string;
}