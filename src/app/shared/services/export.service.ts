import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportBooking {
  bookingReference: string;
  type: string;
  status: string;
  holderName: string;
  email: string;
  clientName?: string;
  agentName?: string;
  totalAmount: number;
  currency: string;
  createdDatetime: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Exportar reservas a PDF
   */
  exportToPDF(
    bookings: ExportBooking[], 
    userRole: string,
    fileName: string = 'reservas'
  ): void {
    // Crear documento PDF en modo landscape
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Reservas - DeViaje', 14, 15);

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
    doc.text(`Total de reservas: ${bookings.length}`, 14, 27);

    // Preparar columnas según el rol
    const columns = this.getPDFColumns(userRole);
    const rows = this.getPDFRows(bookings, userRole);

    // Generar tabla usando autoTable
    autoTable(doc,{
      startY: 32,
      head: [columns],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Referencia
        1: { cellWidth: 15 }, // Tipo
        2: { cellWidth: 20 }, // Estado
        3: { cellWidth: 40 }, // Titular
        4: { cellWidth: 40 }, // Email
        5: { cellWidth: 30 }, // cliente
        6: { cellWidth: 30 }, // agente
      },
      margin: { top: 32, left: 14, right: 14 },
      didDrawPage: (data: any) => {
        // Footer con número de página
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
    doc.save(`${fileName}_${timestamp}.pdf`);
  }

  /**
   * Exportar reservas a Excel
   */
  exportToExcel(
    bookings: ExportBooking[], 
    userRole: string,
    fileName: string = 'reservas'
  ): void {
    // Preparar datos según el rol
    const data = this.getExcelData(bookings, userRole);

    // Crear worksheet
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    // Ajustar anchos de columna
    const columnWidths = this.getExcelColumnWidths(userRole);
    ws['!cols'] = columnWidths;

    // Crear workbook
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas');

    // Agregar metadatos
    wb.Props = {
      Title: 'Reporte de Reservas - DeViaje',
      Subject: 'Exportación de reservas',
      Author: 'DeViaje',
      CreatedDate: new Date()
    };

    // Guardar archivo
    const timestamp = new Date().getTime();
    XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
  }

  /**
   * Obtener columnas para PDF según el rol
   */
  private getPDFColumns(userRole: string): string[] {
    const baseColumns = [
      'Referencia',
      'Tipo',
      'Estado',
      'Titular',
      'Email',
    ];

    if (userRole === 'ADMINISTRADOR') {
      return [
        ...baseColumns,
        'Cliente',
        'Agente',
        'Monto',
        'Fecha'
      ];
    } else if (userRole === 'AGENTE') {
      return [
        ...baseColumns,
        'Cliente',
        'Monto',
        'Fecha'
      ];
    }

    return [...baseColumns, 'Monto', 'Fecha'];
  }

  /**
   * Obtener filas para PDF según el rol
   */
  private getPDFRows(bookings: ExportBooking[], userRole: string): any[][] {
    return bookings.map(booking => {
      const baseRow = [
        booking.bookingReference,
        this.getTypeLabel(booking.type),
        this.getStatusLabel(booking.status),
        booking.holderName || '-',
        booking.email || '-',
      ];

      const amount = `${booking.currency} ${this.formatNumber(booking.totalAmount)}`;
      const date = this.formatDate(booking.createdDatetime);

      if (userRole === 'ADMINISTRADOR') {
        return [
          ...baseRow,
          booking.clientName || 'Invitado',
          booking.agentName || 'Sin agente',
          amount,
          date
        ];
      } else if (userRole === 'AGENTE') {
        return [
          ...baseRow,
          booking.clientName || 'Invitado',
          amount,
          date
        ];
      }

      return [...baseRow, amount, date];
    });
  }

  /**
   * Obtener datos para Excel según el rol
   */
  private getExcelData(bookings: ExportBooking[], userRole: string): any[] {
    return bookings.map(booking => {
      const baseData = {
        'Referencia': booking.bookingReference,
        'Tipo': this.getTypeLabel(booking.type),
        'Estado': this.getStatusLabel(booking.status),
        'Titular': booking.holderName || '-',
        'Email': booking.email || '-',
      };

      const additionalData: any = {};
      
      if (userRole === 'ADMINISTRADOR') {
        additionalData['Cliente'] = booking.clientName || 'Invitado';
        additionalData['Agente'] = booking.agentName || 'Sin agente';
      } else if (userRole === 'AGENTE') {
        additionalData['Cliente'] = booking.clientName || 'Invitado';
      }

      additionalData['Moneda'] = booking.currency;
      additionalData['Monto'] = booking.totalAmount;
      additionalData['Fecha'] = this.formatDate(booking.createdDatetime);

      return { ...baseData, ...additionalData };
    });
  }

  /**
   * Obtener anchos de columna para Excel
   */
  private getExcelColumnWidths(userRole: string): any[] {
    const baseWidths = [
      { wch: 18 }, // Referencia
      { wch: 10 }, // Tipo
      { wch: 12 }, // Estado
      { wch: 25 }, // Titular
      { wch: 30 }, // Email
    ];

    if (userRole === 'ADMINISTRADOR') {
      return [
        ...baseWidths,
        { wch: 20 }, // Cliente
        { wch: 20 }, // Agente
        { wch: 8 },  // Moneda
        { wch: 15 }, // Monto
        { wch: 18 }, // Fecha
      ];
    } else if (userRole === 'AGENTE') {
      return [
        ...baseWidths,
        { wch: 20 }, // Cliente
        { wch: 8 },  // Moneda
        { wch: 15 }, // Monto
        { wch: 18 }, // Fecha
      ];
    }

    return [
      ...baseWidths,
      { wch: 8 },  // Moneda
      { wch: 15 }, // Monto
      { wch: 18 }, // Fecha
    ];
  }

  /**
   * Helpers para formateo
   */
  private getTypeLabel(type: string): string {
    const types: any = {
      'FLIGHT': 'Vuelo',
      'HOTEL': 'Hotel',
      'PACKAGE': 'Paquete'
    };
    return types[type] || type;
  }

  private getStatusLabel(status: string): string {
    const statuses: any = {
      'CONFIRMED': 'Confirmada',
      'PENDING': 'Pendiente',
      'CANCELLED': 'Cancelada',
      'COMPLETED': 'Completada'
    };
    return statuses[status] || status;
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}