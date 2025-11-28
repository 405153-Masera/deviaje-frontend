// ==================== BOOKINGS BY TYPE ====================
export interface BookingsByTypeResponse {
  data: TypeCount[];
  kpis: BookingsByTypeKpis;
}

export interface TypeCount {
  bookingType: string;
  count: number;
  totalRevenue: number;
  totalCommission: number;
  averageRevenue: number;
}

export interface BookingsByTypeKpis {
  totalBookings: number;
  totalRevenue: number;
  totalCommissions: number;
  averageBookingValue: number;
}

// ==================== REVENUE OVER TIME ====================
export interface RevenueOverTimeResponse {
  data: TimeSeriesPoint[];
  kpis: RevenueOverTimeKpis;
  granularity: string;
}

export interface TimeSeriesPoint {
  period: string;
  bookingsCount: number;
  revenue: number;
  commission: number;
}

export interface RevenueOverTimeKpis {
  totalRevenue: number;
  averageRevenuePerPeriod: number;
  highestRevenue: number;
  highestRevenuePeriod: string;
}

// ==================== TOP DESTINATIONS ====================
export interface TopDestinationsResponse {
  data: DestinationData[];
  kpis: TopDestinationsKpis;
  limit: number;
}

export interface DestinationData {
  destination: string;
  bookingsCount: number;
  revenue: number;
  averageNights: number;
  averagePrice: number;
}

export interface TopDestinationsKpis {
  totalHotelBookings: number;
  uniqueDestinations: number;
  topDestination: string;
  totalHotelRevenue: number;
}

// ==================== TOP CARRIERS ====================
export interface TopCarriersResponse {
  data: CarrierData[];
  kpis: TopCarriersKpis;
  limit: number;
}

export interface CarrierData {
  carrierCode: string;
  carrierName: string;
  bookingsCount: number;
  revenue: number;
  averagePassengers: number;
}

export interface TopCarriersKpis {
  totalFlightBookings: number;
  uniqueCarriers: number;
  topCarrier: string;
  totalFlightRevenue: number;
}

// ==================== PAYMENTS BY STATUS ====================
export interface PaymentsByStatusResponse {
  data: PaymentStatusData[];
  kpis: PaymentsByStatusKpis;
}

export interface PaymentStatusData {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentsByStatusKpis {
  totalPayments: number;
  totalAmount: number;
  approvedPayments: number;
  approvedAmount: number;
  rejectedPayments: number;
  approvalRate: number;
}

// ==================== BOOKINGS BY STATUS ====================
export interface BookingsByStatusResponse {
  data: BookingStatusData[];
  kpis: BookingsByStatusKpis;
}

export interface BookingStatusData {
  status: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface BookingsByStatusKpis {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  cancellationRate: number;
}

// ==================== SUMMARY ====================
export interface DashboardSummaryResponse {
  globalKpis: GlobalKpis;
  miniCharts: MiniChartData[];
}

export interface GlobalKpis {
  totalBookings: number;
  totalRevenue: number;
  totalCommissions: number;
  averageBookingValue: number;
}

export interface MiniChartData {
  chartType: string;
  title: string;
  previewData: any;
}
