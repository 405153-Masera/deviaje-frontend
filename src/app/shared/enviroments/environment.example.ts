export const environment = {
  production: false,
  apiDeviajeSearches: 'http://localhost:9061/api/searches',
  apiDeviajeAuth: 'http://localhost:9060/api/auth',
  apiDeviajeUsers: 'http://localhost:9060/api/users',
  apiDeviajeValidation: 'http://localhost:9060/api/validation',
  apiDeviajeBookings: 'http://localhost:9062',

  mercadoPago: {
    sdkUrl: 'https://sdk.mercadopago.com/js/v2',
    locale: 'es-AR',
    publicKeyEndpoint: '/api/payments/config',
  },

  googleMaps: {
    apiKey: 'TU_GOOGLE_MAPS_API_KEY_AQUI' // ← Placeholder
  }
};