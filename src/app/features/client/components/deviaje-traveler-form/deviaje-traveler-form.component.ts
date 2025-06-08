import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, Input, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-deviaje-traveler-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-traveler-form.component.html',
  styleUrl: './deviaje-traveler-form.component.scss',
})
export class DeviajeTravelerFormComponent implements OnInit {
  @Input() travelerForm!: FormGroup;
  @Input() isPrimaryTraveler: boolean = false;

  private http = inject(HttpClient);

  countries: Country[] = [];
  filteredCountries: Country[] = [];
  isLoading = false;
  today: Date = new Date();

  genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' },
    { value: 'UNSPECIFIED', label: 'Otro' }
  ];

  documentTypes = [
    { value: 'PASSPORT', label: 'Pasaporte' },
    { value: 'ID_CARD', label: 'Documento de Identidad' },
    { value: 'DRIVING_LICENSE', label: 'Licencia de Conducir' },
  ];

  ngOnInit(): void {
    this.loadCountries();
    this.setupValidations();
  }

  setupValidations(): void {
    // Configurar validaciones según tipo de pasajero
    const travelerType = this.travelerForm.get('travelerType')?.value;

    // Validar formato de pasaporte (alfanumérico, al menos 6 caracteres)
    this.travelerForm.get('documents')?.get('0')?.get('number')?.setValidators([
      Validators.required,
      Validators.minLength(6),
      Validators.pattern(/^[A-Z0-9]+$/i)
    ]);

    // Validar fecha de caducidad (debe ser fecha futura)
    this.travelerForm.get('documents')?.get('0')?.get('expiryDate')?.setValidators([
      Validators.required,
      this.futureDateValidator()
    ]);

    // Actualizar validaciones
    this.travelerForm.get('documents')?.get('0')?.get('number')?.updateValueAndValidity();
    this.travelerForm.get('documents')?.get('0')?.get('expiryDate')?.updateValueAndValidity();
  }

  loadCountries(): void {
    this.isLoading = true;
    this.http
      .get(
        'https://restcountries.com/v3.1/all?fields=name,cca2,idd,translations'
      )
      .subscribe({
        next: (data: any) => {
          // Filtrar solo los campos necesarios y usar el nombre en español
          this.countries = data
            .map((country: any) => ({
              name: country.translations.spa?.common || country.name.common,
              cca2: country.cca2,
              phoneCode: country.idd?.root
                ? country.idd.root.replace('+', '')
                : '',
            }))
            .filter((country: Country) => country.cca2 && country.name)
            .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

          this.filteredCountries = [...this.countries];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          // Países de fallback en caso de error
          this.countries = [
            { name: 'Argentina', cca2: 'AR', phoneCode: '54' },
            { name: 'España', cca2: 'ES', phoneCode: '34' },
            { name: 'Estados Unidos', cca2: 'US', phoneCode: '1' },
            { name: 'México', cca2: 'MX', phoneCode: '52' },
          ];
          this.filteredCountries = [...this.countries];
        },
      });
  }

  // Validador personalizado para garantizar que la fecha sea futura
  futureDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(control.value);
      
      if (selectedDate <= today) {
        return { pastDate: true };
      }
      return null;
    };
  }

  filterCountries(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    if (searchTerm) {
      this.filteredCountries = this.countries.filter((country) =>
        country.name.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredCountries = [...this.countries];
    }
  }

  selectCountry(field: string, country: Country): void {
    if (field === 'nationality') {
      this.travelerForm
        .get('documents')
        ?.get('0')
        ?.get('nationality')
        ?.setValue(country.cca2);
    } else if (field === 'issuanceCountry') {
      this.travelerForm
        .get('documents')
        ?.get('0')
        ?.get('issuanceCountry')
        ?.setValue(country.cca2);
    } else if (field === 'phoneCode') {
      this.travelerForm
        .get('contact')
        ?.get('phones')
        ?.get('0')
        ?.get('countryCallingCode')
        ?.setValue(country.phoneCode);
    }
  }

  // Formatear un objeto Date como YYYY-MM-DD
  formatDateForInput(date: Date): string {
    if (!date) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Calcular la fecha mínima y máxima según el tipo de pasajero
  getDateConstraints(type: string): { min: string; max: string } {
    const today = new Date();
    let minDate: Date;
    let maxDate: Date;

    if (type === 'ADULT') {
      // Adulto: 18+ años
      maxDate = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
      );
      minDate = new Date(
        today.getFullYear() - 120,
        today.getMonth(),
        today.getDate()
      );
    } else if (type === 'CHILD') {
      // Niño: 2-17 años
      minDate = new Date(
        today.getFullYear() - 17,
        today.getMonth(),
        today.getDate()
      );
      maxDate = new Date(
        today.getFullYear() - 2,
        today.getMonth(),
        today.getDate()
      );
    } else {
      // Infante: 0-2 años
      minDate = new Date(
        today.getFullYear() - 2,
        today.getMonth(),
        today.getDate()
      );
      maxDate = today;
    }

    return {
      min: this.formatDateForInput(minDate),
      max: this.formatDateForInput(maxDate),
    };
  }

  //METODOS PARA ERRORES DE VALIDACION
  shouldShowError(fieldName: string): boolean {
    const field = this.travelerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrors(fieldName: string): ValidationErrors | null {
    const field = this.travelerForm.get(fieldName);
    return field ? field.errors : null;
  }

  onValidate(fieldName: string) {
    const control = this.travelerForm.get(fieldName);
    return {
      'is-invalid': control?.invalid && (control?.dirty || control?.touched),
      'is-valid': control?.valid,
    };
  }
}

interface Country {
  name: string;
  cca2: string;
  phoneCode?: string;
}
