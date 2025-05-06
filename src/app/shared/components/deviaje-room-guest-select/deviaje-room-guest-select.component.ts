import { Component, ElementRef, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';

@Component({
  selector: 'app-deviaje-room-guest-select',
  standalone: true,
  imports: [],
  templateUrl: './deviaje-room-guest-select.component.html',
  styleUrl: './deviaje-room-guest-select.component.scss',
})
export class DeviajeRoomGuestSelectComponent {

  private readonly elementRef: ElementRef = inject(ElementRef);

  @Input() rooms: number = 1;
  @Input() adults: number = 1;
  @Input() children: number = 0;
  @Input() placeholder: string = 'Habitaciones y huéspedes';
  @Input() maxRooms: number = 9;
  @Input() maxAdultsPerRoom: number = 9;
  //@Input() maxChildren: number = 6;
  @Input() minAdults: number = 1;
  @Input() minRooms: number = 1;
  @Output() roomsAndGuestsChanged = new EventEmitter<{
    rooms: number;
    adults: number;
    children: number;
  }>();

  isDropdownOpen = false;

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

  get displayText(): string {
    const roomText = this.rooms === 1 ? 'habitación' : 'habitaciones';
    const adultText = this.adults === 1 ? 'adulto' : 'adultos';
    const childText = this.children === 1 ? 'niño' : 'niños';

    let text = `${this.rooms} ${roomText}, ${this.adults} ${adultText}`;
    if (this.children > 0) {
      text += `, ${this.children} ${childText}`;
    }

    return text;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  incrementRooms(event: Event): void {
    event.stopPropagation();
    if (this.rooms < this.maxRooms) {
      this.rooms++;
      this.emitChange();
    }
  }

  decrementRooms(event: Event): void {
    event.stopPropagation();
    if (this.rooms > this.minRooms) {
      this.rooms--;
      this.emitChange();
    }
  }

  get totalGuest(): number {
    return this.adults + this.children;
  }

  incrementGuest(type: 'adults' | 'children', event: Event): void {
    event.stopPropagation();
    if (this.totalGuest < this.maxAdultsPerRoom) {
      
      if(type === 'adults') {
        this.adults++;
       } else if(type=== 'children') {
        
          this.children++;
       }
    }  
    this.emitChange();
  }

  decrementGuest(type: 'adults' | 'children', event: Event): void {
    event.stopPropagation();
    if (type === 'adults' && this.adults > this.minAdults) {
      this.adults--;
    } else if (type === 'children' && this.children > 0) {
      this.children--;
    }
    this.emitChange();
  }

  applySelection(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = false;
    this.emitChange();
  }

  private emitChange(): void {
    this.roomsAndGuestsChanged.emit({
      rooms: this.rooms,
      adults: this.adults,
      children: this.children,
    });
  }
}
