import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HotelService } from '../../../../../shared/services/hotel.service';
import { Subscription } from 'rxjs';
import { HotelResponseDto, HotelSearchRequest, HotelSearchResponse } from '../../../../../shared/models/hotels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-deviaje-hotel-detail',
  standalone: true,
  imports: [CommonModule, RouterModule,FormsModule],
  templateUrl: './deviaje-hotel-detail.component.html',
  styleUrl: './deviaje-hotel-detail.component.scss'
})
export class DeviajeHotelDetailComponent {

  readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly hotelService: HotelService = inject(HotelService);
  
  subscription: Subscription = new Subscription();
  
  hotelCode: string | null = null;
  hotel: HotelSearchResponse.Hotel | null = null;
  hotelDetails: HotelResponseDto | null = null;
  searchParams: HotelSearchRequest | null = null;
  
  selectedRoom: HotelSearchResponse.Room | null = null;
  selectedRate: HotelSearchResponse.Rate | null = null;
  
  // Estado
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Galería de imágenes
  currentImageIndex: number = 0;
  
  ngOnInit(): void {
    // Obtener el código del hotel de la URL
    this.route.paramMap.subscribe(params => {
      this.hotelCode = params.get('code');
      console.log('Hotel code from URL:', this.hotelCode);
      
      if (this.hotelCode) {
        // Intentar obtener el hotel y parámetros de búsqueda del state
        if (window.history.state.hotel) {
          this.hotel = window.history.state.hotel;
          this.searchParams = window.history.state.searchParams;

          console.log('Hotel from state:', this.hotel);
          console.log('Search params from state:', this.searchParams);
          this.loadHotelDetails();
        } else {
          // Si no está en el state, redirigir a la página de búsqueda
          this.router.navigate(['/home/hotels/search']);
        }
      } else {
        this.router.navigate(['/home/hotels/search']);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  loadHotelDetails(): void {
    if (!this.hotelCode) {
      return;
    }
    
    this.isLoading = true;
    this.hasError = false;
    
    this.subscription.add(
      this.hotelService.getHotelOfferDetails(this.hotelCode).subscribe({
        next: (details) => {
          this.hotelDetails = details;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al cargar detalles del hotel:', error);
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage = 'Error al cargar los detalles del hotel. Por favor, intenta de nuevo.';
        }
      })
    );
  }
  
  selectRoom(room: HotelSearchResponse.Room): void {
    this.selectedRoom = room;
    this.selectedRate = null;
  }
  
  selectRate(rate: HotelSearchResponse.Rate): void {
    this.selectedRate = rate;
  }
  
  checkRateAvailability(rateKey: string): void {
    this.isLoading = true;
    
    this.subscription.add(
      this.hotelService.checkRates(rateKey).subscribe({
        next: (response) => {
          this.isLoading = false;
          // Navegar a la página de reserva
          this.router.navigate(['/hotels/booking'], {
            state: {
              hotel: this.hotel,
              room: this.selectedRoom,
              rate: this.selectedRate,
              searchParams: this.searchParams,
              checkRateResponse: response
            }
          });
        },
        error: (error) => {
          console.error('Error al verificar disponibilidad:', error);
          this.isLoading = false;
          this.hasError = true;
          this.errorMessage = 'Esta tarifa ya no está disponible. Por favor, selecciona otra opción.';
        }
      })
    );
  }
  
  bookHotel(): void {
    if (!this.selectedRoom || !this.selectedRate) {
      return;
    }
    
    this.checkRateAvailability(this.selectedRate.rateKey);
  }
  
  // Métodos para galería de imágenes
  nextImage(): void {
    if (!this.hotelDetails || !this.hotelDetails.images) {
      return;
    }
    
    this.currentImageIndex = (this.currentImageIndex + 1) % this.hotelDetails.images.length;
  }
  
  prevImage(): void {
    if (!this.hotelDetails || !this.hotelDetails.images) {
      return;
    }
    
    this.currentImageIndex = (this.currentImageIndex - 1 + this.hotelDetails.images.length) % this.hotelDetails.images.length;
  }
  
  selectImage(index: number): void {
    this.currentImageIndex = index;
  }
  
  // Formateo y helpers
  getHotelMainImage(): string {
    if (this.hotelDetails && this.hotelDetails.images && this.hotelDetails.images.length > 0) {
        const imagePath = this.hotelDetails.images[this.currentImageIndex]?.path;
        if (imagePath) {
            return `http://photos.hotelbeds.com/giata/bigger/${imagePath}`;
        }
    }
    
    // Si no hay imágenes disponibles, devolver una imagen genérica
    return `https://via.placeholder.com/800x500?text=${encodeURIComponent(this.hotel?.name || 'Hotel')}`;
}
  
getThumbnailImages(): any[] {
  if (this.hotelDetails && this.hotelDetails.images && this.hotelDetails.images.length > 0) {
      return this.hotelDetails.images.slice(0, 6).map(image => ({
          ...image,
          path: `http://photos.hotelbeds.com/giata/small/${image.path}`
      }));
  }
  return [];
}
  
  getCategoryStars(categoryCode: string): number {
    const match = categoryCode.match(/^(\d)/);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
    return 0;
  }
  
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(price);
  }
  
  getMinRoomPrice(room: HotelSearchResponse.Room): number {
    if (!room.rates || room.rates.length === 0) {
      return 0;
    }
    
    let minPrice = Number.MAX_VALUE;
    
    for (const rate of room.rates) {
      if (rate.net !== undefined && rate.net < minPrice) {
        minPrice = rate.net;
      }
    }
    
    return minPrice === Number.MAX_VALUE ? 0 : minPrice;
  }
  
  getRoomImage(roomCode: string): string {
    if (this.hotelDetails && this.hotelDetails.images && this.hotelDetails.images.length > 0) {
        const roomImage = this.hotelDetails.images.find(img => img.roomCode === roomCode);
        if (roomImage && roomImage.path) {
            return `http://photos.hotelbeds.com/giata/${roomImage.path}`;
        }
    }
    return 'https://via.placeholder.com/300x200?text=Habitación';
  }
}
