import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-deviaje-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './deviaje-footer.component.html',
  styleUrl: './deviaje-footer.component.scss'
})
export class DeviajeFooterComponent {

   currentYear = new Date().getFullYear();

  // Método para manejar suscripción al newsletter
  onSubscribeNewsletter(email: string) {
    console.log('Suscripción al newsletter:', email);
    // Aquí puedes agregar la lógica para suscribir al usuario
  }

  // Método para abrir redes sociales
  openSocialMedia(platform: string) {
    const urls = {
      facebook: 'https://facebook.com/deviaje',
      twitter: 'https://twitter.com/deviaje', 
      instagram: 'https://instagram.com/deviaje',
      linkedin: 'https://linkedin.com/company/deviaje'
    };
    
    window.open(urls[platform as keyof typeof urls], '_blank');
  }

}
