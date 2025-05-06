import { Component, inject, Input, OnDestroy, OnInit, Pipe } from '@angular/core';
import { FlightOffer, FlightSearchRequest } from '../../../../shared/models/flights';
import { Subscription } from 'rxjs';
import { FlightService } from '../../../../shared/services/flight.service';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deviaje-flight-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-flight-detail.component.html',
  styleUrl: './deviaje-flight-detail.component.scss'
})
export class DeviajeFlightDetailComponent implements OnInit, OnDestroy {

  private readonly flightService: FlightService = inject(FlightService);
  readonly flightUtils: FlightUtilsService = inject(FlightUtilsService); 

  @Input() flightOffer!: FlightOffer;
  @Input() searchParams?: FlightSearchRequest;
  
  alternativeOffers: FlightOffer[] = [];
  selectedOffer: FlightOffer | null = null;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  
  // Estado para mostrar o ocultar detalles de segmentos
  expandedSegments: {[key: string]: boolean} = {};
  
  private subscription = new Subscription();
  
  ngOnInit(): void {
    this.selectedOffer = this.flightOffer;
    this.loadAlternativeOffers();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  loadAlternativeOffers(): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.subscription.add(
      this.flightService.getUpsellOffers(this.flightOffer).subscribe({
        next: (offers) => {
          this.alternativeOffers = offers;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error al obtener tarifas alternativas:', error);
          this.hasError = true;
          this.errorMessage = 'No pudimos obtener tarifas alternativas para este vuelo.';
          this.isLoading = false;
        }
      })
    );
  }
  
  selectOffer(offer: FlightOffer): void {
    this.selectedOffer = offer;
  }
  
  // Método para verificar el precio antes de proceder a la reserva
  verifyAndBook(offer: FlightOffer): void {
    this.isLoading = true;
    this.hasError = false;
    
    this.subscription.add(
      this.flightService.verifyPricing(offer).subscribe({
        next: (verifiedOffer) => {
          this.isLoading = false;
          // Redirigir a la página de reserva con la oferta verificada
          // Implementar navegación
        },
        error: (error) => {
          console.error('Error al verificar el precio:', error);
          this.hasError = true;
          this.errorMessage = 'Esta oferta ya no está disponible o el precio ha cambiado. Por favor, seleccione otra tarifa o intente nuevamente.';
          this.isLoading = false;
        }
      })
    );
  }
  
  // Mostrar u ocultar detalles del segmento
  toggleSegmentDetails(itineraryIndex: number, segmentIndex: number): void {
    const key = `${itineraryIndex}-${segmentIndex}`;
    this.expandedSegments[key] = !this.expandedSegments[key];
  }
  
  isSegmentExpanded(itineraryIndex: number, segmentIndex: number): boolean {
    const key = `${itineraryIndex}-${segmentIndex}`;
    return this.expandedSegments[key] || false;
  }
  
  // Métodos para formatear datos
  getAirlineLogo(code: string): string {
    if (!code) return 'assets/images/generic-airline.png';
    return `https://www.gstatic.com/flights/airline_logos/70px/${code}.png`;
  }
  
  getTotalDuration(offer: FlightOffer, itineraryIndex: number): string {
    const minutes = this.flightUtils.getItineraryDurationMinutes(offer, itineraryIndex);
    return this.flightUtils.minutesToString(minutes);
  }
  
  // Método para obtener los beneficios de la tarifa
  getFareBenefits(offer: FlightOffer): string[] {
    const benefits: string[] = [];
    
    // Extraer beneficios basados en las condiciones de la tarifa
    if (offer.travelerPricings && offer.travelerPricings.length > 0) {
      const pricing = offer.travelerPricings[0];
      
      // Equipaje incluido
      if (pricing.fareDetailsBySegment && pricing.fareDetailsBySegment.length > 0) {
        const segment = pricing.fareDetailsBySegment[0];
        if (segment.includedCheckedBags && segment.includedCheckedBags.quantity > 0) {
          benefits.push(`${segment.includedCheckedBags.quantity} maleta(s) incluida(s)`);
        }
        
        // Clase de cabina
        if (segment.cabin) {
          benefits.push(`Clase ${this.flightUtils.getCabinClass(segment.cabin)}`);
        }
      }
      
      // Tipo de tarifa
      if (pricing.fareOption) {
        benefits.push(`Tarifa ${pricing.fareOption}`);
      }
    }
    
    // Si no hay beneficios específicos, agregar uno genérico
    if (benefits.length === 0) {
      benefits.push('Tarifa básica');
    }
    
    return benefits;
  }
}
