import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  PaginatedUsersResponse,
  UserResponse,
  UserService,
} from '../../../../shared/services/user.service';

@Component({
  selector: 'app-deviaje-users-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './deviaje-users-list.component.html',
  styleUrl: './deviaje-users-list.component.scss',
})
export class DeviajeUsersListComponent implements OnInit, OnDestroy {
  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  totalElements = 0;
  loading = true;
  error = '';
  success = '';

  showViewModal = false;
  showDeactivateModal = false;
  showActivateModal = false;
  showResetPasswordModal = false;

  // Usuario seleccionado para modales
  selectedUser: UserResponse | null = null;

  // Estados de dar de baja
  deactivateLoading = false;
  deactivateError = '';

  // Estados de activar
  activateLoading = false;
  activateError = '';

  // Estados de resetear contraseña
  resetPasswordLoading = false;
  resetPasswordError = '';
  resetPasswordSuccess = '';

  // Paginación (copiado de flight-results)
  currentPage = 1;
  itemsPerPage = 10;

  // Formulario de filtros
  filtersForm: FormGroup;

  // Opciones para el select de roles
  roleOptions = [
    { value: '', label: 'Todos los roles' },
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'AGENTE', label: 'Agente' },
    { value: 'CLIENTE', label: 'Cliente' },
  ];

  // Para el dropdown de acciones
  openDropdownId: number | null = null;

  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    // Verificar que el usuario sea administrador
    if (!this.authService.hasRole('ADMINISTRADOR')) {
      this.router.navigate(['/access-denied']);
    }

    // Inicializar formulario de filtros
    this.filtersForm = this.fb.group({
      search: [''],
      role: [''],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private setupFilters(): void {
    // Configurar búsqueda con debounce
    this.subscription.add(
      this.filtersForm
        .get('search')
        ?.valueChanges.pipe(debounceTime(500), distinctUntilChanged())
        .subscribe(() => {
          this.applyFilters();
        }) || new Subscription()
    );

    // Configurar filtro de rol
    this.subscription.add(
      this.filtersForm.get('role')?.valueChanges.subscribe(() => {
        this.applyFilters();
      }) || new Subscription()
    );
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    // Llamar al getAllUsers del backend (sin paginación backend)
    this.subscription.add(
      this.userService
        .getAllUsers() // Traer todos los usuarios
        .subscribe({
          next: (response: UserResponse[]) => {
            this.users = response || [];
            this.applyFilters();
            this.loading = false;
          },
          error: (error) => {
            this.error =
              error?.error?.message || 'Error al cargar los usuarios';
            this.users = [];
            this.filteredUsers = [];
            this.loading = false;
          },
        })
    );
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Filtro de búsqueda por username
    const search = this.filtersForm.get('search')?.value?.toLowerCase() || '';
    if (search) {
      filtered = filtered.filter((user) =>
        user.username.toLowerCase().includes(search)
      );
    }

    // Filtro por rol
    const role = this.filtersForm.get('role')?.value || '';
    if (role) {
      filtered = filtered.filter((user) => user.roles.includes(role));
    }

    this.filteredUsers = filtered;
    this.totalElements = filtered.length;
    this.currentPage = 1; // Reset a primera página
  }

  // Paginación (copiado exacto de flight-results)
  get paginatedUsers(): UserResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
    }
  }

  // Métodos para dropdown de acciones
  toggleDropdown(userId: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === userId ? null : userId;
  }

  closeDropdown(): void {
    this.openDropdownId = null;
  }

  // Acciones de usuario
  viewUser(user: UserResponse): void {
    this.closeDropdown();
    console.log('Ver usuario:', user);
  }

  editUser(user: UserResponse): void {
    this.closeDropdown();
    this.router.navigate(['/admin/users/edit', user.id]);
  }

  toggleUserStatus(user: UserResponse): void {
    this.closeDropdown();

    const action = user.active ? 'desactivar' : 'activar';
    const confirmMessage = `¿Está seguro que desea ${action} al usuario ${user.username}?`;

    if (confirm(confirmMessage)) {
      this.subscription.add(
        this.userService.toggleUserStatus(user.id).subscribe({
          next: (response) => {
            this.success =
              response.message || `Usuario ${action}do exitosamente`;
            this.loadUsers(); // Recargar la lista

            setTimeout(() => {
              this.success = '';
            }, 3000);
          },
          error: (error) => {
            this.error =
              error?.error?.message || `Error al ${action} el usuario`;
            setTimeout(() => {
              this.error = '';
            }, 3000);
          },
        })
      );
    }
  }

  // Métodos de utilidad
  getRoleBadgeClass(roles: string[]): string {
    if (roles.includes('ADMINISTRADOR')) return 'badge bg-danger';
    if (roles.includes('AGENTE')) return 'badge bg-warning text-dark';
    if (roles.includes('CLIENTE')) return 'badge bg-info';
    return 'badge bg-secondary';
  }

  getRoleDisplayName(roles: string[]): string {
    if (roles.includes('ADMINISTRADOR')) return 'Administrador';
    if (roles.includes('AGENTE')) return 'Agente';
    if (roles.includes('CLIENTE')) return 'Cliente';
    return 'Sin rol';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Limpiar filtros
  clearFilters(): void {
    this.filtersForm.reset();
    this.applyFilters();
  }

  // Ir a registro de usuario
  goToRegisterUser(): void {
    this.router.navigate(['/admin/users/register']);
  }

  // Forzar cambio de contraseña
  forcePasswordChange(user: UserResponse): void {
    this.closeDropdown();

    const confirmMessage = `¿Está seguro que desea forzar el cambio de contraseña para ${user.username}?`;

    if (confirm(confirmMessage)) {
      this.subscription.add(
        this.userService.forcePasswordChange(user.id).subscribe({
          next: (response) => {
            this.success =
              response.message ||
              'Se envió un email para cambiar la contraseña';
            setTimeout(() => {
              this.success = '';
            }, 3000);
          },
          error: (error) => {
            this.error =
              error?.error?.message || 'Error al forzar cambio de contraseña';
            setTimeout(() => {
              this.error = '';
            }, 3000);
          },
        })
      );
    }
  }

  // Método para calcular el número mínimo (para paginación)
  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  openViewModal(user: UserResponse): void {
    this.selectedUser = user;
    this.showViewModal = true;
    this.closeDropdown();
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedUser = null;
  }

  goToEdit(): void {
    if (this.selectedUser) {
      this.closeViewModal();
      this.router.navigate(['/admin/users', this.selectedUser.id, '/edit']);
    }
  }

  // ===== MODAL DAR DE BAJA =====

  openDeactivateModal(user: UserResponse): void {
    this.selectedUser = user;
    this.showDeactivateModal = true;
    this.deactivateError = '';
    this.closeDropdown();
  }

  closeDeactivateModal(): void {
    this.showDeactivateModal = false;
    this.selectedUser = null;
    this.deactivateError = '';
    this.deactivateLoading = false;
  }

  isCurrentUser(userId: number | undefined): boolean {
    if (!userId) return false;
    const currentUser = this.authService.getUser();
    return currentUser?.id === userId;
  }

  confirmDeactivate(): void {
    if (!this.selectedUser) return;

    // Verificar que no sea el mismo usuario
    if (this.isCurrentUser(this.selectedUser.id)) {
      this.deactivateError = 'No puedes darte de baja a ti mismo';
      return;
    }

    this.deactivateLoading = true;
    this.deactivateError = '';

    this.subscription.add(
      this.userService.deactivateUser(this.selectedUser.id).subscribe({
        next: (response) => {
          this.success = `Usuario ${this.selectedUser?.username} dado de baja exitosamente`;
          this.deactivateLoading = false;
          this.closeDeactivateModal();
          this.loadUsers(); // Recargar lista
        },
        error: (error) => {
          this.deactivateError =
            error?.error?.message || 'Error al dar de baja el usuario';
          this.deactivateLoading = false;
        },
      })
    );
  }

  // ===== MODAL ACTIVAR USUARIO =====

  openActivateModal(user: UserResponse): void {
    this.selectedUser = user;
    this.showActivateModal = true;
    this.activateError = '';
    this.closeDropdown();
  }

  closeActivateModal(): void {
    this.showActivateModal = false;
    this.selectedUser = null;
    this.activateError = '';
    this.activateLoading = false;
  }

  confirmActivate(): void {
    if (!this.selectedUser) return;

    this.activateLoading = true;
    this.activateError = '';

    this.subscription.add(
      this.userService.activateUser(this.selectedUser.id).subscribe({
        next: (response) => {
          this.success = `Usuario ${this.selectedUser?.username} activado exitosamente`;
          this.activateLoading = false;
          this.closeActivateModal();
          this.loadUsers(); // Recargar lista
        },
        error: (error) => {
          this.activateError =
            error?.error?.message || 'Error al activar el usuario';
          this.activateLoading = false;
        },
      })
    );
  }

  // ===== MODAL RESETEAR CONTRASEÑA =====

  openResetPasswordModal(user: UserResponse): void {
    this.selectedUser = user;
    this.showResetPasswordModal = true;
    this.resetPasswordError = '';
    this.resetPasswordSuccess = '';
    this.closeDropdown();
  }

  closeResetPasswordModal(): void {
    this.showResetPasswordModal = false;
    this.selectedUser = null;
    this.resetPasswordError = '';
    this.resetPasswordSuccess = '';
    this.resetPasswordLoading = false;
  }

  confirmResetPassword(): void {
    if (!this.selectedUser) return;

    this.resetPasswordLoading = true;
    this.resetPasswordError = '';
    this.resetPasswordSuccess = '';

    this.subscription.add(
      this.userService.adminResetPassword(this.selectedUser.id).subscribe({
        next: (response) => {
          this.resetPasswordSuccess =
            response.message ||
            'Contraseña reseteada exitosamente. Se envió un email al usuario con la nueva contraseña temporal.';
          this.resetPasswordLoading = false;

          // Cerrar modal después de 3 segundos
          setTimeout(() => {
            this.closeResetPasswordModal();
          }, 3000);
        },
        error: (error) => {
          this.resetPasswordError =
            error?.error?.message || 'Error al resetear la contraseña';
          this.resetPasswordLoading = false;
        },
      })
    );
  }

  // ===== MÉTODOS DE UTILIDAD =====

  getRoleName(role: string): string {
    const roleMap: { [key: string]: string } = {
      ADMINISTRADOR: 'Administrador',
      AGENTE: 'Agente',
      CLIENTE: 'Cliente',
    };
    return roleMap[role] || role;
  }

  getGenderLabel(gender: string | null | undefined): string {
    if (!gender) return '—';

    const genderMap: { [key: string]: string } = {
      MALE: 'Masculino',
      FEMALE: 'Femenino',
      UNSPECIFIED: 'Otro',
    };
    return genderMap[gender] || gender;
  }
}
