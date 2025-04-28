import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Hotel, HotelOffer, HotelResult } from '../../../../../shared/models/hotels';
import { HotelService } from '../../../../../shared/services/hotel.service';
import { CityService } from '../../../../../shared/services/city.service';

@Component({
  selector: 'app-deviaje-hotels-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './deviaje-hotels-results.component.html',
  styleUrl: './deviaje-hotels-results.component.scss',
})
export class DeviajeHotelsResultsComponent implements OnInit {
  
  private readonly cityService: CityService = inject(CityService);
  // Datos de hoteles y búsqueda
  hotelOffers: HotelOffer[] = [];
  hotels: HotelResult[] = [];
  filteredHotels: HotelResult[] = [];
  searchParams?: any;

  // Filtros
  priceRange: { min: number; max: number } = { min: 0, max: 1000 };
  selectedStars: number[] = [1, 2, 3, 4, 5];
  minUserRating: number = 0;
  selectedAmenities: string[] = [];

  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;

  // Ordenamiento
  sortOption: string = 'price_asc';

  // Estados de UI
  isLoading: boolean = true;
  showFilters: boolean = false;

  private readonly router: Router = inject(Router);
  private readonly hotelService: HotelService = inject(HotelService);

  ngOnInit(): void {
    // Obtener parámetros de búsqueda del state
    const state = history.state;

    if (state && state.searchParams) {
      this.isLoading = true;
      this.searchParams = state.searchParams;
      this.hotelOffers = state.hotelOffers;
      
      // Procesamos las ofertas de hoteles recibidas
      this.processHotelOffers();
      this.isLoading = false;
      
    } else {
      // Redirigir si no hay parámetros
      this.router.navigate(['/home/hotels/search']);
    }
  }

  // Procesar las ofertas de hoteles para convertirlas en el formato que espera la UI
  processHotelOffers(): void {
    this.hotels = this.hotelOffers.map(offer => this.mapHotelOfferToResult(offer));
    
    // Establecer rango de precios basado en los resultados
    if (this.hotels.length > 0) {
      const prices = this.hotels.map(hotel => hotel.price);
      this.priceRange.min = Math.floor(Math.min(...prices));
      this.priceRange.max = Math.ceil(Math.max(...prices));
    }
    
    // Aplicar los filtros iniciales
    this.filteredHotels = [...this.hotels];
    
    // Ordenar resultados
    this.sortResults();
  }

  // Mapear una oferta de hotel a un resultado para la UI
  mapHotelOfferToResult(hotelOffer: HotelOffer): HotelResult {
    const hotel = hotelOffer.hotel;
    const offer = hotelOffer.offers && hotelOffer.offers.length > 0 ? hotelOffer.offers[0] : null;
    
    // Extraer el precio de la oferta
    const price = offer ? parseFloat(offer.price.total) : 0;
    
    // Obtener descripción de la habitación (si está disponible)
    const roomDescription = offer?.room?.description?.text || '';
    
    // Verificar si la cancelación es gratuita
    const isCancellable = offer?.policies?.refundable?.cancellationRefund === 'REFUNDABLE_UP_TO_DEADLINE';
    
    // Obtener tipo de pago
    const paymentType = offer?.policies?.paymentType || '';
    
    return {
      id: hotel.hotelId,
      name: hotel.name,
      location: `${hotel.cityCode}, ${hotel.name}`,
      stars: hotel.rating ? parseInt(hotel.rating) : 3,
      // Como no hay ratings en la API, podemos usar un valor por defecto o una lógica empresarial
      rating: 7.5, // Valor por defecto mientras se decide cómo manejar ratings
      reviewCount: 0, // No hay reviews en la API
      price: price,
      mainImage: undefined, // La API actual no proporciona imágenes
      amenities: [], // La API actual no proporciona amenidades
      distanceFromCenter: 0, // No disponible en la API
      isPromoted: false,
      description: hotel.description?.text || "",
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      rooms: [],
      roomType: offer?.room?.type || "Habitación Estándar",
      roomName: offer?.room?.name || "Habitación",
      roomDescription: roomDescription,
      // Información de políticas
      cancellationPolicy: isCancellable ? "Cancelación gratuita hasta la fecha límite" : "No reembolsable",
      paymentType: paymentType === 'prepay' ? "Prepago" : "Pago en el hotel",
      bedType: offer?.room?.typeEstimated?.bedType || "",
      bedCount: offer?.room?.typeEstimated?.beds || 1
    };
  }

