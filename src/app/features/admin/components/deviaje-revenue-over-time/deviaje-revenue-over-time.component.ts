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
  RevenueOverTimeResponse,
  TimeSeriesPoint,
  RevenueOverTimeKpis,
} from '../../dashboard/models/dashboards';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { UserService } from '../../../../shared/services/user.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartExportService } from '../../../../shared/services/chart-export.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard-revenue-over-time',
  standalone: true,
  imports: [GoogleChartsModule, CommonModule, ReactiveFormsModule, FormsModule, MatTooltipModule],
  templateUrl: './deviaje-revenue-over-time.component.html',
  styleUrls: ['./deviaje-revenue-over-time.component.scss'],
})
export class DeviajeRevenueOverTimeComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly chartExportService = inject(ChartExportService);

  private subscriptions = new Subscription();

  // Control de roles
  isAdmin = false;
  isAgent = false;
  currentUserId: number | null = null;

  // Form controls para filtros
  filterForm = new FormGroup({
    startDate: new FormControl(''),
    endDate: new FormControl(''),
    granularity: new FormControl('MONTHLY'),
    bookingType: new FormControl(''),
    agentId: new FormControl<number | null>(null),
  });

  // Estados de carga
  loading = true;
  error: string | null = null;
  errorRange: string | null = null;

  agents: { id: number; username: string }[] = [];
  loadingUsers = false;

  // KPIs
  kpis: RevenueOverTimeKpis = {
    totalRevenue: 0,
    totalCommission: 0,
    averageRevenuePerPeriod: 0,
    highestRevenue: 0,
    highestRevenuePeriod: '',
  };

  // Datos del gráfico
  revenueData: TimeSeriesPoint[] = [];
  currentGranularity = 'MONTHLY';

  // Configuración Google Charts - Line Chart
  lineChart = ChartType.LineChart;
  chartData: any[] = [];
  chartOptions = {
    title: 'Ventas y Comisiones a lo Largo del Tiempo',
    titleTextStyle: { fontSize: 16, bold: true, color: '#495057' },
    backgroundColor: 'transparent',
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
    curveType: 'function', // Líneas suavizadas
    pointSize: 5,
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
    this.loadAgents();
    this.setupFilters();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadAgents(): void {
    this.loadingUsers = true;

    this.userService.getAllUsersByRole('CLIENTE').subscribe({
      next: (clients) => {
        this.agents = clients.map((c) => ({ id: c.id, username: c.username }));
        this.loadingUsers = false;
      },
      error: (err) => {
        console.error('Error loading clients:', err);
        this.loadingUsers = false;
      },
    });
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

    const formValue = this.filterForm.getRawValue(); // getRawValue incluye campos disabled
    const startDate = formValue.startDate || undefined;
    const endDate = formValue.endDate || undefined;
    const granularity = formValue.granularity || 'MONTHLY';
    const bookingType = formValue.bookingType || undefined;
    const agentId = formValue.agentId || undefined;

    this.subscriptions.add(
      this.dashboardService
        .getRevenueOverTime(startDate, endDate, granularity, bookingType, agentId)
        .subscribe({
          next: (response: RevenueOverTimeResponse) => {
            this.loading = false;
            this.kpis = response.kpis;
            this.revenueData = response.data;
            this.currentGranularity = response.granularity;
            this.processChartData(response.data);

            if (response.data.length === 0) {
              this.error = 'No se encontraron datos para los filtros seleccionados';
            }
          },
          error: (err) => {
            this.loading = false;
            this.error = 'Error al cargar los datos. Por favor, intente nuevamente.';
            console.error('Error loading revenue over time:', err);
          },
        })
    );
  }

  private processChartData(data: TimeSeriesPoint[]): void {
    this.chartData = data.map((item) => [
      item.period,
      item.revenue,
      item.commission,
    ]);
  }

  clearFilters(): void {
    if (this.isAgent) {
      // Agente: solo limpiar fechas y tipo, mantener su agentId
      this.filterForm.patchValue({
        startDate: '',
        endDate: '',
        granularity: 'MONTHLY',
        bookingType: '',
      });
    } else {
      // Admin: limpiar todo
      this.filterForm.reset({
        granularity: 'MONTHLY',
      });
    }
    this.errorRange = null;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['admin/dashboard']);
  }

  // Métodos de formateo
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-AR').format(value);
  }

  getGranularityLabel(): string {
    const labels: { [key: string]: string } = {
      DAILY: 'Diario',
      MONTHLY: 'Mensual',
      YEARLY: 'Anual',
    };
    return labels[this.currentGranularity] || this.currentGranularity;
  }

  //  MÉTODOS DE EXPORTACIÓN 

  /**
   * Exporta el gráfico a PDF
   */
  exportChartToPDF(): void {
    this.chartExportService.exportChartToPDF(
      'revenueChart',
      'Ventas y Comisiones a lo Largo del Tiempo',
      'ventas_por_periodo'
    );
  }

  /**
   * Exporta el gráfico a PNG
   */
  exportChartToPNG(): void {
    this.chartExportService.exportChartToPNG(
      'revenueChart',
      'ventas_por_periodo'
    );
  }

  /**
   * Exporta la tabla de datos a PDF
   */
  exportTableToPDF(): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos Detallados por Período - DeViaje', 14, 15);

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
    doc.text(`Granularidad: ${this.getGranularityLabel()}`, 14, 27);

    // Preparar datos de la tabla
    const tableData = this.revenueData.map(item => [
      item.period,
      this.formatCurrency(item.revenue),
      this.formatCurrency(item.commission),
      this.formatCurrency(item.revenue - item.commission)
    ]);

    // Fila de totales
    const totalRow = [
      'TOTAL',
      this.formatCurrency(this.kpis.totalRevenue),
      this.formatCurrency(this.kpis.totalCommission),
      this.formatCurrency(this.kpis.totalRevenue - this.kpis.totalCommission)
    ];

    // Generar tabla
    autoTable(doc, {
      startY: 32,
      head: [['Período', 'Venta Total', 'Comisión Total', 'Venta Neta']],
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
        0: { cellWidth: 40 },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 45, halign: 'right' },
        3: { cellWidth: 45, halign: 'right' },
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
    doc.save(`datos_detallados_${timestamp}.pdf`);
  }

  /**
   * Exporta la tabla de datos a Excel
   */
  exportTableToExcel(): void {
    // Preparar datos
    const excelData = this.revenueData.map(item => ({
      'Período': item.period,
      'Venta Total': item.revenue,
      'Comisión Total': item.commission,
      'Venta Neta': item.revenue - item.commission
    }));

    // Agregar fila de totales
    excelData.push({
      'Período': 'TOTAL',
      'Venta Total': this.kpis.totalRevenue,
      'Comisión Total': this.kpis.totalCommission,
      'Venta Neta': this.kpis.totalRevenue - this.kpis.totalCommission
    });

    // Crear worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 20 }, // Período
      { wch: 18 }, // Venta Total
      { wch: 18 }, // Comisión Total
      { wch: 18 }, // Venta Neta
    ];

    // Crear workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Detallados');

    // Guardar archivo
    const timestamp = new Date().getTime();
    XLSX.writeFile(wb, `datos_detallados_${timestamp}.xlsx`);
  }
}