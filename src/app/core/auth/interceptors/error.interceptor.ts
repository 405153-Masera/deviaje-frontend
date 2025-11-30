import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

// Tipos para los orígenes de error
type ErrorSource =
  | 'HOTELBEDS'
  | 'AMADEUS'
  | 'MERCADO_PAGO'
  | 'BACKEND'
  | 'EXTERNAL_API';

// Tipo para el objeto de mensajes de error
type ErrorMessages = {
  [k in ErrorSource]: {
    [status: number]: string;
  };
};

// Códigos de error específicos de HotelBeds
type HotelBedsErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_DATA'
  | 'ALLOTMENT_EXCEEDED'
  | 'SYSTEM_ERROR'
  | 'PRODUCT_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'INSUFFICIENT_ALLOTMENT'
  | 'PRICE_INCREASED'
  | 'CONTRACT_CLOSED'
  | 'STOP_SALES'
  | 'BOOKING_CONFIRMATION_ERROR'
  | 'RELEASE_VIOLATED';

type MercadoPagoErrorCode =
  | 'MISSING_TOKEN'
  | 'INVALID_PAYMENT_ID'
  | 'cc_rejected_insufficient_amount'
  | 'cc_rejected_bad_filled_security_code'
  | 'cc_rejected_bad_filled_date'
  | 'cc_rejected_bad_filled_other'
  | 'cc_rejected_call_for_authorize'
  | 'cc_rejected_card_disabled'
  | 'cc_rejected_duplicated_payment'
  | 'cc_rejected_high_risk'
  | 'cc_rejected_invalid_installments'
  | 'cc_rejected_max_attempts';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorData = error.error;
      const source = errorData?.source as ErrorSource;
      const status = error.status;
      const codeErrorApi = errorData?.codeErrorApi;

      const userMessage = getErrorMessage(
        source,
        status,
        errorData?.message,
        codeErrorApi
      );

      console.error('Error API:', {
        source,
        status,
        codeErrorApi,
        message: errorData?.message,
        url: error.url,
        timestamp: errorData?.timestamp,
      });

      return throwError(() => ({
        message: userMessage,
        status,
        codeErrorApi,
        source,
        originalError: error,
      }));
    })
  );
};

function getErrorMessage(
  source: ErrorSource,
  status: number,
  backendMessage?: string,
  codeErrorApi?: string
): string {
  if (source === 'HOTELBEDS' && codeErrorApi) {
    const hotelBedsMessage = getHotelBedsSpecificMessage(codeErrorApi, status);
    if (hotelBedsMessage) {
      return hotelBedsMessage;
    }
  }

  if (source === 'MERCADO_PAGO' && codeErrorApi) {
    const mercadoPagoMessage = getMercadoPagoSpecificMessage(
      codeErrorApi,
      status
    );
    if (mercadoPagoMessage) {
      return mercadoPagoMessage;
    }
  }

  if (source === 'AMADEUS' && codeErrorApi) {
    const amadeusMessage = getAmadeusSpecificMessage(codeErrorApi, status);
    if (amadeusMessage) {
      return amadeusMessage;
    }
  }

  const errorMessages: ErrorMessages = {
    HOTELBEDS: {
      400: 'Los criterios de búsqueda de hoteles no son válidos.',
      401: 'Error de autenticación con el servicio de hoteles.',
      403: 'Acceso denegado al servicio de hoteles.',
      404: 'No se encontraron hoteles disponibles.',
      410: 'Esta operación no se puede repetir.',
      429: 'Has realizado demasiadas solicitudes. Por favor, espera un momento.',
      500: 'Error interno del servicio de hoteles. Intenta más tarde.',
    },
    AMADEUS: {
      400: 'Los criterios de búsqueda de vuelos no son válidos.',
      401: 'Error de autenticación con el servicio de vuelos.',
      403: 'Límite de búsquedas de vuelos alcanzado. Intenta más tarde.',
      404: 'No se encontraron vuelos disponibles.',
      429: 'Has realizado demasiadas solicitudes de vuelos. Por favor, espera.',
      500: 'Error en el servicio de vuelos. Intenta más tarde.',
      502: 'El servicio de vuelos está temporalmente no disponible.',
    },
    MERCADO_PAGO: {
      400: 'Los datos del pago no son válidos. Verifica la tarjeta o el formulario.',
      401: 'Error de autenticación con Mercado Pago. Verifica tus credenciales.',
      403: 'Error de autenticación con Mercado Pago. Verifica tus credenciales.',
      404: 'No se encontró la operación de pago solicitada.',
      402: 'Pago rechazado. Intenta con otro medio de pago.', // <-- lo agregaste vos, está bien
      422: 'No se pudo procesar el pago. Verifica los datos o intenta más tarde.',
      500: 'Error en el procesador de pagos. Intenta más tarde.',
      503: 'Servicio de Mercado Pago no disponible temporalmente.',
    },
    BACKEND: {
      400: 'Los datos ingresados no son válidos.',
      401: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
      403: 'No tienes permiso para realizar esta acción.',
      404: 'El recurso solicitado no fue encontrado.',
      500: 'Error del servidor. Intenta más tarde.',
    },
    EXTERNAL_API: {
      500: 'Error al comunicarse con un servicio externo.',
      502: 'Un servicio externo está temporalmente no disponible.',
      503: 'Servicio externo no disponible.',
      504: 'Tiempo de espera agotado al conectar con servicio externo.',
    },
  };

  const sourceMessages = errorMessages[source];
  console.log(sourceMessages);
  if (sourceMessages && sourceMessages[status]) {
    return sourceMessages[status];
  }

  if (backendMessage) {
    const sanitized = sanitizeBackendMessage(backendMessage);
    if (sanitized) {
      return sanitized;
    }
  }

  return getGenericMessage(status);
}

