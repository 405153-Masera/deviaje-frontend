import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Tipos para los orígenes de error
type ErrorSource = 'HOTELBEDS' | 'AMADEUS' | 'MERCADO_PAGO' | 'BACKEND' | 'EXTERNAL_API';

// Tipo para el objeto de mensajes de error
type ErrorMessages = {
  [key in ErrorSource]: {
    [statusCode: number]: string;
  };
};

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  // Mensajes específicos por origen y código de estado
  private errorMessages: ErrorMessages = {
    HOTELBEDS: {
      400: 'Los criterios de búsqueda de hoteles no son válidos.',
      403: 'Límite de búsquedas de hoteles alcanzado. Intenta más tarde.',
      404: 'No se encontraron hoteles disponibles con los criterios seleccionados.',
      500: 'Error en el servicio de hoteles. Por favor, intenta más tarde.',
      502: 'El servicio de hoteles está temporalmente no disponible.'
    },
    AMADEUS: {
      400: 'Los criterios de búsqueda de vuelos no son válidos.',
      403: 'Límite de búsquedas de vuelos alcanzado. Intenta más tarde.',
      404: 'No se encontraron vuelos disponibles con los criterios seleccionados.',
      500: 'Error en el servicio de vuelos. Por favor, intenta más tarde.',
      502: 'El servicio de vuelos está temporalmente no disponible.'
    },
    MERCADO_PAGO: {
      400: 'Error al procesar el pago. Por favor, verifica los datos de tu tarjeta.',
      402: 'Pago rechazado. Por favor, intenta con otro método de pago.',
      403: 'Esta operación no está permitida.',
      500: 'Error en el procesador de pagos. Por favor, intenta más tarde.',
      503: 'El servicio de pagos está temporalmente no disponible.'
    },
    BACKEND: {
      400: 'Los datos ingresados no son válidos. Por favor, verifica la información.',
      401: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      403: 'No tienes permiso para realizar esta acción.',
      404: 'El recurso solicitado no fue encontrado.',
      500: 'Error del servidor. Por favor, intenta más tarde.',
      503: 'El servicio está temporalmente no disponible.'
    },
    EXTERNAL_API: {
      500: 'Error al comunicarse con un servicio externo.',
      502: 'Un servicio externo está temporalmente no disponible.',
      503: 'Servicio externo no disponible.',
      504: 'Tiempo de espera agotado al conectar con servicio externo.'
    }
  };

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const errorData = error.error;
        const source = errorData?.source || 'BACKEND';
        const status = error.status;

        const userMessage = this.getErrorMessage(source, status, errorData?.message);

        console.error('Error API:', {
          source,
          status,
          message: errorData?.message,
          url: error.url,
          timestamp: errorData?.timestamp
        });

        return throwError(() => ({
          message: userMessage,
          status,
          source,
          originalError: error
        }));
      })
    );
  }

  /**
   * Obtiene el mensaje de error apropiado según el origen y el código de estado.
   */
  private getErrorMessage(source: string, status: number, backendMessage?: string): string {
    // Validar que el source sea uno de los tipos conocidos
    const validSources: ErrorSource[] = ['HOTELBEDS', 'AMADEUS', 'MERCADO_PAGO', 'BACKEND', 'EXTERNAL_API'];
    const normalizedSource = validSources.includes(source as ErrorSource) 
      ? (source as ErrorSource) 
      : 'BACKEND';

    // Intentar obtener mensaje específico por origen y status
    const sourceMessages = this.errorMessages[normalizedSource];
    if (sourceMessages && sourceMessages[status]) {
      return sourceMessages[status];
    }

    // Si hay mensaje del backend y es amigable, usarlo
    if (backendMessage) {
      return this.sanitizeBackendMessage(backendMessage);
    }

    // Mensaje genérico por código de estado
    return this.getGenericMessage(status);
  }

  /**
   * Convierte mensajes técnicos del backend en mensajes amigables.
   */
  private sanitizeBackendMessage(message: string): string {
    // Detectar patrones comunes y convertirlos
    if (message.includes('Quota exceeded') || message.includes('límite')) {
      return 'Has alcanzado el límite de consultas disponibles. Por favor, intenta más tarde.';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'La solicitud tardó demasiado tiempo. Por favor, intenta nuevamente.';
    }
    if (message.includes('unavailable') || message.includes('no disponible')) {
      return 'El servicio no está disponible temporalmente. Por favor, intenta más tarde.';
    }
    if (message.includes('not found') || message.includes('no encontrado')) {
      return 'No se encontraron resultados para tu búsqueda.';
    }

    // Si el mensaje no contiene información técnica, devolverlo
    if (!message.includes('Exception') && !message.includes('Error:') && !message.includes('—')) {
      return message;
    }

    // Si es muy técnico, devolver mensaje genérico
    return 'Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.';
  }

  /**
   * Obtiene un mensaje genérico según el código de estado HTTP.
   */
  private getGenericMessage(status: number): string {
    if (status === 0) {
      return 'No se pudo conectar con el servidor. Por favor, revisa tu conexión a Internet.';
    }
    if (status >= 400 && status < 500) {
      return 'No se pudo completar tu solicitud. Por favor, verifica los datos ingresados.';
    }
    if (status >= 500) {
      return 'Ocurrió un problema en el servidor. Por favor, intenta más tarde.';
    }
    return 'Ocurrió un error inesperado. Por favor, intenta más tarde.';
  }
}