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
import {
  ChartType,
  GoogleChartComponent,
  GoogleChartsModule,
} from 'angular-google-charts';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import {
  BookingsByTypeKpis,
  BookingsByTypeResponse,
  TypeCount,
} from '../../dashboard/models/dashboards';
import { UserService } from '../../../../shared/services/user.service';

@Component({
  selector: 'app-dashboard-bookings-by-type',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard-bookings-by-type.component.html',
  styleUrls: ['./dashboard-bookings-by-type.component.scss'],
})
export class DashboardBookingsByTypeComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  private subscriptions = new Subscription();

  // Form controls para filtros
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    bookingType: new FormControl(''),
    bookingStatus: new FormControl(''),
    agentId: new FormControl<number | null>(null), // ← CAMBIAR ESTO
    clientId: new FormControl<number | null>(null),
  });

  // Estados de carga
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  agents: { id: number; username: string }[] = [];
  clients: { id: number; username: string }[] = [];
  loadingUsers = false;

  // KPIs
  kpis: BookingsByTypeKpis = {
    totalBookings: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    averageBookingValue: 0,
  };

  // Datos del gráfico
  bookingsData: TypeCount[] = [];

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

  // Configuración Google Charts - Columnas agrupadas con 2 ejes Y
  columnChart = ChartType.ColumnChart;
  chartData: any[] = [];
  chartOptions = {
    title: 'Reservas y Ventas por Tipo',
    titleTextStyle: { fontSize: 16, bold: true, color: '#495057' },
    backgroundColor: 'transparent',
    chartArea: { width: '75%', height: '70%' },
    hAxis: {
      title: 'Tipo de Reserva',
      titleTextStyle: { color: '#7f8c8d', fontSize: 14 },
      textStyle: { fontSize: 12 },
    },
    vAxes: {
      0: {
        // Eje izquierdo - Cantidad
        title: 'Cantidad de Reservas',
        titleTextStyle: { color: '#8B5CF6', fontSize: 14 },
        gridlines: { color: '#f1f1f1' },
        minValue: 0,
        textStyle: { fontSize: 12 },
      },
      1: {
        // Eje derecho - Revenue
        title: 'Venta Total (ARS)',
        titleTextStyle: { color: '#10B981', fontSize: 14 },
        gridlines: { color: 'transparent' },
        minValue: 0,
        textStyle: { fontSize: 12 },
        format: 'short', // Formato abreviado (1.5K, 2M, etc.)
      },
    },
    seriesType: 'bars',
    series: {
      0: {
        color: '#8B5CF6',
        targetAxisIndex: 0,
        labelInLegend: 'Cantidad de Reservas',
      },
      1: {
        color: '#10B981',
        targetAxisIndex: 1,
        labelInLegend: 'Venta Total (ARS)',
      },
    },
    legend: {
      position: 'top',
      alignment: 'center',
      textStyle: { fontSize: 13 },
    },
    animation: {
      startup: true,
      duration: 800,
      easing: 'out',
    },
  };

  ngOnInit(): void {
    this.loadUsers();
    this.loadData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadUsers(): void {
    this.loadingUsers = true;

    // Cargar agentes
    this.userService.getAllUsersByRole('AGENTE').subscribe({
      next: (agents) => {
        this.agents = agents.map((a) => ({ id: a.id, username: a.username }));
      },
      error: (err) => console.error('Error loading agents:', err),
    });

    // Cargar clientes
    this.userService.getAllUsersByRole('CLIENTE').subscribe({
      next: (clients) => {
        this.clients = clients.map((c) => ({ id: c.id, username: c.username }));
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error loading clients:', err);
        this.loadingUsers = false;
      },
    });
  }

  private setupFilters(): void {
    // Suscribirse a cambios en cualquier filtro
    this.subscriptions.add(
      this.filterForm.valueChanges.subscribe(() => {
        this.applyFilters();
      })
    );
  }

  private applyFilters(): void {
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;

    // Validar rango de fechas
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
    const bookingType = formValue.bookingType || undefined;
    const bookingStatus = formValue.bookingStatus || undefined;
    const agentId = formValue.agentId ? Number(formValue.agentId) : undefined;
    const clientId = formValue.clientId ? Number(formValue.clientId) : undefined;


    console.log('agaente', agentId);

    this.subscriptions.add(
      this.dashboardService
        .getBookingsByType(
          startDate,
          endDate,
          bookingType,
          bookingStatus,
          agentId,
          clientId
        )
        .subscribe({
          next: (response: BookingsByTypeResponse) => {
            this.loading = false;
            this.kpis = response.kpis;
            this.bookingsData = response.data;
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
            console.error('Error loading bookings by type:', err);
          },
        })
    );
  }

  private processChartData(data: TypeCount[]): void {
    // Formato para Google Charts: [['Tipo', 'Cantidad', 'Revenue'], [...], ...]
    this.chartData = data.map((item) => [
      this.translateBookingType(item.bookingType),
      item.count,
      item.totalRevenue,
    ]);
  }

  private translateBookingType(type: string): string {
    const translations: { [key: string]: string } = {
      FLIGHT: 'Vuelos',
      HOTEL: 'Hoteles',
      PACKAGE: 'Paquetes',
    };
    return translations[type] || type;
  }

  clearFilters(): void {
    this.filterForm.reset({
        startDate: '',
        endDate: '',
        bookingType: '',
        bookingStatus: '',
        agentId: null,    // ← Asegurar que sea null
        clientId: null    // ← Asegurar que sea null
    });
    this.errorRange = null;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-AR').format(value);
  }

  getTypeBadgeClass(type: string): string {
    const classes: { [key: string]: string } = {
      FLIGHT: 'bg-primary',
      HOTEL: 'bg-light',
      PACKAGE: 'bg-purple',
    };
    return classes[type] || 'bg-secondary';
  }
}
