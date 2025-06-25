import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Componentes reutilizados
import { DeviajeCalendarComponent } from '../../../../shared/components/deviaje-calendar/deviaje-calendar.component';
import { DeviajeCityInputComponent } from '../../../../shared/components/deviaje-city-input/deviaje-city-input.component';
import { DeviajeRoomGuestSelectComponent } from '../../../../shared/components/deviaje-room-guest-select/deviaje-room-guest-select.component';

// Modelos
import { CityDto } from '../../../../shared/models/locations';
import { FlightSearchRequest } from '../../../../shared/models/flights';
import { HotelSearchRequest } from '../../../../shared/models/hotels';

interface PackageSearchRequest {
  // Datos de vuelo
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children?: number;
  infants?: number;
  travelClass: string;
  
  // Datos de hotel
  hotelDestination: string;
  checkInDate: string;
  checkOutDate: string;
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age: number;
    }>;
  }>;
}

@Component({
  selector: 'app-deviaje-packages-search',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    DeviajeCalendarComponent,
    DeviajeCityInputComponent,
    DeviajeRoomGuestSelectComponent
  ],
  templateUrl: './deviaje-packages-search.component.html',
  styleUrl: './deviaje-packages-search.component.scss'
})
export class DeviajePackagesSearchComponent implements OnInit, OnDestroy {
  @ViewChild('flightCalendar') flightCalendar!: DeviajeCalendarComponent;
  @ViewChild('hotelCalendar') hotelCalendar!: DeviajeCalendarComponent;

  formSearch: FormGroup;
  subscription = new Subscription();
  isLoading: boolean = false;

  // Variables para fechas de vuelo
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  flightCalendarOpen: boolean = false;

  // Variables para fechas de hotel
  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  hotelCalendarOpen: boolean = false;

  // Variables para ocupaciones
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age: number;
    }>;
  }> = [{ rooms: 1, adults: 1, children: 0 }];

  // Clases de viaje
  travelClasses = [
    { code: 'ECONOMY', name: 'Económica' },
    { code: 'PREMIUM_ECONOMY', name: 'Premium Economy' },
    { code: 'BUSINESS', name: 'Business' },
    { code: 'FIRST', name: 'Primera Clase' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.formSearch = this.createForm();
  }

  ngOnInit(): void {
    // Inicializar fechas por defecto
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const returnDefaultDate = new Date();
    returnDefaultDate.setDate(returnDefaultDate.getDate() + 8);

    this.departureDate = tomorrow;
    this.returnDate = returnDefaultDate;
    this.checkInDate = tomorrow;
    this.checkOutDate = returnDefaultDate;

    this.formSearch.patchValue({
      departureDate: tomorrow,
      returnDate: returnDefaultDate,
      checkInDate: tomorrow,
      checkOutDate: returnDefaultDate
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // Campos de vuelo
      origin: [null, Validators.required],
      destination: [null, Validators.required],
      departureDate: [null, Validators.required],
      returnDate: [null, Validators.required],
      travelClass: ['ECONOMY', Validators.required],
      
      // Campos de hotel
      hotelDestination: [null, Validators.required],
      checkInDate: [null, Validators.required],
      checkOutDate: [null, Validators.required]
    });
  }

  // Método para intercambiar origen y destino de vuelos
  swapFlightLocations(): void {
    const originValue = this.formSearch.get('origin')?.value;
    const destinationValue = this.formSearch.get('destination')?.value;
    this.formSearch.get('origin')?.setValue(destinationValue);
    this.formSearch.get('destination')?.setValue(originValue);
  }

  // Métodos para el calendario de vuelos
  openFlightCalendar(): void {
    this.flightCalendarOpen = true;
    this.flightCalendar.open();
  }

  closeFlightCalendar(): void {
    this.flightCalendarOpen = false;
  }

  onFlightDatesSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.departureDate = range.startDate;
    this.returnDate = range.endDate;
    this.formSearch.get('departureDate')?.setValue(range.startDate);
    this.formSearch.get('returnDate')?.setValue(range.endDate);
    this.closeFlightCalendar();
  }

  // Métodos para el calendario de hoteles
  openHotelCalendar(): void {
    this.hotelCalendarOpen = true;
    this.hotelCalendar.open();
  }

  closeHotelCalendar(): void {
    this.hotelCalendarOpen = false;
  }

  onHotelDatesSelected(range: { startDate: Date | null; endDate: Date | null }): void {
    this.checkInDate = range.startDate;
    this.checkOutDate = range.endDate;
    this.formSearch.get('checkInDate')?.setValue(range.startDate);
    this.formSearch.get('checkOutDate')?.setValue(range.endDate);
    this.closeHotelCalendar();
  }

  // Métodos para ocupaciones (huéspedes)
  handleOccupanciesChanged(occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age: number;
    }>;
  }>): void {
    this.occupancies = occupancies;
  }

  // Obtener totales de pasajeros para mostrar
  getTotalAdults(): number {
    return this.occupancies.reduce((total, occ) => total + occ.adults, 0);
  }

  getTotalChildren(): number {
    return this.occupancies.reduce((total, occ) => total + occ.children, 0);
  }

  getTotalRooms(): number {
    return this.occupancies.reduce((total, occ) => total + occ.rooms, 0);
  }

  // Inferir children e infants para vuelos basado en edades
  private inferFlightPassengers(): { children: number; infants: number } {
    let children = 0;
    let infants = 0;

    this.occupancies.forEach(occupancy => {
      if (occupancy.paxes) {
        occupancy.paxes.forEach(pax => {
          if (pax.type === 'CH') {
            if (pax.age < 2) {
              infants++;
            } else {
              children++;
            }
          }
        });
      }
    });

    return { children, infants };
  }

  // Formatear fechas para mostrar
  formatDisplayDate(date: Date | null): string {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Buscar paquetes
  searchPackages(): void {
    if (this.formSearch.invalid) {
      this.formSearch.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      return date.toISOString().split('T')[0];
    };

    const flightPassengers = this.inferFlightPassengers();

    const searchParams: PackageSearchRequest = {
      // Datos de vuelo
      origin: this.formSearch.get('origin')?.value?.iataCode,
      destination: this.formSearch.get('destination')?.value?.iataCode,
      departureDate: formatDate(this.formSearch.get('departureDate')?.value),
      returnDate: formatDate(this.formSearch.get('returnDate')?.value),
      adults: this.getTotalAdults(),
      children: flightPassengers.children > 0 ? flightPassengers.children : undefined,
      infants: flightPassengers.infants > 0 ? flightPassengers.infants : undefined,
      travelClass: this.formSearch.get('travelClass')?.value,
      
      // Datos de hotel
      hotelDestination: this.formSearch.get('hotelDestination')?.value?.name || this.formSearch.get('hotelDestination')?.value?.iataCode,
      checkInDate: formatDate(this.formSearch.get('checkInDate')?.value),
      checkOutDate: formatDate(this.formSearch.get('checkOutDate')?.value),
      occupancies: this.occupancies
    };

    // Navegar a los resultados de paquetes
    this.router.navigate(['/packages/results'], {
      queryParams: searchParams
    });

    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  // Validadores
  hasErrors(field: string): boolean {
    const formField = this.formSearch.get(field);
    return !!(formField && formField.invalid && (formField.dirty || formField.touched));
  }

  getErrorMessage(field: string): string {
    const formField = this.formSearch.get(field);
    if (!formField || !formField.errors) return '';

    if (formField.errors['required']) {
      return 'Este campo es obligatorio';
    }

    return '';
  }
}