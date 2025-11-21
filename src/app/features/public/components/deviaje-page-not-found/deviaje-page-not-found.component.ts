import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-deviaje-page-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deviaje-page-not-found.component.html',
  styleUrl: './deviaje-page-not-found.component.scss'
})
export class DeviajePageNotFoundComponent {
   constructor(private router: Router) {}

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
