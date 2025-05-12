import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-deviaje-room-guest-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deviaje-room-guest-select.component.html',
  styleUrl: './deviaje-room-guest-select.component.scss',
})
export class DeviajeRoomGuestSelectComponent implements OnInit {
  private readonly elementRef: ElementRef = inject(ElementRef);

  @Input() label: string = 'Habitaciones y huéspedes';

  @Input() occupancies: Array<{
    rooms: number;
    adults: number;
    children: number;
    paxes?: Array<{
      type: string;
      age: number;
    }>;
  }> = [{ rooms: 1, adults: 1, children: 0 }];

  @Output() occupanciesChanged = new EventEmitter<
    Array<{
      rooms: number;
      adults: number;
      children: number;
      paxes?: Array<{
        type: string;
        age: number;
      }>;
    }>
  >();

  isDropdownOpen: boolean = false;

  // Detener la propagación del evento para evitar que se cierre el dropdown al hacer clic en él
  @HostListener('click', ['$event'])
  onClick(event: Event) {
    event.stopPropagation();
  }

  // Cerrar el dropdown cuando se hace clic fuera del componente
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    // Asegurarse de que siempre hay al menos una habitación
    if (!this.occupancies || this.occupancies.length === 0) {
      this.occupancies = [{ rooms: 1, adults: 1, children: 0 }];
    }

    // Asegurarse de que los paxes estén inicializados correctamente
    this.validatePaxes();
  }

 toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  applyChanges(): void {
    this.validatePaxes();
    this.occupanciesChanged.emit(this.occupancies);
    this.closeDropdown();
  }

  addRoom(): void {
    if (this.occupancies.length < 4) {
      this.occupancies.push({ rooms: 1, adults: 1, children: 0 });
    }
  }

  removeRoom(index: number): void {
    if (this.occupancies.length > 1) {
      this.occupancies.splice(index, 1);
    }
  }

  updateAdults(roomIndex: number, increment: boolean): void {
    const room = this.occupancies[roomIndex];

    if (increment) {
      if (room.adults < 6) {
        room.adults++;
      }
    } else {
      if (room.adults > 1) {
        room.adults--;
      }
    }
  }

  updateChildren(roomIndex: number, increment: boolean): void {
    const room = this.occupancies[roomIndex];

    if (increment) {
      if (room.children < 4) {
        room.children++;

        // Inicializar array de paxes si no existe
        if (!room.paxes) {
          room.paxes = [];
        }

        // Agregar un nuevo niño con edad 0
        room.paxes.push({ type: 'CH', age: 0 });
      }
    } else {
      if (room.children > 0) {
        room.children--;

        // Eliminar el último niño del array de paxes
        if (room.paxes && room.paxes.length > 0) {
          // Filtramos para mantener solo los paxes que son niños (hasta el nuevo total de niños)
          room.paxes = room.paxes
            .filter((pax) => pax.type === 'CH')
            .slice(0, room.children);
        }
      }
    }
  }

  updateChildAge(roomIndex: number, childIndex: number, age: number): void {
    const room = this.occupancies[roomIndex];

    if (room.paxes && room.paxes.length > childIndex) {
      room.paxes[childIndex].age = age;
    }
  }

  // Asegura que los paxes estén correctamente configurados para cada habitación
  private validatePaxes(): void {
    this.occupancies.forEach((room) => {
      // Inicializar paxes si no existe
      if (!room.paxes) {
        room.paxes = [];
      }

      // Asegurarse de que hay un pax para cada adulto
      while (room.paxes.filter((p) => p.type === 'AD').length < room.adults) {
        room.paxes.push({ type: 'AD', age: 30 }); // Edad por defecto para adultos
      }

      // Asegurarse de que hay un pax para cada niño
      while (room.paxes.filter((p) => p.type === 'CH').length < room.children) {
        room.paxes.push({ type: 'CH', age: 8 }); // Edad por defecto para niños
      }

      // Eliminar paxes extra si hay demasiados
      room.paxes = [
        ...room.paxes.filter((p) => p.type === 'AD').slice(0, room.adults),
        ...room.paxes.filter((p) => p.type === 'CH').slice(0, room.children),
      ];
    });
  }

  getTotalRooms(): number {
    return this.occupancies.length;
  }

  getTotalGuests(): number {
    return this.occupancies.reduce((total, room) => {
      return total + room.adults + room.children;
    }, 0);
  }
}
