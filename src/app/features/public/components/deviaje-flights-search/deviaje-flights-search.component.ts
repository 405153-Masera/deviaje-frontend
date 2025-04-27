import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DeviajeCalendarComponent } from '../../../../shared/components/deviaje-calendar/deviaje-calendar.component';
import { FlightService } from '../../../../shared/services/flight.service';
import { CityService } from '../../../../shared/services/city.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  of,
  Subject,
  Subscription,
  switchMap,
} from 'rxjs';
import { CityDto } from '../../../../shared/models/locations';
import { Router } from '@angular/router';
import { FlightSearchRequest } from '../../../../shared/models/flights';
import { DeviajeCityInputComponent } from '../../../../shared/components/deviaje-city-input/deviaje-city-input.component';

@Component({
  selector: 'app-deviaje-flights-search',
  standalone: true,
  imports: [CommonModule, DeviajeCalendarComponent, ReactiveFormsModule, DeviajeCityInputComponent],
  templateUrl: './deviaje-flights-search.component.html',
  styleUrl: './deviaje-flights-search.component.scss',
})
export class DeviajeFlightsSearchComponent implements OnInit, OnDestroy {
  private readonly fb: FormBuilder = inject(FormBuilder);
  private readonly flightService: FlightService = inject(FlightService);
  //private readonly cityService: CityService = inject(CityService);
  private readonly router: Router = inject(Router);
  subscription: Subscription = new Subscription();

  // Esto sirve para usar los componentes en el type script
  @ViewChild('dateCalendar') calendar!: DeviajeCalendarComponent;
  @ViewChild('originCityInput') originCityInput!: DeviajeCityInputComponent;
  @ViewChild('destinationCityInput')
  destinationCityInput!: DeviajeCityInputComponent;
  //@ViewChild('originInput') originInput!: ElementRef;
  //@ViewChild('destinationInput') destinationInput!: ElementRef;

  originControl = new FormControl('', Validators.required);
  destinationControl = new FormControl('', Validators.required);

  formSearch: FormGroup = this.fb.group({
    origin: this.originControl,
    destination: this.destinationControl,
    departureDate: [null, Validators.required],
    returnDate: [null],
    adults: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    children: [0],
    infants: [0],
    travelClass: [''],
    currency: [''],
    nonStop: [false],
  });

  tripType: 'roundtrip' | 'oneway' | 'multicity' = 'roundtrip';

  //Estas variables las uso para la carga de las ciudades como sugerencia
  originCity: string = '';  // Para almacenar el código IATA
  destinationCity: string = '';  // Para almacenar el código IATA
  //originSuggestion = new Subject<string>();
  //destinationSuggestion = new Subject<string>();
  //originCities: CityDto[] = [];
  //destinationCities: CityDto[] = [];
  //isLoadingOriginCities: boolean = false;
  //isLoadingDestinationCities: boolean = false;
  //isOriginSuggestionsOpen: boolean = false;
  //isDestinationSuggestionsOpen: boolean = false;

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
    //Aca mapeamos los Subject (observables) con los observables que devuelve el servicio CityService
    /*this.subscription = this.originSuggestion
      .pipe(
        debounceTime(300), // Tiempo que tarda despues que el usuario deja de escribir
        //distinctUntilChanged(), // emite si el valor actual eers diferente al anterior
        switchMap((term) => {
          // este metodo mapea al observable a un nuevo observable
          this.isLoadingOriginCities = true;
          return term.length < 2 ? of([]) : this.cityService.searchCities(term);
        })
      )
      .subscribe((cities) => {
        this.originCities = cities;
        this.isLoadingOriginCities = false;
        this.isOriginSuggestionsOpen = cities.length > 0;
      });

      this.subscription = this.destinationSuggestion
      .pipe(
        debounceTime(300),
        //distinctUntilChanged(),
        switchMap((term) => {
          this.isLoadingDestinationCities = true;
          return term.length < 2 ? of([]) : this.cityService.searchCities(term);
        })
      )
      .subscribe((results) => {
        this.destinationCities = results;
        this.isLoadingDestinationCities = false;
        this.isDestinationSuggestionsOpen = results.length > 0;
      });*/
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Métodos para pasajeros
  get totalPassengers(): number {
    return this.adults + this.children + this.infants;
  }

  get totalMaxPassengers(): number {
    return this.adults + this.children;
  }

