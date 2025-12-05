import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: string;
  category: string;
}

@Component({
  selector: 'app-preguntas-frecuentes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './preguntas-frecuentes.component.html',
  styleUrl: './preguntas-frecuentes.component.scss'
})
export class PreguntasFrecuentesComponent implements OnInit {
  searchTerm = '';
  activeCategory = 'cuenta';
  filteredFAQs: FAQItem[] = [];

  // Datos de FAQ organizados por categorías
  faqData: FAQItem[] = [
    // CUENTA
    {
      id: 'cuenta1',
      category: 'cuenta',
      icon: 'bi-key',
      question: '¿Cómo creo mi cuenta y clave de acceso?',
      answer: 'Para crear tu cuenta en DeViaje: 1) Haz clic en "Registrarse" en la página principal, 2) Completa el formulario con tu información personal, 3) Crea una contraseña segura de al menos 8 caracteres, 4) Completa tu perfil con información adicional. Tu contraseña debe incluir mayúsculas, minúsculas, números y símbolos para mayor seguridad.'
    },
    {
      id: 'cuenta2',
      category: 'cuenta',
      icon: 'bi-unlock',
      question: '¿Cómo desbloqueo mi usuario?',
      answer: 'Si olvidaste tu contraseña: Usa "¿Olvidaste tu contraseña?" en la página de login. Problema técnico: Contáctanos al 0810-810-6863 o soporte@deviaje.com. Nunca compartas tu contraseña. Nuestro personal nunca te la pedirá por email o teléfono.'
    },
    {
      id: 'cuenta3',
      category: 'cuenta',
      icon: 'bi-pencil',
      question: '¿Cómo actualizo mi información personal?',
      answer: 'Para actualizar tu información: 1) Inicia sesión en tu cuenta, 2) Ve a "Mi Perfil" en el menú principal, 3) Selecciona "Editar información personal", 4) Modifica los campos necesarios, 5) Guarda los cambios. Datos importantes: Email requiere verificación adicional.'
    },

    // RESERVAS
    {
      id: 'reservas1',
      category: 'reservas',
      icon: 'bi-search',
      question: '¿Cómo funciona el proceso de reserva?',
      answer: 'Pasos para reservar: 1) Busca tu destino y fechas, 2) Selecciona el hotel, vuelo o paquete de tu preferencia, 3) Elige la oferta que prefieras, 4) Completa los datos de los viajeros, 5) Realiza el pago, 6) Recibe tu confirmación por email. La mayoría de reservas se confirman inmediatamente. En casos especiales, puede tomar hasta 24 horas.'
    },
    {
      id: 'reservas2',
      category: 'reservas',
      icon: 'bi-id-card',
      question: '¿Qué necesito para hacer una reserva?',
      answer: 'Necesitarás la siguiente información: tu nombre completo (como titular de la reserva), pasaporte, un email de contacto, un teléfono de contacto, los datos de todos los viajeros, una tarjeta de crédito o débito, y las fechas exactas de tu estadía.'
    },
    // PAGOS
    {
      id: 'pagos1',
      category: 'pagos',
      icon: 'bi-credit-card',
      question: '¿Qué medios de pago aceptan?',
      answer: 'Tarjetas de Crédito: Visa, Mastercard, American Express. Otros Métodos: Tarjetas de débito, MercadoPago, PayPal (próximamente). Pagos 100% seguros con encriptación SSL y certificación PCI DSS.'
    },
    {
      id: 'pagos3',
      category: 'pagos',
      icon: 'bi-receipt',
      question: '¿Cómo obtengo mi voucher?',
      answer: 'Para obtener tu voucher: 1) Ingresa a "Mis reservas", 2) Busca la reserva correspondiente, 3) Haz clic en "Descargar voucher", 4) El archivo PDF se descargará automáticamente. Están disponibles inmediatamente después del pago confirmado.'
    },

    // CANCELACIONES
    {
      id: 'cancelaciones1',
      category: 'cancelaciones',
      icon: 'bi-x-circle',
      question: '¿Puedo cancelar mi reserva?',
      answer: 'Las políticas de cancelación varían según el hotel y tipo de tarifa. Cancelación Gratuita: Hasta 24 horas antes (vuelos), Reembolso completo, Sin penalizaciones. Cancelación con Cargo: Penalización parcial, Reembolso reducido, Depende de la antelación. No Reembolsable: Sin posibilidad de cancelar, Tarifas especiales, Precios más bajos.'
    },
    {
      id: 'cancelaciones2',
      category: 'cancelaciones',
      icon: 'bi-arrow-counterclockwise',
      question: '¿Cómo solicito un reembolso?',
      answer: 'Proceso de reembolso: 1) Cancela la reserva desde tu cuenta o contactando soporte, 2) Verificación de las políticas de cancelación aplicables, 3) Procesamiento del reembolso (5-10 días hábiles), 4) Acreditación en el método de pago original. Tiempos de reembolso: Tarjetas de crédito 5-10 días.'
    },

    // SOPORTE
    {
      id: 'soporte1',
      category: 'soporte',
      icon: 'bi-headset',
      question: '¿Cómo puedo contactar a soporte?',
      answer: 'Atención Telefónica: 0810-810-6863. Lunes a Viernes: 9:00 - 21:00, Sábados: 10:00 - 18:00, Domingos: 10:00 - 16:00. Email y Chat: soporte@deviaje.com, Respuesta en 24 horas, Chat en vivo: 9:00 - 22:00, WhatsApp: +54 9 11 5571-0504. Soporte 24/7 para huéspedes en destino: Si ya estás viajando y tienes un problema urgente, llama al número de emergencias incluido en tu voucher de confirmación.'
    },
    {
      id: 'soporte3',
      category: 'soporte',
      icon: 'bi-chat-dots',
      question: '¿Tienes alguna duda o quieres comunicarte con nosotros?',
      answer: 'Estamos aquí para ayudarte. Puedes contactarnos por: Consultas Generales: info@deviaje.com, Reclamos: reclamos@deviaje.com, Sugerencias: sugerencias@deviaje.com'
    }
  ];

