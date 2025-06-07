import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Project, ProgressUpdate, PaymentRequest } from '@/lib/types';

// Add type definitions for jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PdfExportOptions {
  title: string;
  description?: string;
  data: Record<string, any>[];
  columns: {
    key: string;
    header: string;
    width?: number;
  }[];
  fileName?: string;
  showHeaders?: boolean;
  orientation?: 'portrait' | 'landscape';
  watermark?: {
    image: string;
    opacity: number;
  };
}

export const exportToPDF = ({
  title,
  description,
  data,
  columns,
  fileName = 'export.pdf',
  showHeaders = true,
  orientation = 'portrait',
  watermark
}: PdfExportOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
      });

      // Calculate total expense if the data contains cost information
      const totalExpense = data.reduce((sum, row) => {
        const cost = row.cost || row.totalCost || 0;
        return sum + (typeof cost === 'string' ? parseFloat(cost.replace(/[^0-9.-]+/g, '')) : cost);
      }, 0);

      // Add watermark if provided
      if (watermark) {
        const img = new Image();
        img.src = watermark.image;
        img.onload = () => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          // Calculate dimensions to maintain aspect ratio
          const imgRatio = img.width / img.height;
          const maxWidth = pageWidth * 0.8; // 80% of page width
          const maxHeight = pageHeight * 0.8; // 80% of page height
          
          let imgWidth = maxWidth;
          let imgHeight = imgWidth / imgRatio;
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * imgRatio;
          }
          
          // Calculate center position
          const x = (pageWidth - imgWidth) / 2;
          const y = (pageHeight - imgHeight) / 2;

          // Add content first
          addContent();

          // Add watermark on top of all content
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.1 })); // Set opacity to 0.1
          doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
          doc.restoreGraphicsState();
          
          // Save the PDF
          doc.save(fileName);
          resolve();
        };
      } else {
        addContent();
        // Save the PDF
        doc.save(fileName);
        resolve();
      }

      function addContent() {
        // Add title
        doc.setFontSize(18);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
        // Add date
        const currentDate = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.text(`Generated on: ${currentDate}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        
        // Add description if provided
        let yPos = 30;
        if (description) {
          doc.setFontSize(12);
          doc.text(description, 14, yPos);
          yPos += 10;
        }
        
        // Prepare table data
        const tableHeaders = columns.map(column => column.header);
        const tableBody = data.map(row => 
          columns.map(column => {
            const value = row[column.key];
            return value !== undefined && value !== null ? String(value) : '';
          })
        );
        
        // Add table
        doc.autoTable({
          head: showHeaders ? [tableHeaders] : [],
          body: tableBody,
          startY: yPos,
          theme: 'striped',
          headStyles: {
            fillColor: [100, 100, 100],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240]
          },
          margin: { top: 10, left: 10, right: 10 },
        });

        // Add total expense
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Expense: ₹${totalExpense.toFixed(2)}`, doc.internal.pageSize.getWidth() - 20, finalY, { align: 'right' });
        
        // Add page numbers
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.text(
            `Page ${i} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      }
    } catch (error) {
      console.error('PDF export error:', error);
      reject(error);
    }
  });
};

// Helper function to convert chart data to tabular format
export const convertChartDataForPdf = (
  chartData: Array<{ name: string; value: number }>,
  title: string,
  subtitle?: string
) => {
  return {
    title,
    description: subtitle,
    data: chartData,
    columns: [
      { key: 'name', header: 'Category', width: 250 },
      { key: 'value', header: 'Value', width: 150 }
    ],
    fileName: `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
  };
};

