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
  BookingsByTypeKpis,
  BookingsByTypeResponse,
  TypeCount,
} from '../../dashboard/models/dashboards';
import { UserService } from '../../../../shared/services/user.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChartExportService } from '../../../../shared/services/chart-export.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard-bookings-by-type',
  standalone: true,
  imports: [
    GoogleChartsModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTooltipModule,
  ],
  templateUrl: './dashboard-bookings-by-type.component.html',
  styleUrls: ['./dashboard-bookings-by-type.component.scss'],
})
export class DashboardBookingsByTypeComponent implements OnInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly chartExportService = inject(ChartExportService);
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

  loadData(): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.value;
    const startDate = formValue.startDate || undefined;
    const endDate = formValue.endDate || undefined;
    const bookingType = formValue.bookingType || undefined;
    const bookingStatus = formValue.bookingStatus || undefined;
    const agentId = formValue.agentId ? Number(formValue.agentId) : undefined;
    const clientId = formValue.clientId
      ? Number(formValue.clientId)
      : undefined;

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
      agentId: null, // ← Asegurar que sea null
      clientId: null, // ← Asegurar que sea null
    });
    this.errorRange = null;
    this.loadData();
  }

  goBack(): void {
    this.router.navigate(['admin/dashboard']);
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

  // ========== MÉTODOS DE EXPORTACIÓN ==========

  /**
   * Exporta el gráfico a PDF
   */
  exportChartToPDF(): void {
    this.chartExportService.exportChartToPDF(
      'bookingsByTypeChart',
      'Reservas y Ventas por Tipo',
      'reservas_por_tipo'
    );
  }

  /**
   * Exporta el gráfico a PNG
   */
  exportChartToPNG(): void {
    this.chartExportService.exportChartToPNG(
      'bookingsByTypeChart',
      'reservas_por_tipo'
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
    doc.text('Reservas por Tipo - DeViaje', 14, 15);

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

    // Preparar datos de la tabla (SIN columna #)
    const tableData = this.bookingsData.map((item) => [
      this.translateBookingType(item.bookingType),
      item.count.toString(),
      this.formatCurrency(item.totalRevenue),
      this.formatCurrency(item.totalCommission),
      this.formatCurrency(item.averageRevenue)
    ]);

    // Fila de totales
    const totalRow = [
      'TOTAL',
      this.kpis.totalBookings.toString(),
      this.formatCurrency(this.kpis.totalRevenue),
      this.formatCurrency(this.kpis.totalCommissions),
      this.formatCurrency(this.kpis.averageBookingValue)
    ];

    // Generar tabla
    autoTable(doc, {
      startY: 27,
      head: [['Tipo de Reserva', 'Cantidad', 'Venta Total', 'Comisión Total', 'Venta Promedio']],
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
        0: { cellWidth: 50 },  // Tipo de Reserva
        1: { cellWidth: 35, halign: 'right' },  // Cantidad
        2: { cellWidth: 50, halign: 'right' },  // Venta Total
        3: { cellWidth: 50, halign: 'right' },  // Comisión Total
        4: { cellWidth: 50, halign: 'right' },  // Venta Promedio
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
    doc.save(`reservas_por_tipo_${timestamp}.pdf`);
  }

  /**
   * Exporta la tabla de datos a Excel
   */
  exportTableToExcel(): void {
    // Preparar datos (SIN columna #)
    const excelData = this.bookingsData.map((item) => ({
      'Tipo de Reserva': this.translateBookingType(item.bookingType),
      'Cantidad': item.count,
      'Venta Total': item.totalRevenue,
      'Comisión Total': item.totalCommission,
      'Venta Promedio': item.averageRevenue
    }));

    // Agregar fila de totales
    excelData.push({
      'Tipo de Reserva': 'TOTAL',
      'Cantidad': this.kpis.totalBookings,
      'Venta Total': this.kpis.totalRevenue,
      'Comisión Total': this.kpis.totalCommissions,
      'Venta Promedio': this.kpis.averageBookingValue
    });

    // Crear worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 20 }, // Tipo de Reserva
      { wch: 15 }, // Cantidad
      { wch: 20 }, // Venta Total
      { wch: 20 }, // Comisión Total
      { wch: 20 }, // Venta Promedio
    ];

    // Crear workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas por Tipo');

    // Guardar archivo
    const timestamp = new Date().getTime();
    XLSX.writeFile(wb, `reservas_por_tipo_${timestamp}.xlsx`);
  }

  /**
   * Helper para formatear moneda
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
