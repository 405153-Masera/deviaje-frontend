import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HotelService } from '../../../../shared/services/hotel.service';

export interface PriceBreakdown {
  grandTotal: number;
  net: number;
  basePrice: number;
  taxesFlight: number;
  taxesHotel: number;
  commission: number;
  discount: number;
  totalAmount: number;
  currency: string;
}

export type PriceMode = 'FLIGHT' | 'HOTEL' | 'PACKAGE';

@Component({
  selector: 'app-deviaje-price-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-price-details.component.html',
  styleUrl: './deviaje-price-details.component.scss'
})
export class DeviajePriceDetailsComponent implements OnInit, OnChanges {
  @Input() mode: PriceMode = 'FLIGHT';
  @Input() flightPrice: any = null; // Precio de Amadeus para vuelos
  @Input() hotelPrice: any = null; // Precio de hotel
  @Input() currency: string = 'ARS';
  @Input() passengerCount: number = 1;
  @Input() title: string = '';

  @Output() pricesCalculated = new EventEmitter<any>();

  private readonly hotelService = inject(HotelService);

  priceBreakdown: PriceBreakdown = {
    grandTotal: 0,
    net: 0,
    basePrice: 0,
    taxesFlight: 0,
    taxesHotel: 0,
    commission: 0,
    discount: 0,
    totalAmount: 0,
    currency: 'ARS'
  };

  ngOnInit() {
    this.calculatePrices();
    this.setDefaultTitle();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['flightPrice'] || changes['hotelPrice'] || changes['mode']) {
      this.calculatePrices();
      this.setDefaultTitle();
    }
  }

  private setDefaultTitle() {
    if (!this.title) {
      switch (this.mode) {
        case 'FLIGHT':
          this.title = 'Detalle del precio del vuelo';
          break;
        case 'HOTEL':
          this.title = 'Detalle del precio del hotel';
          break;
        case 'PACKAGE':
          this.title = 'Detalle del precio del paquete';
          break;
      }
    }
  }

  private calculatePrices() {
    this.priceBreakdown.currency = this.currency;

    switch (this.mode) {
      case 'FLIGHT':
        this.calculateFlightPrices();
        this.pricesCalculated.emit(this.getPricesDto());
        break;
      case 'HOTEL':
        this.calculateHotelPrices();
        this.pricesCalculated.emit(this.getPricesDto());
        break;
      case 'PACKAGE':
        this.calculatePackagePrices();
        this.pricesCalculated.emit(this.getPricesDto());
        break;
    }

  }

  private calculateFlightPrices() {
    if (!this.flightPrice) return;

    // Datos de Amadeus
    this.priceBreakdown.grandTotal = parseFloat(this.flightPrice.grandTotal) || 0;
    this.priceBreakdown.basePrice = parseFloat(this.flightPrice.base) || 0;
    
    // Calcular impuestos: grandTotal - basePrice
    this.priceBreakdown.taxesFlight = this.priceBreakdown.grandTotal - this.priceBreakdown.basePrice;
    this.priceBreakdown.taxesHotel = 0;
    
    // Comisión 15% sobre precio base sin impuestos
    this.priceBreakdown.commission = this.priceBreakdown.basePrice * 0.15;
    
    // Total = precio de API + comisión + impuestos - descuento
    this.priceBreakdown.totalAmount = this.priceBreakdown.grandTotal + this.priceBreakdown.commission - this.priceBreakdown.discount;
  }

  private calculateHotelPrices() {
    const hotelNet = parseFloat((this.hotelPrice as any)?.net) || 0;
    const priceInArs = this.hotelService.convertToArs(hotelNet);

    // Para hoteles usamos el campo 'net'
    this.priceBreakdown.net = priceInArs;
    this.priceBreakdown.grandTotal = 0;
    this.priceBreakdown.basePrice = this.priceBreakdown.net;
    
    // Impuestos del hotel (si hay)
    this.priceBreakdown.taxesHotel = 0;
    this.priceBreakdown.taxesFlight = 0;
    
    // Comisión 20% sobre precio base sin impuestos
    this.priceBreakdown.commission = this.priceBreakdown.basePrice * 0.20;
    
    // Total = precio de API + comisión + impuestos - descuento
    this.priceBreakdown.totalAmount = this.priceBreakdown.net + this.priceBreakdown.commission + this.priceBreakdown.taxesHotel - this.priceBreakdown.discount;
  }

  private calculatePackagePrices() {
    // Calcular precio del vuelo
    let flightSubtotal = 0;
    let flightTaxes = 0;
    if (this.flightPrice) {
      flightSubtotal = parseFloat(this.flightPrice.total) || 0;
      const flightBase = parseFloat(this.flightPrice.base) || 0;
      flightTaxes = flightSubtotal - flightBase;
    }

    // Calcular precio del hotel
    let hotelSubtotal = 0;
    let hotelTaxes = 0;
    if (this.hotelPrice) {
      hotelSubtotal = parseFloat(this.hotelPrice.total) || 0;
      hotelTaxes = parseFloat(this.hotelPrice.taxes) || 0;
    }

    // Asignar valores
    this.priceBreakdown.grandTotal = flightSubtotal;
    this.priceBreakdown.net = hotelSubtotal;
    this.priceBreakdown.taxesFlight = flightTaxes;
    this.priceBreakdown.taxesHotel = hotelTaxes;
    
    // Precio base total (vuelo + hotel sin impuestos)
    const flightBase = parseFloat(this.flightPrice?.base) || 0;
    const hotelBase = hotelSubtotal - hotelTaxes;
    this.priceBreakdown.basePrice = flightBase + hotelBase;
    
    // Comisión 20% sobre el total del paquete (sin impuestos)
    this.priceBreakdown.commission = this.priceBreakdown.basePrice * 0.20;
    
    // Total = precio vuelo + precio hotel + comisión - descuento
    this.priceBreakdown.totalAmount = flightSubtotal + hotelSubtotal + this.priceBreakdown.commission - this.priceBreakdown.discount;
  }

  // Método para obtener el PricesDto para enviar al backend
  getPricesDto() {
    return {
      totalAmount: this.priceBreakdown.totalAmount,
      grandTotal: this.priceBreakdown.grandTotal,
      net: this.priceBreakdown.net,
      commission: this.priceBreakdown.commission,
      discount: this.priceBreakdown.discount,
      taxesFlight: this.priceBreakdown.taxesFlight,
      taxesHotel: this.priceBreakdown.taxesHotel,
      currency: this.priceBreakdown.currency
    };
  }
}