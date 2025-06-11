import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HotelService } from '../../../../../shared/services/hotel.service';
import { Subscription } from 'rxjs';
import { HotelResponseDto, HotelSearchRequest, HotelSearchResponse } from '../../../../../shared/models/hotels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RoomSelection {
  roomIndex: number;
  adults: number;
  children: number;
  childrenAges?: number[];
  selectedRate: HotelSearchResponse.Rate | null;
  availableRates: HotelSearchResponse.Rate[];
  isValidating: boolean;
}

@Component({
  selector: 'app-deviaje-hotel-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './deviaje-hotel-detail.component.html',
  styleUrl: './deviaje-hotel-detail.component.scss'
})
export class DeviajeHotelDetailComponent implements OnInit, OnDestroy {

  readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly hotelService: HotelService = inject(HotelService);
  
  // Input para modo paquete
  @Input() inPackageMode: boolean = false;
  @Input() packageSearchParams: HotelSearchRequest | null = null;
  
  subscription: Subscription = new Subscription();
  
  hotelCode: string | null = null;
  hotel: HotelSearchResponse.Hotel | null = null;
  hotelDetails: HotelResponseDto | null = null;
  searchParams: HotelSearchRequest | null = null;
  
  // Nueva estructura para manejar múltiples habitaciones
  roomSelections: RoomSelection[] = [];
  
  // Estado
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Galería de imágenes
  currentImageIndex: number = 0;
  
