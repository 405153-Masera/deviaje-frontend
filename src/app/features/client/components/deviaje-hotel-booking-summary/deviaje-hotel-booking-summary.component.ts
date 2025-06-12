import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  HotelResponseDto,
  HotelSearchRequest,
  HotelSearchResponse,
} from '../../../../shared/models/hotels';

@Component({
  selector: 'app-deviaje-hotel-booking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-hotel-booking-summary.component.html',
  styleUrl: './deviaje-hotel-booking-summary.component.scss',
})
export class DeviajeHotelBookingSummaryComponent {
  @Input() hotelDetails: HotelResponseDto | null = null;
  @Input() hotel: HotelSearchResponse.Hotel | null = null;
  @Input() nameRoom: string = '';
  @Input() rate: HotelSearchResponse.Rate | null = null;
  @Input() searchParams: HotelSearchRequest | null = null;

  // Obtener imagen del hotel
    getHotelMainImage(): string {
    if (
      this.hotelDetails &&
      this.hotelDetails.images &&
      this.hotelDetails.images.length > 0
    ) {
      const imagePath = this.hotelDetails.images[0]?.path;
      if (imagePath) {
        return `http://photos.hotelbeds.com/giata/bigger/${imagePath}`;
      }
    }

    // Si no hay imágenes disponibles, devolver una imagen genérica
    return `https://via.placeholder.com/800x500?text=${encodeURIComponent(
      this.hotel?.name || 'Hotel'
    )}`;
  }

  // Obtener ubicación completa
  getHotelLocation(): string {
    const city = this.hotelDetails?.city || '';
    const country = this.hotelDetails?.country?.name || '';
    const zoneName = this.hotelDetails?.zone;

    let location = '';
    if (city && country) {
      location = `${city}, ${country}`;
    }
    if (zoneName) {
      location += ` - ${zoneName}`;
    }

    return location;
  }

  // Nueva lógica para estrellas/categorías
  getCategoryDisplay(): { type: 'stars' | 'text'; value: number | string } {
    if (!this.hotel?.categoryName) {
      return { type: 'text', value: 'Hotel' };
    }

    // Si contiene "ESTRELLAS", mostrar estrellas visuales
    if (this.hotel.categoryName.includes('ESTRELLAS')) {
      const starsMatch = this.hotel.categoryName.match(/(\d+)\s*ESTRELLAS?/i);
      if (starsMatch) {
        const stars = parseInt(starsMatch[1]);
        return { type: 'stars', value: stars };
      }
    }

    // Para otros tipos (LLAVES, BOUTIQUE, etc.), mostrar el texto
    return { type: 'text', value: this.hotel.categoryName };
  }

  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://via.placeholder.com/100x80?text=Hotel';
  }

  // Obtener número de estrellas para comparación
  getCategoryStars(): number {
    const display = this.getCategoryDisplay();
    return display.type === 'stars' ? (display.value as number) : 0;
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

  // Obtener fechas de check-in y check-out
  getCheckInDate(): string {
    if (!this.searchParams?.stay?.checkIn) return '';
    return this.formatDate(this.searchParams.stay.checkIn.toString());
  }

  getCheckOutDate(): string {
    if (!this.searchParams?.stay?.checkOut) return '';
    return this.formatDate(this.searchParams.stay.checkOut.toString());
  }

  // Formatear política de cancelación
  getCancellationPolicy(): string {
    const cancellationPolicies = (this.rate as any)?.cancellationPolicies;

    if (!cancellationPolicies || cancellationPolicies.length === 0) {
      return 'Sin política de cancelación especificada';
    }

    const policy = cancellationPolicies[0];
    const fromDate = this.formatDate(policy.from);
    const amount = policy.amount;

    if (amount === '0.00' || amount === 0 || amount === '0') {
      return `Cancelación gratuita hasta ${fromDate}`;
    } else {
      return `Cancelación gratuita hasta ${fromDate}. Después se paga ${this.formatPrice(
        parseFloat(amount)
      )}`;
    }
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
}
