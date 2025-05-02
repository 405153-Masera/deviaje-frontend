import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  inject
} from '@angular/core';
import { CityDto } from '../../models/locations';
import { catchError, debounceTime, of, Subject, Subscription, switchMap } from 'rxjs';
import { CityService } from '../../services/city.service';

@Component({
  selector: 'app-deviaje-city-input',
  standalone: true,
  imports: [],
  templateUrl: './deviaje-city-input.component.html',
  styleUrl: './deviaje-city-input.component.scss',
})
export class DeviajeCityInputComponent implements OnInit, OnDestroy {
  
  @Input() label: string = '';
  @Input() placeholder: string = 'Ciudad o aeropuerto';
  @Input() icon: string = 'bi bi-geo-alt';
  @Input() cityCode: string = ''; 
  @Input() class: string = '';

  @Output() citySelected = new EventEmitter<CityDto>();

  @ViewChild('cityInput') cityInput!: ElementRef;

  displayValue: string = '';
  cities: CityDto[] = [];
  isLoading: boolean = false;
  isSuggestionsOpen: boolean = false;

  private readonly cityService: CityService = inject(CityService);
  private citySearch = new Subject<string>();
  private subscription: Subscription = new Subscription();

  private onChange: any = () => {};
  private onTouched: any = () => {};

  ngOnInit(): void {
    this.subscription = this.citySearch
      .pipe(
        debounceTime(300),
        switchMap((term) => {
          this.isLoading = true;
          return term.length < 2 ? of([]) : this.cityService.searchCities(term).pipe(
            catchError(error => {
              console.error('Error al buscar ciudades:', error);
              return of([]);
            })
          )
        })
      )
      .subscribe((cities) => {
        this.cities = cities;
        this.isLoading = false;
        this.isSuggestionsOpen = cities.length > 0;
      });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    this.displayValue = query;

    // Emitir el valor para búsqueda
    if (query.length >= 3) {
      this.citySearch.next(query);
    } else {
      this.isSuggestionsOpen = false;
    }
  }

  selectCity(city: CityDto): void {
    this.displayValue = `${city.name} (${city.iataCode})`;
    this.cityInput.nativeElement.value = this.displayValue;
    this.isSuggestionsOpen = false;
    this.citySelected.emit(city);
  }

  closeDropdown(): void {
    this.isSuggestionsOpen = false;
  }

  focus(): void {
    if (this.cityInput) {
      this.cityInput.nativeElement.focus();
    }
  }
}
