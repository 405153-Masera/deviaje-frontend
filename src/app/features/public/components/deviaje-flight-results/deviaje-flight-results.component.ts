import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  FlightOffer,
  FlightSearchRequest,
} from '../../../../shared/models/flights';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { FlightService } from '../../../../shared/services/flight.service';
import { Subscription } from 'rxjs';
import { DeviajeFlightDetailComponent } from '../deviaje-flight-detail/deviaje-flight-detail.component';
import { CityDto } from '../../../../shared/models/locations';
import { CountryService } from '../../../../shared/services/country.service';

@Component({
  selector: 'app-deviaje-flight-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DeviajeFlightDetailComponent,
  ],
  templateUrl: './deviaje-flight-results.component.html',
  styleUrl: './deviaje-flight-results.component.scss',
})
export class DeviajeFlightResultsComponent implements OnInit, OnDestroy {
  private readonly router: Router = inject(Router);
  subscription: Subscription = new Subscription();
  private readonly flightService: FlightService = inject(FlightService);
  private readonly countryService: CountryService = inject(CountryService);
  readonly flightUtils: FlightUtilsService = inject(FlightUtilsService);

  flightOffers: FlightOffer[] = [];
  originCity: CityDto | null = null;
  destinationCity: CityDto | null = null;
  sortOption: string = 'price_asc';
  filteredOffers: FlightOffer[] = [];

  Math = Math;

  // Propiedades para manejar los filtros
  priceRange: { min: number; max: number; current: number } = {
    min: 0,
    max: 10000,
    current: 10000,
  };
  availableAirlines: string[] = [];
  availableCabins: string[] = [];
  selectedAirlines: string[] = [];
  selectedCabins: string[] = [];
  directFlightsOnly: boolean = false;
  maxDuration: number = 0;

  // Propiedades para el modal de detalles de vuelo
  selectedFlightForDetail: FlightOffer | null = null;
  showDetailModal: boolean = false;
  @Input() inPackageMode: boolean = false;
  @Input() searchParams: FlightSearchRequest | null = null;
  @Output() flightSelected = new EventEmitter<{
    flightOffer: FlightOffer;
    searchParams: FlightSearchRequest;
  }>();

  // propiedades para la paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  // Estado de carga
  isLoading: boolean = false;

  // Variables para controlar el estado de los filtros móviles
  showFilters: boolean = false;

  ngOnInit(): void {
    if (!this.inPackageMode) {
      if (typeof window !== 'undefined') {
        const state = window.history.state;

        if (state && state.searchParams) {
          this.searchParams = state.searchParams;
          this.originCity = state.originCity;
          this.destinationCity = state.destinationCity;

          this.searchFlights();
        } else {
          try {
            const storedParams = localStorage.getItem('flightSearchParams');
            const storedOriginCity = localStorage.getItem('cityOrigin');
            const storedDestinationCity =
              localStorage.getItem('cityDestination');
            if (storedParams) {
              this.searchParams = JSON.parse(
                storedParams
              ) as FlightSearchRequest;
              this.originCity = storedOriginCity
                ? JSON.parse(storedOriginCity)
                : null;
              this.destinationCity = storedDestinationCity
                ? JSON.parse(storedDestinationCity)
                : null;
              this.searchFlights();
            } else {
              // Si no hay datos, redirigimos a la búsqueda
              this.router.navigate(['/home/flight/search']);
            }
          } catch (e) {
            console.warn('Error al recuperar datos de localStorage:', e);
            this.router.navigate(['/home/flight/search']);
          }
        }
      }
    } else if (this.searchParams) {
      // MODO PAQUETE: Si tenemos parámetros recibidos como Input, hacer búsqueda
      this.searchFlights();
    }
  }

