import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HotelService } from '../../../../../shared/services/hotel.service';
import { Subscription } from 'rxjs';
import {
  HotelResponseDto,
  HotelSearchRequest,
  HotelSearchResponse,
} from '../../../../../shared/models/hotels';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CityDto } from '../../../../../shared/models/locations';
import { DeviajeHotelDetailComponent } from '../deviaje-hotel-detail/deviaje-hotel-detail.component';
import { environment } from '../../../../../shared/enviroments/enviroment';

@Component({
  selector: 'app-deviaje-hotels-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DeviajeHotelDetailComponent,
  ],
  templateUrl: './deviaje-hotels-results.component.html',
  styleUrl: './deviaje-hotels-results.component.scss',
})
export class DeviajeHotelsResultsComponent implements OnInit {
  private readonly router: Router = inject(Router);
  hotelService: HotelService = inject(HotelService);
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  subscription: Subscription = new Subscription();

  // Input para cuando se utiliza como componente dentro de paquetes
  @Input() inPackageMode: boolean = false;
  @Input() searchParams: HotelSearchRequest | null = null;
  @Output() hotelSelected = new EventEmitter<{
    hotelDetails: HotelResponseDto | null;
    hotel: HotelSearchResponse.Hotel;
    nameRoom: string;
    rate: HotelSearchResponse.Rate;
    rateKey: string;
    recheck: boolean;
    searchParams: HotelSearchRequest;
  }>();

  selectedHotelForDetail: HotelSearchResponse.Hotel | null = null;
  showDetailModal: boolean = false;

  // Resultados y filtros
  searchResults: HotelSearchResponse | null = null;
  filteredHotels: HotelSearchResponse.Hotel[] = [];
  destinationCity: CityDto | null = null;

  // Por:
  categoryFilters = [
    { value: '5', label: '5 estrellas' },
    { value: '4', label: '4 estrellas' },
    { value: '3', label: '3 estrellas' },
    { value: '2', label: '2 estrellas' },
    { value: '1', label: '1 estrellas' },
    { value: 'other', label: 'Otros' },
  ];

  // Estado de carga
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  // Filtros
  priceRange: { min: number; max: number; current: number } = {
    min: 0,
    max: 10000,
    current: 10000,
  };
  selectedCategories: string[] = [];
  sortOption: string = 'price_asc';
  showFilters: boolean = false;

  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;

