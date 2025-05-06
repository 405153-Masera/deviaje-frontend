import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-deviaje-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-calendar.component.html',
  styleUrl: './deviaje-calendar.component.scss'
})
export class DeviajeCalendarComponent implements OnInit {

   // Inputs
   @Input() selectionMode: 'single' | 'range' = 'range';
   @Input() minDate: Date = new Date();
   @Input() maxDate: Date | null = null;
   @Input() initialStartDate: Date | null = null;
   @Input() initialEndDate: Date | null = null;
   @Input() showTwoMonths: boolean = true;
   @Input() showPrices: boolean = false;
   @Input() pricedDates: DatePrice[] = [];
   
   // Outputs
   @Output() dateSelected = new EventEmitter<Date | null>();
   @Output() rangeSelected = new EventEmitter<{startDate: Date | null, endDate: Date | null}>();
   @Output() closed = new EventEmitter<void>();
   
   // Estado interno
   isVisible: boolean = false;
   currentMonth: Date = new Date();
   nextMonths: Date = new Date();
   selectedDate: Date | null = null;
   selectedStartDate: Date | null = null;
   selectedEndDate: Date | null = null;
   activeInput: 'start' | 'end' = 'start';
   
   // Constantes
   weekDays: string[] = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
   months: string[] = [
     'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
   ];
   
   constructor() { }
   
   ngOnInit(): void {
     // Inicializar mes actual y siguiente
     this.updateNextMonth();
     
     // Inicializar fecha seleccionada si se provee
     if (this.selectionMode === 'single' && this.initialStartDate) {
       this.selectedDate = new Date(this.initialStartDate);
     } else if (this.selectionMode === 'range') {
       if (this.initialStartDate) {
         this.selectedStartDate = new Date(this.initialStartDate);
       }
       if (this.initialEndDate) {
         this.selectedEndDate = new Date(this.initialEndDate);
       }
     }
   }
   
   // Métodos públicos
   open(): void {
     this.isVisible = true;
     
     // Actualizar el mes actual basado en la fecha seleccionada
     if (this.selectionMode === 'single' && this.selectedDate) {
       this.currentMonth = new Date(this.selectedDate);
     } else if (this.selectionMode === 'range' && this.selectedStartDate) {
       this.currentMonth = new Date(this.selectedStartDate);
     } else {
       this.currentMonth = new Date();
     }
     
     this.updateNextMonth();
     
     // Resetear al input de fecha de inicio por defecto
     this.activeInput = 'start';
   }
   
   closeCalendar(): void {
     this.isVisible = false;
     this.closed.emit();
   }
   
   // Navegación del calendario
   prevMonth(): void {
     const month = this.currentMonth.getMonth();
     const year = this.currentMonth.getFullYear();
     
     if (month === 0) {
       this.currentMonth = new Date(year - 1, 11, 1);
     } else {
       this.currentMonth = new Date(year, month - 1, 1);
     }
     
     this.updateNextMonth();
   }
   
   nextMonth(): void {
     const month = this.currentMonth.getMonth();
     const year = this.currentMonth.getFullYear();
     
     if (month === 11) {
       this.currentMonth = new Date(year + 1, 0, 1);
     } else {
       this.currentMonth = new Date(year, month + 1, 1);
     }
     
     this.updateNextMonth();
   }
   
   updateNextMonth(): void {
     const month = this.currentMonth.getMonth();
     const year = this.currentMonth.getFullYear();
     
     if (month === 11) {
       this.nextMonths = new Date(year + 1, 0, 1);
     } else {
       this.nextMonths = new Date(year, month + 1, 1);
     }
   }
   
   // Selección de fechas
   selectDate(date: Date): void {
     if (this.isDateDisabled(date)) {
       return;
     }
     
     if (this.selectionMode === 'single') {
       this.selectedDate = new Date(date);
       this.dateSelected.emit(this.selectedDate);
     } else if (this.selectionMode === 'range') {
       if (this.activeInput === 'start') {
         this.selectedStartDate = new Date(date);
         this.activeInput = 'end';
         
         // Si ya había una fecha de fin y es anterior a la nueva fecha de inicio,
         // resetear la fecha de fin
         if (this.selectedEndDate && this.selectedEndDate < this.selectedStartDate) {
           this.selectedEndDate = null;
         }
       } else {
         // Si la fecha seleccionada es anterior a la fecha de inicio, intercambiarlas
         if (date < this.selectedStartDate!) {
           this.selectedEndDate = new Date(this.selectedStartDate!);
           this.selectedStartDate = new Date(date);
         } else {
           this.selectedEndDate = new Date(date);
         }
         
         // Emitir rango completo
         if (this.selectedStartDate && this.selectedEndDate) {
           this.rangeSelected.emit({
             startDate: this.selectedStartDate,
             endDate: this.selectedEndDate
           });
         }
       }
     }
   }
   
