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
import { ValidatorsService } from '../../../../shared/services/validators.service';

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
  @Input() lastArrivalDate: string = '';
  @Input() mode: 'flight' | 'hotel' = 'flight';

  private http = inject(HttpClient);
  private validatorService = inject(ValidatorsService);

  countries: Country[] = [];
  filteredCountries: Country[] = [];
  isLoading = false;
  today: Date = new Date();

  genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' },
    { value: 'UNSPECIFIED', label: 'Otro' },
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
    this.travelerForm
      .get('documents')
      ?.get('0')
      ?.get('number')
      ?.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^[A-Z0-9]+$/i),
      ]);

    // Validar fecha de caducidad (debe ser fecha futura)
    this.travelerForm
      .get('documents')
      ?.get('0')
      ?.get('expiryDate')
      ?.setValidators([Validators.required, this.futureDateValidator()]);

    if (this.isPrimaryTraveler) {
      this.setupPhoneValidation();
    }
    // Actualizar validaciones
    this.travelerForm
      .get('documents')
      ?.get('0')
      ?.get('number')
      ?.updateValueAndValidity();
    this.travelerForm
      .get('documents')
      ?.get('0')
      ?.get('expiryDate')
      ?.updateValueAndValidity();
  }

  setupPhoneValidation(): void {
    if (!this.isPrimaryTraveler) {
      return;
    }

    const phoneControl = this.travelerForm
      .get('contact')
      ?.get('phones')
      ?.get('0')
      ?.get('number');

    if (phoneControl) {
      phoneControl.setValidators([
        Validators.required,
        this.validatorService.validatePhoneNumber(),
      ]);

      // Revalidar cuando cambie el código de país
      this.travelerForm
        .get('contact')
        ?.get('phones')
        ?.get('0')
        ?.get('countryCallingCode')
        ?.valueChanges.subscribe(() => {
          phoneControl.updateValueAndValidity();
        });
    }
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
            .map((country: any) => {
              // Concatenar root + primer suffix para obtener código completo
              let phoneCode = '';
              if (country.idd?.root && country.idd?.suffixes?.length > 0) {
                // Tomar solo el primer suffix (para países con múltiples códigos)
                phoneCode =
                  country.idd.root.replace('+', '') + country.idd.suffixes[0];
              }

              return {
                name: country.translations.spa?.common || country.name.common,
                cca2: country.cca2,
                phoneCode: phoneCode, // Ahora será "54" en lugar de "5"
                displayCode: phoneCode ? `+${phoneCode}` : '', // Para mostrar en UI
              };
            })
            .filter(
              (country: Country) =>
                country.cca2 && country.name && country.phoneCode
            )
            .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

          this.filteredCountries = [...this.countries];
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          // Países de fallback en caso de error
          this.countries = [
            {
              name: 'Argentina',
              cca2: 'AR',
              phoneCode: '54',
              displayCode: '+54',
            },
            { name: 'España', cca2: 'ES', phoneCode: '34', displayCode: '+34' },
            {
              name: 'Estados Unidos',
              cca2: 'US',
              phoneCode: '1',
              displayCode: '+1',
            },
            { name: 'México', cca2: 'MX', phoneCode: '52', displayCode: '+52' },
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
    if (type === 'INFANT') {
      const referenceDate = new Date(this.lastArrivalDate || new Date());

      // Fecha mínima: 2 años antes + 1 día
      const minDate = new Date(
        referenceDate.getFullYear() - 2,
        referenceDate.getMonth(),
        referenceDate.getDate() + 2
      );

      // Fecha máxima: HOY - 1 día
      const today = new Date();
      const maxDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1
      );

      return {
        min: this.formatDateForInput(minDate),
        max: this.formatDateForInput(maxDate),
      };
    }

    // Para ADULT/CHILD (no se usa pero por si acaso)
    return {
      min: '1920-01-01',
      max: new Date().toISOString().split('T')[0],
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

  trimField(fieldPath: string): void {
    const control = this.travelerForm.get(fieldPath);
    if (control && control.value && typeof control.value === 'string') {
      const trimmedValue = control.value.trim(); // ← SOLO inicio/final
      if (control.value !== trimmedValue) {
        control.setValue(trimmedValue);
      }
    }
  }
}

interface Country {
  name: string;
  cca2: string;
  phoneCode: string;
  displayCode: string;
}
