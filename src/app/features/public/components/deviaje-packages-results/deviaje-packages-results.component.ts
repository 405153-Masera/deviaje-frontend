import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Componentes reutilizados
import { DeviajeFlightResultsComponent } from '../deviaje-flight-results/deviaje-flight-results.component';
import { DeviajeHotelsResultsComponent } from '../hotels/deviaje-hotels-results/deviaje-hotels-results.component';

// Modelos
import { FlightSearchRequest, FlightOffer } from '../../../../shared/models/flights';
import { HotelSearchRequest, HotelSearchResponse, HotelResponseDto } from '../../../../shared/models/hotels';
import { CityDto } from '../../../../shared/models/locations';

@Component({
  selector: 'app-deviaje-packages-results',
  standalone: true,
  imports: [
    CommonModule,
    DeviajeFlightResultsComponent,
    DeviajeHotelsResultsComponent
  ],
  templateUrl: './deviaje-packages-results.component.html',
  styleUrl: './deviaje-packages-results.component.scss'
})
export class DeviajePackagesResultsComponent implements OnInit {
  private readonly router = inject(Router);

  // Datos de búsqueda recibidos desde packages-search
  flightSearchRequest!: FlightSearchRequest;
  hotelSearchRequest!: HotelSearchRequest;
  
  // Datos adicionales para mostrar
  originCity!: CityDto;
  destinationCity!: CityDto;
  hotelDestinationCity!: CityDto;
  packageInfo!: {
    departureDate: Date;
    returnDate: Date;
    totalAdults: number;
    totalChildren: number;
    totalRooms: number;
  };

  // ESTADO DEL CARRITO - Lo más importante
  selectedFlight: {
    flightOffer: FlightOffer;
    searchParams: FlightSearchRequest;
  } | null = null;

  selectedHotel: {
    hotelDetails: HotelResponseDto | null;
    hotel: HotelSearchResponse.Hotel;
    nameRoom: string;
    rate: HotelSearchResponse.Rate;
    rateKey: string;
    recheck: boolean;
    searchParams: HotelSearchRequest;
  } | null = null;

  ngOnInit(): void {
    // Obtener datos del state (desde packages-search)
    const state = window.history.state;
    
    if (state && state.flightSearchRequest && state.hotelSearchRequest) {
      this.flightSearchRequest = state.flightSearchRequest;
      this.hotelSearchRequest = state.hotelSearchRequest;
      this.originCity = state.originCity;
      this.destinationCity = state.destinationCity;
      this.hotelDestinationCity = state.hotelDestinationCity;
      this.packageInfo = state.packageInfo;
      
      console.log('Datos de paquetes recibidos:', {
        flight: this.flightSearchRequest,
        hotel: this.hotelSearchRequest,
        packageInfo: this.packageInfo
      });
    } else {
      // Si no hay datos, redirigir a búsqueda
      console.error('No se encontraron datos de búsqueda de paquetes');
      this.router.navigate(['/home/packages/search']);
    }
  }

  // ========== MANEJADORES DEL CARRITO ==========
  
  onFlightSelected(flightData: { flightOffer: FlightOffer; searchParams: FlightSearchRequest }): void {
    console.log('Vuelo seleccionado:', flightData);
    this.selectedFlight = flightData;
  }

  onHotelSelected(hotelData: {
    hotelDetails: HotelResponseDto | null;
    hotel: HotelSearchResponse.Hotel;
    nameRoom: string;
    rate: HotelSearchResponse.Rate;
    rateKey: string;
    recheck: boolean;
    searchParams: HotelSearchRequest;
  }): void {
    console.log('Hotel seleccionado:', hotelData);
    this.selectedHotel = hotelData;
  }

  // ========== LÓGICA DEL CARRITO ==========

  canProceedToBooking(): boolean {
    return this.selectedFlight !== null && this.selectedHotel !== null;
  }

  getTotalPrice(): number {
    let total = 0;
    
    if (this.selectedFlight) {
      total += parseFloat(this.selectedFlight.flightOffer.price.total);
    }
    
    if (this.selectedHotel) {
      total += this.getHotelRateNet(this.selectedHotel.rate);
    }
    
    return total;
  }

  getHotelRateNet(rate: HotelSearchResponse.Rate): number {
    return (rate as any)?.net || 0;
  }

  formatPrice(price: number | string): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(numPrice);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  // ========== NAVEGACIÓN ==========

  proceedToBooking(): void {
    if (!this.canProceedToBooking()) {
      alert('Debes seleccionar un vuelo y un hotel para continuar');
      return;
    }

    console.log('Procediendo a reserva de paquete con:', {
      flight: this.selectedFlight,
      hotel: this.selectedHotel
    });

    // Navegar a reserva de paquetes con los mismos datos que usan las reservas individuales
    this.router.navigate(['/client/packages/booking'], {
      state: {
        // Datos del vuelo (exactamente como flight-booking los recibe)
        flightOffer: this.selectedFlight!.flightOffer,
        flightSearchParams: this.selectedFlight!.searchParams,
        
        // Datos del hotel (exactamente como hotel-booking los recibe)
        hotelDetails: this.selectedHotel!.hotelDetails,
        hotel: this.selectedHotel!.hotel,
        nameRoom: this.selectedHotel!.nameRoom,
        rate: this.selectedHotel!.rate,
        rateKey: this.selectedHotel!.rateKey,
        recheck: this.selectedHotel!.recheck,
        hotelSearchParams: this.selectedHotel!.searchParams,
        
        // Datos adicionales del paquete
        packageInfo: this.packageInfo,
        totalPrice: this.getTotalPrice()
      }
    });
  }

  clearSelection(): void {
    this.selectedFlight = null;
    this.selectedHotel = null;
  }

  removeFlightSelection(): void {
    this.selectedFlight = null;
  }

  removeHotelSelection(): void {
    this.selectedHotel = null;
  }

  goBackToSearch(): void {
    this.router.navigate(['/home/packages/search']);
  }
}