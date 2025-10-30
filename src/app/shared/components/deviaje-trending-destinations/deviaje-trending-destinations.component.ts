import { Component, OnInit, Input, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../enviroments/enviroment';

@Component({
  selector: 'app-trending-destinations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './deviaje-trending-destinations.component.html',
  styleUrls: ['./deviaje-trending-destinations.component.scss']
})
export class TrendingDestinationsComponent implements OnInit {
  @Input() title: string = 'Destinos que son tendencia';
  @Input() subtitle: string = 'Los lugares más visitados del mundo según nuestros viajeros';
  @Input() cities: City[] = [
    { name: 'París', country: 'Francia' },
    { name: 'Nueva York', country: 'EE.UU.' },
    { name: 'Tokio', country: 'Japón' },
    { name: 'Roma', country: 'Italia' },
    { name: 'Londres', country: 'Reino Unido' },
    { name: 'Barcelona', country: 'España' },
    { name: 'Río de Janeiro', country: 'Brasil' },
    { name: 'Buenos Aires', country: 'Argentina' }
  ];

  trendingDestinations: Destination[] = [];
  isLoading = true;
  isMobile = false;
  currentIndex = 0;

  // Modal para ver todas las fotos
  showGalleryModal = false;
  selectedDestination: Destination | null = null;
  currentGalleryIndex = 0;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadImages();
    
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('resize', () => this.checkScreenSize());
    }
  }

  checkScreenSize(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Detectar mobile y tablet (menos de 992px = Bootstrap lg breakpoint)
      this.isMobile = window.innerWidth < 992;
      console.log('🔍 Detección de pantalla:', {
        width: window.innerWidth,
        isMobile: this.isMobile,
        isLoading: this.isLoading
      });
    }
  }

    loadImages(): void {
    const requests = this.cities.map(city => 
      this.http.get<UnsplashResponse>(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city.name)}&orientation=landscape&per_page=10&client_id=${environment.unsplash.apiKey}`
      ).pipe(
        map(res => ({
          name: city.name,
          country: city.country,
          image: res.results?.[0]?.urls?.regular || 'assets/default-city.jpg',
          gallery: res.results?.slice(0, 10).map(r => r.urls.regular) || []
        }))
      )
    );

    forkJoin(requests).subscribe({
      next: (destinations) => {
        this.trendingDestinations = destinations;
        this.isLoading = false;
        // Re-verificar el tamaño después de cargar
        setTimeout(() => this.checkScreenSize(), 100);
        console.log('✅ Imágenes cargadas:', destinations.length);
      },
      error: (err) => {
        console.error('❌ Error cargando imágenes:', err);
        this.trendingDestinations = this.cities.map(city => ({
          name: city.name,
          country: city.country,
          image: 'assets/default-city.jpg',
          gallery: ['assets/default-city.jpg']
        }));
        this.isLoading = false;
        setTimeout(() => this.checkScreenSize(), 100);
      }
    });
  }

  // Carrusel - Navegación
  nextSlide(): void {
    if (this.currentIndex < this.trendingDestinations.length - 1) {
      this.currentIndex++;
    }
  }

  prevSlide(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  // Modal de galería
  openGallery(destination: Destination): void {
    this.selectedDestination = destination;
    this.currentGalleryIndex = 0;
    this.showGalleryModal = true;
    
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeGallery(): void {
    this.showGalleryModal = false;
    this.selectedDestination = null;
    
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
    }
  }

  nextGalleryImage(): void {
    if (this.selectedDestination && this.currentGalleryIndex < this.selectedDestination.gallery.length - 1) {
      this.currentGalleryIndex++;
    }
  }

  prevGalleryImage(): void {
    if (this.currentGalleryIndex > 0) {
      this.currentGalleryIndex--;
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', () => this.checkScreenSize());
      document.body.style.overflow = 'auto';
    }
  }
}

export interface City {
  name: string;
  country: string;
}

export interface Destination {
  name: string;
  country: string;
  image: string;
  gallery: string[];
}

interface UnsplashResponse {
  results: Array<{
    urls: { regular: string };
  }>;
}