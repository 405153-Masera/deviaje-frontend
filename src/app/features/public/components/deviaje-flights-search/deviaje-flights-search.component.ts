import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild } from '@angular/core';
import { DeviajeCalendarComponent } from '../../../../shared/components/deviaje-calendar/deviaje-calendar.component';

@Component({
  selector: 'app-deviaje-flights-search',
  standalone: true,
  imports: [CommonModule, DeviajeCalendarComponent],
  templateUrl: './deviaje-flights-search.component.html',
  styleUrl: './deviaje-flights-search.component.scss'
})
export class DeviajeFlightsSearchComponent {

  
  @ViewChild('dateCalendar') calendar!: DeviajeCalendarComponent;

   tripType: 'roundtrip' | 'oneway' | 'multicity' = 'roundtrip';
    
     // Variables para pasajeros
     adults: number = 1;
     children: number = 0;
     infants: number = 0;
     isPassengerDropdownOpen: boolean = false;
     
     // Variables para fechas
     departureDate: Date | null = null;
     returnDate: Date | null = null;
     isCalendarOpen: boolean = false;
     minDate: Date = new Date(); // Fecha mínima (hoy)
     currentCalendarField: 'departure' | 'return' | null = null;
     currentMonth: Date = new Date();
     
     // Variables para sugerencias de ciudad
     isOriginSuggestionsOpen: boolean = false;
     isDestinationSuggestionsOpen: boolean = false;
     originQuery: string = '';
     destinationQuery: string = '';
     
     // Estado de carga
     calendarActiveInput: 'start' | 'end' = 'start';
     isLoading: boolean = false;
     
     // Datos de ejemplo de ciudades
     popularCities: City[] = [
       { name: 'Buenos Aires', code: 'BUE', country: 'Argentina' },
       { name: 'Madrid', code: 'MAD', country: 'España' },
       { name: 'Barcelona', code: 'BCN', country: 'España' },
       { name: 'Lima', code: 'LIM', country: 'Perú' },
       { name: 'Miami', code: 'MIA', country: 'Estados Unidos' },
       { name: 'Santiago', code: 'SCL', country: 'Chile' },
       { name: 'Nueva York', code: 'NYC', country: 'Estados Unidos' },
       { name: 'Bogotá', code: 'BOG', country: 'Colombia' },
       { name: 'Roma', code: 'ROM', country: 'Italia' },
       { name: 'París', code: 'PAR', country: 'Francia' }
     ];
     
     filteredOriginCities: City[] = [];
     filteredDestinationCities: City[] = [];
     
     constructor() { }
    
     // Getter para total de pasajeros
     get totalPassengers(): number {
       return this.adults + this.children + this.infants;
     }
     
     // Métodos para pasajeros
     incrementPassengers(type: 'adults' | 'children' | 'infants'): void {
       const maxPassengers = 9;
       
       if (this.totalPassengers < maxPassengers) {
         if (type === 'adults' && this.adults < 9) {
           this.adults++;
         } else if (type === 'children' && this.children < 8) {
           this.children++;
         } else if (type === 'infants' && this.infants < this.adults) {
           // Limitar bebés a no más que adultos
           this.infants++;
         }
       }
     }
     
     decrementPassengers(type: 'adults' | 'children' | 'infants'): void {
       if (type === 'adults' && this.adults > 1) {
         this.adults--;
         // Ajustar bebés si necesario
         if (this.infants > this.adults) {
           this.infants = this.adults;
         }
       } else if (type === 'children' && this.children > 0) {
         this.children--;
       } else if (type === 'infants' && this.infants > 0) {
         this.infants--;
       }
     }
     
     togglePassengerDropdown(): void {
       this.isPassengerDropdownOpen = !this.isPassengerDropdownOpen;
     }
     
     closePassengerDropdown(): void {
       this.isPassengerDropdownOpen = false;
     }