  incrementPassengers(type: 'adults' | 'children' | 'infants'): void {
    const maxSeatedPassengers = 9;

    if (type === 'adults' && this.totalMaxPassengers < maxSeatedPassengers) {
      this.adults++;
      this.formSearch.get('adults')?.setValue(this.adults);
    } else if (
      type === 'children' &&
      this.totalMaxPassengers < maxSeatedPassengers
    ) {
      this.children++;
      this.formSearch.get('children')?.setValue(this.children);
    } else if (type === 'infants' && this.infants < this.adults) {
      this.infants++;
      this.formSearch.get('infants')?.setValue(this.infants);
    }
  }

  decrementPassengers(type: 'adults' | 'children' | 'infants'): void {
    if (type === 'adults' && this.adults > 1) {
      this.adults--;
      this.formSearch.get('adults')?.setValue(this.adults);

      if (this.infants > this.adults) {
        this.infants = this.adults;
        this.formSearch.get('infants')?.setValue(this.infants);
      }
    } else if (type === 'children' && this.children > 0) {
      this.children--;
    } else if (type === 'infants' && this.infants > 0) {
      this.infants--;
    }
  }

  togglePassengerDropdown(): void {
    this.isPassengerDropdownOpen = !this.isPassengerDropdownOpen;
  }

  closePassengerDropdown(): void {
    this.isPassengerDropdownOpen = false;
  }

  /*@HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.passenger-selector-trigger');

    if (!clickedInside && this.isPassengerDropdownOpen) {
      this.closePassengerDropdown();
    }

    const clickedOriginInput = target.closest('.origin-input');
    if (!clickedOriginInput && this.isOriginSuggestionsOpen) {
      this.isOriginSuggestionsOpen = false;
    }

    const clickedDestinationInput = target.closest('.destination-input');
    if (!clickedDestinationInput && this.isDestinationSuggestionsOpen) {
      this.isDestinationSuggestionsOpen = false;
    }
  }*/

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

  formatDisplayDate(date: Date | null): string {
    if (!date) return '';

    // Formatea la fecha como dd/mm/aaaa
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
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

  /*//Metodos para el manejo de las ciudades
  onOriginInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;

    if (query.length >= 2) {
      this.originSuggestion.next(query);
    } else {
      this.isOriginSuggestionsOpen = false;
    }
  }

  onDestinationInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;

    if (query.length >= 2) {
      this.destinationSuggestion.next(query);
    } else {
      this.isDestinationSuggestionsOpen = false;
    }
  }*/

  /*selectOriginCity(city: CityDto): void {
    this.formSearch.get('origin')?.setValue(city.iataCode);

    this.isOriginSuggestionsOpen = false;

    // Si el destino está vacío, enfocar ese input
    if (!this.formSearch.get('destination')?.value) {
      setTimeout(() => {
        this.destinationInput.nativeElement.focus();
      }, 100);
    }
  }

  selectDestinationCity(city: CityDto): void {
    this.formSearch.get('destination')?.setValue(city.iataCode);
    this.isDestinationSuggestionsOpen = false;

    // Si las fechas están vacías, abrir el calendario
    if (!this.formSearch.get('departureDate')?.value) {
      setTimeout(() => {
        this.openCalendar('departure');
      }, 100);
    }
  }*/

  onOriginCitySelected(city: CityDto): void {

    this.originCity = city.iataCode;
    this.formSearch.get('origin')?.setValue(city.iataCode);
   
  }

  onDestinationCitySelected(city: CityDto): void {

    this.destinationCity = city.iataCode;
    this.formSearch.get('destination')?.setValue(city.iataCode);

  
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
      origin: this.formSearch.get('origin')?.value!,
      destination: this.formSearch.get('destination')?.value!,
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

    this.subscription = this.flightService
      .searchFlights(searchParams)
      .subscribe({
        next: (flightOffers) => {
          this.isLoading = false;

          console.log('Resultados de búsqueda:', flightOffers);
          this.router.navigate(['/flights/results'], {
            state: { flightOffers, searchParams },
          });
        },
        error: (error) => {
          console.error('Error en la búsqueda de vuelos:', error);
          this.isLoading = false;
          alert(
            'Ocurrió un error al buscar los vuelos. Por favor, intenta de nuevo.'
          );
        },
      });
  }
}
