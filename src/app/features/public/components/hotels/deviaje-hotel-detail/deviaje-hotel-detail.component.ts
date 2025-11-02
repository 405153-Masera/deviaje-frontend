import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HotelService } from '../../../../../shared/services/hotel.service';
import { Subscription } from 'rxjs';
import {
  HotelFacility,
  HotelResponseDto,
  HotelRoom,
  HotelSearchRequest,
  HotelSearchResponse,
} from '../../../../../shared/models/hotels';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CityDto } from '../../../../../shared/models/locations';

// Interface para agrupar facilities
interface GroupedFacility {
  groupCode: number;
  groupName: string;
  items: HotelFacility[];
}

@Component({
  selector: 'app-deviaje-hotel-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './deviaje-hotel-detail.component.html',
  styleUrl: './deviaje-hotel-detail.component.scss',
})
export class DeviajeHotelDetailComponent implements OnInit, OnDestroy {
  readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  readonly hotelService: HotelService = inject(HotelService);

  // Input para modo paquete
  @Input() inPackageMode: boolean = false;
  @Input() packageHotel: HotelSearchResponse.Hotel | null = null;
  @Input() packageSearchParams: HotelSearchRequest | null = null;
  @Input() packageDestinationCity: CityDto | null = null;

  // OUTPUT para emitir selección al carrito (modo paquete)
  @Output() hotelAndRoomSelected = new EventEmitter<{
    hotelDetails: HotelResponseDto | null;
    hotel: HotelSearchResponse.Hotel;
    nameRoom: string;
    rate: HotelSearchResponse.Rate;
    rateKey: string;
    recheck: boolean;
    searchParams: HotelSearchRequest;
  }>();

  @Output() modalClosed = new EventEmitter<void>();

  subscription: Subscription = new Subscription();

  hotelCode: string | null = null;
  hotel: HotelSearchResponse.Hotel | null = null;
  hotelDetails: HotelResponseDto | null = null;
  searchParams: HotelSearchRequest | null = null;
  @Input() destinationCity: CityDto | null = null;
  passengers: number = 0;

  // Restaurar variables originales
  selectedRoom: HotelSearchResponse.Room | null = null;
  selectedRate: HotelSearchResponse.Rate | null = null;

  // Estado
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  // Galería de imágenes
  currentImageIndex: number = 0;

  ngOnInit(): void {
    if (this.inPackageMode) {
      // MODO PAQUETE: Usar datos pasados como Input
      this.initializePackageMode();
    } else {
      // MODO NORMAL: Obtener datos de la ruta
      this.initializeNormalMode();
    }
    this.passengers =
      this.searchParams?.occupancies.reduce(
        (total, occ) => total + occ.adults + occ.children,
        0
      ) || 0;
  }

  private initializeNormalMode(): void {
    this.route.paramMap.subscribe((params) => {
      this.hotelCode = params.get('code');

      if (this.hotelCode) {
        if (window.history.state.hotel) {
          this.hotel = window.history.state.hotel;
        }
        if (window.history.state.searchParams) {
          this.searchParams = window.history.state.searchParams;
        }
        if (window.history.state.destination) {
          this.destinationCity = window.history.state.destination;
          console.log(
            'Destino cargado desde el estado de navegación:',
            this.destinationCity
          );
        }

        this.loadHotelDetails();
      } else {
        this.hasError = true;
        this.errorMessage = 'Código de hotel no válido';
      }
    });
  }

