import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DeviajeCalendarComponent } from '../../../../../shared/components/deviaje-calendar/deviaje-calendar.component';
import { DeviajeCityInputComponent } from '../../../../../shared/components/deviaje-city-input/deviaje-city-input.component';
import { CityDto } from '../../../../../shared/models/locations';
import { HotelService } from '../../../../../shared/services/hotel.service';
import { HotelOffersRequest } from '../../../../../shared/models/hotels';
import { DeviajeRoomGuestSelectComponent } from "../../../../../shared/components/deviaje-room-guest-select/deviaje-room-guest-select.component";

@Component({
  selector: 'app-deviaje-hotels-search',
  standalone: true,
  imports: [
    CommonModule,
    DeviajeCalendarComponent,
    ReactiveFormsModule,
    DeviajeCityInputComponent,
    DeviajeRoomGuestSelectComponent
],
  templateUrl: './deviaje-hotels-search.component.html',
  styleUrl: './deviaje-hotels-search.component.scss',
})
export class DeviajeHotelsSearchComponent implements OnInit, OnDestroy {

  private readonly hotelService: HotelService = inject(HotelService);
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly router: Router = inject(Router);
  subscription: Subscription = new Subscription();

  @ViewChild('dateCalendar') calendar!: DeviajeCalendarComponent;
  @ViewChild('destinationCityInput')
  destinationCityInput!: DeviajeCityInputComponent;

  destinationControl = new FormControl('', Validators.required);

  formSearch: FormGroup = this.fb.group({
    destination: this.destinationControl,
    checkInDate: [null, Validators.required],
    checkOutDate: [null, Validators.required],
    adults: [1, [Validators.required, Validators.min(1)]],
    children: [0],
    rooms: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    stars: [''],
    currency: ['ARS'],
  });

  // Variables para la ciudad de destino
  destinationCity: string = '';

  // Variables para habitaciones y huéspedes
  adults: number = 1;
  children: number = 0;
  rooms: number = 1;

  // Variables para fechas
  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  isCalendarOpen: boolean = false;
  minDate: Date = new Date(); // Fecha mínima (hoy)
  currentCalendarField: 'checkin' | 'checkout' | null = null;

  // Estado de carga
  isLoading: boolean = false;

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Métodos para el calendario
  openCalendar(field: 'checkin' | 'checkout'): void {
    this.currentCalendarField = field;

    if (field === 'checkin') {
      this.calendar.setActiveInput('start');
    } else {
      this.calendar.setActiveInput('end');
    }

    // Configuración para un rango de fechas (entrada y salida)
    this.calendar.selectionMode = 'range';

    // Abre el calendario
    if (this.calendar) {
      this.calendar.open();
    }
  }

  closeCalendar(): void {
    this.isCalendarOpen = false;
    this.currentCalendarField = null;
  }

  formatDisplayDate(date: Date | null): string {
    if (!date) return '';

    // Formatea la fecha como dd/mm/aaaa
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  selectDateRange(range: {
    startDate: Date | null;
    endDate: Date | null;
  }): void {
    this.checkInDate = range.startDate;
    this.checkOutDate = range.endDate;

    this.formSearch.get('checkInDate')?.setValue(range.startDate);
    this.formSearch.get('checkOutDate')?.setValue(range.endDate);
  }

  onDestinationCitySelected(city: CityDto): void {
    this.destinationCity = city.iataCode;
    this.formSearch.get('destination')?.setValue(city.iataCode);
  }

  searchHotels(): void {
    if (this.formSearch.invalid) {
      this.formSearch.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const formatDate = (date: Date | null): string | undefined => {
      if (!date) return undefined;
      return date.toISOString().split('T')[0];
    };

    // Primero vamos a buscar hoteles en la ciudad
    const citySearchParams = {
      cityCode: this.formSearch.get('destination')?.value,
      ratings: this.formSearch.get('stars')?.value ? [this.formSearch.get('stars')?.value] : undefined
    };

    this.subscription.add(
      this.hotelService.findHotelsByCity(citySearchParams).subscribe({
        next: (response) => {
          // Extraer IDs de los hoteles encontrados
          const hotelIds = response.data.map((hotel: any) => hotel.hotelId);
          
          if (hotelIds.length === 0) {
            this.isLoading = false;
            // Mostrar mensaje de no hay hoteles disponibles
            return;
          }
          
          // Ahora buscar ofertas para esos hoteles
          const offerParams: HotelOffersRequest = {
            hotelIds: hotelIds.slice(0, 20), // Limitar a 20 hoteles para evitar sobrecarga
            checkInDate: formatDate(this.formSearch.get('checkInDate')?.value)!,
            checkOutDate: formatDate(this.formSearch.get('checkOutDate')?.value)!,
            adults: this.formSearch.get('adults')?.value,
            roomQuantity: this.formSearch.get('rooms')?.value,
            currency: this.formSearch.get('currency')?.value
          };
          
          // Buscar ofertas para los hoteles encontrados
          this.hotelService.findHotelOffers(offerParams).subscribe({
            next: (offers) => {
              this.isLoading = false;
              
              // Navegar a la página de resultados con los parámetros y ofertas
              const searchParams = {
                destination: this.formSearch.get('destination')?.value,
                checkInDate: formatDate(this.formSearch.get('checkInDate')?.value),
                checkOutDate: formatDate(this.formSearch.get('checkOutDate')?.value),
                adults: this.formSearch.get('adults')?.value,
                children: this.formSearch.get('children')?.value,
                rooms: this.formSearch.get('rooms')?.value,
                stars: this.formSearch.get('stars')?.value,
                currency: this.formSearch.get('currency')?.value,
              };
              
              this.router.navigate(['/home/hotels/results'], {
                state: { searchParams, hotelOffers: offers }
              });
            },
            error: (error) => {
              console.error('Error al buscar ofertas de hoteles:', error);
              this.isLoading = false;
              // Mostrar mensaje de error
            }
          });
        },
        error: (error) => {
          console.error('Error al buscar hoteles:', error);
          this.isLoading = false;
        }
      })
    );
  }
}
