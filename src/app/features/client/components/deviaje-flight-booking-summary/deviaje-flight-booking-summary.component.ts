import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlightUtilsService } from '../../../../shared/services/flight-utils.service';
import { CountryService } from '../../../../shared/services/country.service';
import { CancellationRulesDto } from '../../models/bookings';

@Component({
  selector: 'app-deviaje-flight-booking-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-flight-booking-summary.component.html',
  styleUrl: './deviaje-flight-booking-summary.component.scss',
})
export class DeviajeFlightBookingSummaryComponent implements OnInit {
  @Input() flightOffer: any = null;
  @Input() title: string = 'Detalles del vuelo';
  @Input() cancellationRules: CancellationRulesDto | null = null;
  @Output() originChange = new EventEmitter<string>();
  @Output() destinationChange = new EventEmitter<string>();

  private readonly countryService = inject(CountryService);
  readonly flightUtils = inject(FlightUtilsService);

  ngOnInit() {
    this.sendFlightData();
  }

  getAirportInfo(iataCode: string): string {
    return this.countryService.getAirportInfo(iataCode);
  }

  sendFlightData() {
    if (this.flightOffer) {
      const segments = this.flightOffer.itineraries[0].segments;
      const origin = segments[0].departure.iataCode;
      const destination = segments[segments.length - 1].arrival.iataCode;

      this.originChange.emit(this.getAirportInfo(origin));
      this.destinationChange.emit(this.getAirportInfo(destination));
    }
  }
}