/**
 * Obtiene mensajes específicos para códigos de error de HotelBeds.
 */
function getHotelBedsSpecificMessage(
  codeErrorApi: string,
  status: number
): string | null {
  const hotelBedsMessages: Record<string, string> = {
    // Errores 400
    INVALID_REQUEST:
      'La solicitud no cumple con el formato requerido. Por favor, verifica los datos.',
    INVALID_DATA:
      'Los datos son incorrectos. Verifica las fechas, número de huéspedes y habitaciones.',
    ALLOTMENT_EXCEEDED:
      'Se ha excedido el límite de habitaciones disponibles. Por favor, reduce la cantidad.',
    AUTHORIZATION_MISSING: 'Error de autenticación con el servicio de hoteles.',
    SIGNATURE_FAILED: 'Error de verificación con el servicio de hoteles.',
    SYSTEM_ERROR:
      'Error interno del servicio de hoteles. Nuestro equipo ha sido notificado. Intenta más tarde.',
    PRODUCT_ERROR:
      'No se puede completar la reserva debido a que la oferta ya no esta disponible o debido a cambios en el precio.',
    CONFIGURATION_ERROR:
      'Hay un problema de configuración con el servicio de hoteles. Contacta con soporte.',
  };

  // Buscar mensaje específico
  const message = hotelBedsMessages[codeErrorApi];
  if (message) {
    return message;
  }

  // Si el código contiene palabras clave, buscar coincidencias parciales
  const lowerCode = codeErrorApi.toLowerCase();

  if (lowerCode.includes('insufficient') || lowerCode.includes('allotment')) {
    return 'Esta habitación ya no está disponible. Por favor, realiza una nueva búsqueda.';
  }

  if (lowerCode.includes('price') && lowerCode.includes('increase')) {
    return 'El precio del hotel ha aumentado. Por favor, verifica el nuevo precio.';
  }

  if (
    lowerCode.includes('contract') ||
    lowerCode.includes('office') ||
    lowerCode.includes('branch')
  ) {
    return 'El hotel no está disponible para reservas en este momento.';
  }

  if (lowerCode.includes('stop') && lowerCode.includes('sales')) {
    return 'El hotel no acepta reservas para las fechas seleccionadas.';
  }

  if (lowerCode.includes('release')) {
    return 'No se puede reservar con tan poca antelación para este hotel.';
  }

  if (lowerCode.includes('confirmation')) {
    return 'Error al confirmar la reserva. Por favor, intenta nuevamente.';
  }

  // Si no hay coincidencia específica, retornar null para usar mensajes por defecto
  return null;
}

