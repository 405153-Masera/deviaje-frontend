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
  PaymentsByStatusResponse,
  PaymentsByStatusKpis,
  PaymentStatusData,
} from '../../dashboard/models/dashboards';

@Component({
  selector: 'app-dashboard-payments-by-status',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './deviaje-payments-by-status.component.html',
  styleUrls: ['./deviaje-payments-by-status.component.scss'],
})
export class DeviajePaymentsByStatusComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  private subscriptions = new Subscription();

  // Form controls para filtros
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    paymentMethod: new FormControl(''),
  });

  // Estados de carga
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  // KPIs
  kpis: PaymentsByStatusKpis = {
    totalPayments: 0,
    totalAmount: 0,
    approvedPayments: 0,
    approvedAmount: 0,
    refundedPayments: 0,
    approvalRate: 0,
  };

  // Datos del gráfico
  paymentsData: PaymentStatusData[] = [];

  // Configuración Google Charts - Column Chart
  columnChart = ChartType.ColumnChart;
  chartData: any[] = [];
  chartOptions = {
    title: 'Pagos por Estado',
    titleTextStyle: { fontSize: 16, bold: true, color: '#495057' },
    backgroundColor: 'transparent',
    chartArea: { width: '75%', height: '70%' },
    hAxis: {
      title: 'Estado del Pago',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      textStyle: { fontSize: 12 },
    },
    vAxis: {
      title: 'Cantidad de Pagos',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      gridlines: { color: '#f1f1f1' },
      minValue: 0,
      textStyle: { fontSize: 12 },
    },
    colors: ['#10B981'], // Verde para pagos
    legend: { position: 'none' },
    animation: {
      startup: true,
      duration: 800,
      easing: 'out',
    },
    bar: { groupWidth: '60%' },
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

  private loadData(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const startDate = formValue.startDate || undefined;
    const endDate = formValue.endDate || undefined;
    const paymentMethod = formValue.paymentMethod || undefined;

    this.subscriptions.add(
      this.dashboardService
        .getPaymentsByStatus(startDate, endDate, paymentMethod)
        .subscribe({
          next: (response: PaymentsByStatusResponse) => {
            this.loading = false;
            this.kpis = response.kpis;
            this.paymentsData = response.data;
            this.processChartData(response.data);

            if (response.data.length === 0) {
              this.error =
                'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error =
              'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading payments by status:', err);
          },
        })
    );
  }

  private processChartData(data: PaymentStatusData[]): void {
    // Formato para Google Charts: [['Estado', 'Cantidad'], [...], ...]
    this.chartData = data.map((item) => [
      this.translateStatus(item.status),
      item.count,
    ]);
  }

  translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      APPROVED: 'Aprobado',
      REFUNDED: 'Reembolsado', // ← CAMBIAR
    };
    return translations[status] || status;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.errorRange = null;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['admin/dashboard']);
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      APPROVED: 'bg-success',
      REFUNDED: 'bg-warning', // ← CAMBIAR
    };
    return classes[status] || 'bg-secondary';
  }
}
