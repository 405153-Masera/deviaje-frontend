import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../enviroments/enviroment';
import { Review, ReviewCategory, ReviewCreateRequest, ReviewResponse, ReviewResponseCreateRequest } from '../models/reviews';

/**
 * Servicio para gestionar reviews de la plataforma
 */
@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiDeviajeUsers.replace('/users', '/reviews');

  // =============== REVIEWS ===============

  /**
   * Crear una nueva review
   */
  createReview(request: ReviewCreateRequest): Observable<Review> {
    return this.http.post<Review>(this.baseUrl, request);
  }

  /**
   * Obtener todas las reviews o filtrar por categoría
   */
  getAllReviews(category?: ReviewCategory): Observable<Review[]> {
    let params = new HttpParams();
    if (category) {
      params = params.set('category', category);
    }
    return this.http.get<Review[]>(this.baseUrl, { params });
  }

  /**
   * Obtener reviews por categoría
   */
  getReviewsByCategory(category: ReviewCategory): Observable<Review[]> {
    return this.getAllReviews(category);
  }

  /**
   * Obtener una review por ID con sus respuestas
   */
  getReviewById(id: number): Observable<Review> {
    return this.http.get<Review>(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtener reviews de un usuario específico
   */
  getReviewsByUser(userId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.baseUrl}/user/${userId}`);
  }

  /**
   * Eliminar una review
   */
  deleteReview(id: number): Observable<{ message: string; success: boolean }> {
    return this.http.delete<{ message: string; success: boolean }>(
      `${this.baseUrl}/${id}`
    );
  }

  // =============== RESPUESTAS ===============

  /**
   * Crear una respuesta a una review
   */
  createReviewResponse(
    reviewId: number,
    request: ReviewResponseCreateRequest
  ): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(
      `${this.baseUrl}/${reviewId}/responses`,
      request
    );
  }

  /**
   * Eliminar una respuesta
   */
  deleteReviewResponse(
    responseId: number
  ): Observable<{ message: string; success: boolean }> {
    return this.http.delete<{ message: string; success: boolean }>(
      `${this.baseUrl}/responses/${responseId}`
    );
  }
}