/**
 * Convierte mensajes técnicos del backend en mensajes amigables.
 */
function sanitizeBackendMessage(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('Quota exceeded') ||
    lowerMessage.includes('límite')
  ) {
    return 'Has alcanzado el límite de consultas disponibles. Por favor, intenta más tarde.';
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'La solicitud tardó demasiado tiempo. Por favor, intenta nuevamente.';
  }
  if (
    lowerMessage.includes('unavailable') ||
    lowerMessage.includes('no disponible')
  ) {
    return 'El servicio no está disponible temporalmente. Por favor, intenta más tarde.';
  }
  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('no encontrado')
  ) {
    return 'No se encontraron resultados para tu búsqueda.';
  }

  if (lowerMessage.includes('failed to fetch')) {
    return 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a Internet o que el servidor esté funcionando.';
  }

  // Si el mensaje no contiene información técnica, devolverlo
  if (
    !lowerMessage.includes('Exception') &&
    !lowerMessage.includes('Error:') &&
    !lowerMessage.includes('—') &&
    lowerMessage.length < 200
  ) {
    return message;
  }

  // Si es muy técnico, devolver null para usar mensaje genérico
  return null;
}

/**
 * Obtiene un mensaje genérico según el código de estado HTTP.
 */
function getGenericMessage(status: number): string {
  if (status === 0) {
    return 'No se pudo conectar con el servidor. Por favor, revisa tu conexión a Internet.';
  }
  if (status === 401) {
    return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
  }
  if (status === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }
  if (status === 404) {
    return 'El recurso solicitado no fue encontrado.';
  }
  if (status === 429) {
    return 'Has realizado demasiadas solicitudes. Por favor, espera un momento e intenta nuevamente.';
  }
  if (status >= 400 && status < 500) {
    return 'No se pudo completar tu solicitud. Por favor, verifica los datos ingresados.';
  }
  if (status >= 500 && status < 600) {
    return 'Ocurrió un problema en el servidor. Por favor, intenta más tarde.';
  }
  return 'Ocurrió un error inesperado. Por favor, intenta más tarde.';
}

