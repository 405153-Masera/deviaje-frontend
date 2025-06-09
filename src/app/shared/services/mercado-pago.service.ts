import { Injectable } from '@angular/core';

declare var MercadoPago: any;

export interface MercadoPagoCardData {
  cardNumber: string;
  cardholderName: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

export interface MercadoPagoResponse {
  status: number;
  cause: any[];
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private mp: any;
  private publicKey = 'TEST-aa806bb9-6912-4882-a450-dc03a46152f9';

  constructor() {
    this.initializeMercadoPago();
  }

  private initializeMercadoPago(): void {
    if (typeof MercadoPago !== 'undefined') {
      this.mp = new MercadoPago(this.publicKey);
      console.log('MercadoPago SDK inicializado correctamente');
    } else {
      console.error('MercadoPago SDK no está cargado');
    }
  }

  /**
   * Tokenizar datos de tarjeta usando el SDK de MercadoPago
   */
  async createCardToken(cardData: MercadoPagoCardData): Promise<MercadoPagoResponse> {
    if (!this.mp) {
      throw new Error('MercadoPago SDK no está inicializado');
    }

    try {
      const response = await this.mp.createCardToken({
        cardNumber: cardData.cardNumber,
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.cardExpirationMonth,
        cardExpirationYear: cardData.cardExpirationYear,
        securityCode: cardData.securityCode,
        identificationType: cardData.identificationType,
        identificationNumber: cardData.identificationNumber
      });

      return response;
    } catch (error) {
      console.error('Error al crear token de tarjeta:', error);
      throw error;
    }
  }

  /**
   * Obtener tipos de documento válidos para el país
   */
  async getIdentificationTypes(): Promise<any[]> {
    if (!this.mp) {
      return [];
    }

    try {
      const response = await this.mp.getIdentificationTypes();
      return response;
    } catch (error) {
      console.error('Error al obtener tipos de identificación:', error);
      return [
        { id: 'DNI', name: 'DNI', type: 'number', min_length: 7, max_length: 8 },
        { id: 'CUIL', name: 'CUIL', type: 'number', min_length: 11, max_length: 11 },
        { id: 'CUIT', name: 'CUIT', type: 'number', min_length: 11, max_length: 11 }
      ];
    }
  }

  /**
   * Validar número de tarjeta en tiempo real
   */
  validateCardNumber(cardNumber: string): boolean {
    if (!cardNumber) return false;
    
    // Eliminar espacios y caracteres no numéricos
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    // Validación básica de longitud
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return false;
    }

    // Algoritmo de Luhn
    return this.luhnCheck(cleanNumber);
  }

  /**
   * Obtener el tipo de tarjeta basado en el número
   */
  getCardType(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6/.test(cleanNumber)) return 'discover';
    
    return '';
  }

  /**
   * Validar fecha de expiración
   */
  validateExpiryDate(month: string, year: string): boolean {
    if (!month || !year) return false;
    
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // Últimos 2 dígitos
    const currentMonth = now.getMonth() + 1;
    
    const expMonth = parseInt(month);
    const expYear = parseInt(year);
    
    if (expMonth < 1 || expMonth > 12) return false;
    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;
    
    return true;
  }

  /**
   * Validar código de seguridad según tipo de tarjeta
   */
  validateSecurityCode(cvv: string, cardType: string): boolean {
    if (!cvv) return false;
    
    const cleanCvv = cvv.replace(/\D/g, '');
    
    if (cardType === 'amex') {
      return cleanCvv.length === 4;
    } else {
      return cleanCvv.length === 3;
    }
  }

  /**
   * Algoritmo de Luhn para validar números de tarjeta
   */
  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Formatear número de tarjeta con espacios
   */
  formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }

  /**
   * Formatear fecha de expiración MM/YY
   */
  formatExpiryDate(input: string): string {
    const cleaned = input.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  }
}