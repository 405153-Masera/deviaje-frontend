import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Occupancy {
  rooms: number;
  adults: number;
  children: number;
  paxes?: Array<{
    type: string;
    age: number;
  }>;
}

@Component({
  selector: 'app-deviaje-room-guest-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deviaje-room-guest-select.component.html',
  styleUrl: './deviaje-room-guest-select.component.scss'
})
export class DeviajeRoomGuestSelectComponent {
  private readonly elementRef: ElementRef = inject(ElementRef);

  @Input() label: string = 'Huéspedes';
  @Input() occupancies: Occupancy[] = [{ rooms: 1, adults: 1, children: 0, paxes: [] }];
  @Output() occupanciesChanged = new EventEmitter<Occupancy[]>();

  isDropdownOpen = false;
  
  // ✅ PROPIEDADES PARA VALIDACIÓN DEL FORMULARIO
  isValid: boolean = true;
  errorMessage: string = '';

  // ✅ MISMAS VALIDACIONES QUE DeviajePassengerSelectComponent
  readonly MAX_PASSENGERS = 9; // Máximo 9 pasajeros (adultos + niños de 2+)
  readonly MIN_ADULTS = 1;

  @HostListener('click', ['$event'])
  onClick(event: Event) {
    event.stopPropagation();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  updateAdults(roomIndex: number, increment: boolean): void {
    const room = this.occupancies[roomIndex];
    
    if (increment) {
      // ✅ NO PERMITIR si llega al máximo (como PassengerSelectComponent)
      if (this.getTotalValidPassengers() >= this.MAX_PASSENGERS) {
        return;
      }
      room.adults++;
    } else {
      if (room.adults <= this.MIN_ADULTS) {
        return;
      }
      
      // ✅ NO PERMITIR si quedarían más bebés que adultos
      const totalBabies = this.getTotalBabies();
      if (totalBabies >= room.adults) {
        return;
      }
      
      room.adults--;
    }
    
    this.validateAndUpdate();
  }

  updateChildren(roomIndex: number, increment: boolean): void {
    const room = this.occupancies[roomIndex];

    if (increment) {
      // ✅ NO PERMITIR agregar niño si hay niños sin edad
      if (this.hasChildrenWithoutAge()) {
        return;
      }
      
      room.children++;

      // Inicializar array de paxes si no existe
      if (!room.paxes) {
        room.paxes = [];
      }

      // ✅ AGREGAR NIÑO SIN EDAD (obligatorio seleccionar)
      room.paxes.push({ type: 'CH', age: -1 }); // -1 = edad no seleccionada
    } else {
      if (room.children > 0) {
        room.children--;

        // Eliminar el último niño del array de paxes
        if (room.paxes && room.paxes.length > 0) {
          room.paxes = room.paxes
            .filter((pax) => pax.type === 'CH')
            .slice(0, room.children);
        }
      }
    }

    this.validatePaxes();
    this.validateAndUpdate();
  }

  updateChildAge(roomIndex: number, childIndex: number, age: number): void {
    const room = this.occupancies[roomIndex];

    if (room.paxes && room.paxes.length > childIndex) {
      room.paxes[childIndex].age = age;
    }
    
    this.validateAndUpdate();
  }

  // ✅ VALIDACIÓN PRINCIPAL QUE DETERMINA SI EL FORMULARIO ES VÁLIDO
  private validateAndUpdate(): void {
    this.validatePaxes();
    
    // Resetear estado
    this.isValid = true;
    this.errorMessage = '';

    // 🔍 DEBUG: Agregar logs para ver qué está pasando
    console.log('🔍 Debug validación:', {
      totalValidPassengers: this.getTotalValidPassengers(),
      totalBabies: this.getTotalBabies(),
      totalAdults: this.getTotalAdults(),
      hasChildrenWithoutAge: this.hasChildrenWithoutAgeReal(),
      occupancies: this.occupancies
    });

    // ✅ VALIDACIÓN 1: Edad del menor es obligatoria (SOLO si realmente falta)
    if (this.hasChildrenWithoutAgeReal()) {
      this.isValid = false;
      this.errorMessage = 'La edad del menor es obligatoria';
      console.log('❌ Error: Edad del menor obligatoria');
      this.emitChange();
      return;
    }

    // ✅ VALIDACIÓN 2: Máximo 9 pasajeros (PRIORIDAD ALTA)
    const totalValidPassengers = this.getTotalValidPassengers();
    if (totalValidPassengers > this.MAX_PASSENGERS) {
      this.isValid = false;
      this.errorMessage = `Máximo ${this.MAX_PASSENGERS} huéspedes (adultos + niños de 2+ años)`;
      console.log('❌ Error: Máximo pasajeros');
      this.emitChange();
      return;
    }

    // ✅ VALIDACIÓN 3: Los bebés deben ser igual cantidad que adultos
    const totalBabies = this.getTotalBabies();
    const totalAdults = this.getTotalAdults();
    
    if (totalBabies > totalAdults) {
      this.isValid = false;
      this.errorMessage = 'Debe viajar 1 adulto por cada bebé (menor de 2 años)';
      console.log('❌ Error: Bebés > adultos');
      this.emitChange();
      return;
    }

    // Si llegamos aquí, todo es válido
    console.log('✅ Validación exitosa');
    this.emitChange();
  }

  // ✅ CÁLCULOS PARA VALIDACIONES
  private getTotalValidPassengers(): number {
    // Contar adultos + niños de 2+ años (los bebés no cuentan para el límite de 9)
    let totalAdults = 0;
    let totalChildren2Plus = 0;

    this.occupancies.forEach(room => {
      totalAdults += room.adults;
      
      if (room.paxes) {
        room.paxes.forEach(pax => {
          if (pax.type === 'CH' && pax.age >= 2 && pax.age <= 11) {
            totalChildren2Plus++;
          }
        });
      }
    });

    return totalAdults + totalChildren2Plus;
  }

  private getTotalBabies(): number {
    // Contar niños de 0-1 años
    let totalBabies = 0;

    this.occupancies.forEach(room => {
      if (room.paxes) {
        room.paxes.forEach(pax => {
          if (pax.type === 'CH' && pax.age >= 0 && pax.age < 2) {
            totalBabies++;
          }
        });
      }
    });

    return totalBabies;
  }

  private getTotalAdults(): number {
    return this.occupancies.reduce((total, room) => total + room.adults, 0);
  }

  private hasChildrenWithoutAge(): boolean {
    return this.occupancies.some(room => 
      room.paxes?.some(pax => pax.type === 'CH' && pax.age === -1)
    );
  }

  // ✅ VALIDACIÓN MÁS ROBUSTA PARA VERIFICAR EDADES FALTANTES
  private hasChildrenWithoutAgeReal(): boolean {
    for (const room of this.occupancies) {
      if (room.children > 0) {
        if (!room.paxes) {
          return true; // Si hay niños pero no hay paxes
        }
        
        const childrenPaxes = room.paxes.filter(pax => pax.type === 'CH');
        
        // Si hay menos paxes de niños que el número de niños
        if (childrenPaxes.length < room.children) {
          return true;
        }
        
        // Si algún niño tiene edad -1 (sin seleccionar)
        if (childrenPaxes.some(pax => pax.age === -1)) {
          return true;
        }
      }
    }
    return false;
  }

  // ✅ MÉTODO PÚBLICO PARA EL TEMPLATE (solo para deshabilitar botones)
  public hasChildrenWithoutAgePublic(): boolean {
    return this.hasChildrenWithoutAge();
  }

  // ✅ MÉTODOS EXISTENTES
  private validatePaxes(): void {
    this.occupancies.forEach((room) => {
      if (!room.paxes) {
        room.paxes = [];
      }

      while (room.paxes.filter((p) => p.type === 'CH').length < room.children) {
        room.paxes.push({ type: 'CH', age: -1 }); // Sin edad por defecto
      }

      room.paxes = [
        ...room.paxes.filter((p) => p.type === 'AD').slice(0, room.adults),
        ...room.paxes.filter((p) => p.type === 'CH').slice(0, room.children),
      ];
    });
  }

  private emitChange(): void {
    this.occupanciesChanged.emit(this.occupancies);
  }

  getTotalRooms(): number {
    return 1;
  }

  getTotalGuests(): number {
    return this.occupancies.reduce((total, room) => {
      return total + room.adults + room.children;
    }, 0);
  }

  // ✅ MÉTODOS PÚBLICOS PARA EL TEMPLATE
  public getTotalValidPassengersPublic(): number {
    return this.getTotalValidPassengers();
  }

  public getMaxPassengers(): number {
    return this.MAX_PASSENGERS;
  }

  // ✅ MÉTODO PÚBLICO PARA QUE EL FORMULARIO PADRE PUEDA VALIDAR
  public isFormValid(): boolean {
    this.validateAndUpdate();
    return this.isValid;
  }
}