  ngOnInit(): void {
    if (this.inPackageMode && this.packageSearchParams) {
      // Modo paquete
      this.searchParams = this.packageSearchParams;
      this.initializeRoomSelections();
    } else {
      // Modo normal
      this.route.paramMap.subscribe(params => {
        this.hotelCode = params.get('code');
        
        if (this.hotelCode) {
          if (window.history.state.hotel) {
            this.hotel = window.history.state.hotel;
            this.searchParams = window.history.state.searchParams;
            this.initializeRoomSelections();
            this.loadHotelDetails();
          } else {
            this.router.navigate(['/home/hotels/search']);
          }
        } else {
          this.router.navigate(['/home/hotels/search']);
        }
      });
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  initializeRoomSelections(): void {
    if (!this.searchParams?.occupancies) return;
    
    this.roomSelections = this.searchParams.occupancies.map((occupancy, index) => ({
      roomIndex: index,
      adults: occupancy.adults,
      children: occupancy.children || 0,
      childrenAges: occupancy.paxes?.filter(p => p.type === 'CH').map(p => p.age) || [],
      selectedRate: null,
      availableRates: this.getAvailableRatesForOccupancy(occupancy),
      isValidating: false
    }));
  }
  
  getAvailableRatesForOccupancy(occupancy: any): HotelSearchResponse.Rate[] {
    if (!this.hotel?.rooms) return [];
    
    const availableRates: HotelSearchResponse.Rate[] = [];
    
    for (const room of this.hotel.rooms) {
      if (room.rates) {
        const matchingRates = room.rates.filter(rate => {
          const rateAdults = this.getRateAdults(rate);
          const rateChildren = this.getRateChildren(rate);
          return rateAdults === occupancy.adults && rateChildren === (occupancy.children || 0);
        });
        availableRates.push(...matchingRates);
      }
    }
    
    return availableRates;
  }
  
  loadHotelDetails(): void {
    if (!this.hotelCode) return;
    
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
  
  onRateSelectionChange(roomIndex: number, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const rateKey = target.value;
    
    if (!rateKey) {
      this.roomSelections[roomIndex].selectedRate = null;
      return;
    }
    
    const selectedRate = this.roomSelections[roomIndex].availableRates.find(r => r.rateKey === rateKey);
    if (selectedRate) {
      this.onRateSelected(roomIndex, selectedRate);
    }
  }
  
  async onRateSelected(roomIndex: number, rate: HotelSearchResponse.Rate): Promise<void> {
    const roomSelection = this.roomSelections[roomIndex];
    roomSelection.selectedRate = rate;
    
    // Si es RECHECK, validar disponibilidad
    if (rate.rateType === 'RECHECK') {
      roomSelection.isValidating = true;
      
      try {
        const response = await this.hotelService.checkRates(rate.rateKey).toPromise();
        
        if (!response) {
          // Si no está disponible, remover del select
          roomSelection.availableRates = roomSelection.availableRates.filter(r => r.rateKey !== rate.rateKey);
          roomSelection.selectedRate = null;
          this.errorMessage = `La tarifa seleccionada para la habitación ${roomIndex + 1} ya no está disponible.`;
        } else {
          // Actualizar con los datos validados
          roomSelection.selectedRate = { ...rate, ...response };
        }
      } catch (error) {
        console.error('Error al validar tarifa:', error);
        roomSelection.availableRates = roomSelection.availableRates.filter(r => r.rateKey !== rate.rateKey);
        roomSelection.selectedRate = null;
        this.errorMessage = `Error al validar la tarifa para la habitación ${roomIndex + 1}.`;
      } finally {
        roomSelection.isValidating = false;
      }
    }
  }
  
  canProceedToBooking(): boolean {
    return this.roomSelections.every(room => 
      room.selectedRate !== null && !room.isValidating
    );
  }
  
  getTotalPrice(): number {
    return this.roomSelections.reduce((total, room) => {
      return total + this.getRateNet(room.selectedRate);
    }, 0);
  }
  
  getRoomDescription(roomSelection: RoomSelection): string {
    let description = `${roomSelection.adults} adulto${roomSelection.adults > 1 ? 's' : ''}`;
    if (roomSelection.children > 0) {
      description += `, ${roomSelection.children} niño${roomSelection.children > 1 ? 's' : ''}`;
      if (roomSelection.childrenAges && roomSelection.childrenAges.length > 0) {
        description += ` (${roomSelection.childrenAges.join(', ')} años)`;
      }
    }
    return description;
  }
  
  
  // Métodos auxiliares para acceder a propiedades de Rate de forma segura
  getRateOffers(rate: HotelSearchResponse.Rate | null): any[] {
    return (rate as any)?.offers || [];
  }
  
  getRateAdults(rate: HotelSearchResponse.Rate | null): number {
    return (rate as any)?.adults || 0;
  }
  
  getRateChildren(rate: HotelSearchResponse.Rate | null): number {
    return (rate as any)?.children || 0;
  }
  
  getRateClass(rate: HotelSearchResponse.Rate | null): string {
    return (rate as any)?.rateClass || '';
  }
  
  getRateNet(rate: HotelSearchResponse.Rate | null): number {
    return (rate as any)?.net || 0;
  }
  
  formatCancellationPolicy(cancellationPolicies: any[] | undefined): string {
    if (!cancellationPolicies || cancellationPolicies.length === 0) {
      return 'Sin política de cancelación especificada';
    }
    
    const policy = cancellationPolicies[0];
    const fromDate = new Date(policy.from);
    const amount = policy.amount;
    
    if (amount === "0.00" || amount === 0) {
      return `Cancelación gratuita hasta ${fromDate.toLocaleDateString()}`;
    } else {
      return `Cancelación gratuita hasta ${fromDate.toLocaleDateString()}. Después: ${this.formatPrice(amount, this.searchParams?.currency)}`;
    }
  }
  
  formatPrice(amount: number | string, currency?: string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const currencySymbol = this.getCurrencySymbol(currency || 'EUR');
    return `${currencySymbol} ${numAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  }
  
  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'EUR': '€',
      'USD': '$',
      'ARS': '$'
    };
    return symbols[currency] || currency;
  }
  
  getNightsCount(): number {
    if (!this.searchParams?.stay) return 1;
    
    const checkIn = new Date(this.searchParams.stay.checkIn);
    const checkOut = new Date(this.searchParams.stay.checkOut);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  bookHotel(): void {
    if (!this.canProceedToBooking()) {
      this.errorMessage = 'Debe seleccionar una opción para todas las habitaciones antes de continuar.';
      return;
    }
    
    // Navegar a booking con todas las habitaciones seleccionadas
    this.router.navigate(['/hotels/booking'], {
      state: {
        hotel: this.hotel,
        roomSelections: this.roomSelections,
        searchParams: this.searchParams,
        totalPrice: this.getTotalPrice()
      }
    });
  }
  
  // Métodos de utilidad para la galería (mantener los existentes)
  getHotelMainImage(): string {
    return this.getHotelImage(this.hotel!);
  }
  
  getThumbnailImages(): any[] {
    // Implementar lógica para thumbnails
    return [];
  }
  
  prevImage(): void {
    // Implementar navegación de imágenes
  }
  
  nextImage(): void {
    // Implementar navegación de imágenes
  }
  
  selectImage(index: number): void {
    this.currentImageIndex = index;
  }
  
  getHotelImage(hotel: HotelSearchResponse.Hotel): string {
    return `https://via.placeholder.com/600x400?text=${encodeURIComponent(hotel.name || 'Hotel')}`;
  }
  
  getCategoryStars(categoryCode: string): number {
    // Implementar lógica de estrellas
    return parseInt(categoryCode) || 3;
  }
}