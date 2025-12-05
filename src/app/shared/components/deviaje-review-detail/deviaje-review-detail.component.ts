import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import {
  getCategoryIcon,
  getCategoryName,
  Review,
  ReviewResponse,
} from '../../models/reviews';

@Component({
  selector: 'app-deviaje-review-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-review-detail.component.html',
  styleUrl: './deviaje-review-detail.component.scss',
})
export class DeviajeReviewDetailComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private subscriptions = new Subscription();

  // Review principal
  review: Review | null = null;
  categoryName = '';
  categoryIcon = '';
  loading = true;
  error = '';
  success = '';

  // Respuestas
  responses: ReviewResponse[] = [];
  showResponseForm = false;
  responseForm!: FormGroup;
  submittingResponse = false;

  // Paginación de respuestas
  currentPage = 1;
  itemsPerPage = 5;

  // Usuario actual y roles
  currentUser: any = null;
  isAdmin = false;
  isAgent = false;
  isClient = false;

  // Modales de confirmación
  showDeleteReviewModal = false;
  deletingReview = false;
  showDeleteResponseModal = false;
  responseToDelete: ReviewResponse | null = null;
  deletingResponse = false;

  ngOnInit(): void {

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

    this.initResponseForm();

    // Obtener ID de review de la ruta
    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        const reviewId = params['id'];
        if (reviewId) {
          this.loadReviewDetail(+reviewId);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Inicializa el formulario de respuesta
   */
  private initResponseForm(): void {
    this.responseForm = this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  /**
   * Carga el detalle de la review con sus respuestas
   */
  private loadReviewDetail(reviewId: number): void {
    this.loading = true;
    this.error = '';

    this.subscriptions.add(
      this.reviewService.getReviewById(reviewId).subscribe({
        next: (review) => {
          this.review = review;
          this.responses = review.responses || [];
          this.categoryName = getCategoryName(review.category);
          this.categoryIcon = getCategoryIcon(review.category);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al cargar review:', err);
          this.error =
            err?.message ||
            'Error al cargar la review. Por favor, intente nuevamente.';
          this.loading = false;
        },
      })
    );
  }

   /**
   * Verifica si el usuario puede eliminar la review principal
   * - Admin/Agente: pueden eliminar cualquier review (moderación)
   * - Cliente: solo puede eliminar SU PROPIA review
   */
  canDeleteReview(): boolean {
    if (!this.currentUser || !this.review) return false;

    // Admin y Agente pueden eliminar cualquier review
    if (this.isAdmin || this.isAgent) {
      return true;
    }

    // Cliente solo puede eliminar su propia review
    if (this.isClient) {
      return this.review.userId === this.currentUser.id;
    }

    return false;
  }

  /**
   * Verifica si el usuario puede eliminar una respuesta específica
   * - Admin/Agente: pueden eliminar cualquier respuesta (moderación)
   * - Cliente: solo puede eliminar SUS PROPIAS respuestas
   */
  canDeleteResponse(response: ReviewResponse): boolean {
    if (!this.currentUser) return false;

    // Admin y Agente pueden eliminar cualquier respuesta
    if (this.isAdmin || this.isAgent) {
      return true;
    }

    // Cliente solo puede eliminar sus propias respuestas
    if (this.isClient) {
      return response.userId === this.currentUser.id;
    }

    return false;
  }

  /**
   * Muestra/oculta el formulario de respuesta
   */
  toggleResponseForm(): void {
    this.showResponseForm = !this.showResponseForm;
    if (!this.showResponseForm) {
      this.responseForm.reset();
    }
  }

  /**
   * Envía una nueva respuesta
   */
  submitResponse(): void {
    if (this.responseForm.invalid || !this.review) return;

    this.submittingResponse = true;
    this.error = '';

    const request = {
      comment: this.responseForm.value.comment,
    };

    this.subscriptions.add(
      this.reviewService
        .createReviewResponse(this.review.id, request)
        .subscribe({
          next: (response) => {
            this.success = 'Respuesta publicada correctamente';
            this.responseForm.reset();
            this.showResponseForm = false;
            this.loadReviewDetail(this.review!.id); // Recargar

            setTimeout(() => {
              this.success = '';
            }, 3000);

            this.submittingResponse = false;
          },
          error: (err) => {
            console.error('Error al crear respuesta:', err);
            this.error =
              err?.message ||
              'Error al publicar la respuesta. Intente nuevamente.';
            this.submittingResponse = false;

            setTimeout(() => {
              this.error = '';
            }, 3000);
          },
        })
    );
  }

    /**
   * Abre el modal de confirmación para eliminar la review
   */
  openDeleteReviewModal(): void {
    if (!this.canDeleteReview()) {
      this.error = 'No tienes permisos para eliminar esta review.';
      setTimeout(() => {
        this.error = '';
      }, 3000);
      return;
    }

    this.showDeleteReviewModal = true;
  }

   /**
   * Cierra el modal de confirmación
   */
  closeDeleteReviewModal(): void {
    this.showDeleteReviewModal = false;
  }

  /**
   * Confirma y elimina la review principal
   */
  confirmDeleteReview(): void {
    if (!this.review) return;

    this.deletingReview = true;

    this.subscriptions.add(
      this.reviewService.deleteReview(this.review.id).subscribe({
        next: (response) => {
          this.success = response.message || 'Review eliminada correctamente';
          this.deletingReview = false;

          setTimeout(() => {
            this.backToList();
          }, 1500);
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
   * Abre el modal de confirmación para eliminar respuesta
   */
  openDeleteResponseModal(response: ReviewResponse): void {
    if (!this.canDeleteResponse(response)) {
      this.error = 'No tienes permisos para eliminar esta respuesta.';
      setTimeout(() => {
        this.error = '';
      }, 3000);
      return;
    }

    this.responseToDelete = response;
    this.showDeleteResponseModal = true;
  }

  /**
   * Cierra el modal de confirmación de respuesta
   */
  closeDeleteResponseModal(): void {
    this.showDeleteResponseModal = false;
    this.responseToDelete = null;
  }

  /**
   * Confirma y elimina una respuesta específica
   */
  confirmDeleteResponse(): void {
    if (!this.responseToDelete) return;

    this.deletingResponse = true;

    this.subscriptions.add(
      this.reviewService.deleteReviewResponse(this.responseToDelete.id).subscribe({
        next: (result) => {
          this.success =
            result.message || 'Respuesta eliminada correctamente';
          this.deletingResponse = false;
          this.closeDeleteResponseModal();

          // Recargar la review
          if (this.review) {
            this.loadReviewDetail(this.review.id);
          }

          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (err) => {
          console.error('Error al eliminar respuesta:', err);
          this.error =
            err?.message ||
            'Error al eliminar la respuesta. Intente nuevamente.';
          this.deletingResponse = false;

          setTimeout(() => {
            this.error = '';
          }, 3000);
        },
      })
    );
  }

  /**
   * Elimina una respuesta (solo Admin/Agente)
   */
  deleteResponse(response: ReviewResponse): void {
    if (
      !confirm(
        `¿Está seguro que desea eliminar la respuesta de ${this.getUserDisplayName(
          response
        )}?`
      )
    ) {
      return;
    }

    this.subscriptions.add(
      this.reviewService.deleteReviewResponse(response.id).subscribe({
        next: (result) => {
          this.success = result.message || 'Respuesta eliminada correctamente';
          this.loadReviewDetail(this.review!.id); // Recargar

          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (err) => {
          console.error('Error al eliminar respuesta:', err);
          this.error =
            err?.message ||
            'Error al eliminar la respuesta. Intente nuevamente.';

          setTimeout(() => {
            this.error = '';
          }, 3000);
        },
      })
    );
  }


  /**
   * Elimina la review principal y vuelve atrás
   */
  deleteReview(): void {
    if (!this.review) return;

    if (
      !confirm(
        `¿Está seguro que desea eliminar esta review de ${this.getUserDisplayName(
          this.review
        )}?`
      )
    ) {
      return;
    }

    this.subscriptions.add(
      this.reviewService.deleteReview(this.review.id).subscribe({
        next: (response) => {
          this.success = response.message || 'Review eliminada correctamente';

          setTimeout(() => {
            this.backToList();
          }, 1500);
        },
        error: (err) => {
          console.error('Error al eliminar review:', err);
          this.error =
            err?.message || 'Error al eliminar la review. Intente nuevamente.';

          setTimeout(() => {
            this.error = '';
          }, 3000);
        },
      })
    );
  }

  /**
   * Vuelve a la lista de reviews de la categoría
   */
  backToList(): void {
    if (this.review) {
      this.router.navigate(['/reviews/category', this.review.category]);
    } else {
      this.router.navigate(['/reviews']);
    }
  }

  /**
   * Obtiene el nombre a mostrar del usuario
   */
  getUserDisplayName(item: Review | ReviewResponse): string {
    if (item.userFirstName && item.userLastName) {
      return `${item.userFirstName} ${item.userLastName}`;
    }
    return item.username;
  }

  /**
   * Formatea la fecha
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Fecha desconocida';

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

  // =============== MÉTODOS DE PAGINACIÓN DE RESPUESTAS ===============

  get paginatedResponses(): ReviewResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.responses.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.responses.length / this.itemsPerPage);
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
