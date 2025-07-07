const fs = require('fs-extra');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const imageType = require('image-type');

// Helper: Get all section folders in order
async function getSectionFolders(tenderDir) {
  const entries = await fs.readdir(tenderDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .sort((a, b) => Number(a.name) - Number(b.name))
    .map(e => e.name);
}

// Helper: Get section PDF and name
async function getSectionPdfAndName(sectionDir) {
  const files = await fs.readdir(sectionDir);
  const pdfFile = files.find(f => f.endsWith('.pdf'));
  if (!pdfFile) throw new Error(`No PDF found in ${sectionDir}`);
  return {
    pdfPath: path.join(sectionDir, pdfFile),
    sectionName: path.basename(pdfFile, '.pdf'),
  };
}

// Merge PDFs and add bookmarks
async function mergeTenderPdfs(tenderDir, outputPdfPath) {
  const sectionFolders = await getSectionFolders(tenderDir);
  const mergedPdf = await PDFDocument.create();
  const sectionStartPages = [];
  let pageIndex = 0;

  for (const folder of sectionFolders) {
    const { pdfPath, sectionName } = await getSectionPdfAndName(path.join(tenderDir, folder));
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
    sectionStartPages.push({ sectionName, pageIndex });
    pageIndex += copiedPages.length;
  }

  // Add bookmarks (named destinations)
  // pdf-lib does not support true bookmarks, but we can add named destinations for compatible viewers
  // For true bookmarks, you may need to use a CLI tool like qpdf or pdftk after this step

  // Save merged PDF
  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPdfPath, mergedPdfBytes);

  // Print section info for manual bookmark addition if needed
  console.log('Section start pages:', sectionStartPages);
  console.log(`Merged PDF saved to ${outputPdfPath}`);
}

// Add an image as a new page to a section
async function addImageToSection(tenderDir, sectionNumber, imagePath) {
  const sectionFolder = path.join(tenderDir, String(sectionNumber));
  const { pdfPath } = await getSectionPdfAndName(sectionFolder);

  // Load the section PDF
  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Load the image
  const imgBytes = await fs.readFile(imagePath);
  const imgType = imageType(imgBytes);
  let img;
  if (imgType && imgType.mime === 'image/jpeg') {
    img = await pdfDoc.embedJpg(imgBytes);
  } else if (imgType && imgType.mime === 'image/png') {
    img = await pdfDoc.embedPng(imgBytes);
  } else {
    throw new Error('Unsupported image type');
  }

  // Add a new page with the image
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const imgDims = img.scaleToFit(width - 40, height - 40);
  page.drawImage(img, {
    x: (width - imgDims.width) / 2,
    y: (height - imgDims.height) / 2,
    width: imgDims.width,
    height: imgDims.height,
  });

  // Save the updated section PDF
  await fs.writeFile(pdfPath, await pdfDoc.save());
  console.log(`Image added to section ${sectionNumber} (${pdfPath})`);
}

// Example usage:
(async () => {
  const tenderDir = path.join(__dirname, 'tender');
  const outputPdfPath = path.join(__dirname, 'merged-tender.pdf');

  // 1. Merge all section PDFs
  await mergeTenderPdfs(tenderDir, outputPdfPath);

  // 2. To add an image to a section (e.g., section 2)
  // await addImageToSection(tenderDir, 2, path.join(__dirname, 'myimage.jpg'));
})(); 