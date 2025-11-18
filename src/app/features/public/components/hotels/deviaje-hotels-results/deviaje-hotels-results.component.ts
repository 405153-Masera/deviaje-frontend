import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
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
import { LocationFormatterService } from '../../../../../shared/services/locationFormater.service';

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
export class DeviajeHotelsResultsComponent implements OnInit, OnDestroy {
  private readonly router: Router = inject(Router);
  hotelService: HotelService = inject(HotelService);
  locationService: LocationFormatterService = inject(LocationFormatterService);
  private sanitizer: DomSanitizer = inject(DomSanitizer);
  subscription: Subscription = new Subscription();

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

  //Mapas de hoteles para Google Maps
  hotelMapsUrls: Map<string, SafeResourceUrl> = new Map();

  // Resultados
  searchResults: HotelSearchResponse | null = null;
  filteredHotels: HotelSearchResponse.Hotel[] = [];
  @Input() destinationCity: CityDto | null = null;

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

  // Zonas extraídas dinámicamente de los resultados
  availableZones: { zoneCode: number; zoneName: string }[] = [];
  zoneFilters: { value: number; label: string }[] = [];
  selectedZones: number[] = [];

  // Filtros de categorías (se generan dinámicamente)
  categoryFilters: { value: string; label: string }[] = [];

  // Categorías extraídas dinámicamente de los resultados
  availableCategories: { categoryCode: string; categoryName: string }[] = [];

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
    this.errorMessage = '';

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
            error.message ||
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

      // Extraer categorías únicas
      this.extractUniqueCategories();

      // Extraer zonas únicas
      this.extractUniqueZones();

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

