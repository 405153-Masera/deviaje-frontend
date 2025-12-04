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
import { CategoryInfo, REVIEW_CATEGORIES } from '../../models/reviews';

/**
 * Componente para crear una nueva review
 * Solo accesible para usuarios autenticados (CLIENTE y AGENTE)
 */
@Component({
  selector: 'app-deviaje-create-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './deviaje-create-review.component.html',
  styleUrl: './deviaje-create-review.component.scss',
})
export class DeviajeCreateReviewComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private subscriptions = new Subscription();

  currentUser: any;
  isLoggedIn: boolean = false;
  userRole: string = '';
  reviewForm!: FormGroup;
  categories: CategoryInfo[] = REVIEW_CATEGORIES;
  submitting = false;
  error = '';

  // Rating hover effect
  hoverRating = 0;

  ngOnInit(): void {
    // Verificar que el usuario esté autenticado
    this.loadCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/user/login'], {
        queryParams: { returnUrl: '/reviews' },
      });
      return;
    }

    this.initForm();

    // Si viene con categoría en query params, seleccionarla
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        if (params['category']) {
          this.reviewForm.patchValue({
            category: params['category'],
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadCurrentUser(): void {
    // Suscribirse al usuario actual
    this.subscriptions.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoggedIn = !!user;
          this.setupBookingBasedOnRole();
        },
        error: () => {
          this.isLoggedIn = false;
          this.setupBookingBasedOnRole();
        },
      })
    );

    this.subscriptions.add(
      this.authService.activeRole$.subscribe((role) => {
        this.userRole = role || '';
        this.setupBookingBasedOnRole();
      })
    );
  }
  
  setupBookingBasedOnRole(): void {
    if (this.userRole === 'ADMINISTRADOR') {
      this.router.navigate(['/home']);
      return;
    }
  }

  /**
   * Inicializa el formulario
   */
  private initForm(): void {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      category: ['', Validators.required],
      comment: [
        '',
        [
          Validators.required,
          Validators.minLength(20),
          Validators.maxLength(1000),
        ],
      ],
    });
  }

  /**
   * Establece el rating al hacer clic en una estrella
   */
  setRating(rating: number): void {
    this.reviewForm.patchValue({ rating });
  }

  /**
   * Establece el hover rating
   */
  setHoverRating(rating: number): void {
    this.hoverRating = rating;
  }

  /**
   * Resetea el hover rating
   */
  resetHoverRating(): void {
    this.hoverRating = 0;
  }

  /**
   * Verifica si una estrella debe mostrarse como filled
   */
  isStarFilled(index: number): boolean {
    const currentRating = this.reviewForm.get('rating')?.value || 0;
    const displayRating = this.hoverRating || currentRating;
    return index < displayRating;
  }

  /**
   * Envía el formulario
   */
  submitReview(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = '';

    const request = {
      rating: this.reviewForm.value.rating,
      category: this.reviewForm.value.category,
      comment: this.reviewForm.value.comment,
    };

    this.subscriptions.add(
      this.reviewService.createReview(request, this.currentUser.id).subscribe({
        next: (review) => {
          // Navegar al detalle de la review creada
          this.router.navigate(['/reviews/detail', review.id]);
        },
        error: (err) => {
          console.error('Error al crear review:', err);
          this.error =
            err?.message ||
            'Error al crear la review. Por favor, intente nuevamente.';
          this.submitting = false;
        },
      })
    );
  }

  /**
   * Cancela y vuelve atrás
   */
  cancel(): void {
    const category = this.reviewForm.value.category;
    if (category) {
      this.router.navigate(['/reviews/category', category]);
    } else {
      this.router.navigate(['/reviews']);
    }
  }

  /**
   * Obtiene el mensaje de error para un campo
   */
  getFieldError(fieldName: string): string {
    const field = this.reviewForm.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (field?.hasError('minlength')) {
      const minLength = field.getError('minlength').requiredLength;
      return `Debe tener al menos ${minLength} caracteres`;
    }
    if (field?.hasError('maxlength')) {
      const maxLength = field.getError('maxlength').requiredLength;
      return `No debe superar los ${maxLength} caracteres`;
    }
    if (field?.hasError('min')) {
      return 'Debe seleccionar un rating';
    }
    return '';
  }
}