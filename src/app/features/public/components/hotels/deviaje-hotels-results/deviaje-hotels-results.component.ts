import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaz para hoteles
interface Hotel {
  id: string;
  name: string;
  stars: number;
  location: string;
  rating: number;
  reviewCount: number;
  price: number;
  imageUrl?: string;
  amenities?: string[];
  roomType?: string;
  boardBasis?: string;
  freeCancellation?: boolean;
}

// Interfaz para los parámetros de búsqueda
interface HotelSearchParams {
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  rooms: number;
  stars?: string;
  currency?: string;
}

@Component({
  selector: 'app-deviaje-hotels-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './deviaje-hotels-results.component.html',
  styleUrl: './deviaje-hotels-results.component.scss',
})
export class DeviajeHotelsResultsComponent implements OnInit {
  // Datos de hoteles y búsqueda
  hotels: Hotel[] = [];
  filteredHotels: Hotel[] = [];
  searchParams?: HotelSearchParams;

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

  ngOnInit(): void {
    // Obtener parámetros de búsqueda del state
    const state = history.state;

    if (state && state.searchParams) {
      this.searchParams = state.searchParams;

      // Cargar los datos de hoteles (simulado)
      this.loadHotelData();
    } else {
      // Redirigir si no hay parámetros
      this.router.navigate(['/home/hotels/search']);
    }
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
        if (!this.selectedStars.includes(hotel.stars)) {
          return false;
        }

        // Filtrar por valoración de usuarios
        if (hotel.rating < this.minUserRating) {
          return false;
        }

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
      case 'rating_desc':
        this.filteredHotels.sort((a, b) => b.rating - a.rating);
        break;
      case 'stars_desc':
        this.filteredHotels.sort((a, b) => b.stars - a.stars);
        break;
      case 'name_asc':
        this.filteredHotels.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  }

  // Paginación
  get paginatedHotels(): Hotel[] {
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

  selectHotel(hotel: Hotel): void {
    // Navegar a la página de detalles del hotel
    this.router.navigate(['/hotels/details'], {
      state: { hotel, searchParams: this.searchParams },
    });
  }

  // Cargar datos de hoteles (simulados)
  private loadHotelData(): void {
    // Simulamos una carga de datos
    setTimeout(() => {
      // Datos de ejemplo
      this.hotels = [
        {
          id: 'h1',
          name: 'Grand Hotel Plaza',
          stars: 5,
          location: 'Centro, Buenos Aires',
          rating: 9.2,
          reviewCount: 426,
          price: 250,
          imageUrl: 'https://via.placeholder.com/300x200?text=Grand+Hotel',
          amenities: [
            'Wi-Fi gratis',
            'Piscina',
            'Aire acondicionado',
            'Restaurante',
            'Spa',
          ],
          roomType: 'Habitación Deluxe con Vista',
          boardBasis: 'Desayuno incluido',
          freeCancellation: true,
        },
        {
          id: 'h2',
          name: 'City Comfort Inn',
          stars: 4,
          location: 'Palermo, Buenos Aires',
          rating: 8.7,
          reviewCount: 302,
          price: 180,
          imageUrl: 'https://via.placeholder.com/300x200?text=City+Comfort',
          amenities: ['Wi-Fi gratis', 'Aire acondicionado', 'Restaurante'],
          roomType: 'Habitación Superior',
          boardBasis: 'Desayuno incluido',
          freeCancellation: true,
        },
        {
          id: 'h3',
          name: 'Urban Suites',
          stars: 4,
          location: 'Recoleta, Buenos Aires',
          rating: 8.5,
          reviewCount: 187,
          price: 150,
          imageUrl: 'https://via.placeholder.com/300x200?text=Urban+Suites',
          amenities: ['Wi-Fi gratis', 'Cocina', 'Aire acondicionado'],
          roomType: 'Suite Junior',
          boardBasis: 'Solo alojamiento',
          freeCancellation: false,
        },
        {
          id: 'h4',
          name: 'Budget Stay',
          stars: 3,
          location: 'San Telmo, Buenos Aires',
          rating: 7.8,
          reviewCount: 245,
          price: 95,
          imageUrl: 'https://via.placeholder.com/300x200?text=Budget+Stay',
          amenities: ['Wi-Fi gratis', 'Aire acondicionado'],
          roomType: 'Habitación Estándar',
          boardBasis: 'Desayuno incluido',
          freeCancellation: true,
        },
        {
          id: 'h5',
          name: 'Hostel Connect',
          stars: 2,
          location: 'San Nicolás, Buenos Aires',
          rating: 7.2,
          reviewCount: 178,
          price: 45,
          imageUrl: 'https://via.placeholder.com/300x200?text=Hostel+Connect',
          amenities: ['Wi-Fi gratis', 'Cocina compartida'],
          roomType: 'Cama en dormitorio compartido',
          boardBasis: 'Solo alojamiento',
          freeCancellation: true,
        },
      ];

      // Establecer el rango de precios
      const prices = this.hotels.map((hotel) => hotel.price);
      this.priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices),
      };

      // Aplicar filtros iniciales
      this.filteredHotels = [...this.hotels];

      // Ordenar por defecto
      this.sortResults();

      this.isLoading = false;
    }, 1500);
  }
}
