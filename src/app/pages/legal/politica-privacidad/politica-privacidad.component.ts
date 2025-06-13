import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-politica-privacidad',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './politica-privacidad.component.html',
  styleUrl: './politica-privacidad.component.scss'
})
export class PoliticaPrivacidadComponent {
  lastUpdated = new Date('2025-06-13');
  
  // Datos para la tabla de cookies
  cookiesData = [
    {
      tipo: 'Esenciales',
      proposito: 'Funcionamiento básico del sitio',
      duracion: 'Sesión',
      badgeClass: 'bg-success'
    },
    {
      tipo: 'Funcionales',
      proposito: 'Recordar preferencias del usuario',
      duracion: '30 días',
      badgeClass: 'bg-info'
    },
    {
      tipo: 'Analíticas',
      proposito: 'Mejorar rendimiento del sitio',
      duracion: '2 años',
      badgeClass: 'bg-warning'
    },
    {
      tipo: 'Marketing',
      proposito: 'Personalizar ofertas',
      duracion: '1 año',
      badgeClass: 'bg-primary'
    }
  ];

  // Datos de retención
  retencionData = [
    { tipo: 'Datos de cuenta activa', periodo: 'Mientras mantenga su cuenta abierta' },
    { tipo: 'Historial de reservas', periodo: '7 años (requerimiento fiscal)' },
    { tipo: 'Datos de marketing', periodo: 'Hasta que retire su consentimiento' },
    { tipo: 'Datos de soporte', periodo: '3 años después de la última interacción' },
    { tipo: 'Datos de seguridad', periodo: '5 años para prevención de fraudes' }
  ];

  constructor() {
    // Scroll to top when component loads
    window.scrollTo(0, 0);
  }

  // Método para formatear fechas
  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Método para enviar solicitud de derechos
  onRightsRequest(): void {
    const email = 'privacidad@deviaje.com';
    const subject = 'Solicitud de ejercicio de derechos sobre datos personales';
    const body = 'Estimado equipo de DeViaje,\n\nPor favor, quisiera ejercer mis derechos sobre mis datos personales.\n\nDetalles de la solicitud:\n- Tipo de derecho: [Especificar: acceso, rectificación, eliminación, etc.]\n- Motivo: [Explicar el motivo]\n\nGracias por su atención.\n\nSaludos cordiales.';
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // Método para scroll suave a secciones
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}