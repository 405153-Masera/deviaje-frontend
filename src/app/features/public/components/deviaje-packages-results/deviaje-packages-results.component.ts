import { Component, OnInit, Pipe, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Componentes reutilizados
import { DeviajeFlightResultsComponent } from '../deviaje-flight-results/deviaje-flight-results.component';
import { DeviajeHotelsResultsComponent } from '../hotels/deviaje-hotels-results/deviaje-hotels-results.component';

// Modelos
import {
  FlightSearchRequest,
  FlightOffer,
} from '../../../../shared/models/flights';
import {
  HotelSearchRequest,
  HotelSearchResponse,
  HotelResponseDto,
} from '../../../../shared/models/hotels';
import { CityDto } from '../../../../shared/models/locations';
import { HotelService } from '../../../../shared/services/hotel.service';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { LocationFormatterService } from '../../../../shared/services/locationFormater.service';

@Component({
  selector: 'app-deviaje-packages-results',
  standalone: true,
  imports: [
    CommonModule,
    DeviajeFlightResultsComponent,
    DeviajeHotelsResultsComponent,
    ReactiveFormsModule,
    DateFormatPipe,
  ],
  templateUrl: './deviaje-packages-results.component.html',
  styleUrl: './deviaje-packages-results.component.scss',
})
export class DeviajePackagesResultsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly hotelService = inject(HotelService);
  locationService: LocationFormatterService = inject(LocationFormatterService);
  private readonly fb = inject(FormBuilder);

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

  //Variables para CONTROL DE FLUJO CON FECHAS MANUALES
  isHotelTabEnabled: boolean = false;
  showHotelDateSelector: boolean = false;
  hotelDatesForm!: FormGroup;

  flightArrivalInfo: {
    date: Date;
    dateFormatted: string;
    time: string;
  } | null = null;

  flightDepartureInfo: {
    date: Date;
    dateFormatted: string;
    time: string;
  } | null = null;

  suggestedCheckIn: Date | null = null;
  suggestedCheckOut: Date | null = null;
  suggestionReason: {
    checkIn: string;
    checkOut: string;
  } = { checkIn: '', checkOut: '' };

  // Control de búsqueda
  isSearchingHotels: boolean = false;
  hasSearchedHotels: boolean = false;

  ngOnInit(): void {
    // Obtener datos del state (desde packages-search)
    const state = window.history.state;

    if (state && state.flightSearchRequest && state.hotelSearchRequest) {
      this.flightSearchRequest = state.flightSearchRequest;
      this.hotelSearchRequest = state.hotelSearchRequest;
      this.originCity = state.originCityPackage;
      this.destinationCity = state.destinationCityPackage;
      this.hotelDestinationCity = state.hotelDestinationCity;
      this.packageInfo = state.packageInfo;
      this.initHotelDatesForm();

      localStorage.setItem(
                'flightSearchRequest',
                JSON.stringify(this.flightSearchRequest)
              );
      localStorage.setItem(
                'hotelSearchRequest',
                JSON.stringify(this.hotelSearchRequest )
              );
      localStorage.setItem(
                'originCityPackage',
                JSON.stringify(this.originCity)
              );
      localStorage.setItem(
                'destinationCityPackage',
                JSON.stringify(this.destinationCity)
              );
      localStorage.setItem(
                'hotelDestinationCity',
                JSON.stringify(this.hotelDestinationCity)
              );
      localStorage.setItem(
                'packageInfo',
                JSON.stringify(this.packageInfo)
              );
      this.isHotelTabEnabled = false;
    } else {
      this.tryLoadFromStorage();
      this.isHotelTabEnabled = false;
    } 
  }

  private tryLoadFromStorage(): void {
    try {
      const flightSearchRequest = localStorage.getItem('flightSearchRequest');
      const hotelSearchRequest = localStorage.getItem('hotelSearchRequest');
      const originCityPackage = localStorage.getItem('originCityPackage');
      const destinationCityPackage = localStorage.getItem('destinationCityPackage');
      const hotelDestinationCity = localStorage.getItem('hotelDestinationCity');
      const packageInfo = localStorage.getItem('packageInfo');

      this.flightSearchRequest = flightSearchRequest
                ? JSON.parse(flightSearchRequest)
                : null;
      this.hotelSearchRequest = hotelSearchRequest
                ? JSON.parse(hotelSearchRequest)
                : null;
      this.originCity = originCityPackage
                ? JSON.parse(originCityPackage)
                : null;
      this.destinationCity = destinationCityPackage
                ? JSON.parse(destinationCityPackage)
                : null;
      this.hotelDestinationCity = hotelDestinationCity
                ? JSON.parse(hotelDestinationCity)
                : null;
      this.packageInfo = packageInfo
                ? JSON.parse(packageInfo)
                : null;
      this.initHotelDatesForm();

    } catch (e) {
      console.error('No se encontraron datos de búsqueda de paquetes');
      this.router.navigate(['/home/packages/search']);
    }
  }

  private initHotelDatesForm(): void {
    this.hotelDatesForm = this.fb.group(
      {
        checkIn: [null, Validators.required],
        checkOut: [null, Validators.required],
      },
      { validators: dateRangeValidator }
    );
  }

  // ========== MANEJADORES DEL CARRITO ==========

  /**
   * Cuando se selecciona un vuelo:
   * 1. Guardar el vuelo
   * 2. Extraer información del vuelo (llegada/salida)
   * 3. Calcular fechas sugeridas
   * 4. Mostrar selector de fechas de hotel
   */
  onFlightSelected(flight: {
    flightOffer: FlightOffer;
    searchParams: FlightSearchRequest;
  }): void {
    this.selectedFlight = flight;

    this.extractFlightInfo(flight.flightOffer);
    this.calculateSuggestedDates(flight.flightOffer);

    // Habilitar tab de hoteles pero mostrar selector de fechas primero
    this.isHotelTabEnabled = true;
    this.showHotelDateSelector = true;
    this.hasSearchedHotels = false;

    // Cambiar automáticamente a la pestaña de hoteles
    this.switchToHotelsTab();
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
    this.selectedHotel = hotelData;
  }

  // ========== LÓGICA DEL CARRITO ==========

  canProceedToBooking(): boolean {
    return this.selectedFlight !== null && this.selectedHotel !== null;
  }

  getHotelRateNet(rate: HotelSearchResponse.Rate): number {
    const eurPrice = (rate as any)?.net || 0;
    return this.hotelService.convertToArs(eurPrice);
  }

  getTotalPrice(): number {
    let priceFlightTotal = 0; // vuelo final (incluye impuestos)
    let priceFlightBase = 0; // vuelo base sin impuestos
    let priceNetHotel = 0; // tarifa neta del hotel

    if (this.selectedHotel) {
      priceNetHotel = this.getHotelRateNet(this.selectedHotel.rate);
    }

    if (this.selectedFlight) {
      priceFlightTotal = parseFloat(
        this.selectedFlight.flightOffer.price.grandTotal
      );
      priceFlightBase = parseFloat(this.selectedFlight.flightOffer.price.base);
    }

    // Comisión solo sobre la base
    const subtotalBase = priceFlightBase + priceNetHotel;
    const commission = subtotalBase * 0.2;

    return priceFlightTotal + priceNetHotel + commission;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
      hotel: this.selectedHotel,
    });

    // Navegar a reserva de paquetes con los mismos datos que usan las reservas individuales
    this.router.navigate(['/home/packages/booking'], {
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
        totalPrice: this.getTotalPrice(),
      },
    });
  }

  clearSelection(): void {
    this.selectedFlight = null;
    this.selectedHotel = null;
  }

  removeFlightSelection(): void {
    this.selectedFlight = null;
    this.selectedHotel = null;
    this.isHotelTabEnabled = false;
    this.showHotelDateSelector = false;
    this.hasSearchedHotels = false;
    this.flightArrivalInfo = null;
    this.flightDepartureInfo = null;
  }

  removeHotelSelection(): void {
    this.selectedHotel = null;
  }

  goBackToSearch(): void {
    this.router.navigate(['/home/packages/search']);
  }

  //Metodos auxiliares para elegir fechas de hotel manualmente

  private extractFlightInfo(flight: FlightOffer): void {
    const lastSegment =
      flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1];
    const arrivalDate = new Date(lastSegment.arrival.at);

    this.flightArrivalInfo = {
      date: arrivalDate,
      dateFormatted: this.formatDateLong(arrivalDate),
      time: this.formatTime(arrivalDate),
    };

    // Información de salida (primer segmento del segundo itinerario)
    const returnItinerary = flight.itineraries[1];
    if (returnItinerary) {
      const firstSegment = returnItinerary.segments[0];
      const departureDate = new Date(firstSegment.departure.at);

      this.flightDepartureInfo = {
        date: departureDate,
        dateFormatted: this.formatDateLong(departureDate),
        time: this.formatTime(departureDate),
      };
    }
  }

  private calculateSuggestedDates(flight: FlightOffer): void {
    if (!this.flightArrivalInfo || !this.flightDepartureInfo) return;

    const arrivalHour = this.flightArrivalInfo.date.getHours();
    const departureHour = this.flightDepartureInfo.date.getHours();

    // ========== CHECK-IN SUGERIDO ==========
    this.suggestedCheckIn = new Date(this.flightArrivalInfo.date);

    if (arrivalHour >= 22) {
      // Llega muy tarde (después de 10 PM) → Sugerir día siguiente
      this.suggestedCheckIn.setDate(this.suggestedCheckIn.getDate() + 1);
      this.suggestionReason.checkIn =
        'Tu vuelo llega muy tarde (después de las 22:00)';
    } else if (arrivalHour < 6) {
      // Llega de madrugada → Sugerir mismo día
      this.suggestionReason.checkIn = 'Tu vuelo llega de madrugada';
    } else if (arrivalHour >= 19) {
      // Llega tarde pero no tan tarde
      this.suggestionReason.checkIn = 'Tu vuelo llega en horario vespertino';
    } else {
      // Llega en horario normal
      this.suggestionReason.checkIn = 'Tu vuelo llega en horario diurno';
    }

    // ========== CHECK-OUT SUGERIDO ==========
    this.suggestedCheckOut = new Date(this.flightDepartureInfo.date);

    // if (departureHour < 10) {
    //   // Sale muy temprano → Sugerir día anterior
    //   //this.suggestedCheckOut.setDate(this.suggestedCheckOut.getDate() - 1);
    //   this.suggestionReason.checkOut =
    //     'Tu vuelo sale muy temprano (antes de las 10:00)';
    // }  
      
    if (departureHour < 12) {
      // Sale temprano pero no tanto
      this.suggestionReason.checkOut = 'Tu vuelo sale en horario matutino';
    } else {
      // Sale en horario normal
      this.suggestionReason.checkOut = 'Tu vuelo sale en horario diurno';
    }

    // Pre-llenar el formulario con las fechas sugeridas
    this.hotelDatesForm.patchValue({
      checkIn: this.suggestedCheckIn,
      checkOut: this.suggestedCheckOut,
    });
  }

  searchHotelsWithSelectedDates(): void {
    const checkInString = this.hotelDatesForm.get('checkIn')?.value;
    const checkOutString = this.hotelDatesForm.get('checkOut')?.value;

    const checkIn = this.parseLocalDate(checkInString);
    const checkOut = this.parseLocalDate(checkOutString);

    this.hotelSearchRequest.stay.checkIn = checkIn;
    this.hotelSearchRequest.stay.checkOut = checkOut;

    this.isSearchingHotels = true;
    this.hasSearchedHotels = true;
    this.showHotelDateSelector = false;
  }

  useSuggestedDates(): void {
    if (!this.suggestedCheckIn || !this.suggestedCheckOut) return;

    this.hotelDatesForm.patchValue({
      checkIn: this.suggestedCheckIn,
      checkOut: this.suggestedCheckOut,
    });

    // Buscar inmediatamente con las fechas sugeridas
    this.searchHotelsWithSelectedDates();
  }

  private parseLocalDate(value: string | Date): Date {
    if (value instanceof Date) {
      return value; // ← Si ya es Date, NO lo toca
    }

    // Si es string (input yyyy-mm-dd):
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  modifyHotelDates(): void {
    // Volver a mostrar el selector de fechas
    this.showHotelDateSelector = true;
    this.isSearchingHotels = false;
    this.selectedHotel = null; // Limpiar hotel seleccionado si cambian fechas
  }

  // ========== UTILIDADES DE FECHAS ==========

  private formatDateLong(date: Date): string {
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ========== CONTROL DE PESTAÑAS ==========

  private switchToHotelsTab(): void {
    setTimeout(() => {
      const hotelTab = document.getElementById('hotels-tab');
      if (hotelTab) {
        const tab = new (window as any).bootstrap.Tab(hotelTab);
        tab.show();
      }
    }, 100);
  }

  formatDateForInput(date: Date): string {
    if (!date) return '';
    return date.toISOString().split('T')[0]; // "2025-11-20"
  }
}

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const checkIn = control.get('checkIn')?.value;
  const checkOut = control.get('checkOut')?.value;

  if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
    return { dateRange: true };
  }

  return null;
}