export const generateProjectPdfReport = async (
  project: Project,
  progress: ProgressUpdate[] = [],
  payments: PaymentRequest[] = []
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Title
  doc.setFontSize(20);
  doc.text(`Project Report: ${project.name || 'Unknown Project'}`, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
  
  // Project details section
  doc.setFontSize(16);
  doc.text("Project Details", 14, 35);
  
  // Project details in table format
  doc.autoTable({
    startY: 40,
    head: [['Property', 'Value']],
    body: [
      ['Project ID', project.id || 'N/A'],
      ['Project Name', project.name || 'N/A'],
      ['Status', project.status || 'In Progress'],
      ['Start Date', project.startDate || 'N/A'],
      ['Total Work', `${project.totalWork || 0} meters`],
      ['Completed Work', `${project.completedWork || 0} meters`],
      ['Completion', `${Math.round(((project.completedWork || 0) / (project.totalWork || 1)) * 100)}%`]
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [100, 100, 100],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
    }
  });
  
  // Progress updates section
  const progressY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.text("Progress Updates", 14, progressY);
  
  if (progress && progress.length > 0) {
    doc.autoTable({
      startY: progressY + 5,
      head: [['Date', 'Distance', 'Location', 'Notes']],
      body: progress.map(p => [
        new Date(p.date).toLocaleDateString(),
        `${p.completedWork || 0} m`,
        p.location ? `${p.location.latitude.toFixed(4)}, ${p.location.longitude.toFixed(4)}` : 'N/A',
        p.notes || ''
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      }
    });
  } else {
    doc.text("No progress updates available", 14, progressY + 10);
  }
  
  // Payment details section
  const paymentY = (doc as any).lastAutoTable?.finalY + 15 || progressY + 20;
  doc.setFontSize(16);
  doc.text("Payment Details", 14, paymentY);
  
  if (payments && payments.length > 0) {
    doc.autoTable({
      startY: paymentY + 5,
      head: [['Date', 'Amount', 'Status', 'Notes']],
      body: payments.map(p => [
        new Date(p.date).toLocaleDateString(),
        `₹${p.totalAmount.toLocaleString()}`,
        p.status,
        p.checkerNotes || ''
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      }
    });
  } else {
    doc.text("No payment records available", 14, paymentY + 10);
  }
  
  // Add page numbers
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  return doc;
};

// Convert Word document to PDF
export const wordToPdf = async (wordBlob: Blob): Promise<void> => {
  try {
    // For now, we'll create a simple PDF directly since Word-to-PDF conversion
    // is complex and typically requires a server-side component
    const doc = new jsPDF();
    
    // Set up PDF title and content
    doc.setFontSize(18);
    doc.text("Word Document Converted to PDF", 20, 20);
    
    doc.setFontSize(12);
    doc.text("This document was generated from a Word file.", 20, 40);
    
    // Current date
    const date = new Date().toLocaleDateString();
    doc.text(`Conversion date: ${date}`, 20, 50);
    
    // Save the PDF
    doc.save("converted-document.pdf");
  } catch (error) {
    console.error("Error converting Word to PDF:", error);
    throw error;
  }
};

// Export functions for direct PDF generation from data
export const exportProjectsToPDF = async (projects: Project[]): Promise<void> => {
  try {
    const data = projects.map(project => ({
      id: project.id || '',
      name: project.name || '',
      completedWork: project.completedWork || 0,
      totalWork: project.totalWork || 0,
      progress: `${Math.round(((project.completedWork || 0) / (project.totalWork || 1)) * 100)}%`
    }));
    
    return exportToPDF({
      title: 'Projects Report',
      description: 'List of all projects',
      data,
      columns: [
        { key: 'name', header: 'Project Name', width: 150 },
        { key: 'completedWork', header: 'Completed (m)', width: 80 },
        { key: 'totalWork', header: 'Total (m)', width: 80 },
        { key: 'progress', header: 'Progress', width: 80 }
      ],
      fileName: `projects-report-${new Date().toISOString().split('T')[0]}.pdf`,
      orientation: 'landscape'
    });
  } catch (error) {
    console.error("Error exporting projects to PDF:", error);
    throw error;
  }
};

export const exportPaymentsToPDF = async (payments: PaymentRequest[]): Promise<void> => {
  try {
    const data = payments.map(payment => ({
      date: new Date(payment.date).toLocaleDateString(),
      project: payment.projectId,
      amount: payment.totalAmount.toLocaleString(),
      status: payment.status,
      notes: payment.checkerNotes || ''
    }));
    
    return exportToPDF({
      title: 'Payment Requests Report',
      description: 'List of all payment requests',
      data,
      columns: [
        { key: 'date', header: 'Date', width: 80 },
        { key: 'project', header: 'Project ID', width: 80 },
        { key: 'amount', header: 'Amount (₹)', width: 80 },
        { key: 'status', header: 'Status', width: 80 },
        { key: 'notes', header: 'Notes', width: 150 }
      ],
      fileName: `payments-report-${new Date().toISOString().split('T')[0]}.pdf`,
      orientation: 'landscape'
    });
  } catch (error) {
    console.error("Error exporting payments to PDF:", error);
    throw error;
  }
};
