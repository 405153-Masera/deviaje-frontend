import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, Input, OnInit } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-deviaje-traveler-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-traveler-form.component.html',
  styleUrl: './deviaje-traveler-form.component.scss'
})
export class DeviajeTravelerFormComponent implements OnInit {
  @Input() travelerForm!: AbstractControl;
  @Input() isPrimaryTraveler: boolean = false;

  private http = inject(HttpClient);
  
  countries: Country[] = [];
  filteredCountries: Country[] = [];
  isLoading = false;
  today: Date = new Date();

  genderOptions = [
    { value: 'MALE', label: 'Masculino' },
    { value: 'FEMALE', label: 'Femenino' }
  ];

  documentTypes = [
    { value: 'PASSPORT', label: 'Pasaporte' },
    { value: 'ID_CARD', label: 'Documento de Identidad' },
    { value: 'DRIVING_LICENSE', label: 'Licencia de Conducir' }
  ];

  ngOnInit(): void {
    this.loadCountries();
    
    // Inicializar fecha de nacimiento según el tipo de pasajero
    const travelerType = this.travelerForm.get('travelerType')?.value;
    if (travelerType === 'ADULT') {
      // Adulto (mayor de 18 años)
      this.setDefaultDateOfBirth(30);
    } else if (travelerType === 'CHILD') {
      // Niño (entre 2 y 11 años)
      this.setDefaultDateOfBirth(5);
    } else if (travelerType === 'INFANT') {
      // Infante (menor de 2 años)
      this.setDefaultDateOfBirth(1);
    }
  }

  loadCountries(): void {
    this.isLoading = true;
    this.http.get('https://restcountries.com/v3.1/all').subscribe({
      next: (data: any) => {
        // Filtrar solo los campos necesarios y usar el nombre en español
        this.countries = data.map((country: any) => ({
          name: country.translations.spa?.common || country.name.common,
          cca2: country.cca2,
          phoneCode: country.idd?.root ? country.idd.root.replace('+', '') : ''
        })).sort((a: Country, b: Country) => a.name.localeCompare(b.name));
        
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
          { name: 'México', cca2: 'MX', phoneCode: '52' }
        ];
        this.filteredCountries = [...this.countries];
      }
    });
  }

  filterCountries(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    if (searchTerm) {
      this.filteredCountries = this.countries.filter(country => 
        country.name.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredCountries = [...this.countries];
    }
  }

  selectCountry(field: string, country: Country): void {
    if (field === 'nationality') {
      this.travelerForm.get('documents')?.get('0')?.get('nationality')?.setValue(country.cca2);
    } else if (field === 'issuanceCountry') {
      this.travelerForm.get('documents')?.get('0')?.get('issuanceCountry')?.setValue(country.cca2);
    } else if (field === 'phoneCode') {
      this.travelerForm.get('contact')?.get('phones')?.get('0')?.get('countryCallingCode')?.setValue(country.phoneCode);
    }
  }

  private setDefaultDateOfBirth(yearsAgo: number): void {
    const today = new Date();
    const defaultDate = new Date(today.getFullYear() - yearsAgo, today.getMonth(), today.getDate());
    const formattedDate = defaultDate.toISOString().split('T')[0]; // formato YYYY-MM-DD
    this.travelerForm.get('dateOfBirth')?.setValue(formattedDate);
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
  getDateConstraints(type: string): { min: string, max: string } {
    const today = new Date();
    let minDate: Date;
    let maxDate: Date;

    if (type === 'ADULT') {
      // Adulto: 18+ años
      maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    } else if (type === 'CHILD') {
      // Niño: 2-17 años
      minDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
      maxDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    } else {
      // Infante: 0-2 años
      minDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
      maxDate = today;
    }

    return {
      min: this.formatDateForInput(minDate),
      max: this.formatDateForInput(maxDate)
    };
  }
}

interface Country {
  name: string;
  cca2: string;
  phoneCode?: string;
}