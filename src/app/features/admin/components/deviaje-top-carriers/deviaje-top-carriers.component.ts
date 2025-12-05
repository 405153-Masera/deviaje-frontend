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
import { AuthService } from '../../../../core/auth/services/auth.service';
import { ChartExportService } from '../../../../shared/services/chart-export.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard-top-carriers',
  standalone: true,
  imports: [
    GoogleChartsModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTooltipModule,
  ],
  templateUrl: './deviaje-top-carriers.component.html',
  styleUrls: ['./deviaje-top-carriers.component.scss'],
})
export class DeviajeTopCarriersComponent implements OnInit, OnDestroy {
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
              this.error =
                'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error =
              'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading top carriers:', err);
          },
        })
    );
  }

  private processChartData(data: CarrierData[]): void {
    // Formato para Google Charts PieChart: [['Aerolínea', 'Cantidad'], [...], ...]
    this.chartData = data.map((item) => [item.carrierName, item.bookingsCount]);
  }

  clearFilters(): void {
    this.filterForm.reset({
      limit: 10,
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
      this.router.navigate(['agent/dashboard']);
      return;
    }
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
      'topCarriersChart',
      'Top Aerolíneas',
      'top_aerolineas'
    );
  }

  /**
   * Exporta el gráfico a PNG
   */
  exportChartToPNG(): void {
    this.chartExportService.exportChartToPNG(
      'topCarriersChart',
      'top_aerolineas'
    );
  }

  /**
   * Exporta la tabla de datos a PDF
   */
  exportTableToPDF(): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Aerolíneas - DeViaje', 14, 15);

    // Fecha del reporte
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generado: ${today}`, 14, 22);
    doc.text(`Total de aerolíneas: ${this.carriersData.length}`, 14, 27);

    // Preparar datos de la tabla (SIN columna #)
    const tableData = this.carriersData.map((carrier) => [
      carrier.carrierName,
      carrier.bookingsCount.toString(),
      this.formatCurrency(carrier.totalRevenue),
      carrier.averagePassengers.toFixed(1),
      this.formatCurrency(carrier.averagePrice)
    ]);

    // Fila de totales
    const totalBookings = this.carriersData.reduce((sum, c) => sum + c.bookingsCount, 0);
    const totalRevenue = this.carriersData.reduce((sum, c) => sum + c.totalRevenue, 0);
    
    const totalRow = [
      'TOTAL',
      totalBookings.toString(),
      this.formatCurrency(totalRevenue),
      '-',
      '-'
    ];

    // Generar tabla
    autoTable(doc, {
      startY: 32,
      head: [['Aerolínea', 'Cantidad', 'Venta Total', 'Promedio Pasajeros', 'Precio Promedio']],
      body: [...tableData, totalRow],
      styles: {
        fontSize: 9,
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
        0: { cellWidth: 70 },  // Aerolínea
        1: { cellWidth: 35, halign: 'right' },  // Cantidad
        2: { cellWidth: 50, halign: 'right' },  // Venta Total
        3: { cellWidth: 45, halign: 'right' },  // Promedio Pasajeros
        4: { cellWidth: 50, halign: 'right' },  // Precio Promedio
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
      }
    });

    // Guardar PDF
    const timestamp = new Date().getTime();
    doc.save(`top_aerolineas_${timestamp}.pdf`);
  }

  /**
   * Exporta la tabla de datos a Excel
   */
  exportTableToExcel(): void {
    // Preparar datos (SIN columna #)
    const excelData = this.carriersData.map((carrier) => ({
      'Aerolínea': carrier.carrierName,
      'Cantidad': carrier.bookingsCount,
      'Venta Total': carrier.totalRevenue,
      'Promedio Pasajeros': carrier.averagePassengers,
      'Precio Promedio': carrier.averagePrice
    }));

    // Agregar fila de totales
    const totalBookings = this.carriersData.reduce((sum, c) => sum + c.bookingsCount, 0);
    const totalRevenue = this.carriersData.reduce((sum, c) => sum + c.totalRevenue, 0);
    
    excelData.push({
      'Aerolínea': 'TOTAL',
      'Cantidad': totalBookings,
      'Venta Total': totalRevenue,
      'Promedio Pasajeros': '-' as any,
      'Precio Promedio': '-' as any
    });

    // Crear worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 30 }, // Aerolínea
      { wch: 15 }, // Cantidad
      { wch: 20 }, // Venta Total
      { wch: 20 }, // Promedio Pasajeros
      { wch: 20 }, // Precio Promedio
    ];

    // Crear workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Aerolíneas');

    // Guardar archivo
    const timestamp = new Date().getTime();
    XLSX.writeFile(wb, `top_aerolineas_${timestamp}.xlsx`);
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
