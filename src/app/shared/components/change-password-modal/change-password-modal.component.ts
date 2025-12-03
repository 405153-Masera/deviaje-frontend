import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './change-password-modal.component.html',
  styleUrl: './change-password-modal.component.scss',
})
export class ChangePasswordModalComponent {
  @Input() show = false;
  @Output() closeModal = new EventEmitter<void>();

  constructor(private router: Router) {}

  close(): void {
    this.closeModal.emit();
  }

  goToChangePassword(): void {
    this.close();
    this.router.navigate(['/user/change-password']);
  }
}