

// Categorías de reviews
export type ReviewCategory = 
  | 'USABILITY' 
  | 'SEARCHES' 
  | 'BOOKING_PROCESS' 
  | 'PERFORMANCE' 
  | 'GENERAL';

// Interfaz para crear una review
export interface ReviewCreateRequest {
  rating: number; // 1-5
  comment: string;
  category: ReviewCategory;
}

// Interfaz para crear una respuesta
export interface ReviewResponseCreateRequest {
  comment: string;
}

// Interfaz de review completa (respuesta del backend)
export interface Review {
  id: number;
  userId: number;
  username: string;
  userFirstName: string | null;
  userLastName: string | null;
  rating: number;
  comment: string;
  category: ReviewCategory;
  createdDatetime: string;
  lastUpdatedDatetime: string;
  responses: ReviewResponse[];
  responsesCount: number;
}

// Interfaz de respuesta a review
export interface ReviewResponse {
  id: number;
  reviewId: number;
  userId: number;
  username: string;
  userFirstName: string | null;
  userLastName: string | null;
  comment: string;
  createdDatetime: string;
  lastUpdatedDatetime: string;
}

// Interfaz para estadísticas (no se usa por ahora)
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  averageRatingByCategory: { [key: string]: number };
  ratingDistribution: { [key: number]: number };
}

// Interfaz para la información de categoría en el listado
export interface CategoryInfo {
  code: ReviewCategory;
  name: string;
  icon: string;
  description: string;
  reviewsCount?: number;
}

// Constantes para las categorías
export const REVIEW_CATEGORIES: CategoryInfo[] = [
  {
    code: 'USABILITY',
    name: 'Usabilidad General',
    icon: 'bi-laptop',
    description: 'Facilidad de uso de la plataforma'
  },
  {
    code: 'SEARCHES',
    name: 'Búsquedas',
    icon: 'bi-search',
    description: 'Experiencia buscando vuelos y hoteles'
  },
  {
    code: 'BOOKING_PROCESS',
    name: 'Proceso de Reserva',
    icon: 'bi-cart-check',
    description: 'Fluidez al realizar reservas'
  },
  {
    code: 'PERFORMANCE',
    name: 'Rendimiento',
    icon: 'bi-speedometer2',
    description: 'Velocidad y estabilidad del sistema'
  },
  {
    code: 'GENERAL',
    name: 'General',
    icon: 'bi-chat-dots',
    description: 'Comentarios generales sobre la plataforma'
  }
];

/**
 * Obtiene el nombre amigable de una categoría
 */
export function getCategoryName(code: ReviewCategory): string {
  const category = REVIEW_CATEGORIES.find(c => c.code === code);
  return category?.name || code;
}

/**
 * Obtiene el icono de una categoría
 */
export function getCategoryIcon(code: ReviewCategory): string {
  const category = REVIEW_CATEGORIES.find(c => c.code === code);
  return category?.icon || 'bi-chat-dots';
}

/**
 * Obtiene la descripción de una categoría
 */
export function getCategoryDescription(code: ReviewCategory): string {
  const category = REVIEW_CATEGORIES.find(c => c.code === code);
  return category?.description || '';
}