   clearSelection(): void {
     if (this.selectionMode === 'single') {
       this.selectedDate = null;
       this.dateSelected.emit(null);
     } else {
       this.selectedStartDate = null;
       this.selectedEndDate = null;
       this.activeInput = 'start';
       this.rangeSelected.emit({ startDate: null, endDate: null });
     }
   }
   
   setActiveInput(input: 'start' | 'end'): void {
     this.activeInput = input;
   }
   
   applySelection(): void {
     if (this.selectionMode === 'single') {
       this.dateSelected.emit(this.selectedDate);
     } else {
       this.rangeSelected.emit({
         startDate: this.selectedStartDate,
         endDate: this.selectedEndDate
       });
     }
     this.closeCalendar();
   }
   
   canApply(): boolean {
     if (this.selectionMode === 'single') {
       return this.selectedDate !== null;
     } else {
       return this.selectedStartDate !== null && this.selectedEndDate !== null;
     }
   }
   
   // Utilidades de calendario
   getDaysInMonth(): Date[] {
     const year = this.currentMonth.getFullYear();
     const month = this.currentMonth.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     
     const days: Date[] = [];
     for (let i = 1; i <= daysInMonth; i++) {
       days.push(new Date(year, month, i));
     }
     
     return days;
   }
   
   getDaysInNextMonth(): Date[] {
     const year = this.nextMonths.getFullYear();
     const month = this.nextMonths.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     
     const days: Date[] = [];
     for (let i = 1; i <= daysInMonth; i++) {
       days.push(new Date(year, month, i));
     }
     
     return days;
   }
   
   getMonthStartGap(): number[] {
     const year = this.currentMonth.getFullYear();
     const month = this.currentMonth.getMonth();
     const firstDay = new Date(year, month, 1).getDay(); // getDay() devuelve 0 para domingo, 1 para lunes, etc.
     
     return Array(firstDay).fill(0); // fill(0) llena el array con ceros
   }
   
   getMonthEndGap(): number[] {
     const year = this.currentMonth.getFullYear();
     const month = this.currentMonth.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     const lastDay = new Date(year, month, daysInMonth).getDay();
     
     return Array(6 - lastDay).fill(0);
   }
   
   getNextMonthStartGap(): number[] {
     const year = this.nextMonths.getFullYear();
     const month = this.nextMonths.getMonth();
     const firstDay = new Date(year, month, 1).getDay();
     
     return Array(firstDay).fill(0);
   }
   
   getNextMonthEndGap(): number[] {
     const year = this.nextMonths.getFullYear();
     const month = this.nextMonths.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     const lastDay = new Date(year, month, daysInMonth).getDay();
     
     return Array(6 - lastDay).fill(0);
   }
   
   // Validaciones de fechas
   isDateDisabled(date: Date): boolean {
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     
     // Deshabilitar fechas anteriores a la fecha mínima
     if (date < this.minDate) {
       return true;
     }
     
     // Deshabilitar fechas posteriores a la fecha máxima si está definida
     if (this.maxDate && date > this.maxDate) {
       return true;
     }
     
     return false;
   }
   
   isDateSelected(date: Date): boolean {
     if (this.selectionMode === 'single') {
       return this.isSameDate(date, this.selectedDate);
     } else {
       return this.isSameDate(date, this.selectedStartDate) || 
              this.isSameDate(date, this.selectedEndDate);
     }
   }
   
   isRangeStart(date: Date): boolean {
     return this.selectionMode === 'range' && this.isSameDate(date, this.selectedStartDate);
   }
   
   isRangeEnd(date: Date): boolean {
     return this.selectionMode === 'range' && this.isSameDate(date, this.selectedEndDate);
   }
   
   isInRange(date: Date): boolean {
     if (this.selectionMode !== 'range' || !this.selectedStartDate || !this.selectedEndDate) {
       return false;
     }
     
     return date > this.selectedStartDate && date < this.selectedEndDate;
   }
   
   isToday(date: Date): boolean {
     const today = new Date();
     return this.isSameDate(date, today);
   }
   
   isSameDate(date1: Date | null, date2: Date | null): boolean {
     if (!date1 || !date2) {
       return false;
     }
     
     return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
   }
   
   // Formateo de fechas
   formatDate(date: Date | null): string {
     if (!date) {
       return '';
     }
     
     return `${date.getDate()} de ${this.months[date.getMonth()]}, ${date.getFullYear()}`;
   }
   
   formatShortDate(date: Date | null): string {
     if (!date) {
       return '';
     }
     
     return `${date.getDate()}/${date.getMonth() + 1}`;
   }
   
   // Precios de fechas
   getPriceForDate(date: Date): number | null {
     if (!this.showPrices || !this.pricedDates.length) {
       return null;
     }
     
     const pricedDate = this.pricedDates.find(pd => this.isSameDate(pd.date, date));
     return pricedDate ? pricedDate.price : null;
   }

  
}

interface DatePrice {
  date: Date;
  price: number;
}