  searchFlights(): void {
    this.isLoading = true;

    this.subscription.add(
      this.flightService.searchFlights(this.searchParams!).subscribe({
        next: (flightOffers) => {
          this.isLoading = false;
          this.flightOffers = flightOffers;
          this.flightUtils.extractBrandedFaresFromOffers(flightOffers);

          this.preloadAirportCodes();

          try {
            localStorage.setItem(
              'flightSearchParams',
              JSON.stringify(this.searchParams)
            );
            localStorage.setItem('cityOrigin', JSON.stringify(this.originCity));
            localStorage.setItem(
              'cityDestination',
              JSON.stringify(this.destinationCity)
            );
          } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
          }

          this.initializeFilters();
          this.applyFilters();
          console.log('Resultados de búsqueda:', flightOffers);
        },
        error: (error) => {
          console.error('Error en la búsqueda de vuelos:', error);
          this.isLoading = false;
          alert(
            'Ocurrió un error al buscar los vuelos. Por favor, intenta de nuevo.'
          );
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  initializeFilters(): void {
    if (this.flightOffers.length > 0) {
      // Aca inicializamos el rango de precios
      const prices = this.flightOffers.map((offer) =>
        parseFloat(offer.price.total)
      );
      this.priceRange.min = Math.floor(Math.min(...prices));
      this.priceRange.max = Math.ceil(Math.max(...prices));
      this.priceRange.current = this.priceRange.max;

      // Aca inicializo las aerolineas (solo los codigos)
      const airlines = new Set<string>();
      this.flightOffers.forEach((offer) => {
        offer.validatingAirlineCodes.forEach((airline) =>
          airlines.add(airline)
        );
      });
      this.availableAirlines = Array.from(airlines);
      this.selectedAirlines = [];

      // Aca inicializo las travel class segun las ofertas de vuelos
      const cabins = new Set<string>();
      this.flightOffers.forEach((offer) => {
        if (offer.travelerPricings && offer.travelerPricings.length > 0) {
          offer.travelerPricings.forEach((travelPricing) => {
            if (
              travelPricing.fareDetailsBySegment &&
              travelPricing.fareDetailsBySegment.length > 0
            ) {
              travelPricing.fareDetailsBySegment.forEach((segment) => {
                if (segment.cabin) {
                  cabins.add(segment.cabin);
                }
              });
            }
          });
        }
      });
      this.availableCabins = Array.from(cabins);
      this.selectedCabins = [];

      // Aca establezco la duración máxima
      const durations = this.flightOffers.map((offer) =>
        this.flightUtils.getItineraryDurationMinutes(offer)
      );
      this.maxDuration = Math.max(...durations);
      this.filteredOffers = [...this.flightOffers];
    }
  }

  applyFilters(): void {
    this.isLoading = true;

    let filtered = [...this.flightOffers];

    if (
      this.selectedAirlines.length === 0 &&
      this.selectedCabins.length === 0 &&
      !this.directFlightsOnly &&
      this.priceRange.current === this.priceRange.max
    ) {
      this.filteredOffers = [...this.flightOffers];
      this.sortResults();
      this.currentPage = 1;
      this.isLoading = false;
      return;
    }

    // Filtrar por precio
    filtered = filtered.filter((offer) => {
      const price = parseFloat(offer.price.total);
      return price >= this.priceRange.min && price <= this.priceRange.current;
    });

    // Filtrar por aerolíneas seleccionadas
    if (this.selectedAirlines.length > 0) {
      filtered = filtered.filter(
        (offer) =>
          offer.validatingAirlineCodes &&
          offer.validatingAirlineCodes.some((airline) =>
            this.selectedAirlines.includes(airline)
          )
      );
    }

    // Filtrar por vuelos directos
    if (this.directFlightsOnly) {
      filtered = filtered.filter(
        (offer) =>
          offer.itineraries &&
          offer.itineraries.every(
            (itinerary) => itinerary.segments && itinerary.segments.length === 1
          )
      );
    }

    // Filtrar por cabinas seleccionadas
    if (this.selectedCabins.length > 0) {
      filtered = filtered.filter((offer) => {
        if (!offer.travelerPricings || offer.travelerPricings.length === 0) {
          return false;
        }

        // Comprobar si alguna de las cabinas del vuelo está en las seleccionadas
        for (const pricing of offer.travelerPricings) {
          if (
            !pricing.fareDetailsBySegment ||
            pricing.fareDetailsBySegment.length === 0
          ) {
            continue;
          }

          for (const segment of pricing.fareDetailsBySegment) {
            if (segment.cabin && this.selectedCabins.includes(segment.cabin)) {
              return true;
            }
          }
        }

        return false;
      });
    }
    this.filteredOffers = filtered;
    this.sortResults();
    this.currentPage = 1;
    this.isLoading = false;
  }

  toggleSelectedFilters(): void {
    // Obtener referencias a todos los checkboxes
    const airlineCheckboxes = document.querySelectorAll(
      'input[id^="airline-"]'
    );
    const cabinCheckboxes = document.querySelectorAll('input[id^="cabin-"]');

    // Actualizar el array de aerolíneas seleccionadas
    this.selectedAirlines = Array.from(airlineCheckboxes)
      .filter((checkbox: any) => checkbox.checked)
      .map((checkbox: any) => checkbox.id.replace('airline-', ''));

    // Actualizar el array de cabinas seleccionadas
    this.selectedCabins = Array.from(cabinCheckboxes)
      .filter((checkbox: any) => checkbox.checked)
      .map((checkbox: any) => checkbox.id.replace('cabin-', ''));

    // Actualizar el filtro de vuelos directos
    this.directFlightsOnly =
      (document.getElementById('direct-flights') as HTMLInputElement)
        ?.checked || false;
  }

  sortResults(): void {
    switch (this.sortOption) {
      case 'price_asc':
        this.filteredOffers.sort(
          //depende de (a, b)
          (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
        );
        break;
      case 'price_desc':
        this.filteredOffers.sort(
          (a, b) => parseFloat(b.price.total) - parseFloat(a.price.total)
        );
        break;
      case 'duration_asc':
        this.filteredOffers.sort((a, b) => {
          const durationA = this.flightUtils.getItineraryDurationMinutes(a);
          const durationB = this.flightUtils.getItineraryDurationMinutes(b);
          return durationA - durationB;
        });
        break;
      case 'departure_asc':
        this.filteredOffers.sort((a, b) => {
          const departureA = new Date(
            a.itineraries[0].segments[0].departure.at
          ).getTime();
          const departureB = new Date(
            b.itineraries[0].segments[0].departure.at
          ).getTime();
          return departureA - departureB;
        });
        break;
      case 'arrival_asc':
        this.filteredOffers.sort((a, b) => {
          const arrivalA = this.flightUtils
            .getArrivalDate(a.itineraries[0])
            .getTime();
          const arrivalB = this.flightUtils
            .getArrivalDate(b.itineraries[0])
            .getTime();
          return arrivalA - arrivalB;
        });
        break;
    }
  }

  durationToMinutes(duration: string): number {
    return this.flightUtils.durationToMinutes(duration);
  }

  minutesToString(minutes: number): string {
    return this.flightUtils.minutesToString(minutes);
  }

  formatDate(dateString: string): string {
    return this.flightUtils.formatDate(dateString);
  }

  formatTime(dateString: string): string {
    return this.flightUtils.formatTime(dateString);
  }

  getStopsLabel(segments: any[]): string {
    return this.flightUtils.getStopsLabel(segments);
  }

  getAirlineName(code: string): string {
    return this.flightUtils.getAirlineName(code);
  }

  getAirlineLogo(code: string): string {
    if (!code) return 'assets/images/generic-airline.png';
    return `https://www.gstatic.com/flights/airline_logos/70px/${code}.png`;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onFilterChange(): void {
    this.toggleSelectedFilters();
    this.applyFilters();
  }

  resetFilters(): void {
    this.initializeFilters();
    this.applyFilters();
  }

  //######################## METODOS DE PAGINACIÓN ########################
  get paginatedOffers(): FlightOffer[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOffers.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOffers.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): (number | string)[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const visiblePages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
      return visiblePages;
    }

    visiblePages.push(1);

    if (currentPage <= 4) {
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        visiblePages.push(i);
      }
      if (totalPages > 5) visiblePages.push('...');
    } else if (currentPage >= totalPages - 3) {
      visiblePages.push('...');
      for (let i = Math.max(2, totalPages - 4); i < totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      visiblePages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        visiblePages.push(i);
      }
      visiblePages.push('...');
    }

    if (totalPages > 1) visiblePages.push(totalPages);
    return visiblePages;
  }

  isPageNumber(page: number | string): page is number {
    return typeof page === 'number';
  }
  //######################## FIN DE METODOS DE PAGINACIÓN ########################

  showFlightDetails(offer: FlightOffer): void {
    this.selectedFlightForDetail = offer;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedFlightForDetail = null;
  }

  bookFlight(offer: FlightOffer): void {
    if (this.inPackageMode) {
      // MODO PAQUETE: Emitir evento hacia el componente padre (packages-results)
      this.flightSelected.emit({
        flightOffer: offer,
        searchParams: this.searchParams!,
      });
    } else {
      // MODO NORMAL: Navegar (lógica original sin cambios)
      this.router.navigate(['/home/flight/booking'], {
        state: { flightOffer: offer, searchParams: this.searchParams },
      });
    }
  }

  hasFlightCabinInfo(offer: FlightOffer): boolean {
    if (!offer.travelerPricings || offer.travelerPricings.length === 0) {
      return false;
    }

    for (const pricing of offer.travelerPricings) {
      if (
        pricing.fareDetailsBySegment &&
        pricing.fareDetailsBySegment.length > 0
      ) {
        for (const segment of pricing.fareDetailsBySegment) {
          if (segment.cabin) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Obtiene la cabina principal de un vuelo
  getFlightPrimaryCabin(offer: FlightOffer): string {
    if (!offer.travelerPricings || offer.travelerPricings.length === 0) {
      return 'ECONOMY';
    }

    const cabins = new Set<string>();

    for (const pricing of offer.travelerPricings) {
      if (
        pricing.fareDetailsBySegment &&
        pricing.fareDetailsBySegment.length > 0
      ) {
        for (const segment of pricing.fareDetailsBySegment) {
          if (segment.cabin) {
            cabins.add(segment.cabin);
          }
        }
      }
    }

    // Priorizar las cabinas en este orden
    const priority = ['FIRST', 'BUSINESS', 'PREMIUM_ECONOMY', 'ECONOMY'];

    for (const cabin of priority) {
      if (cabins.has(cabin)) {
        return cabin;
      }
    }

    return 'ECONOMY';
  }

  getAirportInfo(iataCode: string): string {
     return this.countryService.getAirportInfo(iataCode);
  }

  private preloadAirportCodes(): void {
    const codes: string[] = [];
    this.flightOffers.forEach(offer => {
      offer.itineraries.forEach(itinerary => {
        itinerary.segments.forEach(segment => {
          codes.push(segment.departure.iataCode);
          codes.push(segment.arrival.iataCode);
        });
      });
    });
    
    // Pre-cargar todos los códigos únicos
    const uniqueCodes = [...new Set(codes)];
    this.countryService.preloadAirports(uniqueCodes);
  }
}