  categories = [
    { id: 'cuenta', name: 'Cuenta', icon: 'bi-person' },
    { id: 'reservas', name: 'Reservas', icon: 'bi-calendar-check' },
    { id: 'pagos', name: 'Pagos', icon: 'bi-credit-card' },
    { id: 'cancelaciones', name: 'Cancelaciones', icon: 'bi-x-circle' },
    { id: 'soporte', name: 'Soporte', icon: 'bi-headset' }
  ];

  constructor() {
    // Scroll to top when component loads
    window.scrollTo(0, 0);
  }

  ngOnInit(): void {
    this.filterFAQs();
  }

  // Cambiar categoría activa
  setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;
    this.filterFAQs();
  }

  // Filtrar FAQs por categoría y término de búsqueda
  filterFAQs(): void {
    let filtered = this.faqData.filter(faq => faq.category === this.activeCategory);
    
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(term) || 
        faq.answer.toLowerCase().includes(term)
      );
    }
    
    this.filteredFAQs = filtered;
  }

  // Búsqueda en tiempo real
  onSearch(): void {
    this.filterFAQs();
  }

  // Limpiar búsqueda
  clearSearch(): void {
    this.searchTerm = '';
    this.filterFAQs();
  }

  // Obtener FAQs por categoría
  getFAQsByCategory(categoryId: string): FAQItem[] {
    return this.faqData.filter(faq => faq.category === categoryId);
  }

  // Método para abrir email de contacto
  openContactEmail(): void {
    const email = 'soporte@deviaje.com';
    const subject = 'Consulta desde FAQ - DeViaje';
    const body = 'Hola equipo de DeViaje,\n\nTengo una consulta sobre:\n\n[Describe tu consulta aquí]\n\nGracias por su atención.\n\nSaludos cordiales.';
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}