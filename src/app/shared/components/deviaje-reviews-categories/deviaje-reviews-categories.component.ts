import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { CategoryInfo, REVIEW_CATEGORIES } from '../../models/reviews';

/**
 * Componente que muestra las categorías de reviews disponibles
 */
@Component({
  selector: 'app-deviaje-reviews-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-reviews-categories.component.html',
  styleUrl: './deviaje-reviews-categories.component.scss',
})
export class DeviajeReviewsCategoriesComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);
  private subscriptions = new Subscription();

  categories: CategoryInfo[] = [];
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Carga las categorías y cuenta las reviews de cada una
   */
  loadCategories(): void {
    this.loading = true;
    this.error = '';

    // Cargar todas las reviews para contar por categoría
    this.subscriptions.add(
      this.reviewService.getAllReviews().subscribe({
        next: (reviews) => {
          // Inicializar categorías con las constantes
          this.categories = REVIEW_CATEGORIES.map((cat) => ({
            ...cat,
            reviewsCount: 0,
          }));

          // Contar reviews por categoría
          reviews.forEach((review) => {
            const category = this.categories.find(
              (c) => c.code === review.category
            );
            if (category && category.reviewsCount !== undefined) {
              category.reviewsCount++;
            }
          });

          this.loading = false;
        },
        error: (err) => {
          console.error('Error al cargar categorías:', err);
          this.error =
            err?.message ||
            'Error al cargar las categorías. Por favor, intente nuevamente.';
          this.loading = false;
        },
      })
    );
  }

  /**
   * Navega a la lista de reviews de una categoría
   */
  navigateToCategory(categoryCode: string): void {
    this.router.navigate(['/reviews/category', categoryCode]);
  }

  /**
   * Maneja el evento de teclado para accesibilidad
   */
  onCategoryKeyPress(event: KeyboardEvent, categoryCode: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigateToCategory(categoryCode);
    }
  }
}