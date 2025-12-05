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
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChartExportService } from '../../../../shared/services/chart-export.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard-top-destinations',
  standalone: true,
  imports: [
    GoogleChartsModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTooltipModule,
  ],
  templateUrl: './deviaje-top-destinations.component.html',
  styleUrls: ['./deviaje-top-destinations.component.scss'],
})
export class DeviajeTopDestinationsComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly chartExportService = inject(ChartExportService);

  currentUser: any = null;
  userRole: string = '';

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
    this.loadCurrentUser();
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
              this.error =
                'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error =
              'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading top destinations:', err);
          },
        })
    );
  }

  private processChartData(data: DestinationData[]): void {
    // Formato para Google Charts BarChart: [['Destino', 'Cantidad'], [...], ...]
    this.chartData = data.map((item) => [item.destination, item.bookingsCount]);
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
    if (this.userRole === 'ADMINISTRADOR') {
      this.router.navigate(['admin/dashboard']);
      return;
    }

    if (this.userRole === 'AGENTE') {
      this.router.navigate(['/agent/dashboard']);
      return;
    }
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

  loadCurrentUser(): void {
    // Suscribirse al usuario actual
    this.subscriptions.add(
      this.authService.currentUser$.subscribe({
        next: (user) => {
          this.currentUser = user;
        },
      })
    );

    this.subscriptions.add(
      this.authService.activeRole$.subscribe((role) => {
        this.userRole = role || '';
      })
    );
  }

  // ========== MÉTODOS DE EXPORTACIÓN ==========

  /**
   * Exporta el gráfico a PDF
   */
  exportChartToPDF(): void {
    this.chartExportService.exportChartToPDF(
      'topDestinationsChart',
      `Top Destinos - ${this.getTypeLabel()}`,
      'top_destinos'
    );
  }

  /**
   * Exporta el gráfico a PNG
   */
  exportChartToPNG(): void {
    this.chartExportService.exportChartToPNG(
      'topDestinationsChart',
      'top_destinos'
    );
  }

  /**
   * Exporta la tabla de datos a PDF
   */
  exportTableToPDF(): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Top Destinos - ${this.getTypeLabel()} - DeViaje`, 14, 15);

    // Fecha del reporte
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Generado: ${today}`, 14, 22);
    doc.text(`Total de destinos: ${this.destinationsData.length}`, 14, 27);

    // Preparar datos de la tabla
    const tableData = this.destinationsData.map((dest, index) => [
      dest.destination,
      dest.bookingsCount.toString(),
      this.formatCurrency(dest.revenue),
      dest.averageNights,
      this.formatCurrency(dest.averagePrice),
    ]);

    // Fila de totales
    const totalBookings = this.destinationsData.reduce(
      (sum, dest) => sum + dest.bookingsCount,
      0
    );
    const totalRevenue = this.destinationsData.reduce(
      (sum, dest) => sum + dest.revenue,
      0
    );

    const totalRow = [
      'TOTAL',
      this.kpis.totalBookings.toString(),
      this.formatCurrency(this.kpis.totalRevenue),
      '-',
      '-',
    ];

    // Generar tabla
    autoTable(doc, {
      startY: 32,
      head: [
        [
          'Destino',
          'Reservas',
          'Venta Total',
          'Promedio Noches',
          'Precio Promedio',
        ],
      ],
      body: [...tableData, totalRow],
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [33, 37, 41],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      footStyles: {
        fillColor: [33, 37, 41],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 21, halign: 'right' },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 21, halign: 'right' },
        4: { cellWidth: 45, halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      },
    });

    // Guardar PDF
    const timestamp = new Date().getTime();
    doc.save(`top_destinos_${timestamp}.pdf`);
  }

  /**
   * Exporta la tabla de datos a Excel
   */
  exportTableToExcel(): void {
    // Preparar datos
    const excelData = this.destinationsData.map((dest, index) => ({
      Destino: dest.destination,
      Reservas: dest.bookingsCount,
      'Venta Total': dest.revenue,
      'Promedio Noches': dest.averageNights,
      'Precio Promedio': dest.averagePrice,
    }));

    // Agregar fila de totales
    const totalBookings = this.destinationsData.reduce(
      (sum, dest) => sum + dest.bookingsCount,
      0
    );
    const totalRevenue = this.destinationsData.reduce(
      (sum, dest) => sum + dest.revenue,
      0
    );

    excelData.push({
      Destino: 'TOTAL',
      Reservas: this.kpis.totalBookings,
      'Venta Total': this.kpis.totalRevenue,
    } as any);

    // Crear worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 40 }, // Destino
      { wch: 20 }, // Cantidad de Reservas
      { wch: 20 }, // Ingresos Totales
      { wch: 20 },
      { wch: 20 },
    ];

    // Crear workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Destinos');

    // Guardar archivo
    const timestamp = new Date().getTime();
    XLSX.writeFile(wb, `top_destinos_${timestamp}.xlsx`);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
