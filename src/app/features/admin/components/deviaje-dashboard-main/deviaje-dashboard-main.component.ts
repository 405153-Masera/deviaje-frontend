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
import { Router, RouterOutlet } from '@angular/router';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import {
  DashboardSummaryResponse,
  GlobalKpis,
  MiniChartData,
} from '../../dashboard/models/dashboards';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './deviaje-dashboard-main.component.html',
  styleUrls: ['./deviaje-dashboard-main.component.scss'],
})
export class DeviajeDashboardMainComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  private subscriptions = new Subscription();

  // Filtros globales
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    bookingStatus: new FormControl(''),
    bookingType: new FormControl('')
  });

  // Estados
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  // KPIs globales
  globalKpis: GlobalKpis = {
    totalBookings: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    averageBookingValue: 0,
  };

  // Mini charts data
  miniCharts: MiniChartData[] = [];

  // Google Charts configs
  pieChart = ChartType.PieChart;
  lineChart = ChartType.LineChart;
  columnChart = ChartType.ColumnChart;
  barChart = ChartType.BarChart;

  // Chart data arrays
  bookingsByTypeData: any[] = [];
  revenueOverTimeData: any[] = [];
  topDestinationsData: any[] = [];
  topCarriersData: any[] = [];
  paymentsByStatusData: any[] = [];

  pieChartOptions = {
    backgroundColor: 'transparent',
    pieHole: 0.4,
    legend: {
      position: 'right',
      alignment: 'center',
      textStyle: { fontSize: 11, color: '#374151' },
    },
    chartArea: { width: '85%', height: '85%' },
    pieSliceText: 'value', // Mostrar valores en cada slice
    pieSliceTextStyle: {
      fontSize: 12,
      color: '#fff',
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
    tooltip: {
      showColorCode: true,
      trigger: 'both',
      textStyle: { fontSize: 13 },
    },
  };

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

  lineChartOptions = {
    backgroundColor: 'transparent',
    titleTextStyle: { fontSize: 16, bold: true, color: '#495057' },
    legend: { position: 'none' },
    chartArea: { width: '80%', height: '70%' },
    hAxis: {
      title: 'Período',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      textStyle: { fontSize: 11 },
      slantedText: false,
    },
    vAxis: {
      title: 'Monto (ARS)',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      gridlines: { color: '#f1f1f1' },
      minValue: 0,
      textStyle: { fontSize: 12 },
      format: 'short',
    },
    series: {
      0: { color: '#10B981', lineWidth: 3, labelInLegend: 'Ventas' },
      1: { color: '#F59E0B', lineWidth: 3, labelInLegend: 'Comisiones' },
    },
    animation: {
      startup: true,
      duration: 800,
      easing: 'out',
    },
    curveType: 'function', // Líneas suavizadas
    pointSize: 5,
  };

  columnChartOptions = {
    backgroundColor: 'transparent',
    legend: { position: 'none' },
    chartArea: { width: '85%', height: '70%' },
    hAxis: {
      textStyle: { fontSize: 10, color: '#6B7280' },
      gridlines: { color: 'transparent' },
    },
    vAxis: {
      textStyle: { fontSize: 10, color: '#6B7280' },
      gridlines: { color: '#E5E7EB', count: 4 },
      minValue: 0,
    },
    colors: ['#10B981'],
    bar: { groupWidth: '60%' },
    tooltip: {
      trigger: 'selection',
      textStyle: { fontSize: 13 },
    },
    annotations: {
      alwaysOutside: true,
      textStyle: {
        fontSize: 11,
        color: '#374151',
        bold: true,
      },
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
    if (this.bookingsByTypeData.length > 0) {
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
      this.dashboardService.getDashboardSummary(startDate, endDate, bookingStatus, bookingType).subscribe({
        next: (response: DashboardSummaryResponse) => {
          this.loading = false;
          this.globalKpis = response.globalKpis;
          this.miniCharts = response.miniCharts;
          this.processChartData(response.miniCharts);
          console.log(this.globalKpis);

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
        case 'BOOKINGS_BY_TYPE':
          this.bookingsByTypeData = Object.entries(chart.previewData).map(
            ([type, count]) => [this.translateBookingType(type), count]
          );
          break;

        case 'REVENUE_OVER_TIME':
          this.revenueOverTimeData = chart.previewData.map((p: any) => [
            p.period,
            Number(p.revenue),
            Number(p.commission),
          ]);
          break;

        case 'TOP_DESTINATIONS':
          this.topDestinationsData = Object.entries(chart.previewData).map(
            ([destination, count]) => [destination, count]
          );
          console.log(this.topDestinationsData);
          break;

        case 'TOP_CARRIERS':
          this.topCarriersData = Object.entries(chart.previewData).map(
            ([carrier, count]) => [carrier, count]
          );
          break;

        case 'PAYMENTS_BY_STATUS':
          this.paymentsByStatusData = Object.entries(chart.previewData).map(
            ([status, count]) => [this.translatePaymentStatus(status), count]
          );
          break;
      }
    });
  }

  private reloadCharts(): void {
    const tempBookings = [...this.bookingsByTypeData];
    const tempRevenue = [...this.revenueOverTimeData];
    const tempDestinations = [...this.topDestinationsData];
    const tempCarriers = [...this.topCarriersData];
    const tempPayments = [...this.paymentsByStatusData];

    this.bookingsByTypeData = [];
    this.revenueOverTimeData = [];
    this.topDestinationsData = [];
    this.topCarriersData = [];
    this.paymentsByStatusData = [];

    setTimeout(() => {
      this.bookingsByTypeData = tempBookings;
      this.revenueOverTimeData = tempRevenue;
      this.topDestinationsData = tempDestinations;
      this.topCarriersData = tempCarriers;
      this.paymentsByStatusData = tempPayments;
    }, 10);
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.errorRange = null;
    this.loadData();
  }

  // Navegación a vistas expandidas
  navigateToBookingsByType(): void {
    this.router.navigate(['admin/dashboard/bookings-by-type']);
  }

  navigateToRevenueOverTime(): void {
    this.router.navigate(['admin/dashboard/revenue-over-time']);
  }

  navigateToTopDestinations(): void {
    this.router.navigate(['admin/dashboard/top-destinations']);
  }

  navigateToTopCarriers(): void {
    this.router.navigate(['admin/dashboard/top-carriers']);
  }

  navigateToPaymentsByStatus(): void {
    this.router.navigate(['admin/dashboard/payments-by-status']);
  }

  // Traducciones
  private translateBookingType(type: string): string {
    const translations: { [key: string]: string } = {
      FLIGHT: 'Vuelos',
      HOTEL: 'Hoteles',
      PACKAGE: 'Paquetes',
    };
    return translations[type] || type;
  }

  private translatePaymentStatus(status: string): string {
    const translations: { [key: string]: string } = {
      APPROVED: 'Aprobado',
      REFUNDED: 'Reembolsado',
    };
    return translations[status] || status;
  }
}
