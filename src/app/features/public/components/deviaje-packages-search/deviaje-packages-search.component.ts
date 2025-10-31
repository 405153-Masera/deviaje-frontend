import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Componentes reutilizados
import { DeviajeCalendarComponent } from '../../../../shared/components/deviaje-calendar/deviaje-calendar.component';
import { DeviajeCityInputComponent } from '../../../../shared/components/deviaje-city-input/deviaje-city-input.component';
import { DeviajeRoomGuestSelectComponent } from '../../../../shared/components/deviaje-room-guest-select/deviaje-room-guest-select.component';

// Modelos y servicios
import { CityDto } from '../../../../shared/models/locations';
import { FlightSearchRequest } from '../../../../shared/models/flights';
import { HotelSearchRequest } from '../../../../shared/models/hotels';
import { CityService } from '../../../../shared/services/city.service';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';
import { TrendingDestinationsComponent } from "../../../../shared/components/deviaje-trending-destinations/deviaje-trending-destinations.component";

@Component({
  selector: 'app-deviaje-packages-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DeviajeCalendarComponent,
    DeviajeCityInputComponent,
    DeviajeRoomGuestSelectComponent,
    DateFormatPipe,
    TrendingDestinationsComponent
],
  templateUrl: './deviaje-packages-search.component.html',
  styleUrl: './deviaje-packages-search.component.scss'
})
export class DeviajePackagesSearchComponent implements OnInit, OnDestroy {
  @ViewChild('flightCalendar') flightCalendar!: DeviajeCalendarComponent;
  @ViewChild(DeviajeRoomGuestSelectComponent) roomGuestComponent!: DeviajeRoomGuestSelectComponent;

  formSearch: FormGroup;
  subscription = new Subscription();
  isLoading: boolean = false;

  private today: Date = new Date();
  private departureInitialDate: Date = new Date(this.today);
  private returnInitialDate: Date = new Date(this.today);

