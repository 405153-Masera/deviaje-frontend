import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
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
    this.stopAutoScroll();
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
          this.errorMessage = error.message;
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

  //--------------------------------- Imagénes ---------------------------------
  @ViewChild('thumbnailsContainer') thumbnailsContainer!: ElementRef;

  private scrollInterval: any = null;
  private scrollSpeed = 5; // Velocidad de scroll
  private edgeThreshold = 100;

  onThumbnailsMouseMove(event: MouseEvent) {
    if (!this.thumbnailsContainer) return;

    const container = this.thumbnailsContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const containerWidth = rect.width;

    // Limpiar cualquier scroll previo
    this.stopAutoScroll();

    // Zona izquierda - scroll hacia la izquierda
    if (mouseX < this.edgeThreshold) {
      const intensity = 1 - mouseX / this.edgeThreshold;
      this.startAutoScroll(-this.scrollSpeed * intensity);
    }
    // Zona derecha - scroll hacia la derecha
    else if (mouseX > containerWidth - this.edgeThreshold) {
      const intensity =
        (mouseX - (containerWidth - this.edgeThreshold)) / this.edgeThreshold;
      this.startAutoScroll(this.scrollSpeed * intensity);
    }
  }

  onThumbnailsMouseLeave() {
    this.stopAutoScroll();
  }

  private startAutoScroll(speed: number) {
    if (this.scrollInterval) return;

    this.scrollInterval = setInterval(() => {
      if (this.thumbnailsContainer) {
        this.thumbnailsContainer.nativeElement.scrollLeft += speed;
      }
    }, 16); // ~60fps
  }

  private stopAutoScroll() {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
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
        return `https://photos.hotelbeds.com/giata/xxl/${imagePath}`;
      }
    }

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
      return this.hotelDetails.images.map((image) => ({
        ...image,
        path: `https://photos.hotelbeds.com/giata/bigger/${image.path}`,
      }));
    }
    return [];
  }

  getHotelImage(hotel: HotelSearchResponse.Hotel): string {
    return `https://via.placeholder.com/600x400?text=${encodeURIComponent(
      hotel.name || 'Hotel'
    )}`;
  }

  //--------------------------------- Imagénes ---------------------------------

  //--------------------------------- Datos adicionales ---------------------------------
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

  getHealthSafetyStars(): number {
    if (!this.hotelDetails?.s2c) return 0;

    const match = this.hotelDetails.s2c.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  getWildcardRoomName(roomCode: string): string | null {
    if (!this.hotelDetails?.wildcards) {
      return null;
    }

    const wildcard = this.hotelDetails.wildcards.find(
      (w) => w.roomType === roomCode
    );
    return wildcard?.hotelRoomDescription?.content || null;
  }

  //--------------------------------- Datos adicionales ---------------------------------

  //--------------------------------- Instalaciones ---------------------------------
  expandedFacilityGroups: Set<number> = new Set();
  expandedRoomAmenities: Set<string> = new Set();
  currentRoomImageIndex: Map<string, number> = new Map();
  @ViewChildren('thumbnailsRoom') thumbnailsRooms!: QueryList<ElementRef>;
  private scrollIntervals = new Map<string, any>();

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

      if (!this.isFacilityAvailable(facility)) {
        return; // Skipea la facilidad si no existe
      }

      if (!grouped.has(groupCode)) {
        const groupName = facility.facilityGroupName || 'Otros servicios';

        grouped.set(groupCode, {
          groupCode,
          groupName,
          items: [],
        });
      }

      grouped.get(groupCode)!.items.push(facility);
    });

    return Array.from(grouped.values())
      .filter((group) => group.items.length > 0) // Excluir grupo 60 y grupos vacíos
      .sort((a, b) => a.groupCode - b.groupCode);
  }

  getRoomFacilities(roomCode: string): HotelFacility[] {
    if (!this.hotelDetails?.rooms) {
      return [];
    }

    const room = this.hotelDetails.rooms.find((r) => r.roomCode === roomCode);
    console.log(room?.roomCode);
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

  /**
   * Obtiene TODAS las imágenes de una habitación
   * @param roomCode Código de la habitación
   * @returns Array de URLs de imágenes
   */
  getRoomImages(roomCode: string): string[] {
    if (!this.hotelDetails?.images || this.hotelDetails.images.length === 0) {
      return [];
    }
    // Filtrar imágenes de esta habitación específica
    const roomImages = this.hotelDetails.images
      .filter((img) => img.roomCode === roomCode)
      .map((img) => `https://photos.hotelbeds.com/giata/xxl/${img.path}`);

    // Si no hay imágenes específicas de la habitación, buscar imágenes generales del hotel
    if (roomImages.length === 0) {
      const hotelImages = this.hotelDetails.images
        .filter((img) => !img.roomCode || img.roomCode === '')
        .slice(0, 3) // Máximo 3 imágenes del hotel
        .map((img) => `https://photos.hotelbeds.com/giata/xxl/${img.path}`);

      return hotelImages;
    }

    return roomImages;
  }

  // Método para manejar errores de carga de imagen
  onImageError(event: any): void {
    const img = event.target;
    const currentSrc = img.src;

    // Si falló XXL, intentar XL
    if (currentSrc.includes('/xxl/')) {
      img.src = currentSrc.replace('/xxl/', '/xl/');
    }
    // Si falló XL, intentar bigger
    else if (currentSrc.includes('/xl/')) {
      img.src = currentSrc.replace('/xl/', '/bigger/');
    }
    // Si falló bigger, usar placeholder
    else if (currentSrc.includes('/bigger/')) {
      img.src = `https://via.placeholder.com/800x500?text=Sin imagen`;
    }
  }

  onThumbnailsRoomMouseMove(event: MouseEvent, roomCode: string) {
    const element = this.thumbnailsRooms.find(
      (el) => el.nativeElement.getAttribute('data-room-code') === roomCode
    );

    if (!element) return;

    const container = element.nativeElement;
    const rect = container.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const containerWidth = rect.width;

    this.stopAutoRoomScroll(roomCode);

    if (mouseX < this.edgeThreshold) {
      const intensity = 1 - mouseX / this.edgeThreshold;
      this.startAutoRoomScroll(roomCode, -this.scrollSpeed * intensity);
    } else if (mouseX > containerWidth - this.edgeThreshold) {
      const intensity =
        (mouseX - (containerWidth - this.edgeThreshold)) / this.edgeThreshold;
      this.startAutoRoomScroll(roomCode, this.scrollSpeed * intensity);
    }
  }

  onThumbnailsRoomMouseLeave(roomCode: string) {
    this.stopAutoRoomScroll(roomCode);
  }

  private startAutoRoomScroll(roomCode: string, speed: number) {
    if (this.scrollIntervals.get(roomCode)) return;

    this.scrollIntervals.set(
      roomCode,
      setInterval(() => {
        const element = this.thumbnailsRooms.find(
          (el) => el.nativeElement.getAttribute('data-room-code') === roomCode
        );

        if (element) {
          element.nativeElement.scrollLeft += speed;
        }
      }, 16)
    );
  }

  private stopAutoRoomScroll(roomCode: string) {
    const interval = this.scrollIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.scrollIntervals.delete(roomCode);
    }
  }
  /**
   * Selecciona una imagen específica de la galería
   * @param roomCode Código de la habitación
   * @param index Índice de la imagen
   */
  selectRoomImage(roomCode: string, index: number): void {
    this.currentRoomImageIndex.set(roomCode, index);
  }

  /**
   * Obtiene el índice de la imagen actual de una habitación
   * @param roomCode Código de la habitación
   * @returns Índice actual (default 0)
   */
  getCurrentRoomImageIndex(roomCode: string): number {
    return this.currentRoomImageIndex.get(roomCode) || 0;
  }

  /**
   * Navega a la siguiente imagen
   * @param roomCode Código de la habitación
   */
  nextRoomImage(roomCode: string): void {
    const images = this.getRoomImages(roomCode);
    if (images.length <= 1) return;

    const currentIndex = this.getCurrentRoomImageIndex(roomCode);
    const nextIndex = (currentIndex + 1) % images.length;
    this.selectRoomImage(roomCode, nextIndex);
  }

  /**
   * Navega a la imagen anterior
   * @param roomCode Código de la habitación
   */
  prevRoomImage(roomCode: string): void {
    const images = this.getRoomImages(roomCode);
    if (images.length <= 1) return;

    const currentIndex = this.getCurrentRoomImageIndex(roomCode);
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    this.selectRoomImage(roomCode, prevIndex);
  }

  /**
   * Toggle para expandir/colapsar comodidades de una habitación
   */
  toggleRoomAmenities(roomCode: string): void {
    if (this.expandedRoomAmenities.has(roomCode)) {
      this.expandedRoomAmenities.delete(roomCode);
    } else {
      this.expandedRoomAmenities.add(roomCode);
    }
  }

  /**
   * Verifica si las comodidades de una habitación están expandidas
   */
  isRoomAmenitiesExpanded(roomCode: string): boolean {
    return this.expandedRoomAmenities.has(roomCode);
  }

  formatFacilityInfo(facility: HotelFacility): string {
    let info =
      facility.description?.content || facility.facilityName || 'Disponible';

    if (facility.number) {
      info += ` (${facility.number})`;
    }

    if (facility.distance) {
      info += ` ${facility.distance} m²`;
    }

    if (facility.timeFrom) {
      info += `: ${facility.timeFrom.substring(0, 5)} hs`;
    }

    if (facility.timeTo) {
      info += ` - ${facility.timeTo.substring(0, 5)} hs`;
    }

    return info;
  }

  isFacilityAvailable(facility: HotelFacility): boolean {
    if (facility.indLogic !== null) {
      return facility.indLogic === true;
    }

    if (facility.indYesOrNo !== null) {
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

    if (facility.amount) {
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

  // Expandir/Colapsar grupos
  toggleFacilityGroup(groupCode: number): void {
    if (this.expandedFacilityGroups.has(groupCode)) {
      this.expandedFacilityGroups.delete(groupCode);
    } else {
      this.expandedFacilityGroups.add(groupCode);
    }
  }

  isGroupExpanded(groupCode: number): boolean {
    return this.expandedFacilityGroups.has(groupCode);
  }

  // Expandir y colapsar todos los grupos
  expandAllGroups(): void {
    const groups = this.getGroupedFacilities();
    groups.forEach((group) => {
      this.expandedFacilityGroups.add(group.groupCode);
    });
  }

  collapseAllGroups(): void {
    this.expandedFacilityGroups.clear();
  }

  areAllGroupsExpanded(): boolean {
    const groups = this.getGroupedFacilities();
    return (
      groups.length > 0 &&
      groups.every((group) => this.isGroupExpanded(group.groupCode))
    );
  }

  getVisibleFacilitiesCount(group: GroupedFacility): number {
    return group.items.filter((f) => this.isFacilityAvailable(f)).length;
  }

  /**
   * Formatea la política de cancelación de forma corta para las cards
   * @param cancellationPolicies Políticas de cancelación
   * @returns Texto corto
   */
  formatCancellationPolicyShort(
    cancellationPolicies: any[] | undefined
  ): string {
    if (!cancellationPolicies || cancellationPolicies.length === 0) {
      return 'Sin política';
    }

    const policy = cancellationPolicies[0];
    const fromDate = new Date(policy.from);
    const amount = policy.amount;

    if (amount === '0.00' || amount === 0) {
      return `Gratis hasta ${fromDate.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      })}`;
    } else {
      return `Cancela con cargo`;
    }
  }

  //--------------------------------- Instalaciones ---------------------------------
}
