import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { CountryService } from '../../../../shared/services/country.service';

@Component({
  selector: 'app-deviaje-flight-booking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-flight-booking-summary.component.html',
  styleUrl: './deviaje-flight-booking-summary.component.scss'
})
export class DeviajeFlightBookingSummaryComponent {
  @Input() flightOffer: any = null;
  @Input() title: string = 'Detalles del vuelo';

  private readonly countryService = inject(CountryService);
  readonly flightUtils = inject(FlightUtilsService);

  getAirportInfo(iataCode: string): string {
     return this.countryService.getAirportInfo(iataCode);
  }
}