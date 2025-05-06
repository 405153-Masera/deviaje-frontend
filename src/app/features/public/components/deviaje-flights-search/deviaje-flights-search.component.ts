import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DeviajeCalendarComponent } from '../../../../shared/components/deviaje-calendar/deviaje-calendar.component';
import { FlightService } from '../../../../shared/services/flight.service';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subscription,
} from 'rxjs';
import { Router } from '@angular/router';
import { FlightSearchRequest } from '../../../../shared/models/flights';
import { DeviajeCityInputComponent } from '../../../../shared/components/deviaje-city-input/deviaje-city-input.component';
import { DeviajePassengerSelectComponent } from "../../../../shared/components/deviaje-passenger-select/deviaje-passenger-select.component";
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-deviaje-flights-search',
  standalone: true,
  imports: [CommonModule, DeviajeCalendarComponent, ReactiveFormsModule, 
    DeviajeCityInputComponent, DeviajePassengerSelectComponent,
    DateFormatPipe
  ],
  templateUrl: './deviaje-flights-search.component.html',
  styleUrl: './deviaje-flights-search.component.scss',
})
export class DeviajeFlightsSearchComponent implements OnInit, OnDestroy {

  private today: Date = new Date();
  private departureInitialDate: Date = new Date(this.today);
  private returnInitialDate: Date = new Date(this.today);
  
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly router: Router = inject(Router);
  subscription: Subscription = new Subscription();

  // Esto sirve para usar los componentes en el type script
  @ViewChild('dateCalendar') calendar!: DeviajeCalendarComponent;

  formSearch: FormGroup = this.fb.group({
    origin: [null, Validators.required],
    destination: [null, Validators.required],
    departureDate: [this.departureInitialDate, Validators.required],
    returnDate: [this.returnInitialDate],
    adults: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    children: [0],
    infants: [0],
    travelClass: [''],
    currency: ['ARS'],
    nonStop: [false],
  });

  tripType: 'roundtrip' | 'oneway' | 'multicity' = 'roundtrip';

  // Variables para pasajeros
  adults: number = 1;
  children: number = 0;
  infants: number = 0;
  isPassengerDropdownOpen: boolean = false;

  // Variables para fechas
  departureDate: Date | null = null;
  returnDate: Date | null = null;
  isCalendarOpen: boolean = false;
  minDate: Date = new Date(); // Fecha mínima (hoy)
  currentCalendarField: 'departure' | 'return' | null = null;

  // Estado de carga
  isLoading: boolean = false;

  ngOnInit(): void {
    this.updateReturnDateValidators();
    this.departureInitialDate.setDate(this.today.getDate() + 10);
    this.returnInitialDate.setDate(this.today.getDate() + 17);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  togglePassengerDropdown(): void {
    this.isPassengerDropdownOpen = !this.isPassengerDropdownOpen;
  }

  closePassengerDropdown(): void {
    this.isPassengerDropdownOpen = false;
  }

  // Métodos para el calendario
  openCalendar(field: 'departure' | 'return'): void {
    this.currentCalendarField = field;

    if (field === 'departure') {
      this.calendar.setActiveInput('start');
    } else {
      this.calendar.setActiveInput('end');
    }

    if (this.tripType === 'oneway') {
      // Para viajes de solo ida
      this.calendar.selectionMode = 'single';
    } else {
      // Para viajes de ida y vuelta
      this.calendar.selectionMode = 'range';
    }

    // Abre el calendario
    if (this.calendar) {
      this.calendar.open();
    }
  }

  closeCalendar(): void {
    this.isCalendarOpen = false;
    this.currentCalendarField = null;
  }

  selectSingleDate(date: Date | null): void {
    this.departureDate = date;
    this.formSearch.get('departureDate')?.setValue(date);
  }

  selectDateRange(range: {
    startDate: Date | null;
    endDate: Date | null;
  }): void {
    this.departureDate = range.startDate;
    this.returnDate = range.endDate;

    this.formSearch.get('departureDate')?.setValue(range.startDate);
    this.formSearch.get('returnDate')?.setValue(range.endDate);
  }

  // Métodos para cambio de tipo de viaje
  setTripType(type: 'roundtrip' | 'oneway' | 'multicity'): void {
    this.tripType = type;

    if (type === 'oneway') {
      this.returnDate = null;
      this.formSearch.get('returnDate')?.disable();
      this.formSearch.get('returnDate')?.clearValidators();
    } else if (type === 'roundtrip') {
      this.formSearch.get('returnDate')?.enable();
      this.formSearch.get('returnDate')?.setValidators(Validators.required);
    }

    this.formSearch.get('returnDate')?.updateValueAndValidity();
  }

  // Método para intercambiar origen y destino
  swapLocations(): void {
    const originValue = this.formSearch.get('origin')?.value;
    const destinationValue = this.formSearch.get('destination')?.value;
    this.formSearch.get('origin')?.setValue(destinationValue);
    this.formSearch.get('destination')?.setValue(originValue);
  }

  searchFlights(): void {
    if (this.formSearch.invalid) {
      this.formSearch.markAllAsTouched();
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    const formatDate = (date: Date | null): string | undefined => {
      if (!date) return undefined;
      return date.toISOString().split('T')[0];
    };

    // Solo incluye los campos obligatorios inicialmente
    const searchParams: FlightSearchRequest = {
      origin: this.formSearch.get('origin')?.value.iataCode,
      destination: this.formSearch.get('destination')?.value.iataCode,
      departureDate: formatDate(this.formSearch.get('departureDate')?.value)!,
      adults: this.formSearch.get('adults')?.value!,
    };

    // Añade condicionalmente los campos opcionales
    if (
      this.tripType === 'roundtrip' &&
      this.formSearch.get('returnDate')?.value
    ) {
      searchParams.returnDate = formatDate(
        this.formSearch.get('returnDate')?.value
      );
    }

    const children = this.formSearch.get('children')?.value;
    if (children && children > 0) {
      searchParams.children = children;
    }

    const infants = this.formSearch.get('infants')?.value;
    if (infants && infants > 0) {
      searchParams.infants = infants;
    }

    // Solo añade travelClass si tiene un valor válido
    const travelClass = this.formSearch.get('travelClass')?.value;
    if (travelClass && travelClass !== '') {
      searchParams.travelClass = travelClass;
    }

    const currency = this.formSearch.get('currency')?.value;
    if (currency && currency !== '') {
      searchParams.currency = currency;
    }

    const nonStop = this.formSearch.get('nonStop')?.value;
    if (nonStop === true) {
      searchParams.nonStop = nonStop;
    }

    this.router.navigate(['/home/flight/results'], {
      state: { searchParams }
    });
    this.isLoading = false;
  }

  handlePassengersChanged(passengers: {adults: number, children: number, infants: number}): void {
    this.adults = passengers.adults;
    this.children = passengers.children;
    this.infants = passengers.infants;
    
    // Actualizar el formulario si es necesario
    this.formSearch.get('adults')?.setValue(this.adults);
    this.formSearch.get('children')?.setValue(this.children);
    this.formSearch.get('infants')?.setValue(this.infants);
  }

  private updateReturnDateValidators(): void {
    const returnDateControl = this.formSearch.get('returnDate');
    if (this.tripType === 'roundtrip') {
      returnDateControl?.setValidators(Validators.required);
    } else {
      returnDateControl?.clearValidators();
    }
    returnDateControl?.updateValueAndValidity();
  }
}
