// dashboard.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BookingsByStatusResponse,
  BookingsByTypeResponse,
  DashboardSummaryResponse,
  PaymentsByStatusResponse,
  RevenueOverTimeResponse,
  TopCarriersResponse,
  TopDestinationsResponse
} from '../models/dashboards';
import { environment } from '../../../../shared/enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiDeviajeBookings}/api/dashboard`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene el resumen general del dashboard (para vista principal).
   */
  getDashboardSummary(
    startDate?: string,
    endDate?: string
  ): Observable<DashboardSummaryResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<DashboardSummaryResponse>(`${this.apiUrl}/summary`, { params });
  }

  /**
   * Obtiene reservas por tipo (Flight, Hotel, Package).
   */
  getBookingsByType(
    startDate?: string, 
    endDate?: string, 
    bookingType?: string, 
    bookingStatus?: string,
    agentId?: number,      
    clientId?: number 
  ): Observable<BookingsByTypeResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (bookingType) params = params.set('bookingType', bookingType);
    if (bookingStatus) params = params.set('bookingStatus', bookingStatus);

    if (agentId !== undefined && agentId !== null) {
        params = params.set('agentId', agentId.toString());
    }
    if (clientId !== undefined && clientId !== null) {
        params = params.set('clientId', clientId.toString());
    }

    return this.http.get<BookingsByTypeResponse>(`${this.apiUrl}/bookings-by-type`, { params });
  }

  /**
   * Obtiene revenue en el tiempo.
   */
  getRevenueOverTime(
    startDate?: string,
    endDate?: string,
    granularity?: string,
    bookingType?: string
  ): Observable<RevenueOverTimeResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (granularity) params = params.set('granularity', granularity);
    if (bookingType) params = params.set('bookingType', bookingType);

    return this.http.get<RevenueOverTimeResponse>(`${this.apiUrl}/revenue-over-time`, { params });
  }

  /**
   * Obtiene top destinos (hoteles).
   */
  getTopDestinations(
    startDate?: string,
    endDate?: string,
    limit?: number,
    bookingStatus?: string
  ): Observable<TopDestinationsResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (limit) params = params.set('limit', limit.toString());
    if (bookingStatus) params = params.set('bookingStatus', bookingStatus);

    return this.http.get<TopDestinationsResponse>(`${this.apiUrl}/top-destinations`, { params });
  }

  /**
   * Obtiene top aerolíneas (vuelos).
   */
  getTopCarriers(
    startDate?: string,
    endDate?: string,
    limit?: number,
    bookingStatus?: string
  ): Observable<TopCarriersResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (limit) params = params.set('limit', limit.toString());
    if (bookingStatus) params = params.set('bookingStatus', bookingStatus);

    return this.http.get<TopCarriersResponse>(`${this.apiUrl}/top-carriers`, { params });
  }

  /**
   * Obtiene pagos por estado.
   */
  getPaymentsByStatus(
    startDate?: string,
    endDate?: string,
    paymentMethod?: string
  ): Observable<PaymentsByStatusResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (paymentMethod) params = params.set('paymentMethod', paymentMethod);

    return this.http.get<PaymentsByStatusResponse>(`${this.apiUrl}/payments-by-status`, { params });
  }

  /**
   * Obtiene reservas por estado.
   */
  getBookingsByStatus(
    startDate?: string,
    endDate?: string,
    bookingType?: string
  ): Observable<BookingsByStatusResponse> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (bookingType) params = params.set('bookingType', bookingType);

    return this.http.get<BookingsByStatusResponse>(`${this.apiUrl}/bookings-by-status`, { params });
  }
}