  // Variables para fechas (IGUALES para vuelo y hotel)
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  flightCalendarOpen: boolean = false;

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

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private cityService: CityService
  ) {
    this.formSearch = this.formBuilder.group({
      origin: ['', Validators.required],
      destination: ['', Validators.required], 
      departureDate: [this.departureInitialDate, Validators.required],
      returnDate: [this.returnInitialDate, Validators.required],
      travelClass: ['']
    });
  }

  ngOnInit(): void {
    this.initializeDefaultDates();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initializeDefaultDates(): void {
    this.departureInitialDate.setDate(this.today.getDate() + 10);
    this.returnInitialDate.setDate(this.today.getDate() + 17);
  }

  // Intercambiar ciudades
  swapFlightLocations(): void {
    const origin = this.formSearch.get('origin')?.value;
    const destination = this.formSearch.get('destination')?.value;
    
    this.formSearch.get('origin')?.setValue(destination);
    this.formSearch.get('destination')?.setValue(origin);
  }

  // Métodos para el calendario
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

  // Métodos para ocupaciones
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

  getTotalAdults(): number {
    return this.occupancies.reduce((total, occ) => total + occ.adults, 0);
  }

  getTotalChildren(): number {
    return this.occupancies.reduce((total, occ) => total + occ.children, 0);
  }

  getTotalRooms(): number {
    return this.occupancies.reduce((total, occ) => total + occ.rooms, 0);
  }

  formatDisplayDate(date: Date | null): string {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // MÉTODO CLAVE: Mapear código de vuelo (IATA) a código de hotel (Hotelbeds)
  private mapFlightCityToHotelCity(flightDestination: CityDto): Promise<CityDto> {
    return new Promise((resolve, reject) => {
      // Buscar ciudades de hoteles por nombre
      this.subscription.add(
        this.cityService.searchHotelCities(flightDestination.name).subscribe({
          next: (hotelCities: CityDto[]) => {
            console.log('Ciudades de hoteles encontradas:', hotelCities);

            // LÓGICA DE MAPEO COMO ME EXPLICASTE:
            // 1. Buscar por coincidencia exacta de nombre y país
            let matchingCity = hotelCities.find(city => 
              city.name === flightDestination.name && 
              city.country === flightDestination.country
            );

            // 2. Si no encuentra, buscar por código IATA
            if (!matchingCity) {
              matchingCity = hotelCities.find(city => 
                city.iataCode === flightDestination.iataCode
              );
            }

            if (matchingCity) {
              console.log('Ciudad mapeada para hoteles:', matchingCity);
              resolve(matchingCity);
            } else {
              console.error('No se encontró mapeo para la ciudad:', flightDestination);
              reject(new Error(`No se encontró código de hotel para ${flightDestination.name}`));
            }
          },
          error: (error) => {
            console.error('Error buscando ciudades de hoteles:', error);
            reject(error);
          }
        })
      );
    });
  }

  // Inferir passengers para vuelos basado en edades
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

  // MÉTODO PRINCIPAL: Buscar paquetes
  async searchPackages(): Promise<void> {
    // Validaciones
    if (this.formSearch.invalid) {
      this.formSearch.markAllAsTouched();
      return;
    }

    // VALIDACIÓN DE HUÉSPEDES QUE FALTABA
    if (!this.roomGuestComponent.isFormValid()) {
      return; // No permitir búsqueda si hay errores en huéspedes
    }

    this.isLoading = true;

    try {
      const formatDateForApi = (date: Date | null): string => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
      };

      const flightPassengers = this.inferFlightPassengers();
      const originCity = this.formSearch.get('origin')?.value as CityDto;
      const destinationCity = this.formSearch.get('destination')?.value as CityDto;

      // MAPEAR CIUDAD DE VUELO A CIUDAD DE HOTEL
      const hotelDestinationCity = await this.mapFlightCityToHotelCity(destinationCity);

      // CREAR OBJETO FlightSearchRequest IGUAL QUE EN VUELOS
      const flightSearchRequest: FlightSearchRequest = {
        origin: originCity.iataCode,
        destination: destinationCity.iataCode,
        departureDate: formatDateForApi(this.formSearch.get('departureDate')?.value),
        returnDate: formatDateForApi(this.formSearch.get('returnDate')?.value),
        adults: this.getTotalAdults(),
        children: flightPassengers.children > 0 ? flightPassengers.children : undefined,
        infants: flightPassengers.infants > 0 ? flightPassengers.infants : undefined,
        currency: 'ARS',
        nonStop: false
      };

      const travelClass = this.formSearch.get('travelClass')?.value;
      if (travelClass && travelClass !== '') {
        flightSearchRequest.travelClass = travelClass;
      }

      // CREAR OBJETO HotelSearchRequest IGUAL QUE EN HOTELES
      const hotelOccupancy: any = {
        rooms: 1, // SIEMPRE 1 como en hoteles
        adults: this.getTotalAdults(),
        children: this.getTotalChildren(),
      };

      // Agregar paxes solo si hay niños
      if (this.getTotalChildren() > 0 && this.occupancies[0].paxes) {
        hotelOccupancy.paxes = this.occupancies[0].paxes
          .filter((pax) => pax.type === 'CH')
          .map((pax) => ({
            type: pax.type,
            age: pax.age,
          }));
      }

      const hotelSearchRequest: HotelSearchRequest = {
        stay: {
          checkIn: this.formSearch.get('departureDate')?.value, // FECHAS IGUALES - SIMPLIFICADO
          checkOut: this.formSearch.get('returnDate')?.value,   // FECHAS IGUALES - SIMPLIFICADO
        },
        occupancies: [hotelOccupancy],
        destination: {
          code: hotelDestinationCity.iataCode // USAR EL CÓDIGO MAPEADO DE HOTELES
        },
        currency: 'ARS',
        language: 'CAS',
      };

      console.log('Flight Search Request:', flightSearchRequest);
      console.log('Hotel Search Request:', hotelSearchRequest);
      console.log('Ciudad vuelo:', destinationCity);
      console.log('Ciudad hotel mapeada:', hotelDestinationCity);

      // Navegar a resultados de paquetes
      this.router.navigate(['/home/packages/results'], {
        state: { 
          flightSearchRequest,
          hotelSearchRequest,
          originCity,
          destinationCity: destinationCity, // Ciudad original del vuelo
          hotelDestinationCity, // Ciudad mapeada para hoteles
          // Datos para mostrar en resultados
          packageInfo: {
            departureDate: this.formSearch.get('departureDate')?.value,
            returnDate: this.formSearch.get('returnDate')?.value,
            totalAdults: this.getTotalAdults(),
            totalChildren: this.getTotalChildren(),
            totalRooms: this.getTotalRooms()
          }
        },
      });

    } catch (error) {
      console.error('Error al buscar paquetes:', error);
      alert('Error: ' + (error as Error).message);
    } finally {
      this.isLoading = false;
    }
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