  private initializePackageMode(): void {
    if (this.packageHotel && this.packageSearchParams) {
      this.hotel = this.packageHotel;
      this.searchParams = this.packageSearchParams;
      this.hotelCode = this.packageHotel.code;

      // Cargar detalles del hotel desde API (EN MODO PAQUETE SÍ CARGAMOS TODO)
      this.loadHotelDetails();
    } else {
      this.hasError = true;
      this.errorMessage = 'Datos de hotel no válidos para modo paquete';
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadHotelDetails(): void {
    if (!this.hotelCode) return;

    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

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
          this.errorMessage =
            'Error al cargar los detalles del hotel. Por favor, intenta de nuevo.';
        },
      })
    );
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

    if (amount === '0.00' || amount === 0) {
      return `Cancelación gratuita hasta ${fromDate.toLocaleDateString()}`;
    } else {
      // ⭐ CAMBIAR esta línea:
      const priceInArs = this.hotelService.convertToArs(Number(amount));
      const formattedPrice = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
      }).format(priceInArs);

      return `Cancelación gratuita hasta ${fromDate.toLocaleDateString()}. Después: ${formattedPrice}`;
    }
  }

  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      EUR: '€',
      USD: '$',
      ARS: '$',
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
    if (!this.selectedRoom || !this.selectedRate) {
      this.errorMessage =
        'Debe seleccionar una habitación y tarifa antes de continuar.';
      return;
    }

    if (this.inPackageMode) {
      // Modo paquete: emitir evento
      this.hotelAndRoomSelected.emit({
        hotelDetails: this.hotelDetails,
        hotel: this.hotel!,
        nameRoom: this.selectedRoom.name,
        rate: this.selectedRate,
        rateKey: this.selectedRate.rateKey,
        recheck: this.selectedRate.rateType === 'RECHECK',
        searchParams: this.searchParams!,
      });
    } else {
      // Modo normal: navegar (LÓGICA ORIGINAL)
      this.router.navigate(['/home/hotels/booking'], {
        state: {
          hotelDetails: this.hotelDetails,
          hotel: this.hotel, // ⭐ PARA categoryName y categoryCode
          nameRoom: this.selectedRoom.name,
          rate: this.selectedRate,
          rateKey: this.selectedRate.rateKey,
          recheck: this.selectedRate.rateType === 'RECHECK',
          searchParams: this.searchParams, // ⭐ PARA fechas y calcular noches
        },
      });
    }
  }

  closeModal(): void {
    if (this.inPackageMode) {
      this.modalClosed.emit();
    }
  }

  selectRoom(room: HotelSearchResponse.Room): void {
    this.selectedRoom = room;
    this.selectedRate = null;
  }

  selectRate(rate: HotelSearchResponse.Rate): void {
    this.selectedRate = rate;
  }

  nextImage(): void {
    if (!this.hotelDetails || !this.hotelDetails.images) {
      return;
    }

    this.currentImageIndex =
      (this.currentImageIndex + 1) % this.hotelDetails.images.length;
  }

  prevImage(): void {
    if (!this.hotelDetails || !this.hotelDetails.images) {
      return;
    }

    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.hotelDetails.images.length) %
      this.hotelDetails.images.length;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
  }

  // Formateo y helpers
  getHotelMainImage(): string {
    if (
      this.hotelDetails &&
      this.hotelDetails.images &&
      this.hotelDetails.images.length > 0
    ) {
      const imagePath = this.hotelDetails.images[this.currentImageIndex]?.path;
      if (imagePath) {
        return `http://photos.hotelbeds.com/giata/bigger/${imagePath}`;
      }
    }

    // Si no hay imágenes disponibles, devolver una imagen genérica
    return `https://via.placeholder.com/800x500?text=${encodeURIComponent(
      this.hotel?.name || 'Hotel'
    )}`;
  }

  getThumbnailImages(): any[] {
    if (
      this.hotelDetails &&
      this.hotelDetails.images &&
      this.hotelDetails.images.length > 0
    ) {
      return this.hotelDetails.images.slice(0, 6).map((image) => ({
        ...image,
        path: `http://photos.hotelbeds.com/giata/small/${image.path}`,
      }));
    }
    return [];
  }

  getRoomImage(roomCode: string): string {
    if (
      this.hotelDetails &&
      this.hotelDetails.images &&
      this.hotelDetails.images.length > 0
    ) {
      const roomImage = this.hotelDetails.images.find(
        (img) => img.roomCode === roomCode
      );
      if (roomImage && roomImage.path) {
        return `http://photos.hotelbeds.com/giata/${roomImage.path}`;
      }
    }
    return 'https://via.placeholder.com/300x200?text=Habitación';
  }

  getHotelImage(hotel: HotelSearchResponse.Hotel): string {
    return `https://via.placeholder.com/600x400?text=${encodeURIComponent(
      hotel.name || 'Hotel'
    )}`;
  }

  getRoomNameForRate(rate: HotelSearchResponse.Rate): string {
    if (!this.hotel?.rooms) return 'Habitación';

    // Buscar la habitación que contiene esta tarifa
    for (const room of this.hotel.rooms) {
      if (room.rates && room.rates.some((r) => r.rateKey === rate.rateKey)) {
        return room.name || 'Habitación';
      }
    }

    return 'Habitación';
  }

  getBoardDescription(boardName: string | undefined): string {
    if (!boardName) return 'Solo alojamiento';

    return `Régimen: ${boardName}`;
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

    return 0; // Para otros tipos
  }

  getHealthSafetyStars(): number {
    if (!this.hotelDetails?.s2c) return 0;

    const match = this.hotelDetails.s2c.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  // ============================================
  // FACILITIES DEL HOTEL
  // ============================================

  getGroupedFacilities(): GroupedFacility[] {
    if (
      !this.hotelDetails?.facilities ||
      this.hotelDetails.facilities.length === 0
    ) {
      return [];
    }

    const grouped = new Map<number, GroupedFacility>();

    this.hotelDetails.facilities.forEach((facility) => {
      const groupCode = facility.facilityGroupCode || 0;

      if (!grouped.has(groupCode)) {
        // ✅ USAR facilityGroupName que viene del BACKEND (enrichFacilities)
        const groupName = facility.facilityGroupName || 'Otros servicios';

        grouped.set(groupCode, {
          groupCode,
          groupName, // 👈 Del backend, NO hardcodeado
          items: [],
        });
      }

      grouped.get(groupCode)!.items.push(facility);
    });

    return Array.from(grouped.values()).sort(
      (a, b) => a.groupCode - b.groupCode
    );
  }

  getRoomFacilities(roomCode: string): HotelFacility[] {
    if (!this.hotelDetails?.rooms) {
      return [];
    }

    const room = this.hotelDetails.rooms.find((r) => r.roomCode === roomCode);
    return room?.roomFacilities || [];
  }

  getCommonRoomFacilities(): HotelFacility[] {
    if (!this.hotelDetails?.facilities) {
      return [];
    }

    return this.hotelDetails.facilities.filter(
      (f) => f.facilityGroupCode === 60
    );
  }

  getAllRoomFacilities(roomCode: string): HotelFacility[] {
    const specificFacilities = this.getRoomFacilities(roomCode);
    const commonFacilities = this.getCommonRoomFacilities();

    return [...commonFacilities, ...specificFacilities];
  }

  formatFacilityInfo(facility: HotelFacility): string {
    let info =
      facility.description?.content || facility.facilityName || 'Disponible';

    if (facility.number) {
      info += ` (${facility.number})`;
    }

    return info;
  }

  isFacilityAvailable(facility: HotelFacility): boolean {
    if (facility.indLogic !== undefined) {
      return facility.indLogic === true;
    }

    if (facility.indYesOrNo !== undefined) {
      return facility.indYesOrNo === true;
    }

    return true;
  }

  hasFee(facility: HotelFacility): boolean {
    return facility.indFee === true;
  }

  getFeeText(facility: HotelFacility): string {
    if (!this.hasFee(facility)) {
      return 'Gratis';
    }

    if (facility.amount && facility.currency) {
      return `${facility.amount} ${facility.currency}`;
    }

    return 'Con cargo';
  }

  getRoomDetails(roomCode: string): HotelRoom | null {
    if (!this.hotelDetails?.rooms) {
      return null;
    }

    return this.hotelDetails.rooms.find((r) => r.roomCode === roomCode) || null;
  }

  getWildcardRoomName(roomCode: string): string | null {
    if (!this.hotelDetails?.wildcards) {
      return null;
    }

    const wildcard = this.hotelDetails.wildcards.find(
      (w) => w.roomCode === roomCode
    );
    return wildcard?.hotelRoomDescription?.content || null;
  }
}
