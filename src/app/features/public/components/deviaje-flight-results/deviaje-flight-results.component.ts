import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  FlightOffer,
  FlightSearchRequest,
} from '../../../../shared/models/flights';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule} from '@angular/forms';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { FlightService } from '../../../../shared/services/flight.service';
import { Subscription } from 'rxjs';
import { DeviajeFlightDetailComponent } from "../deviaje-flight-detail/deviaje-flight-detail.component";

@Component({
  selector: 'app-deviaje-flight-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DeviajeFlightDetailComponent],
  templateUrl: './deviaje-flight-results.component.html',
  styleUrl: './deviaje-flight-results.component.scss',
})
export class DeviajeFlightResultsComponent implements OnInit, OnDestroy {
  
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  subscription: Subscription = new Subscription();
  private readonly flightService: FlightService = inject(FlightService);
  readonly flightUtils: FlightUtilsService = inject(FlightUtilsService);

  flightOffers: FlightOffer[] = [];
  searchParams?: FlightSearchRequest;
  sortOption: string = 'price_asc';
  filteredOffers: FlightOffer[] = [];

  Math = Math;

  // Propiedades para manejar los filtros
  priceRange: { min: number; max: number; current: number } = { min: 0, max: 10000, current:10000 };
  availableAirlines: string[] = []; 
  availableCabins: string[] = []; 
  selectedAirlines: string[] = [];
  selectedCabins: string[] = [];
  directFlightsOnly: boolean = false;
  maxDuration: number = 0;

  // Propiedades para el modal de detalles de vuelo
  selectedFlightForDetail: FlightOffer | null = null;
  showDetailModal: boolean = false;

  // propiedades para la paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  // Estado de carga
  isLoading: boolean = false;

  // Variables para controlar el estado de los filtros móviles
  showFilters: boolean = false;

  ngOnInit(): void {

    if(typeof window !== 'undefined') {
      const state = window.history.state;

      if(state && state.searchParams){
        this.searchParams = state.searchParams;

        if(state.flightOffers){
          this.flightOffers = state.flightOffers;

          try {
            localStorage.setItem('flightSearchParams', JSON.stringify(this.searchParams));
            localStorage.setItem('flightSearchResults', JSON.stringify(this.flightOffers));
            localStorage.setItem('flightSearchTimestamp', Date.now().toString());
          } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
          }
  
          this.initializeFilters();
          this.applyFilters();
        } else {
          this.searchFlights();
        }
        
      } else {

        try {
          const storedParams = localStorage.getItem('flightSearchParams');
          const storedResults = localStorage.getItem('flightSearchResults');
          const timestamp = localStorage.getItem('flightSearchTimestamp');
          
          // Verificar si los datos tienen menos de 5 minutos de antigüedad
          const isDataFresh = timestamp && (Date.now() - parseInt(timestamp)) < 10 * 60 * 1000;
          
          if (storedParams && storedResults && isDataFresh) {
            this.searchParams = JSON.parse(storedParams) as FlightSearchRequest;
            this.flightOffers = JSON.parse(storedResults) as FlightOffer[];
            
            this.initializeFilters();
            this.applyFilters();
          } else if (storedParams) {
            // Si los datos son viejos pero tenemos los parámetros, hacemos una nueva búsqueda
            this.searchParams = JSON.parse(storedParams) as FlightSearchRequest;
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
    } else {
      // Si estamos en SSR, esperamos a que se cargue en el cliente
      console.log('Ejecutando en SSR, esperando carga en cliente');
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

          try {
            localStorage.setItem('flightSearchResults', JSON.stringify(flightOffers));
            localStorage.setItem('flightSearchTimestamp', Date.now().toString());
          } catch (e) {
            console.warn('No se pudo guardar en localStorage:', e);
          }

          this.router.navigate([], {
            relativeTo: this.route,
            state: { flightOffers: flightOffers, searchParams: this.searchParams }
          });

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
      this.selectedAirlines = [...this.availableAirlines];

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
      this.selectedCabins = [...this.availableCabins];

       // Aca establezco la duración máxima
       const durations = this.flightOffers.map(offer => this.flightUtils.getItineraryDurationMinutes(offer));
       this.maxDuration = Math.max(...durations);
       this.filteredOffers = [...this.flightOffers];
    }
  }

  applyFilters(): void {
    this.isLoading = true;

    // Verificar si hay alguna aerolínea o cabina seleccionada
    const hasAirlinesSelected = this.selectedAirlines.length > 0;
    const hasCabinsSelected = this.selectedCabins.length > 0;
  
    // Si no hay ninguna aerolínea o cabina seleccionada, mostrar mensaje de "No hay resultados"
    if ((!hasAirlinesSelected && this.availableAirlines.length > 0) || 
        (!hasCabinsSelected && this.availableCabins.length > 0)) {
      this.filteredOffers = [];
      this.sortResults();
      this.currentPage = 1;
      this.isLoading = false;
      return;
    }

    let filtered = [...this.flightOffers];

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
      filtered = filtered.filter(offer => {
        if (!offer.travelerPricings || offer.travelerPricings.length === 0) {
          return false;
        }
        
        // Comprobar si alguna de las cabinas del vuelo está en las seleccionadas
        for (const pricing of offer.travelerPricings) {
          if (!pricing.fareDetailsBySegment || pricing.fareDetailsBySegment.length === 0) {
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
    const airlineCheckboxes = document.querySelectorAll('input[id^="airline-"]');
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
    this.directFlightsOnly = (document.getElementById('direct-flights') as HTMLInputElement)?.checked || false;
  }

  sortResults(): void {
    switch (this.sortOption) {
      case 'price_asc':
        this.filteredOffers.sort( //depende de (a, b)
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

  // Paginación
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

  showFlightDetails(offer: FlightOffer): void {
    this.selectedFlightForDetail = offer;
    this.showDetailModal = true;
  }
  
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedFlightForDetail = null;
  }

  bookFlight(offer: FlightOffer): void {
    // Navegar a la página de reserva de vuelo
    this.router.navigate(['/home/flight/booking'], {
      state: { flightOffer: offer, searchParams: this.searchParams },
    });
  }

  hasFlightCabinInfo(offer: FlightOffer): boolean {
    if (!offer.travelerPricings || offer.travelerPricings.length === 0) {
      return false;
    }
    
    for (const pricing of offer.travelerPricings) {
      if (pricing.fareDetailsBySegment && pricing.fareDetailsBySegment.length > 0) {
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
      if (pricing.fareDetailsBySegment && pricing.fareDetailsBySegment.length > 0) {
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
}
