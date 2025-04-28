import { Component, inject, OnInit } from '@angular/core';
import { FlightOffer, FlightSearchRequest } from '../../../../shared/models/flights';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';

@Component({
  selector: 'app-deviaje-flight-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './deviaje-flight-results.component.html',
  styleUrl: './deviaje-flight-results.component.scss'
})
export class DeviajeFlightResultsComponent implements OnInit{
  
  flightOffers: FlightOffer[] = [];
  searchParams?: FlightSearchRequest;
  sortOption: string = 'price_asc';
  filteredOffers: FlightOffer[] = [];

  Math = Math;
  
  // Filtros
  priceRange: { min: number, max: number } = { min: 0, max: 10000 };
  selectedAirlines: string[] = [];
  directFlightsOnly: boolean = false;
  
  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  // Estado de carga
  isLoading: boolean = false;
  
  // Variables para controlar el estado de los filtros móviles
  showFilters: boolean = false;

  constructor(
    private router: Router,
    public flightUtils: FlightUtilsService
  ) { }

  ngOnInit(): void {
    //const navigation = this.router.getCurrentNavigation();
    const state = history.state;
    
    if (state) {
      this.flightOffers = state['flightOffers'] as FlightOffer[] || [];
      this.searchParams = state['searchParams'] as FlightSearchRequest;
      
      // Inicializar filtros basados en los resultados
      this.initializeFilters();
      
      // Aplicar filtros iniciales
      this.applyFilters();
    } else {
      // Si no hay datos en state, redirigir a la búsqueda
      this.router.navigate(['/home/flight-search']);
    }
  }

  initializeFilters(): void {
    // Establecer rango de precios basado en los resultados
    if (this.flightOffers.length > 0) {
      const prices = this.flightOffers.map(offer => parseFloat(offer.price.total));
      this.priceRange.min = Math.floor(Math.min(...prices));
      this.priceRange.max = Math.ceil(Math.max(...prices));
      
      // Establecer aerolíneas disponibles
      const airlines = new Set<string>();
      this.flightOffers.forEach(offer => {
        offer.validatingAirlineCodes.forEach(airline => airlines.add(airline));
      });
      this.selectedAirlines = Array.from(airlines);
    }
    
    // Aplicar los filtros iniciales a los resultados
    this.filteredOffers = [...this.flightOffers];
  }

  applyFilters(): void {
    this.isLoading = true;
    
    // Filtrar por precio
    this.filteredOffers = this.flightOffers.filter(offer => {
      const price = parseFloat(offer.price.total);
      return price >= this.priceRange.min && price <= this.priceRange.max;
    });
    
    // Filtrar por aerolíneas seleccionadas
    if (this.selectedAirlines && this.selectedAirlines.length > 0) {
      this.filteredOffers = this.filteredOffers.filter(offer => 
        offer.validatingAirlineCodes && offer.validatingAirlineCodes.some(airline => 
          this.selectedAirlines.includes(airline)
        )
      );
    }
    
    // Filtrar por vuelos directos
    if (this.directFlightsOnly) {
      this.filteredOffers = this.filteredOffers.filter(offer => 
        offer.itineraries && offer.itineraries.every(itinerary => 
          itinerary.segments && itinerary.segments.length === 1
        )
      );
    }
    
    // Ordenar los resultados
    this.sortResults();
    
    // Simular tiempo de carga
    setTimeout(() => {
      this.isLoading = false;
    }, 300);
  }

  sortResults(): void {
    switch(this.sortOption) {
      case 'price_asc':
        this.filteredOffers.sort((a, b) => 
          parseFloat(a.price.total) - parseFloat(b.price.total)
        );
        break;
      case 'price_desc':
        this.filteredOffers.sort((a, b) => 
          parseFloat(b.price.total) - parseFloat(a.price.total)
        );
        break;
      case 'duration_asc':
        this.filteredOffers.sort((a, b) => {
          const durationA = this.flightUtils.getTotalDurationMinutes(a);
          const durationB = this.flightUtils.getTotalDurationMinutes(b);
          return durationA - durationB;
        });
        break;
      case 'departure_asc':
        this.filteredOffers.sort((a, b) => {
          const departureA = new Date(a.itineraries[0].segments[0].departure.at).getTime();
          const departureB = new Date(b.itineraries[0].segments[0].departure.at).getTime();
          return departureA - departureB;
        });
        break;
      case 'arrival_asc':
        this.filteredOffers.sort((a, b) => {
          const arrivalA = this.flightUtils.getArrivalTime(a.itineraries[0]).getTime();
          const arrivalB = this.flightUtils.getArrivalTime(b.itineraries[0]).getTime();
          return arrivalA - arrivalB;
        });
        break;
    }
  }

  // Métodos de utilidad que redirigen al servicio
  parseDuration(duration: string): number {
    return this.flightUtils.parseDuration(duration);
  }

  formatDuration(minutes: number): string {
    return this.flightUtils.formatDuration(minutes);
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
    this.applyFilters();
  }

  resetFilters(): void {
    this.initializeFilters();
    this.applyFilters();
  }

  // Paginación
  get paginatedOffers(): FlightOffer[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOffers.slice(startIndex, startIndex + this.itemsPerPage);
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

  bookFlight(offer: FlightOffer): void {
    // Navegar a la página de reserva de vuelo
    this.router.navigate(['/flights/booking'], {
      state: { flightOffer: offer, searchParams: this.searchParams }
    });
  }
}
