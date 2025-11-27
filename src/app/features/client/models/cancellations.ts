export interface CancelBookingRequest {
  cancellationReason: string;
  additionalDetails?: string;
  refundAmount: number;
}

export interface CancelBookingResponse {
  bookingId: number;
  bookingReference: string;
  status: string;
  bookingType: string;
  cancelledAt: string;
  message: string;
  flightRefundAmount: number;
  hotelRefundAmount: number;
  totalRefundAmount: number;
  currency: string;
}
