import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, IParagraphOptions, ImageRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Packer } from 'docx';
import { Project, PaymentRequest, ProgressUpdate } from '@/lib/types';

interface DocxExportOptions {
  title: string;
  description?: string;
  data: Record<string, any>[];
  columns: {
    key: string;
    header: string;
    width?: number;
  }[];
  fileName?: string;
  watermark?: {
    image: string;
    opacity: number;
  };
}

export const exportToDocx = async ({
  title,
  description,
  data,
  columns,
  fileName = 'export.docx',
  watermark
}: DocxExportOptions): Promise<void> => {
  try {
    // Calculate total expense if the data contains cost information
    const totalExpense = data.reduce((sum, row) => {
      const cost = row.cost || row.totalCost || 0;
      return sum + (typeof cost === 'string' ? parseFloat(cost.replace(/[^0-9.-]+/g, '')) : cost);
    }, 0);

    // Create a new document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
            }),
            
            // Date
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString()}`,
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 200,
              },
            }),
            
            // Description if provided
            ...(description ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: description,
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: {
                  after: 200,
                },
              })
            ] : []),
            
            // Create table
            createTable(columns, data),
            
            // Total Expense
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total Expense: ₹${totalExpense.toFixed(2)}`,
                  bold: true,
                  size: 24,
                  color: "000000", // Black text
                  highlight: "lightGray", // Light gray background
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: {
                before: 200,
                after: 200,
              },
              indent: {
                right: 400, // Move text slightly to the left (400 twips = ~0.7 inches)
              },
            }),
            
            // Page number
            new Paragraph({
              children: [
                new TextRun({
                  text: "Page ",
                  size: 20,
                }),
                new TextRun({
                  children: ["PAGE"],
                  size: 20,
                }),
                new TextRun({
                  text: " of ",
                  size: 20,
                }),
                new TextRun({
                  children: ["NUMPAGES"],
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    // Add watermark if provided
    if (watermark) {
      try {
        const response = await fetch(watermark.image);
        if (!response.ok) {
          throw new Error('Failed to fetch watermark image');
        }
        const imageBuffer = await response.arrayBuffer();
        
        const watermarkImage = new ImageRun({
          data: imageBuffer,
          transformation: {
            width: 300,
            height: 300,
          },
          floating: {
            horizontalPosition: {
              offset: 0,
            },
            verticalPosition: {
              offset: 0,
            },
            wrap: {
              type: 'front',
              side: 'largest',
            },
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            },
          },
          transparency: 0.9, // 1 - 0.1 opacity
        });

        // Add watermark to each section
        doc.sections.forEach(section => {
          section.addWatermark(watermarkImage);
        });
      } catch (error) {
        console.error('Error adding watermark:', error);
        // Continue without watermark if there's an error
      }
    }

    // Generate the document
    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, fileName);
  } catch (error) {
    console.error('Word export error:', error);
    throw error;
  }
};

// Helper function to create a table
function createTable(columns: { key: string; header: string; width?: number }[], data: Record<string, any>[]) {
  const table = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
    rows: [
      // Header row
      new TableRow({
        children: columns.map(column => 
          new TableCell({
            width: column.width ? { size: column.width, type: WidthType.DXA } : undefined,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: column.header,
                    bold: true,
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          })
        ),
      }),
      // Data rows
      ...data.map(row => 
        new TableRow({
          children: columns.map(column => 
            new TableCell({
              width: column.width ? { size: column.width, type: WidthType.DXA } : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row[column.key] || '',
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
          ),
        })
      ),
    ],
  });

  return table;
}

export const generateProjectReport = async (
  projectData: Project, 
  progressUpdates: ProgressUpdate[] = [], 
  paymentRequests: PaymentRequest[] = []
): Promise<Blob> => {
  // Create the document as before
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: `Project Report: ${projectData.name}`,
            heading: HeadingLevel.HEADING_1
          }),
          
          new Paragraph({
            text: `Generated on: ${new Date().toLocaleDateString()}`,
            spacing: { after: 400 }
          }),
          
          // Project details
          new Paragraph({
            text: "Project Details",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          // Project details table
          createDetailTable([
            ["Project ID", projectData.id || "N/A"],
            ["Project Name", projectData.name || "N/A"],
            ["Start Date", projectData.startDate || "N/A"],
            ["End Date", projectData.endDate || "N/A"],
            ["Status", projectData.status || "N/A"],
            ["Completion", `${projectData.completionPercentage || Math.round(((projectData.completedWork || 0) / (projectData.totalWork || 1)) * 100)}%`],
          ]),
          
          // Progress updates
          new Paragraph({
            text: "Progress Updates",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          // Add progress updates if available
          ...(progressUpdates.length > 0 ? 
            progressUpdates.map(update => 
              new Paragraph({
                text: `Update ${new Date(update.date).toLocaleDateString()}: ${update.completedWork} meters completed`,
                spacing: { after: 100 }
              })
            ) : [
              new Paragraph({ text: "No progress updates available" })
            ]),
            
          // Payment information
          new Paragraph({
            text: "Payment Information",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          // Add payment details if available
          ...(paymentRequests.length > 0 ?
            paymentRequests.map(payment => 
              new Paragraph({
                text: `Payment ${new Date(payment.date).toLocaleDateString()}: ₹${payment.totalAmount} - Status: ${payment.status}`,
                spacing: { after: 100 }
              })
            ) : [
              new Paragraph({ text: "No payment information available" })
            ])
        ]
      }
    ]
  });
  
  // Convert Document to Blob directly and return the Blob
  return await Packer.toBlob(doc);
};

// Helper function to create a simple detail table
function createDetailTable(data: string[][]) {
  const rows = data.map(row => 
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ 
            text: row[0], 
            style: "strong"  // Use style instead of bold
          })],
          width: { size: 30, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ text: row[1] })],
          width: { size: 70, type: WidthType.PERCENTAGE }
        })
      ]
    })
  );
  
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    }
  });
}

// Function to generate Word document and then convert to PDF
export const generateWordAndConvertToPdf = async (options: DocxExportOptions): Promise<Blob> => {
  // Create a new document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: options.title,
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200,
            },
          }),
          
          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleDateString()}`,
                size: 20,
              }),
            ],
            spacing: {
              after: 200,
            },
          }),
          
          // Description if provided
          ...(options.description ? [
            new Paragraph({
              text: options.description,
              spacing: {
                after: 200,
              },
            })
          ] : []),
          
          // Create table
          createTable(options.columns, options.data),
        ],
      },
    ],
  });

  // Generate blob from the document
  const buffer = await Packer.toBlob(doc);
  
  // Return the blob for further processing (e.g., conversion to PDF)
  return buffer;
};

// Export comprehensive project data to Word
// Removed exportComprehensiveDataToWord function - no longer needed
