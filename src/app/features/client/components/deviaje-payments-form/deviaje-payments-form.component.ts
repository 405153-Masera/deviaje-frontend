import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-deviaje-payments-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-payments-form.component.html',
  styleUrl: './deviaje-payments-form.component.scss'
})
export class DeviajePaymentsFormComponent implements OnInit {
  @Input() paymentForm: AbstractControl | null = null;
  @Input() amount: string = '0';
  @Input() currency: string = 'USD';
  
  // Banderas para mostrar la tarjeta según el primer dígito
  cardType: string = '';
  cardTypeIcon: string = '';
  showCardPreview: boolean = true;

  // Variables para la vista previa de la tarjeta
  previewCardNumber: string = '•••• •••• •••• ••••';
  previewCardHolder: string = 'NOMBRE DEL TITULAR';
  previewCardExpiry: string = 'MM/YY';
  
  ngOnInit(): void {
    if (this.paymentForm) {
      // Actualizar la cantidad y moneda en el formulario
      this.paymentForm.get('amount')?.setValue(parseFloat(this.amount));
      this.paymentForm.get('currency')?.setValue(this.currency);
      
      // Suscribirse a cambios en los campos para actualizar la vista previa
      this.paymentForm.get('cardNumber')?.valueChanges.subscribe(value => {
        this.updateCardType(value);
        this.updateCardNumberPreview(value);
      });
      
      this.paymentForm.get('cardholderName')?.valueChanges.subscribe(value => {
        this.previewCardHolder = value ? value.toUpperCase() : 'NOMBRE DEL TITULAR';
      });
      
      this.paymentForm.get('expiryDate')?.valueChanges.subscribe(value => {
        this.previewCardExpiry = value || 'MM/YY';
      });
    }
  }

  // Detectar el tipo de tarjeta según el primer dígito
  updateCardType(cardNumber: string): void {
    if (!cardNumber) {
      this.cardType = '';
      this.cardTypeIcon = '';
      return;
    }
    
    const firstDigit = cardNumber.charAt(0);
    
    if (firstDigit === '4') {
      this.cardType = 'visa';
      this.cardTypeIcon = 'bi-credit-card';
    } else if (['5', '2'].includes(firstDigit)) {
      this.cardType = 'mastercard';
      this.cardTypeIcon = 'bi-credit-card-2-front';
    } else if (['3'].includes(firstDigit)) {
      this.cardType = 'amex';
      this.cardTypeIcon = 'bi-credit-card-fill';
    } else {
      this.cardType = '';
      this.cardTypeIcon = 'bi-credit-card';
    }
  }

  // Actualizar la vista previa del número de tarjeta
  updateCardNumberPreview(cardNumber: string): void {
    if (!cardNumber) {
      this.previewCardNumber = '•••• •••• •••• ••••';
      return;
    }

    // Agregar espacios cada 4 dígitos para la visualización
    let formattedNumber = '';
    for (let i = 0; i < cardNumber.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedNumber += ' ';
      }
      formattedNumber += cardNumber[i];
    }
    
    // Completar con placeholders si es necesario
    const digitsLeft = 16 - cardNumber.length;
    if (digitsLeft > 0) {
      formattedNumber += ' ' + '•'.repeat(digitsLeft);
    }
    
    this.previewCardNumber = formattedNumber;
  }

  // Formatear el número de tarjeta mientras se escribe
  formatCardNumber(event: any): void {
    if (!this.paymentForm) return;
    
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Eliminar caracteres no numéricos
    
    // Limitar a 16 dígitos
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    
    this.paymentForm.get('cardNumber')?.setValue(value, { emitEvent: false });
    
    // Actualizar la vista previa manualmente
    this.updateCardType(value);
    this.updateCardNumberPreview(value);
  }

  // Formatear la fecha de vencimiento mientras se escribe (MM/YY)
  formatExpiryDate(event: any): void {
    if (!this.paymentForm) return;
    
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Eliminar caracteres no numéricos
    
    if (value.length > 0) {
      // Limitar el mes entre 01 y 12
      if (value.length >= 2) {
        let month = parseInt(value.substring(0, 2));
        if (month > 12) {
          month = 12;
        } else if (month === 0) {
          month = 1;
        }
        
        value = month.toString().padStart(2, '0') + value.substring(2);
      }
      
      // Formatear como MM/YY
      if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
    }
    
    this.paymentForm.get('expiryDate')?.setValue(value, { emitEvent: false });
    this.previewCardExpiry = value || 'MM/YY';
  }

  // Formatear el código CVV mientras se escribe
  formatCvv(event: any): void {
    if (!this.paymentForm) return;
    
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); // Eliminar caracteres no numéricos
    
    // Limitar a 3 o 4 dígitos según el tipo de tarjeta
    const maxLength = this.cardType === 'amex' ? 4 : 3;
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }
    
    this.paymentForm.get('cvv')?.setValue(value);
  }

  // Girar la tarjeta para mostrar el CVV
  flipCard(show: boolean): void {
    this.showCardPreview = !show;
  }
}

