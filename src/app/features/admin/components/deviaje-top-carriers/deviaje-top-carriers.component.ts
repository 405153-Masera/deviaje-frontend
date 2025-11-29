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
  TopCarriersResponse,
  CarrierData,
  TopCarriersKpis,
} from '../../dashboard/models/dashboards';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-dashboard-top-carriers',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule, MatTooltipModule],
  templateUrl: './deviaje-top-carriers.component.html',
  styleUrls: ['./deviaje-top-carriers.component.scss'],
})
export class DeviajeTopCarriersComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  private subscriptions = new Subscription();

  // Form controls para filtros
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    limit: new FormControl(10),
    bookingStatus: new FormControl(''),
  });

  // Estados de carga
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  // KPIs
  kpis: TopCarriersKpis = {
    totalFlightBookings: 0,
    uniqueCarriers: 0,
    topCarrier: '',
    totalFlightRevenue: 0,
  };

  // Datos del gráfico
  carriersData: CarrierData[] = [];

  // Configuración Google Charts - Doughnut Chart (PieChart con pieHole)
  pieChart = ChartType.PieChart;
  chartData: any[] = [];
  chartOptions = {
    title: 'Distribución de Reservas por Aerolínea',
    titleTextStyle: { fontSize: 16, bold: true, color: '#495057' },
    backgroundColor: 'transparent',
    pieHole: 0.4, // Hace que sea un doughnut
    chartArea: { width: '90%', height: '80%' },
    legend: {
      position: 'right',
      alignment: 'center',
      textStyle: { fontSize: 12 },
    },
    pieSliceText: 'percentage',
    pieSliceTextStyle: { fontSize: 12 },
    colors: [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'
    ],
    animation: {
      startup: true,
      duration: 800,
      easing: 'out',
    },
    tooltip: {
      showColorCode: true,
      trigger: 'both',
      textStyle: { fontSize: 13 },
    },
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

    this.subscriptions.add(
      this.dashboardService
        .getTopCarriers(startDate, endDate, limit, bookingStatus)
        .subscribe({
          next: (response: TopCarriersResponse) => {
            this.loading = false;
            this.kpis = response.kpis;
            this.carriersData = response.data;
            this.processChartData(response.data);

            if (response.data.length === 0) {
              this.error = 'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error = 'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading top carriers:', err);
          },
        })
    );
  }

  private processChartData(data: CarrierData[]): void {
    // Formato para Google Charts PieChart: [['Aerolínea', 'Cantidad'], [...], ...]
    this.chartData = data.map((item) => [
      item.carrierName,
      item.bookingsCount,
    ]);
  }

  clearFilters(): void {
    this.filterForm.reset({
      limit: 10,
    });
    this.errorRange = null;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['admin/dashboard']);
  }
}