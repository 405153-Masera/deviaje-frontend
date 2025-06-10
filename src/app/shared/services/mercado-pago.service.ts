import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../enviroments/enviroment';
import { Observable, firstValueFrom, from } from 'rxjs';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export interface MercadoPagoConfig {
  publicKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class MercadoPagoService {
  private readonly http = inject(HttpClient);
  private mp: any = null;

  /**
   * Inicializa el SDK de Mercado Pago con una clave pública básica
   */
  async initializeMercadoPago(): Promise<void> {
    try {
      const config = await firstValueFrom(this.getPaymentConfig());
      if (!window.MercadoPago) {
        await this.loadSDK();
      }

      // Verificar que config no sea undefined antes de usarlo
      if (config && config.publicKey) {
        this.mp = new window.MercadoPago(config.publicKey, {
          locale: 'es-AR',
        });
        console.log('Mercado Pago SDK inicializado correctamente');
      } else {
        throw new Error('No se pudo obtener la clave pública de MercadoPago');
      }
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
      script.onerror = () =>
        reject(new Error('Error al cargar SDK de Mercado Pago'));
      document.head.appendChild(script);
    });
  }

  /**
   * Obtiene la configuración de pagos desde el backend
   */
  getPaymentConfig(): Observable<MercadoPagoConfig> {
    // Corregir la construcción de la URL - usar concatenación normal
    const url = `${environment.apiDeviajeBookings}/api/payments/config`;
    return this.http.get<MercadoPagoConfig>(url);
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
    identificationType?: string;
    identificationNumber?: string;
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
        securityCode: cardData.securityCode,
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
   * Obtiene el método de pago basado en el número de tarjeta
   */
  async getPaymentMethod(cardNumber: string): Promise<string> {
    if (!this.mp) {
      throw new Error('SDK no inicializado');
    }

    try {
      const paymentMethods = await this.mp.getPaymentMethods({
        bin: cardNumber.slice(0, 6),
      });
      if (
        !paymentMethods ||
        !paymentMethods.results ||
        paymentMethods.results.length === 0
      ) {
        throw new Error(
          'No se encontraron métodos de pago para el BIN proporcionado'
        );
      }

      const paymentMethod = paymentMethods.results[0];
      if (paymentMethods.results.length > 1) {
        console.warn(
          'Múltiples métodos de pago encontrados para el BIN:',
          cardNumber.slice(0, 6)
        );
      }

      return paymentMethod.id; // Ejemplo: 'master' para el BIN 503175
    } catch (error) {
      console.error('Error al obtener método de pago:', error);
      throw error;
    }
  }
}
