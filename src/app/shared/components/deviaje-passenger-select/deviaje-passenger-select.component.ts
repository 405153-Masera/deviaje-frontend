import { Component, ElementRef, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';

@Component({
  selector: 'app-deviaje-passenger-select',
  standalone: true,
  imports: [],
  templateUrl: './deviaje-passenger-select.component.html',
  styleUrl: './deviaje-passenger-select.component.scss'
})
export class DeviajePassengerSelectComponent {

  private readonly elementRef: ElementRef = inject(ElementRef);

  @Input() adults: number = 1;
  @Input() children: number = 0;
  @Input() infants: number = 0;
  @Input() placeholder: string = 'Pasajeros';
  @Input() minAdults: number = 1;
  @Input() maxPassengers: number = 9;

  @Output() passengersChanged = new EventEmitter<{adults: number, children: number, infants: number}>();

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

  get totalPassengers(): number {
    return this.adults + this.children + this.infants;
  }

  get displayText(): string {
    const totalText = this.totalPassengers === 1 ? 'Pasajero' : 'Pasajeros';
    return `${this.totalPassengers} ${totalText}`;
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  get totalMaxPassengers(): number {
    return this.adults + this.children;
  }

  incrementPassengers(type: 'adults' | 'children' | 'infants', event: Event): void {
   
    event.stopPropagation();

    if (type === 'adults' && this.totalMaxPassengers < this.maxPassengers) {
      this.adults++;
    } else if (type === 'children' && this.totalMaxPassengers < this.maxPassengers) {
      this.children++;
    } else if (type === 'infants' && this.infants < this.adults) {
      this.infants++;
    }
    
    this.emitChange();
  }

  decrementPassengers(type: 'adults' | 'children' | 'infants', event: Event): void {
    
    event.stopPropagation();

    if (type === 'adults' && this.adults > this.minAdults) {
      this.adults--;

      if (this.infants > this.adults) {
        this.infants = this.adults;
      }

    } else if (type === 'children' && this.children > 0) {
      this.children--;
    } else if (type === 'infants' && this.infants > 0) {
      this.infants--;
    }

    this.emitChange();
  }

  applySelection(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = false;
    this.emitChange();
  }

  private emitChange(): void {
    this.passengersChanged.emit({
      adults: this.adults,
      children: this.children,
      infants: this.infants
    });
  }
}
