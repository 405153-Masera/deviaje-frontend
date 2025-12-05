import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import {
  getCategoryIcon,
  getCategoryName,
  Review,
  ReviewCategory,
} from '../../models/reviews';

@Component({
  selector: 'app-deviaje-reviews-by-category',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-reviews-by-category.component.html',
  styleUrl: './deviaje-reviews-by-category.component.scss',
})
export class DeviajeReviewsByCategoryComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private subscriptions = new Subscription();

  // Categoría actual
  category: ReviewCategory | null = null;
  categoryName = '';
  categoryIcon = '';

  // Reviews
  reviews: Review[] = [];
  loading = true;
  error = '';
  success = '';

  // Paginación (igual que hoteles)
  currentPage = 1;
  itemsPerPage = 5;

  // Usuario actual y roles
  currentUser: any = null;
  isAdmin = false;
  isAgent = false;
  isClient = false;

  ngOnInit(): void {
    // Obtener usuario y roles
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
      })
    );

    this.subscriptions.add(
      this.authService.activeRole$.subscribe((activeRole) => {
        this.isAdmin = activeRole === 'ADMINISTRADOR';
        this.isAgent = activeRole === 'AGENTE';
        this.isClient = activeRole === 'CLIENTE';
      })
    );

    // Obtener categoría de la ruta
    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        const categoryParam = params['category'];
        if (categoryParam) {
          this.category = categoryParam.toUpperCase() as ReviewCategory;
          this.categoryName = getCategoryName(this.category);
          this.categoryIcon = getCategoryIcon(this.category);
          this.loadReviews();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Carga las reviews de la categoría actual
   */
  private loadReviews(): void {
    if (!this.category) return;

    this.loading = true;
    this.error = '';

    this.subscriptions.add(
      this.reviewService.getReviewsByCategory(this.category).subscribe({
        next: (reviews) => {
          this.reviews = reviews;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al cargar reviews:', err);
          this.error =
            err?.message ||
            'Error al cargar las reviews. Por favor, intente nuevamente.';
          this.loading = false;
        },
      })
    );
  }

  /**
   * Navega al detalle de una review
   */
  viewReviewDetail(reviewId: number): void {
    this.router.navigate(['/reviews/detail', reviewId]);
  }

  /**
   * Abre el modal para crear una nueva review
   */
  openCreateReviewModal(): void {
    this.router.navigate(['/reviews/create'], {
      queryParams: { category: this.category },
    });
  }

  /**
   * Verifica si el usuario puede crear reviews
   * SOLO CLIENTES pueden crear reviews (Admin/Agente solo responden)
   */
  canCreateReview(): boolean {
    return this.isClient && !this.isAdmin && !this.isAgent;
  }

  /**
   * Verifica si el usuario puede eliminar una review específica
   * - Admin/Agente: pueden eliminar cualquier review (moderación)
   * - Cliente: solo puede eliminar SUS PROPIAS reviews
   */
  canDeleteReview(review: Review): boolean {
    if (!this.currentUser) return false;

    // Admin y Agente pueden eliminar cualquier review (moderación)
    if (this.isAdmin || this.isAgent) {
      return true;
    }

    // Cliente solo puede eliminar sus propias reviews
    if (this.isClient) {
      return review.userId === this.currentUser.id;
    }

    return false;
  }

  showDeleteModal = false;
  reviewToDelete: Review | null = null;
  deletingReview = false;

  /**
   * Abre el modal de confirmación para eliminar
   */
  openDeleteModal(review: Review, event: Event): void {
    event.stopPropagation(); // Evitar que navegue al detalle

    // Verificar permisos antes de abrir modal
    if (!this.canDeleteReview(review)) {
      this.error = 'No tienes permisos para eliminar esta review.';
      setTimeout(() => {
        this.error = '';
      }, 3000);
      return;
    }

    this.reviewToDelete = review;
    this.showDeleteModal = true;
  }

  /**
   * Cierra el modal de confirmación
   */
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.reviewToDelete = null;
  }

  /**
   * Confirma y elimina la review
   */
  confirmDeleteReview(): void {
    if (!this.reviewToDelete) return;

    this.deletingReview = true;

    this.subscriptions.add(
      this.reviewService.deleteReview(this.reviewToDelete.id).subscribe({
        next: (response) => {
          this.success = response.message || 'Review eliminada correctamente';
          this.deletingReview = false;
          this.closeDeleteModal();
          this.loadReviews(); // Recargar lista

          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (err) => {
          console.error('Error al eliminar review:', err);
          this.error =
            err?.message || 'Error al eliminar la review. Intente nuevamente.';
          this.deletingReview = false;

          setTimeout(() => {
            this.error = '';
          }, 3000);
        },
      })
    );
  }

  /**
   * Volver a la lista de categorías
   */
  backToCategories(): void {
    this.router.navigate(['/reviews']);
  }

  /**
   * Obtiene el nombre a mostrar del usuario
   */
  getUserDisplayName(review: Review): string {
    if (review.userFirstName && review.userLastName) {
      return `${review.userFirstName} ${review.userLastName}`;
    }
    return review.username;
  }

  /**
   * Formatea la fecha de creación
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Genera array de estrellas para mostrar rating
   */
  getStars(rating: number): { filled: boolean }[] {
    return Array.from({ length: 5 }, (_, i) => ({
      filled: i < rating,
    }));
  }

  // =============== MÉTODOS DE PAGINACIÓN (igual que hoteles) ===============

  get paginatedReviews(): Review[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.reviews.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.reviews.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo(0, 0);
    }
  }

  getVisiblePages(): (number | string)[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const visiblePages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        visiblePages.push(i);
      }
      return visiblePages;
    }

    visiblePages.push(1);

    if (currentPage <= 4) {
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        visiblePages.push(i);
      }
      if (totalPages > 5) visiblePages.push('...');
    } else if (currentPage >= totalPages - 3) {
      visiblePages.push('...');
      for (let i = Math.max(2, totalPages - 4); i < totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      visiblePages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        visiblePages.push(i);
      }
      visiblePages.push('...');
    }

    if (totalPages > 1) visiblePages.push(totalPages);
    return visiblePages;
  }

  isPageNumber(page: number | string): page is number {
    return typeof page === 'number';
  }
}
