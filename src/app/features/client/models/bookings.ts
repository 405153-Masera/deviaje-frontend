import { FlightOffer } from '../../../shared/models/flights';

export interface BookingReferenceResponse {
  bookingReference: string
}

// DTOs para reserva de vuelos
export interface FlightBookingDto {
  clientId?: number;
  agentId?: number;
  origin: string;
  destination: string;
  branchId?: number;
  flightOffer: FlightOfferDto;
  travelers: TravelerDto[];
  cancellationRules?: CancellationRulesDto;
}

export interface CancellationRulesDto {
  cancellationPolicy: 'NON_REFUNDABLE' | 'REFUNDABLE' | 'REFUNDABLE_WITH_PENALTY' | 'UNKNOWN';
  penaltyAmount?: number;
  penaltyCurrency?: string;
  deadline?: string; 
  rawText?: string;
}

export interface FlightOfferDto extends FlightOffer {
  // Extiende el modelo existente para mantener compatibilidad
}

export interface TravelerDto {
  id: string;
  dateOfBirth?: string;
  name: {
    firstName: string;
    lastName: string;
  };
  gender: string;
  travelerType?: string; // ADULT, CHILD, INFANT
  associatedAdultId?: string; // Para vincular infantes con adultos
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
  type?: string;
  paymentToken: string;
  installments: number;
  description?: string;
  payer?: PayerDto;
  issuerId?: string; // Opcional para MercadoPago
}

export interface PayerDto {
  email: string;
  firstName?: string;
  lastName?: string;
  identification?: string;
  identificationType?: string;
}

// DTOs para reserva de hoteles
export interface HotelBookingDto {
  clientId?: number;
  agentId?: number;
  branchId?: number;
  holder: HolderDto;
  countryName?: string;
  rooms: RoomBookingDto[];
  clientReference?: string;
  remark?: string;
  tolerance?: number;
}

export interface HolderDto {
  name: string;
  surname: string;
  email: string;
  phone: string;
  countryCallingCode?: string;
}

export interface RoomBookingDto {
  rateKey: string;
  roomName: string;
  boardName: string;
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
    bookingReference?: string;
    clientId?: number;
    agentId?: number;
    status: string;
    type?: string; // "FLIGHT", "HOTEL", etc.
    totalAmount: number;
    currency: string;
  };
  detailedError?: string;
  failureReason?: string;
}

// DTOs específicos para MercadoPago
export interface MercadoPagoTokenRequest {
  cardNumber: string;
  cardholderName: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  identificationType?: string;
  identificationNumber?: string;
}

export interface MercadoPagoTokenResponse {
  id: string;
  public_key: string;
  card_id?: string;
  luhn_validation?: boolean;
  status: string;
  date_used?: string;
  card_number_length: number;
  date_created: string;
  first_six_digits: string;
  last_four_digits: string;
  security_code_length: number;
  expiration_month: number;
  expiration_year: number;
  date_last_updated: string;
  date_due: string;
  live_mode: boolean;
  cardholder?: {
    name: string;
    identification?: {
      number: string;
      type: string;
    };
  };
}

export interface MercadoPagoValidationResult {
  isValid: boolean;
  errors: string[];
}
