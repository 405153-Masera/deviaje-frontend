import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import {
  TopDestinationsResponse,
  DestinationData,
  TopDestinationsKpis,
} from '../../dashboard/models/dashboards';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard-top-destinations',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule, MatTooltipModule],
  templateUrl: './deviaje-top-destinations.component.html',
  styleUrls: ['./deviaje-top-destinations.component.scss'],
})
export class DeviajeTopDestinationsComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  private subscriptions = new Subscription();

  // Form controls para filtros
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    limit: new FormControl(10),
    bookingStatus: new FormControl(''),
    type: new FormControl('HOTEL'), // ← HOTEL por defecto
  });

  // Estados de carga
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  // KPIs
  kpis: TopDestinationsKpis = {
    totalBookings: 0,
    uniqueDestinations: 0,
    topDestination: '',
    totalRevenue: 0,
  };

  // Datos del gráfico
  destinationsData: DestinationData[] = [];

  // Configuración Google Charts - Horizontal Bar Chart
  barChart = ChartType.BarChart;
  chartData: any[] = [];
  chartOptions = {
    title: 'Top Destinos por Cantidad de Reservas',
    titleTextStyle: { fontSize: 16, bold: true, color: '#495057' },
    backgroundColor: 'transparent',
    chartArea: { width: '60%', height: '80%' },
    hAxis: {
      title: 'Cantidad de Reservas',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      gridlines: { color: '#f1f1f1' },
      minValue: 0,
      textStyle: { fontSize: 12 },
    },
    vAxis: {
      title: 'Destino',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      textStyle: { fontSize: 11 },
    },
    colors: ['#3B82F6'],
    legend: { position: 'none' },
    animation: {
      startup: true,
      duration: 800,
      easing: 'out',
    },
    bar: { groupWidth: '75%' },
  };

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // Forzar recarga del gráfico
    if (this.chartData.length > 0) {
      const temp = [...this.chartData];
      this.chartData = [];
      setTimeout(() => {
        this.chartData = temp;
      }, 10);
    }
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setupFilters(): void {
    this.subscriptions.add(
      this.filterForm.valueChanges.subscribe(() => {
        this.applyFilters();
      })
    );
  }

  private applyFilters(): void {
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      this.errorRange = 'La fecha inicial no puede ser mayor a la fecha final';
      return;
    }

    this.errorRange = null;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const startDate = formValue.startDate || undefined;
    const endDate = formValue.endDate || undefined;
    const limit = formValue.limit || 10;
    const bookingStatus = formValue.bookingStatus || undefined;
    const type = formValue.type || 'HOTEL';

    this.subscriptions.add(
      this.dashboardService
        .getTopDestinations(startDate, endDate, limit, bookingStatus, type)
        .subscribe({
          next: (response: TopDestinationsResponse) => {
            this.loading = false;
            this.kpis = response.kpis;
            this.destinationsData = response.data;
            this.processChartData(response.data);

            if (response.data.length === 0) {
              this.error = 'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error = 'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading top destinations:', err);
          },
        })
    );
  }

  private processChartData(data: DestinationData[]): void {
    // Formato para Google Charts BarChart: [['Destino', 'Cantidad'], [...], ...]
    this.chartData = data.map((item) => [
      item.destination,
      item.bookingsCount,
    ]);
  }

  clearFilters(): void {
    this.filterForm.reset({
      limit: 10,
      type: 'HOTEL', // Mantener HOTEL por defecto
    });
    this.errorRange = null;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['admin/dashboard']);
  }

  getTypeLabel(): string {
    const type = this.filterForm.get('type')?.value;
    return type === 'HOTEL' ? 'Hoteles' : 'Vuelos';
  }

  getTypeIcon(): string {
    const type = this.filterForm.get('type')?.value;
    return type === 'HOTEL' ? 'bi-building' : 'bi-airplane';
  }

  // Método para mostrar "Noches" solo si es HOTEL
  isHotelType(): boolean {
    return this.filterForm.get('type')?.value === 'HOTEL';
  }
}