  ngOnInit(): void {
    if (!this.inPackageMode) {
      // Solo buscar hoteles si no estamos en modo paquete
      if (typeof window !== 'undefined') {
        const state = window.history.state;

        if (state && state.searchParams) {
          this.searchParams = state.searchParams;
          this.destinationCity = state.destination;

          this.searchHotels();
        } else {
          this.tryLoadFromStorage();
        }
      }
    } else if (this.searchParams) {
      // Si estamos en modo paquete y tenemos parámetros, hacer búsqueda
      this.searchHotels();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  searchHotels(): void {
    if (!this.searchParams) {
      this.router.navigate(['/home/hotels/search']);
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    this.subscription.add(
      this.hotelService.findHotelsByCity(this.searchParams).subscribe({
        next: (response) => {
          this.processSearchResults(response);
          this.isLoading = false;

          if (!this.inPackageMode) {
            // Solo guardar en localStorage si no estamos en modo paquete
            try {
              localStorage.setItem(
                'hotelSearchParams',
                JSON.stringify(this.searchParams)
              );
              localStorage.setItem(
                'destination',
                JSON.stringify(this.destinationCity)
              );
            } catch (e) {
              console.warn('No se pudo guardar en localStorage:', e);
            }
          }
        },
        error: (error) => {
          console.error('Error al buscar hoteles:', error);
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage =
            'Error al buscar hoteles. Por favor, intenta de nuevo.';
        },
      })
    );
  }

  private tryLoadFromStorage(): void {
    try {
      const storedParams = localStorage.getItem('hotelSearchParams');
      const storedDestination = localStorage.getItem('destination');

      if (storedParams) {
        this.searchParams = JSON.parse(storedParams);
        this.destinationCity = storedDestination
          ? JSON.parse(storedDestination)
          : null;

        this.searchHotels();
      } else {
        this.router.navigate(['/home/hotels/search']);
      }
    } catch (e) {
      console.warn('Error al recuperar datos de localStorage:', e);
      this.router.navigate(['/home/hotels/search']);
    }
  }

  private processSearchResults(response: HotelSearchResponse): void {
    this.searchResults = response;

    if (response && response.hotels && response.hotels.hotels) {
      const hotels = response.hotels.hotels;

      // Inicializar filtros
      this.initializeFilters(hotels);

      // Aplicar filtros iniciales
      this.applyFilters();
    } else {
      this.filteredHotels = [];
    }
  }

  private initializeFilters(hotels: HotelSearchResponse.Hotel[]): void {
    // Rango de precios
    const prices = hotels.map((hotel) => hotel.minRate || 0);
    this.priceRange.min = this.hotelService.convertToArs(
      Math.floor(Math.min(...prices))
    );
    this.priceRange.max = this.hotelService.convertToArs(
      Math.ceil(Math.max(...prices))
    );
    this.priceRange.current = this.priceRange.max;
    this.selectedCategories = [];
  }

  applyFilters(): void {
    this.isLoading = true;

    let filtered = [...(this.searchResults?.hotels?.hotels || [])];

    if (
      this.selectedCategories.length === 0 &&
      this.priceRange.current === this.priceRange.max
    ) {
      this.filteredHotels = [...(this.searchResults?.hotels?.hotels || [])];
      this.sortResults();
      this.currentPage = 1;
      this.isLoading = false;
      return;
    }

    // Filtrar por precio
    filtered = filtered.filter((hotel) => {
      const price = this.hotelService.convertToArs(hotel.minRate);
      return price >= this.priceRange.min && price <= this.priceRange.current;
    });

    // Filtrar por categorías seleccionadas
    if (this.selectedCategories && this.selectedCategories.length > 0) {
      filtered = filtered.filter((hotel) => {
        const stars = this.getCategoryStars(hotel.categoryName || '');

        return this.selectedCategories.some((category) => {
          if (category === 'other') {
            return stars === 0; // Sin estrellas = "Otros"
          }
          return stars.toString() === category;
        });
      });
    }

    this.filteredHotels = filtered;
    this.sortResults();
    this.currentPage = 1;
    this.isLoading = false;
  }

  sortResults(): void {
    switch (this.sortOption) {
      case 'price_asc':
        this.filteredHotels.sort((a, b) => (a.minRate || 0) - (b.minRate || 0));
        break;
      case 'price_desc':
        this.filteredHotels.sort((a, b) => (b.minRate || 0) - (a.minRate || 0));
        break;
      case 'stars_desc':
        this.filteredHotels.sort((a, b) => {
          const starsA = this.getCategoryStars(a.categoryCode || '');
          const starsB = this.getCategoryStars(b.categoryCode || '');
          return starsB - starsA;
        });
        break;
      case 'name_asc':
        this.filteredHotels.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
        break;
    }
  }

  onCategoryChange(categoryValue: string, event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.checked) {
      // Agregar categoría si no está
      if (!this.selectedCategories.includes(categoryValue)) {
        this.selectedCategories.push(categoryValue);
      }
    } else {
      // Remover categoría si está
      this.selectedCategories = this.selectedCategories.filter(
        (cat) => cat !== categoryValue
      );
    }

    // Aplicar filtros después del cambio
    this.applyFilters();
  }

  getCategoryStars(categoryName: string): number {
    if (!categoryName) return 0;

    // Si contiene "ESTRELLAS", extraer número
    if (categoryName.includes('ESTRELLAS')) {
      const starsMatch = categoryName.match(/(\d+)\s*ESTRELLAS?/i);
      if (starsMatch) {
        return parseInt(starsMatch[1]);
      }
    }

    return 0; // Para otros tipos como "LLAVES", "BOUTIQUE", etc.
  }

  resetFilters(): void {
    if (
      this.searchResults &&
      this.searchResults.hotels &&
      this.searchResults.hotels.hotels
    ) {
      this.initializeFilters(this.searchResults.hotels.hotels);
      this.applyFilters();
    }
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  //###################### METÓDOS DE PAGINACIÓN ######################
  get paginatedHotels(): HotelSearchResponse.Hotel[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredHotels.slice(
      startIndex,
      startIndex + this.itemsPerPage
    );
  }

  get totalPages(): number {
    return Math.ceil(this.filteredHotels.length / this.itemsPerPage);
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
  //###################### METÓDOS DE PAGINACIÓN ######################

  //####################### METÓDOS PARA DETALLES DE LOS HOTELES ######################
  showHotelDetails(hotel: HotelSearchResponse.Hotel): void {
    console.log(
      'Mostrando detalles del hotel:',
      hotel.name,
      'Modo paquete:',
      this.inPackageMode
    );
    // Depura
    if (this.inPackageMode) {
      // En modo paquete, mostrar modal
      this.selectedHotelForDetail = hotel;
      this.showDetailModal = true;
    } else {
      if (!hotel.code) {
        console.error('Hotel code is missing:', hotel);
        return; // Evitar navegar si no hay code
      }
      this.router.navigate(['/home/hotels/detail', hotel.code], {
        state: { hotel, searchParams: this.searchParams },
      });
    }
  }

  // Obtener el precio mínimo de las habitaciones
  getMinRoomPrice(hotel: HotelSearchResponse.Hotel): number {
    if (!hotel.rooms || hotel.rooms.length === 0) {
      return hotel.minRate || 0;
    }

    let minPrice = Number.MAX_VALUE;

    for (const room of hotel.rooms) {
      if (room.rates && room.rates.length > 0) {
        for (const rate of room.rates) {
          if (rate.net !== undefined && rate.net < minPrice) {
            minPrice = rate.net;
          }
        }
      }
    }

    return minPrice === Number.MAX_VALUE ? hotel.minRate || 0 : minPrice;
  }

  // NUEVO: Obtener URL de Google Maps para el hotel
  getGoogleMapsUrl(hotel: HotelSearchResponse.Hotel): SafeResourceUrl {
   
    const apiKey = environment.googleMaps.apiKey;
    
    // Si el hotel tiene coordenadas, usarlas
    if (hotel.latitude && hotel.longitude) {
      const lat = hotel.latitude;
      const lng = hotel.longitude;
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`
      );
    }

    // Si no tiene coordenadas, buscar por nombre y ubicación
    const query = encodeURIComponent(
      `${hotel.name} ${hotel.destinationCode || ''}`
    );
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps/embed/v1/search?key=${apiKey}&q=${query}`
    );
  }

  // Obtener el número total de habitaciones de la búsqueda actual
  getTotalRooms(): number {
    if (!this.searchParams || !this.searchParams.occupancies) {
      return 0;
    }

    return this.searchParams.occupancies.reduce((total, occupancy) => {
      return total + (occupancy.rooms || 0);
    }, 0);
  }

  // Obtener el número total de huéspedes de la búsqueda actual
  getTotalGuests(): number {
    if (!this.searchParams || !this.searchParams.occupancies) {
      return 0;
    }

    return this.searchParams.occupancies.reduce((total, occupancy) => {
      return total + (occupancy.adults || 0) + (occupancy.children || 0);
    }, 0);
  }

  //METODOS PARA EL MODO PAQUETE
  onHotelAndRoomSelected(selection: {
    hotelDetails: HotelResponseDto | null;
    hotel: HotelSearchResponse.Hotel;
    nameRoom: string;
    rate: HotelSearchResponse.Rate;
    rateKey: string;
    recheck: boolean;
    searchParams: HotelSearchRequest;
  }): void {
    console.log('Hotel y habitación seleccionados:', selection);

    // Emitir evento hacia el componente padre (packages-results)
    this.hotelSelected.emit(selection);

    // Cerrar modal
    this.closeDetailModal();
  }

  onModalClosed(): void {
    this.closeDetailModal();
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedHotelForDetail = null;
  }
}
