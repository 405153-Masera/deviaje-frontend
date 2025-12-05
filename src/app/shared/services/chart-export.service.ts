import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class ChartExportService {

  /**
   * Exporta un gráfico de Google Charts a PDF
   */
  exportChartToPDF(chartId: string, title: string, fileName: string = 'grafico'): void {
    const chartElement = document.getElementById(chartId);
    
    if (!chartElement) {
      console.error(`No se encontró el elemento con id: ${chartId}`);
      return;
    }

    const svgElement = chartElement.querySelector('svg');
    
    if (!svgElement) {
      console.error('No se encontró el SVG del gráfico');
      return;
    }

    // Serializar el SVG
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Establecer dimensiones del canvas
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Dibujar imagen en canvas con fondo blanco
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      
      const imgData = canvas.toDataURL('image/png');
      
      // Crear PDF
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // Margen de 10mm a cada lado
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Agregar título
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, pdfWidth / 2, 15, { align: 'center' });
      
      // Agregar fecha
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const today = new Date().toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Generado: ${today}`, pdfWidth / 2, 22, { align: 'center' });
      
      // Agregar imagen del gráfico
      const yPosition = imgHeight + 30 > pdfHeight ? 30 : (pdfHeight - imgHeight) / 2;
      pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
      
      // Guardar
      const timestamp = new Date().getTime();
      pdf.save(`${fileName}_${timestamp}.pdf`);
    };
    
    img.onerror = () => {
      console.error('Error al cargar la imagen del gráfico');
    };
    
    // Convertir SVG a base64
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  /**
   * Exporta un gráfico de Google Charts como imagen PNG
   */
  exportChartToPNG(chartId: string, fileName: string = 'grafico'): void {
    const chartElement = document.getElementById(chartId);
    
    if (!chartElement) {
      console.error(`No se encontró el elemento con id: ${chartId}`);
      return;
    }

    const svgElement = chartElement.querySelector('svg');
    
    if (!svgElement) {
      console.error('No se encontró el SVG del gráfico');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Fondo blanco
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const timestamp = new Date().getTime();
          link.href = url;
          link.download = `${fileName}_${timestamp}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };
    
    img.onerror = () => {
      console.error('Error al cargar la imagen del gráfico');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }

  /**
   * Exporta múltiples gráficos en un solo PDF
   */
  exportMultipleChartsToPDF(
    charts: { chartId: string; title: string }[],
    mainTitle: string,
    fileName: string = 'graficos'
  ): void {
    if (charts.length === 0) {
      console.error('No hay gráficos para exportar');
      return;
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    let currentPage = 0;

    // Título principal
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(mainTitle, pdfWidth / 2, 15, { align: 'center' });

    // Fecha
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    pdf.text(`Generado: ${today}`, pdfWidth / 2, 22, { align: 'center' });

    let processedCharts = 0;

    charts.forEach((chart, index) => {
      const chartElement = document.getElementById(chart.chartId);
      if (!chartElement) return;

      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }

        const imgData = canvas.toDataURL('image/png');
        
        // Nueva página para cada gráfico excepto el primero
        if (index > 0) {
          pdf.addPage();
        }

        // Título del gráfico
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(chart.title, pdfWidth / 2, 30, { align: 'center' });

        // Imagen del gráfico
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const yPosition = 40;

        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);

        processedCharts++;

        // Guardar cuando se procesen todos los gráficos
        if (processedCharts === charts.length) {
          const timestamp = new Date().getTime();
          pdf.save(`${fileName}_${timestamp}.pdf`);
        }
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  }
}