  // Métodos para filtros
  resetFilters(): void {
    this.priceRange = { min: 0, max: 1000 };
    this.selectedStars = [1, 2, 3, 4, 5];
    this.minUserRating = 0;
    this.selectedAmenities = [];
    this.applyFilters();
  }

  toggleStar(star: number): void {
    const index = this.selectedStars.indexOf(star);
    if (index > -1) {
      this.selectedStars.splice(index, 1);
    } else {
      this.selectedStars.push(star);
    }
    this.applyFilters();
  }

  setMinUserRating(rating: number): void {
    this.minUserRating = rating;
    this.applyFilters();
  }

  toggleAmenity(amenityId: string): void {
    const index = this.selectedAmenities.indexOf(amenityId);
    if (index > -1) {
      this.selectedAmenities.splice(index, 1);
    } else {
      this.selectedAmenities.push(amenityId);
    }
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    this.isLoading = true;

    // Simular tiempo de procesamiento
    setTimeout(() => {
      this.filteredHotels = this.hotels.filter((hotel) => {
        // Filtrar por precio
        if (
          hotel.price < this.priceRange.min ||
          hotel.price > this.priceRange.max
        ) {
          return false;
        }

        // Filtrar por estrellas
        

        // Filtrar por valoración de usuarios
        

        // Filtrar por amenidades (si se seleccionaron)
        if (this.selectedAmenities.length > 0) {
          if (
            !hotel.amenities ||
            !this.selectedAmenities.every((amenity) =>
              hotel.amenities?.some((hotelAmenity) =>
                hotelAmenity
                  .toLowerCase()
                  .includes(this.getAmenityLabel(amenity).toLowerCase())
              )
            )
          ) {
            return false;
          }
        }

        return true;
      });

      // Ordenar resultados
      this.sortResults();

      // Resetear paginación
      this.currentPage = 1;

      this.isLoading = false;
    }, 500);
  }

  sortResults(): void {
    switch (this.sortOption) {
      case 'price_asc':
        this.filteredHotels.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        this.filteredHotels.sort((a, b) => b.price - a.price);
        break;
      // case 'rating_desc':
      //   this.filteredHotels.sort((a, b) => b.rating - a.rating);
      //   break;
      // case 'stars_desc':
      //   this.filteredHotels.sort((a, b) => b.stars - a.stars);
      //   break;
      case 'name_asc':
        this.filteredHotels.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  }

  // Paginación
  get paginatedHotels(): HotelResult[] {
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

  // Métodos de utilidad
  calculateNights(): number {
    if (!this.searchParams?.checkInDate || !this.searchParams?.checkOutDate) {
      return 1;
    }

    const checkIn = new Date(this.searchParams.checkInDate);
    const checkOut = new Date(this.searchParams.checkOutDate);
    const timeDiff = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  getRatingText(rating: number): string {
    if (rating >= 9) return 'Excelente';
    if (rating >= 8) return 'Muy bueno';
    if (rating >= 7) return 'Bueno';
    if (rating >= 6) return 'Aceptable';
    return 'Regular';
  }

  getAmenityLabel(amenityId: string): string {
    const amenityMap: { [key: string]: string } = {
      wifi: 'Wi-Fi gratis',
      parking: 'Estacionamiento',
      breakfast: 'Desayuno',
      pool: 'Piscina',
      aircon: 'Aire acondicionado',
    };

    return amenityMap[amenityId] || amenityId;
  }

  selectHotel(hotel: HotelResult): void {
    // Navegar a la página de detalles del hotel
    this.router.navigate(['/hotels/details'], {
      state: { hotel, searchParams: this.searchParams },
    });
  }
}
