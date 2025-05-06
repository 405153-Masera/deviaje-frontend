import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  forwardRef,
} from '@angular/core';
import { CityDto } from '../../models/locations';
import {
  catchError,
  debounceTime,
  of,
  Subject,
  Subscription,
  switchMap,
} from 'rxjs';
import { CityService } from '../../services/city.service';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-deviaje-city-input',
  standalone: true,
  imports: [],
  templateUrl: './deviaje-city-input.component.html',
  styleUrl: './deviaje-city-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DeviajeCityInputComponent),
      multi: true
    }
  ]
})
export class DeviajeCityInputComponent
  implements OnInit, OnDestroy, ControlValueAccessor
{
  // Propiedades requeridas por ControlValueAccessor
  private onChange: (value: CityDto | null) => void = () => {};
  private onTouched: () => void = () => {};
  private selectedCity: CityDto | null = null; // Almacena la ciudad seleccionada

  @Input() label: string = '';
  @Input() placeholder: string = 'Ciudad';
  @Input() icon: string = 'bi bi-geo-alt';

  displayValue: string = '';
  cities: CityDto[] = [];
  isLoading: boolean = false;
  isSuggestionsOpen: boolean = false;
  isDisabled: boolean = false; 

  private readonly cityService: CityService = inject(CityService);
  private citySearch = new Subject<string>();
  private subscription: Subscription = new Subscription();

  ngOnInit(): void {
    this.subscription = this.citySearch
      .pipe(
        debounceTime(300),
        switchMap((term) => {
          this.isLoading = true;
          return term.length < 2
            ? of([])
            : this.cityService.searchCities(term).pipe(
                catchError((error) => {
                  console.error('Error al buscar ciudades:', error);
                  return of([]);
                })
              );
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

    // Si el usuario escribe algo, reseteamos la ciudad seleccionada
    this.selectedCity = null;
    this.onChange(null); // Notificar al formulario que no hay ciudad seleccionada
    this.onTouched(); // Marcar como tocado

    // Emitir el valor para búsqueda
    if (query.length >= 3) {
      this.citySearch.next(query);
    } else {
      this.isSuggestionsOpen = false;
    }
  }

  selectCity(city: CityDto): void {
    this.selectedCity = city;
    this.displayValue = `${city.name} (${city.iataCode})`;
    this.isSuggestionsOpen = false;
    this.onChange(city); // Notificar al formulario del nuevo valor
    this.onTouched(); // Marcar como tocado
  }

  closeDropdown(): void {
    this.isSuggestionsOpen = false;
  }


  //Se llama cuando en el formulario se establece un valor inicial
  writeValue(value: CityDto | null): void {
    if (value) {
      this.selectedCity = value;
      this.displayValue = `${value.name} (${value.iataCode})`;
    } else {
      this.selectedCity = null;
      this.displayValue = '';
    }
  }

  // Se ejecuta cuando el valor del control cambia
  registerOnChange(fn: (value: CityDto | null) => void): void {
    this.onChange = fn;
  }

  // Se ejecuta cuando el control es tocado
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Permite deshabilitar el control si se requiere
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
