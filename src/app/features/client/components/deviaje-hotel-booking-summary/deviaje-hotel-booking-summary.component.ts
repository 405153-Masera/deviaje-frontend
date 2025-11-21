import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HotelResponseDto,
  HotelSearchRequest,
  HotelSearchResponse,
} from '../../../../shared/models/hotels';
import { HotelService } from '../../../../shared/services/hotel.service';

@Component({
  selector: 'app-deviaje-hotel-booking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-hotel-booking-summary.component.html',
  styleUrl: './deviaje-hotel-booking-summary.component.scss',
})
export class DeviajeHotelBookingSummaryComponent {

  hotelService: HotelService = inject(HotelService);

  @Input() hotelDetails: HotelResponseDto | null = null;
  @Input() hotel: HotelSearchResponse.Hotel | null = null;
  @Input() nameRoom: string = '';
  @Input() rate: HotelSearchResponse.Rate | null = null;
  @Input() searchParams: HotelSearchRequest | null = null;
  @Input() isPackage: boolean = false;

  // Obtener ubicación completa
  getHotelLocation(): string {
    const address = this.hotelDetails?.address || '';
    const city = this.hotelDetails?.city || '';
    const country = this.hotelDetails?.country?.name || '';
    const zoneName = this.hotel?.zoneName;

    let location = '';

    if (address) {
      location = `${address}`;
    }

    if (city && country) {
      location += ` - ${city}, ${country}`;
    }

    return location;
  }

  // Nueva lógica para estrellas/categorías
  getCategoryDisplay(): { type: 'stars' | 'text'; value: number | string } {
    if (!this.hotel?.categoryName) {
      return { type: 'text', value: 'Hotel' };
    }
    return { type: 'text', value: this.hotel.categoryName };
  }

  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://via.placeholder.com/100x80?text=Hotel';
  }

  // Calcular cantidad de noches
  calculateNights(): number {
    if (!this.searchParams?.stay) return 1;

    const checkIn = new Date(this.searchParams.stay.checkIn);
    const checkOut = new Date(this.searchParams.stay.checkOut);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Formatear fechas
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  getCheckInDate(): string {
    if (!this.searchParams?.stay?.checkIn) return '';
    return this.formatDate(this.searchParams.stay.checkIn.toString());
  }

  getCheckOutDate(): string {
    if (!this.searchParams?.stay?.checkOut) return '';
    return this.formatDate(this.searchParams.stay.checkOut.toString());
  }

  // Método para obtener el rateComment
  getRateComment(): string {
    const rateComments = (this.rate as any)?.rateComments;

    if (!rateComments) {
      return '';
    }
    return rateComments;
  }

  // Método para obtener todas las políticas de cancelación (no solo la primera)
  getCancellationPolicies(): Array<{
    from: string;
    amount: string;
    formattedAmount: string;
    isFree: boolean;
  }> {
    const cancellationPolicies = (this.rate as any)?.cancellationPolicies;

    if (!cancellationPolicies || cancellationPolicies.length === 0) {
      return [];
    }

    return cancellationPolicies.map((policy: any) => {
      const fromDate = this.formatDate(policy.from);
      const amount = policy.amount;
      const isFree = amount === '0.00' || amount === 0 || amount === '0';

      return {
        from: fromDate,
        amount: amount,
        formattedAmount: isFree
          ? 'Gratis'
          : this.formatPrice(parseFloat(amount)),
        isFree: isFree,
      };
    });
  }

  // Método auxiliar para verificar si hay políticas de cancelación
  hasCancellationPolicies(): boolean {
    const cancellationPolicies = (this.rate as any)?.cancellationPolicies;
    return cancellationPolicies.length > 0;
  }

  // Obtener cantidad de huéspedes
  getGuestsCount(): string {
    if (
      !this.searchParams?.occupancies ||
      this.searchParams.occupancies.length === 0
    ) {
      return '1 huésped';
    }

    const occupancy = this.searchParams.occupancies[0];
    const adults = occupancy.adults || 0;
    const children = occupancy.children || 0;
    const total = adults + children;

    let guestText = '';
    if (adults > 0) {
      guestText += `${adults} adulto${adults > 1 ? 's' : ''}`;
    }
    if (children > 0) {
      if (guestText) guestText += ', ';
      guestText += `${children} niño${children > 1 ? 's' : ''}`;
    }

    return guestText || '1 huésped';
  }

  // Obtener precio neto
  getRateNet(): number {
    return (this.rate as any)?.net || 0;
  }

  // Obtener precio por noche
  getPricePerNight(): number {
    const totalPrice = this.getRateNet();
    const nights = this.calculateNights();
    return nights > 0 ? totalPrice / nights : totalPrice;
  }

  // Formatear precio
  formatPrice(amount: number): string {
    const currency = this.searchParams?.currency || 'EUR';
    const currencySymbol = this.getCurrencySymbol(currency);
    return `${currencySymbol} ${amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
    })}`;
  }

  // Obtener símbolo de moneda
  getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      EUR: '€',
      USD: '$',
      ARS: '$',
    };
    return symbols[currency] || currency;
  }

  // Obtener board name
  getBoardName(): string {
    return (this.rate as any)?.boardName || 'Solo habitación';
  }

  formatDatePoliticy(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