    if (this.inPackageMode) {
      this.priceRange.min = this.hotelService.convertToArs(
        Math.floor(Math.min(...prices))
      );
      this.priceRange.max = this.hotelService.convertToArs(
        Math.ceil(Math.max(...prices))
      );
    } else {
      this.priceRange.min = this.hotelService.getRateTotalWithCommission(
        Math.floor(Math.min(...prices))
      );
      this.priceRange.max = this.hotelService.getRateTotalWithCommission(
        Math.ceil(Math.max(...prices))
      );
    }
    this.priceRange.current = this.priceRange.max;
    this.selectedCategories = [];
  }

  applyFilters(): void {
    this.isLoading = true;

    let filtered = [...(this.searchResults?.hotels?.hotels || [])];

    if (
      this.selectedCategories.length === 0 &&
      this.selectedZones.length === 0 &&
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
      const minRate = Number(hotel.minRate) || 0;

      // Obtener el precio final según modo
      const price = this.inPackageMode
        ? this.hotelService.convertToArs(minRate)
        : this.hotelService.getRateTotalWithCommission(minRate);

      // Filtrar por rango elegido
      return price >= this.priceRange.min && price <= this.priceRange.current;
    });

    // Filtrar por categorías seleccionadas
    if (this.selectedCategories && this.selectedCategories.length > 0) {
      filtered = filtered.filter((hotel) => {
        return this.selectedCategories.includes(hotel.categoryCode || '');
      });
    }

    // Filtrar por zonas seleccionadas
    if (this.selectedZones && this.selectedZones.length > 0) {
      filtered = filtered.filter((hotel) => {
        return this.selectedZones.includes(hotel.zoneCode);
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

  /**
   * Extrae las categorías únicas de los hoteles recibidos
   */
  extractUniqueCategories(): void {
    if (!this.searchResults?.hotels?.hotels) return;

    const uniqueCategories = new Map<
      string,
      { categoryCode: string; categoryName: string }
    >();

    this.searchResults.hotels.hotels.forEach((hotel) => {
      if (hotel.categoryCode && hotel.categoryName) {
        uniqueCategories.set(hotel.categoryCode, {
          categoryCode: hotel.categoryCode,
          categoryName: hotel.categoryName,
        });
      }
    });

    // Convertir a array y ordenar por código
    this.availableCategories = Array.from(uniqueCategories.values()).sort(
      (a, b) => {
        // Función auxiliar para extraer prioridad de ordenamiento
        const getPriority = (
          code: string
        ): { group: number; value: number } => {
          // Grupo 1: Estrellas (1EST, H1_5, 2EST, H2_5, ...)
          if (code.includes('EST') || code.match(/^H\d_5$/)) {
            const stars = code.match(/(\d)/);
            const isMedio = code.includes('_5');
            return {
              group: 1,
              value: stars ? parseInt(stars[1]) * 10 + (isMedio ? 5 : 0) : 0,
            };
          }

          // Grupo 2: Llaves (1LL, 2LL, ...)
          if (code.includes('LL')) {
            const llaves = code.match(/(\d)/);
            return {
              group: 2,
              value: llaves ? parseInt(llaves[1]) * 10 : 0,
            };
          }

          // Grupo 3: Otros (alfabético)
          return { group: 3, value: 0 };
        };

        const priorityA = getPriority(a.categoryCode);
        const priorityB = getPriority(b.categoryName);

        // Comparar por grupo primero
        if (priorityA.group !== priorityB.group) {
          return priorityA.group - priorityB.group;
        }

        // Dentro del mismo grupo, comparar por valor
        if (priorityA.value !== priorityB.value) {
          return priorityA.value - priorityB.value;
        }

        // Si son iguales, alfabético
        return a.categoryCode.localeCompare(b.categoryCode);
      }
    );

    // Generar filtros dinámicamente
    this.generateCategoryFilters();

    console.log('Categorías únicas encontradas:', this.availableCategories);
  }

  generateCategoryFilters(): void {
    this.categoryFilters = this.availableCategories.map((category) => ({
      value: category.categoryCode,
      label: category.categoryName,
    }));

    console.log('Filtros generados:', this.categoryFilters);
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

  onZoneChange(zoneCode: number, event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.checked) {
      // Agregar zona si no está
      if (!this.selectedZones.includes(zoneCode)) {
        this.selectedZones.push(zoneCode);
      }
    } else {
      // Remover zona si está
      this.selectedZones = this.selectedZones.filter(
        (zone) => zone !== zoneCode
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

  /**
   * Extrae las zonas únicas de los hoteles recibidos
   */
  extractUniqueZones(): void {
    if (!this.searchResults?.hotels?.hotels) return;

    const uniqueZones = new Map<
      number,
      { zoneCode: number; zoneName: string }
    >();

    this.searchResults.hotels.hotels.forEach((hotel) => {
      if (hotel.zoneCode && hotel.zoneName) {
        uniqueZones.set(hotel.zoneCode, {
          zoneCode: hotel.zoneCode,
          zoneName: hotel.zoneName,
        });
      }
    });

    // Convertir a array y ordenar alfabéticamente por nombre
    this.availableZones = Array.from(uniqueZones.values()).sort((a, b) =>
      a.zoneName.localeCompare(b.zoneName)
    );

    // Generar filtros de zonas
    this.generateZoneFilters();
  }

  /**
   * Genera los filtros de zonas basándose en las zonas disponibles
   */
  generateZoneFilters(): void {
    this.zoneFilters = this.availableZones.map((zone) => ({
      value: zone.zoneCode,
      label: zone.zoneName,
    }));
  }

  /**
   * Analiza una categoría y devuelve información para renderizar
   */
  getCategoryDisplay(
    categoryCode: string,
    categoryName: string
  ): {
    type: 'stars' | 'badge';
    stars?: number;
    isHalf?: boolean;
    isLuxury?: boolean;
    isSuperior?: boolean;
    badgeText?: string;
    badgeClass?: string;
  } {
    // ===== DETECTAR ESTRELLAS =====
    // Códigos que contienen estrellas: EST, H*_5, LUX, SUP, H*S
    const starsCodes = ['EST', 'LUX', 'SUP'];
    const hasStarsCode =
      starsCodes.some((code) => categoryCode.includes(code)) ||
      categoryCode.match(/^H\d_5$/) ||
      categoryCode.match(/^H\dS$/);

    if (hasStarsCode || categoryName.includes('ESTRELLA')) {
      // Extraer número de estrellas del nombre o código
      let stars = 0;
      const starsMatch = categoryName.match(/(\d+)\s*ESTRELLA/i);
      if (starsMatch) {
        stars = parseInt(starsMatch[1]);
      } else {
        // Si no está en el nombre, buscar en el código
        const codeMatch = categoryCode.match(/(\d)/);
        if (codeMatch) {
          stars = parseInt(codeMatch[1]);
        }
      }

      const isHalf =
        categoryName.includes('MEDIA') || categoryCode.includes('_5');
      const isLuxury =
        categoryName.includes('LUJO') || categoryCode.includes('LUX');
      const isSuperior =
        categoryName.includes('SUPERIOR') ||
        categoryCode === 'SUP' ||
        !!categoryCode.match(/^H\dS$/);

      return {
        type: 'stars',
        stars: stars,
        isHalf: isHalf,
        isLuxury: isLuxury,
        isSuperior: isSuperior,
      };
    }

    // ===== DETECTAR LLAVES =====
    if (categoryCode.includes('LL')) {
      const llavesMatch = categoryName.match(/(\d+)\s*LLAVE/i);
      if (llavesMatch) {
        return {
          type: 'badge',
          badgeText: `${llavesMatch[1]} 🔑`,
          badgeClass: 'bg-warning text-dark',
        };
      }
    }

    // ===== CATEGORÍAS ESPECIALES CON BADGES =====
    const specialCategories: {
      [key: string]: { text: string; class: string };
    } = {
      // Boutique y especiales
      BOU: { text: 'BOUTIQUE', class: 'bg-purple' },
      HIST: { text: 'HISTÓRICO DE LUJO', class: 'bg-dark' },

      // Rurales y naturaleza
      AG: { text: 'AGROTURISMO', class: 'bg-success' },
      HR: { text: 'HOTEL RURAL', class: 'bg-success' },

      // Resorts y villas
      RSORT: { text: 'RESORT', class: 'bg-primary' },
      VILLA: { text: 'VILLA', class: 'bg-info' },
      POUSA: { text: 'POUSADA', class: 'bg-info' },

      // B&B y apartamentos
      BB: { text: 'BED & BREAKFAST', class: 'bg-secondary' },
      APTH: { text: 'APARTOTEL', class: 'bg-info' },
      AT: { text: 'APARTAMENTO', class: 'bg-info' },
      VTV: { text: 'VIVIENDA TURÍSTICA', class: 'bg-info' },

      // Económicos
      ALBER: { text: 'ALBERGUE', class: 'bg-light text-dark' },
      PENSI: { text: 'PENSIÓN', class: 'bg-light text-dark' },
      HS: { text: 'HOSTAL', class: 'bg-purple' },
      CHUES: { text: 'CASA DE HUÉSPEDES', class: 'bg-light text-dark' },

      // Otros
      CAMP: { text: 'CAMPING', class: 'bg-success' },
      LODGE: { text: 'LODGE', class: 'bg-success' },
      RESID: { text: 'RESIDENCIA', class: 'bg-secondary' },
      STD: { text: 'ESTÁNDAR', class: 'bg-secondary' },
      SPC: { text: 'SIN CATEGORÍA', class: 'bg-light text-dark' },
      PENDI: { text: 'PENDIENTE', class: 'bg-warning text-dark' },
    };

    // Buscar coincidencia en el código (busca parcialmente)
    for (const [key, value] of Object.entries(specialCategories)) {
      if (categoryCode.toUpperCase().includes(key)) {
        return {
          type: 'badge',
          badgeText: value.text,
          badgeClass: value.class,
        };
      }
    }

    // Por defecto, mostrar el nombre como badge genérico
    return {
      type: 'badge',
      badgeText: categoryName,
      badgeClass: 'bg-secondary',
    };
  }

  resetFilters(): void {
    if (
      this.searchResults &&
      this.searchResults.hotels &&
      this.searchResults.hotels.hotels
    ) {
      this.initializeFilters(this.searchResults.hotels.hotels);
      this.selectedZones = [];
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
    if (this.destinationCity) {
      this.destinationCity.zone = hotel.zoneName;
    }

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
        state: {
          hotel,
          searchParams: this.searchParams,
          destination: this.destinationCity,
        },
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
          if (
            rate.net !== undefined &&
            rate.net < minPrice
          ) {
            minPrice = rate.net;
          }
        }
      }
    }

    return minPrice === Number.MAX_VALUE ? hotel.minRate || 0 : minPrice;
  }

  // Obtener URL de Google Maps para el hotel
  getGoogleMapsUrl(hotel: HotelSearchResponse.Hotel): SafeResourceUrl {
    if (this.hotelMapsUrls.has(hotel.code)) {
      return this.hotelMapsUrls.get(hotel.code)!;
    }

    // Si no está, generarlo y guardarlo
    const url = this.createGoogleMapsUrl(hotel);
    this.hotelMapsUrls.set(hotel.code, url);
    return url;
  }

  private createGoogleMapsUrl(
    hotel: HotelSearchResponse.Hotel
  ): SafeResourceUrl {
    const apiKey = environment.googleMaps.apiKey;

    // Si el hotel tiene coordenadas, usarlas
    if (hotel.latitude && hotel.longitude) {
      const lat = hotel.latitude;
      const lng = hotel.longitude;
      console.log('Hotel coordinates:', lat, lng);
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
