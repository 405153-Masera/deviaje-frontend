import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DeviajeCalendarComponent } from '../../../../../shared/components/deviaje-calendar/deviaje-calendar.component';
import { DeviajeCityInputComponent } from '../../../../../shared/components/deviaje-city-input/deviaje-city-input.component';
import { CityDto } from '../../../../../shared/models/locations';
import { HotelSearchRequest } from '../../../../../shared/models/hotels';
import { DeviajeRoomGuestSelectComponent } from '../../../../../shared/components/deviaje-room-guest-select/deviaje-room-guest-select.component';

@Component({
  selector: 'app-deviaje-hotels-search',
  standalone: true,
  imports: [
    CommonModule,
    DeviajeCalendarComponent,
    ReactiveFormsModule,
    DeviajeCityInputComponent,
    DeviajeRoomGuestSelectComponent,
  ],
  templateUrl: './deviaje-hotels-search.component.html',
  styleUrl: './deviaje-hotels-search.component.scss',
})
export class DeviajeHotelsSearchComponent implements OnInit, OnDestroy {
  //private readonly hotelService: HotelService = inject(HotelService);
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly router: Router = inject(Router);
  subscription: Subscription = new Subscription();

  @ViewChild('dateCalendar') calendar!: DeviajeCalendarComponent;
  @ViewChild('destinationCityInput')
  destinationCityInput!: DeviajeCityInputComponent;

  formSearch: FormGroup = this.fb.group({
    destination: [null, Validators.required],
    checkInDate: [
      new Date(new Date().setDate(new Date().getDate() + 1)),
      Validators.required,
    ],
    checkOutDate: [
      new Date(new Date().setDate(new Date().getDate() + 7)),
      Validators.required,
    ],
    currency: ['ARS'],
  });

  // Variables para la ciudad de destino
  destinationCity: string = '';

  // Ocupación de habitaciones
  occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age: number;
    }>;
  }> = [{ rooms: 1, adults: 1, children: 0 }];

  // Variables para fechas
  checkInDate: Date | null = null;
  checkOutDate: Date | null = null;
  isCalendarOpen: boolean = false;
  minDate: Date = new Date(); // Fecha mínima (hoy)
  currentCalendarField: 'checkin' | 'checkout' | null = null;

  // Estado de carga
  isLoading: boolean = false;

  ngOnInit(): void {}

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

  // Método para recibir cambios en las ocupaciones
  handleOccupanciesChanged(
    occupancies: Array<{
      rooms: number;
      adults: number;
      children: number;
      paxes?: Array<{
        type: string;
        age: number;
      }>;
    }>
  ): void {
    this.occupancies = occupancies;
  }
  getTotalRooms(): number {
    return this.occupancies.length;
  }

  getTotalGuests(): number {
    return this.occupancies.reduce((total, room) => {
      return total + room.adults + room.children;
    }, 0);
  }

  searchHotels(): void {
    if (this.formSearch.invalid) {
      this.formSearch.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    // Crear estructura de ocupaciones - siempre 1 habitación
    const occupancy: any = {
      rooms: 1, // SIEMPRE 1
      adults: this.occupancies[0].adults,
      children: this.occupancies[0].children,
    };

    // Solo agregar paxes si hay niños
    if (this.occupancies[0].children > 0 && this.occupancies[0].paxes) {
      occupancy.paxes = this.occupancies[0].paxes
        .filter((pax) => pax.type === 'CH')
        .map((pax) => ({
          type: pax.type,
          age: pax.age,
        }));
    }

    // Crear solicitud completa - array con 1 elemento
    const searchParams: HotelSearchRequest = {
      stay: {
        checkIn: this.formSearch.get('checkInDate')?.value,
        checkOut: this.formSearch.get('checkOutDate')?.value,
      },
      occupancies: [occupancy], // Array con 1 ocupación
      destination: {
        code: this.formSearch.get('destination')?.value.iataCode,
      },
      currency: this.formSearch.get('currency')?.value,
      language: 'CAS',
    };

    // Navegar a la página de resultados
    this.router.navigate(['/home/hotels/results'], {
      state: { searchParams },
    });

    this.isLoading = false;
  }
}