     @HostListener('document:click', ['$event'])
     onDocumentClick(event: MouseEvent): void {
      const target = event.target as HTMLElement;
      const clickedInside = target.closest('.passenger-selector-trigger')

      if(!clickedInside && this.isPassengerDropdownOpen) {
        this.closePassengerDropdown();
      }
     }
  
     
     // Métodos para el calendario
     openCalendar(field: 'departure' | 'return'): void {
      this.currentCalendarField = field;
      
      // Configura el input activo en el calendario según el campo
      if (field === 'departure') {
        this.calendarActiveInput = 'start';
      } else {
        this.calendarActiveInput = 'end';
      }
      
      // Ajusta el modo de selección según el tipo de viaje
      if (this.tripType === 'oneway') {
        // Para viajes de solo ida
        this.calendar.selectionMode = 'single';
      } else {
        // Para viajes de ida y vuelta
        this.calendar.selectionMode = 'range';
        this.calendar.setActiveInput(this.calendarActiveInput);
      }
      
      // Abre el calendario
      if (this.calendar) {
        this.calendar.open();
      }
    } 
     closeCalendar(): void {
       this.isCalendarOpen = false;
       this.currentCalendarField = null;
     }

     formatDisplayDate(date: Date | null): string {
      if (!date) return '';
      
      // Formatea la fecha como dd/mm/aaaa
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
     
     selectDate(date: Date): void {
       if (this.currentCalendarField === 'departure') {
         this.departureDate = date;
         
         // Si es ida y vuelta y la fecha de regreso es anterior a la nueva fecha de ida
         if (this.tripType === 'roundtrip' && this.returnDate && this.returnDate < date) {
           // Ajustar la fecha de regreso a un día después de la fecha de ida
           const newReturnDate = new Date(date);
           newReturnDate.setDate(newReturnDate.getDate() + 1);
           this.returnDate = newReturnDate;
         }
       } else if (this.currentCalendarField === 'return') {
         this.returnDate = date;
       }
     }

     selectSingleDate(date: Date | null): void {
    this.departureDate = date;
   }
  
  selectDateRange(range: {startDate: Date | null, endDate: Date | null}): void {
    this.departureDate = range.startDate;
    this.returnDate = range.endDate;
  }
     
     // Métodos para cambio de tipo de viaje
     setTripType(type: 'roundtrip' | 'oneway' | 'multicity'): void {
       this.tripType = type;
       if (type === 'oneway') {
         this.returnDate = null;
       }
     }
     
     // Métodos para sugerencias de ciudades
     filterOriginCities(): void {
       if (!this.originQuery || this.originQuery.length < 2) {
         this.filteredOriginCities = [];
         return;
       }
       
       const query = this.originQuery.toLowerCase();
       this.filteredOriginCities = this.popularCities.filter(city => 
         city.name.toLowerCase().includes(query) || 
         city.code.toLowerCase().includes(query)
       );
     }
     
     filterDestinationCities(): void {
       if (!this.destinationQuery || this.destinationQuery.length < 2) {
         this.filteredDestinationCities = [];
         return;
       }
       
       const query = this.destinationQuery.toLowerCase();
       this.filteredDestinationCities = this.popularCities.filter(city => 
         city.name.toLowerCase().includes(query) || 
         city.code.toLowerCase().includes(query)
       );
     }
     
     selectOriginCity(city: City): void {
       this.originQuery = `${city.name} (${city.code})`;
       this.isOriginSuggestionsOpen = false;
     }
     
     selectDestinationCity(city: City): void {
       this.destinationQuery = `${city.name} (${city.code})`;
       this.isDestinationSuggestionsOpen = false;
     }
     
     // Método para intercambiar origen y destino
     swapLocations(): void {
       const temp = this.originQuery;
       this.originQuery = this.destinationQuery;
       this.destinationQuery = temp;
     }
     
     // Método para enviar el formulario
     searchFlights(): void {
       this.isLoading = true;
       
       // Aquí implementarías la lógica para llamar al servicio de búsqueda
       
       // Simulación de carga
       setTimeout(() => {
         this.isLoading = false;
         // Navegar a página de resultados
       }, 1500);
     }
  
  
}

interface City {
  name: string;
  code: string;
  country: string;
}