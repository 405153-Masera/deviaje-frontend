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
import { DashboardService } from '../../../admin/dashboard/services/dashboard.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import {
  DashboardSummaryResponse,
  GlobalKpis,
  MiniChartData,
} from '../../../admin/dashboard/models/dashboards';

@Component({
  selector: 'app-dashboard-agent',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './deviaje-dashboard-agent.component.html',
  styleUrls: ['./deviaje-dashboard-agent.component.scss'],
})
export class DeviajeDashboardAgentComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private subscriptions = new Subscription();

  // Filtros globales
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    bookingStatus: new FormControl(''),
    bookingType: new FormControl(''),
  });

  // Estados
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  // KPIs específicos del agente (relacionados con destinos y carriers)
  agentKpis = {
    totalDestinations: 0,
    topDestination: '',
    totalCarriers: 0,
    topCarrier: '',
  };

  // Mini charts data (solo 2)
  miniCharts: MiniChartData[] = [];

  globalKpis: GlobalKpis = {
    totalBookings: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    averageBookingValue: 0,
    uniqueDestinations: 0,
    uniqueCarriers: 0,
  };

  // Google Charts configs
  pieChart = ChartType.PieChart;
  barChart = ChartType.BarChart;

  // Chart data arrays (solo 2 gráficos)
  topDestinationsData: any[] = [];
  topCarriersData: any[] = [];

  // Opciones para mini charts
  pieChartAirlines = {
    backgroundColor: 'transparent',
    pieHole: 0.4,
    legend: {
      position: 'right',
      alignment: 'center',
      textStyle: { fontSize: 11, color: '#374151' },
    },
    chartArea: { width: '85%', height: '85%' },
    pieSliceText: 'percentage', // Mostrar valores en cada slice
    pieSliceTextStyle: {
      fontSize: 12,
      bold: true,
    },
    colors: [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#06B6D4',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
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

  barChartOptions = {
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
    // Forzar recarga de gráficos
    if (
      this.topDestinationsData.length > 0 ||
      this.topCarriersData.length > 0
    ) {
      this.reloadCharts();
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

  private loadData(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const startDate = formValue.startDate || undefined;
    const endDate = formValue.endDate || undefined;
    const bookingStatus = formValue.bookingStatus || undefined;
    const bookingType = formValue.bookingType || undefined;

    this.subscriptions.add(
      this.dashboardService
        .getDashboardSummary(startDate, endDate, bookingStatus, bookingType)
        .subscribe({
          next: (response: DashboardSummaryResponse) => {
            this.loading = false;
            this.miniCharts = response.miniCharts;
            this.agentKpis.totalCarriers = response.globalKpis.uniqueCarriers ?? 0;
            this.agentKpis.totalDestinations = response.globalKpis.uniqueDestinations ?? 0;
            console.log(this.agentKpis);
            console.log(response.globalKpis);
            this.processChartData(response.miniCharts);

            if (response.miniCharts.length === 0) {
              this.error =
                'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error =
              'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading dashboard summary:', err);
          },
        })
    );
  }

  private processChartData(miniCharts: MiniChartData[]): void {
    miniCharts.forEach((chart) => {
      switch (chart.chartType) {
        case 'TOP_DESTINATIONS':
          this.topDestinationsData = Object.entries(chart.previewData).map(
            ([destination, count]) => [destination, count]
          );
          // Calcular KPIs de destinos
          this.agentKpis.topDestination =
            this.topDestinationsData.length > 0
              ? this.topDestinationsData[0][0]
              : 'N/A';
          break;

        case 'TOP_CARRIERS':
          this.topCarriersData = Object.entries(chart.previewData).map(
            ([carrier, count]) => [carrier, count]
          );
          // Calcular KPIs de carriers
          this.agentKpis.topCarrier =
            this.topCarriersData.length > 0
              ? this.topCarriersData[0][0]
              : 'N/A';
          break;
      }
    });
  }

  private reloadCharts(): void {
    const tempDestinations = [...this.topDestinationsData];
    const tempCarriers = [...this.topCarriersData];

    this.topDestinationsData = [];
    this.topCarriersData = [];

    setTimeout(() => {
      this.topDestinationsData = tempDestinations;
      this.topCarriersData = tempCarriers;
    }, 10);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.errorRange = null;
    this.loadData();
  }

  // Navegación a vistas expandidas
  navigateToTopDestinations(): void {
    this.router.navigate(['agent/dashboard/top-destinations']);
  }

  navigateToTopCarriers(): void {
    this.router.navigate(['agent/dashboard/top-carriers']);
  }
}
