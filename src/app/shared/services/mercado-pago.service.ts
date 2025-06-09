import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../enviroments/enviroment';
import { Observable, from } from 'rxjs';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export interface MercadoPagoConfig {
  publicKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {
  private readonly http = inject(HttpClient);
  private mp: any = null;

  /**
   * Inicializa el SDK de Mercado Pago con una clave pública básica
   */
  async initializeMercadoPago(): Promise<void> {
    try {
      const config = await this.getPaymentConfig().toPromise();
      
      if (!window.MercadoPago) {
        await this.loadSDK();
      }
      this.mp = new window.MercadoPago(config.publicKey, {
        locale: 'es-AR'
      });
      console.log('Mercado Pago SDK inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar Mercado Pago:', error);
      throw error;
    }
  }

  /**
   * Carga el SDK de Mercado Pago dinámicamente
   */
  private loadSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.MercadoPago) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Error al cargar SDK de Mercado Pago'));
      document.head.appendChild(script);
    });
  }

  /**
   * Obtiene la configuración de pagos desde el backend
   */
  getPaymentConfig(): Observable<MercadoPagoConfig> {
    return this.http.get<MercadoPagoConfig>(${environment.apiDeviajeBookings}/api/payments/config);
  }

  /**
   * Genera un token de tarjeta usando el SDK
   */
  async createCardToken(cardData: {
    cardNumber: string;
    cardholderName: string;
    expirationMonth: string;
    expirationYear: string;
    securityCode: string;
  }): Promise<string> {
    if (!this.mp) {
      throw new Error('SDK no inicializado');
    }

    try {
      const token = await this.mp.createCardToken({
        cardNumber: cardData.cardNumber,
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.expirationMonth,
        cardExpirationYear: cardData.expirationYear,
        securityCode: cardData.securityCode
      });

      if (token.error) {
        throw new Error(token.error.message);
      }

      return token.id;
    } catch (error) {
      console.error('Error al crear token:', error);
      throw error;
    }
  }

  /**
   * Valida los datos básicos de la tarjeta
   */
  validateCardData(cardData: {
    cardNumber: string;
    expirationMonth: string;
    expirationYear: string;
    securityCode: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.mp.validateCardNumber(cardData.cardNumber)) {
      errors.push('Número de tarjeta inválido');
    }

    if (!this.mp.validateExpiryDate(cardData.expirationMonth, cardData.expirationYear)) {
      errors.push('Fecha de expiración inválida');
    }

    if (!this.mp.validateSecurityCode(cardData.securityCode)) {
      errors.push('Código de seguridad inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}