function getMercadoPagoSpecificMessage(
  codeErrorApi: string,
  status: number
): string | null {
  const mercadoPagoMessages: Record<string, string> = {
    // Validación
    MISSING_TOKEN: 'Falta el token de pago. Por favor, intenta nuevamente.',
    INVALID_PAYMENT_ID: 'El ID de pago es inválido.',

    // Pagos rechazados - Status Detail
    cc_rejected_insufficient_amount:
      'No tienes fondos suficientes en tu tarjeta.',
    cc_rejected_bad_filled_security_code:
      'El código de seguridad (CVV) es incorrecto. Verifícalo e intenta nuevamente.',
    cc_rejected_bad_filled_date:
      'La fecha de vencimiento de tu tarjeta es incorrecta.',
    cc_rejected_bad_filled_other:
      'Los datos de tu tarjeta son incorrectos. Verifícalos e intenta nuevamente.',
    cc_rejected_call_for_authorize:
      'Debes autorizar este pago con tu banco. Comunícate con ellos.',
    cc_rejected_card_disabled:
      'Tu tarjeta está deshabilitada. Contacta a tu banco o usa otra tarjeta.',
    cc_rejected_duplicated_payment: 'Este pago ya fue procesado anteriormente.',
    cc_rejected_high_risk:
      'Tu pago fue rechazado por motivos de seguridad. Intenta con otro método de pago.',
    cc_rejected_invalid_installments:
      'La cantidad de cuotas seleccionada no es válida para esta tarjeta.',
    cc_rejected_max_attempts:
      'Excediste el número máximo de intentos permitidos. Por favor, intenta más tarde.',
    cc_rejected_other_reason:
      'Tu tarjeta fue rechazada. Verifica los datos de la tarjeta.',

    // Errores de API (códigos numéricos como strings)
    '2067':
      'El número de tarjeta es inválido. Verifícalo e intenta nuevamente.',
    '2131':
      'No se pudo identificar el método de pago. Verifica los datos de tu tarjeta.',
    '3034': 'El banco emisor es inválido.',
    '3035': 'La cantidad de cuotas no es válida.',
    '3003':
      'Por seguridad, el token de la tarjeta expiró. Volvé a ingresar los datos.',
    '2084':
      'Está transacción no se puede reembolsar.',


    // Errores generales
    bad_request:
      'Los datos del pago son inválidos. Verifícalos e intenta nuevamente.',
    unauthorized: 'Error de autenticación con el procesador de pagos.',
  };

  // Buscar mensaje específico
  const message = mercadoPagoMessages[codeErrorApi];
  if (message) {
    return message;
  }

  // Si el código contiene palabras clave, buscar coincidencias parciales
  const lowerCode = codeErrorApi.toLowerCase();

  if (lowerCode.includes('insufficient') || lowerCode.includes('amount')) {
    return 'No tienes fondos suficientes en tu tarjeta.';
  }

  if (lowerCode.includes('security') || lowerCode.includes('cvv')) {
    return 'El código de seguridad (CVV) es incorrecto.';
  }

  if (lowerCode.includes('date') || lowerCode.includes('expir')) {
    return 'La fecha de vencimiento de tu tarjeta es incorrecta.';
  }

  if (lowerCode.includes('disabled') || lowerCode.includes('blocked')) {
    return 'Tu tarjeta está deshabilitada. Contacta a tu banco.';
  }

  if (lowerCode.includes('duplicat')) {
    return 'Este pago ya fue procesado anteriormente.';
  }

  if (lowerCode.includes('high_risk') || lowerCode.includes('fraud')) {
    return 'Pago rechazado por motivos de seguridad.';
  }

  if (lowerCode.includes('installments') || lowerCode.includes('cuotas')) {
    return 'La cantidad de cuotas no es válida.';
  }

  if (lowerCode.includes('max_attempts') || lowerCode.includes('attempts')) {
    return 'Excediste el número máximo de intentos.';
  }

  // Si no hay coincidencia específica, retornar null para usar mensajes por defecto
  return null;
}

function getAmadeusSpecificMessage(
  codeErrorApi: string,
  status: number
): string | null {
  const amadeusMessages: Record<string, string> = {
    // --- Errores de Formato / Datos ---
    '425': 'La fecha ingresada no es válida. Verifica la fecha del viaje.',
    '477':
      'Formato inválido en los datos enviados. Verifica aeropuertos, fechas o pasajeros.',
    '2781': 'La longitud de un dato es inválida.',
    '2668': 'La combinación de parámetros no es válida.',
    '32171': 'Faltan datos obligatorios en la búsqueda.',
    '4926': 'Los datos enviados no son válidos para realizar la búsqueda.',
    '10661': 'Se excedió el número máximo permitido (pasajeros o segmentos).',

    // --- Tarifas / disponibilidad ---
    '34107': 'La tarifa seleccionada ya no está disponible.',
    '34651': 'Uno de los segmentos del vuelo ya no está disponible.',
    '37200': 'El precio del vuelo cambió. Actualiza la búsqueda.',

    // --- Pago / ticketing ---
    '1304': 'La tarjeta no es aceptada por la aerolínea.',
    '9112': 'Error al emitir el ticket.',
    '34733': 'No se pudo crear la tarjeta virtual para la reserva.',
    '36870': 'La reserva del vuelo falló. Intenta nuevamente.',

    // --- Servicios no disponibles ---
    '38034': 'Uno o más servicios del vuelo no están disponibles.',

    // --- Error interno ---
    '141': 'Error interno en el sistema de vuelos. Intenta más tarde.',
  };

  return amadeusMessages[codeErrorApi] || null;
}
