const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const imageType = require('image-type');
const { pool } = require('../db/config');
const sharp = require('sharp');
import { Request, Response } from 'express';

const router = express.Router();
const upload = multer({ dest: 'uploads/tender/' });
const TEMP_TENDER_DIR = path.join(__dirname, '../../uploads/tender-temp');

// Helper: Get all section folders in order
async function getSectionFolders(tenderDir: string) {
  const entries = await fs.readdir(tenderDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .sort((a, b) => Number(a.name) - Number(b.name))
    .map(e => e.name);
}

// Helper: Get section PDF and name
async function getSectionPdfAndName(sectionDir: string) {
  const files = await fs.readdir(sectionDir);
  const pdfFile = files.find(f => f.endsWith('.pdf'));
  if (!pdfFile) throw new Error(`No PDF found in ${sectionDir}`);
  return {
    pdfPath: path.join(sectionDir, pdfFile),
    sectionName: path.basename(pdfFile, '.pdf'),
    pdfFile
  };
}

// Helper: Clear and recreate temp tender directory
async function resetTempTenderDir() {
  if (await fs.pathExists(TEMP_TENDER_DIR)) {
    await fs.remove(TEMP_TENDER_DIR);
  }
  await fs.mkdirp(TEMP_TENDER_DIR);
}

// Helper: Copy all original section PDFs to temp dir
async function copyOriginalsToTemp(tenderDir: string) {
  const sectionFolders = await getSectionFolders(tenderDir);
  for (const folder of sectionFolders) {
    const sectionSrcDir = path.join(tenderDir, folder);
    const { pdfPath, sectionName, pdfFile } = await getSectionPdfAndName(sectionSrcDir);
    const tempSectionDir = path.join(TEMP_TENDER_DIR, folder);
    await fs.mkdirp(tempSectionDir);
    await fs.copyFile(pdfPath, path.join(tempSectionDir, pdfFile));
  }
}

// GET /api/tender/sections - List section names
router.get('/sections', async (req: Request, res: Response) => {
  try {
    console.log('Sections endpoint called');
    
    // Check if required packages are available
    try {
      require('fs-extra');
      console.log('fs-extra package is available');
    } catch (packageError: unknown) {
      const err = packageError as Error;
      console.error('Missing package:', err.message);
      return res.status(500).json({ 
        error: 'Server configuration error - missing packages',
        details: err.message
      });
    }
    
    const tenderDir = path.join(__dirname, '../../tender');
    console.log('Tender directory path:', tenderDir);
    
    // Check if tender directory exists
    if (!await fs.pathExists(tenderDir)) {
      console.error('Tender directory does not exist:', tenderDir);
      return res.status(500).json({ 
        error: 'Tender directory not found',
        details: `Directory ${tenderDir} does not exist`
      });
    }
    
    const sectionFolders = await getSectionFolders(tenderDir);
    console.log('Found section folders:', sectionFolders);
    
    const sections = [];
    for (const folder of sectionFolders) {
      const sectionDir = path.join(tenderDir, folder);
      console.log('Processing section directory:', sectionDir);
      const { sectionName } = await getSectionPdfAndName(sectionDir);
      sections.push({ folder, sectionName });
    }
    
    console.log('Returning sections:', sections);
    res.json({ sections });
  } catch (err) {
    console.error('Error in GET /api/tender/sections:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to list sections', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Merge PDFs and add bookmarks
async function mergeTenderPdfs(tenderDir: string, outputPdfPath: string) {
  const sectionFolders = await getSectionFolders(TEMP_TENDER_DIR);
  const mergedPdf = await PDFDocument.create();
  const width = 595.28;
  const height = 841.89;
  for (const folder of sectionFolders) {
    const { pdfPath } = await getSectionPdfAndName(path.join(TEMP_TENDER_DIR, folder));
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    for (let i = 0; i < pdf.getPageCount(); i++) {
      const [embeddedPage] = await mergedPdf.embedPages([pdf.getPage(i)]);
      const newPage = mergedPdf.addPage([width, height]);
      newPage.drawPage(embeddedPage, {
        x: 0,
        y: 0,
        xScale: width / embeddedPage.width,
        yScale: height / embeddedPage.height,
      });
    }
  }
  const mergedPdfBytes = await mergedPdf.save();
  await fs.writeFile(outputPdfPath, mergedPdfBytes);
}

// Update compressImageSmart to always output JPEG (or PNG if alpha is needed)
async function compressImageSmart(imgBytes: Buffer, quality: number) {
  const targetSize = 15 * 1024; // 15KB for good quality
  const minWidth = 300;
  const minQuality = 40;
  let imgMeta = await sharp(imgBytes).metadata();
  let imgHasAlpha = imgMeta.hasAlpha;
  let compressedImgBytes = imgBytes;
  let bestImgBytes = imgBytes;
  let bestSize = imgBytes.length;
  let width = imgMeta.width && imgMeta.width > 800 ? 800 : imgMeta.width || 800;
  if (!imgHasAlpha) {
    // Always output JPEG for non-alpha images
    while (quality >= minQuality && width >= minWidth) {
      let candidate = await sharp(imgBytes)
        .resize({ width })
        .jpeg({ quality })
        .toBuffer();
      if (candidate.length <= targetSize) {
        compressedImgBytes = candidate;
        break;
      }
      if (candidate.length < bestSize) {
        bestImgBytes = candidate;
        bestSize = candidate.length;
      }
      quality -= 10;
      width -= 100;
    }
    if (compressedImgBytes.length > targetSize) {
      compressedImgBytes = bestImgBytes;
    }
  } else {
    // Output PNG for images with alpha
    while (quality >= minQuality && width >= minWidth) {
      let candidate = await sharp(imgBytes)
        .resize({ width })
        .png({ quality, compressionLevel: 9 })
        .toBuffer();
      if (candidate.length <= targetSize) {
        compressedImgBytes = candidate;
        break;
      }
      if (candidate.length < bestSize) {
        bestImgBytes = candidate;
        bestSize = candidate.length;
      }
      quality -= 10;
      width -= 100;
    }
    if (compressedImgBytes.length > targetSize) {
      compressedImgBytes = bestImgBytes;
    }
  }
  return compressedImgBytes;
}

// Add an image as a new page to a section and save to DB
async function addImageToSectionAndDb(tenderDir: string, section: string, imagePath: string, filename: string) {
  const sectionFolder = path.join(tenderDir, section);
  const { pdfPath, sectionName } = await getSectionPdfAndName(sectionFolder);
  const imgBytes = await fs.readFile(imagePath);
  const imgType = imageType(imgBytes);
  
  // Validate image type
  if (!imgType || (imgType.mime !== 'image/jpeg' && imgType.mime !== 'image/png')) {
    throw new Error('Unsupported image type. Only JPEG and PNG are supported.');
  }
  
  // Get next serial number for this section
  const [serialRows] = await pool.query(
    'SELECT filename FROM tender_images WHERE section = ? ORDER BY filename',
    [section]
  );
  
  // Extract serial numbers from existing filenames
  const existingSerials = serialRows.map(row => {
    const filenameParts = row.filename.split('_');
    return filenameParts.length > 1 ? 
      parseInt(filenameParts[filenameParts.length - 1]) || 1 : 1;
  });
  
  const nextSerial = existingSerials.length > 0 ? Math.max(...existingSerials) + 1 : 1;
  
  // Generate filename in format: sectionname_serialnumber
  const newFilename = `${sectionName}_${nextSerial}`;
  
  let compressedImgBytes = imgBytes;
  let bestImgBytes = imgBytes;
  let bestSize = imgBytes.length;
  const targetSize = 15 * 1024; // 15KB for good quality
  const minWidth = 300;
  const minQuality = 50;
  let imgMeta = await sharp(imgBytes).metadata();
  let imgHasAlpha = imgMeta.hasAlpha;
  let canUseWebp = true;
  try { await sharp(imgBytes).webp; } catch { canUseWebp = false; }
  if (!imgHasAlpha && canUseWebp) {
    let quality = 75;
    let width = imgMeta.width && imgMeta.width > 800 ? 800 : imgMeta.width || 800;
    while (quality >= minQuality && width >= minWidth) {
      let candidate = await sharp(imgBytes)
        .resize({ width })
        .webp({ quality })
        .toBuffer();
      if (candidate.length <= targetSize) {
        compressedImgBytes = candidate;
        break;
      }
      if (candidate.length < bestSize) {
        bestImgBytes = candidate;
        bestSize = candidate.length;
      }
      quality -= 10;
      width -= 100;
    }
    if (compressedImgBytes.length > targetSize) {
      compressedImgBytes = bestImgBytes;
    }
  } else {
    // PNG with alpha or fallback: compress as much as possible
    let quality = 75;
    let width = imgMeta.width && imgMeta.width > 800 ? 800 : imgMeta.width || 800;
    while (quality >= minQuality && width >= minWidth) {
      let candidate = await sharp(imgBytes)
        .resize({ width })
        .png({ quality, compressionLevel: 9 })
        .toBuffer();
      if (candidate.length <= targetSize) {
        compressedImgBytes = candidate;
        break;
      }
      if (candidate.length < bestSize) {
        bestImgBytes = candidate;
        bestSize = candidate.length;
      }
      quality -= 10;
      width -= 100;
    }
    if (compressedImgBytes.length > targetSize) {
      compressedImgBytes = bestImgBytes;
    }
  }
  
  // Save image as BLOB in DB
  await pool.query(
    'INSERT INTO tender_images (section, image, filename) VALUES (?, ?, ?)',
    [section, compressedImgBytes, newFilename]
  );
  
  // Regenerate the section PDF with all current images
  await regenerateSectionPdf(tenderDir, section);
  
  return pdfPath;
}

// POST /api/tender/add-image
router.post('/add-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { section } = req.body;
    if (!section || !req.file) return res.status(400).json({ error: 'Section and image required' });
    const tenderDir = path.join(__dirname, '../../tender');
    await resetTempTenderDir();
    await copyOriginalsToTemp(tenderDir);
    const pdfPath = await addImageToSectionAndDb(tenderDir, section, req.file.path, req.file.originalname);
    await fs.remove(req.file.path);
    const outputPdfPath = path.join(__dirname, '../../uploads/merged-tender.pdf');
    await mergeTenderPdfs(tenderDir, outputPdfPath);
    const relMergedPath = path.relative(path.join(__dirname, '../../'), outputPdfPath).replace(/\\/g, '/');
    res.json({ success: true, mergedPdf: `/${relMergedPath}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add image and merge', details: err.message });
  }
});

// Helper: Clear any cached PDFs
async function clearCachedPdfs(tenderDir: string) {
  try {
    const sectionFolders = await getSectionFolders(tenderDir);
    for (const folder of sectionFolders) {
      const sectionFolder = path.join(tenderDir, folder);
      const { pdfPath } = await getSectionPdfAndName(sectionFolder);
      // Remove the generated PDF to force regeneration
      if (await fs.pathExists(pdfPath)) {
        await fs.remove(pdfPath);
        console.log(`Cleared cached PDF for section ${folder}`);
      }
    }
    
    // Also clear the merged PDF
    const mergedPdfPath = path.join(__dirname, '../../uploads/merged-tender.pdf');
    if (await fs.pathExists(mergedPdfPath)) {
      await fs.remove(mergedPdfPath);
      console.log('Cleared cached merged PDF');
    }
  } catch (err) {
    console.error('Error clearing cached PDFs:', err);
  }
}

// GET /api/tender/download - Download merged tender PDF with latest images
router.get('/download', async (req: Request, res: Response) => {
  try {
    const tenderDir = path.join(__dirname, '../../tender');
    const outputPdfPath = path.join(__dirname, '../../uploads/merged-tender.pdf');
    const qualityLevels = [75, 65, 55, 45, 40];
    let bestPdfSize = Infinity;
    let bestQuality = 75;
    let bestPdfBuffer = null;
    let found = false;
    for (const quality of qualityLevels) {
      // Regenerate all section PDFs with this quality
      await resetTempTenderDir();
      await copyOriginalsToTemp(tenderDir);
      const sectionFolders = await getSectionFolders(tenderDir);
      for (const folder of sectionFolders) {
        await regenerateSectionPdf(tenderDir, folder, quality);
      }
      await mergeTenderPdfs(tenderDir, outputPdfPath);
      if (!await fs.pathExists(outputPdfPath)) continue;
      const pdfBuffer = await fs.readFile(outputPdfPath);
      if (pdfBuffer.length < bestPdfSize) {
        bestPdfSize = pdfBuffer.length;
        bestQuality = quality;
        bestPdfBuffer = pdfBuffer;
      }
      if (pdfBuffer.length <= 4 * 1024 * 1024) { // 4MB
        found = true;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="merged-tender.pdf"');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.end(pdfBuffer);
        return;
      }
    }
    // If none succeeded, serve the smallest and warn
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="merged-tender.pdf"');
    res.setHeader('X-Warning', 'Could not compress PDF under 4MB, served smallest possible.');
    res.end(bestPdfBuffer);
  } catch (err) {
    console.error('Error in GET /api/tender/download:', err);
    res.status(500).json({ error: 'Failed to download tender PDF', details: err.message });
  }
});

// GET /api/tender/images - Get all tender images
router.get('/images', async (req: Request, res: Response) => {
  try {
    // First check if the table exists
    const [tableCheck] = await pool.query(
      "SHOW TABLES LIKE 'tender_images'"
    );
    
    if (tableCheck.length === 0) {
      return res.status(500).json({ error: 'Tender images table does not exist' });
    }
    
    // Get images and extract serial number from filename
    const [rows] = await pool.query(
      'SELECT id, section, filename, uploaded_at FROM tender_images ORDER BY section, filename'
    );
    
    // Process the data to extract serial numbers from filenames
    const processedImages = rows.map(row => {
      // Extract serial number from filename (format: sectionname_serialnumber)
      const filenameParts = row.filename.split('_');
      const serialNumber = filenameParts.length > 1 ? 
        parseInt(filenameParts[filenameParts.length - 1]) || 1 : 1;
      
      return {
        id: row.id,
        section: row.section,
        filename: row.filename,
        serial_number: serialNumber,
        uploaded_at: row.uploaded_at
      };
    });
    
    // Sort by section and serial number
    processedImages.sort((a, b) => {
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section);
      }
      return a.serial_number - b.serial_number;
    });
    
    res.json({ images: processedImages });
  } catch (err) {
    console.error('Error in GET /api/tender/images:', err);
    res.status(500).json({ 
      error: 'Failed to fetch tender images', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// PUT /api/tender/images/:id - Update tender image
router.put('/images/:id', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { section, serial_number } = req.body;
    
    // Check if the table exists
    const [tableCheck] = await pool.query("SHOW TABLES LIKE 'tender_images'");
    if (tableCheck.length === 0) {
      return res.status(500).json({ error: 'Tender images table does not exist' });
    }
    
    // Get sections data for filename generation
    const tenderDir = path.join(__dirname, '../../tender');
    await resetTempTenderDir();
    await copyOriginalsToTemp(tenderDir);
    const sectionFolders = await getSectionFolders(tenderDir);
    const sections = [];
    for (const folder of sectionFolders) {
      const sectionDir = path.join(tenderDir, folder);
      const { sectionName } = await getSectionPdfAndName(sectionDir);
      sections.push({ folder, sectionName });
    }
    
    // Get current image data
    const [currentRows] = await pool.query(
      'SELECT section, filename FROM tender_images WHERE id = ?',
      [id]
    );
    
    if (currentRows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const currentImage = currentRows[0];
    const newSection = section || currentImage.section;
    
    // Extract current serial number from filename
    const currentFilenameParts = currentImage.filename.split('_');
    const currentSerialNumber = currentFilenameParts.length > 1 ? 
      parseInt(currentFilenameParts[currentFilenameParts.length - 1]) || 1 : 1;
    
    const newSerialNumber = serial_number ? parseInt(serial_number) : currentSerialNumber;
    
    // Generate new filename
    const sectionName = sections.find(s => s.folder === newSection)?.sectionName || newSection;
    const newFilename = `${sectionName}_${newSerialNumber}`;
    
    // If serial number is changing, handle reordering
    if (newSerialNumber !== currentSerialNumber) {
      // Get all images in the same section
      const [sectionImages] = await pool.query(
        'SELECT id, filename FROM tender_images WHERE section = ? ORDER BY filename',
        [newSection]
      );
      
      // Process existing images to get their serial numbers
      const existingImages = sectionImages.map(img => {
        const filenameParts = img.filename.split('_');
        const serial = filenameParts.length > 1 ? 
          parseInt(filenameParts[filenameParts.length - 1]) || 1 : 1;
        return { id: img.id, serial_number: serial };
      });
      
      // Update serial numbers to accommodate the change
      if (newSerialNumber < currentSerialNumber) {
        // Moving to a lower number - shift others up
        for (const img of existingImages) {
          if (img.serial_number >= newSerialNumber && img.serial_number < currentSerialNumber) {
            const sectionName = sections.find(s => s.folder === newSection)?.sectionName || newSection;
            const newFilename = `${sectionName}_${img.serial_number + 1}`;
            await pool.query(
              'UPDATE tender_images SET filename = ? WHERE id = ?',
              [newFilename, img.id]
            );
          }
        }
      } else {
        // Moving to a higher number - shift others down
        for (const img of existingImages) {
          if (img.serial_number > currentSerialNumber && img.serial_number <= newSerialNumber) {
            const sectionName = sections.find(s => s.folder === newSection)?.sectionName || newSection;
            const newFilename = `${sectionName}_${img.serial_number - 1}`;
            await pool.query(
              'UPDATE tender_images SET filename = ? WHERE id = ?',
              [newFilename, img.id]
            );
          }
        }
      }
    }
    
    // Update the image
    let updateQuery = 'UPDATE tender_images SET section = ?, filename = ?';
    let queryParams = [newSection, newFilename];
    
    // If new image file is provided, update it too
    if (req.file) {
      let imgBytes = await fs.readFile(req.file.path);
      const imgType = imageType(imgBytes);
      let compressedImgBytes = imgBytes;
      let bestImgBytes = imgBytes;
      let bestSize = imgBytes.length;
      const targetSize = 15 * 1024;
      const minWidth = 300;
      const minQuality = 50;
      let imgMeta = await sharp(imgBytes).metadata();
      let imgHasAlpha = imgMeta.hasAlpha;
      let canUseWebp = true;
      try { await sharp(imgBytes).webp; } catch { canUseWebp = false; }
      if (!imgHasAlpha && canUseWebp) {
        let quality = 75;
        let width = imgMeta.width && imgMeta.width > 800 ? 800 : imgMeta.width || 800;
        while (quality >= minQuality && width >= minWidth) {
          let candidate = await sharp(imgBytes)
            .resize({ width })
            .webp({ quality })
            .toBuffer();
          if (candidate.length <= targetSize) {
            compressedImgBytes = candidate;
            break;
          }
          if (candidate.length < bestSize) {
            bestImgBytes = candidate;
            bestSize = candidate.length;
          }
          quality -= 10;
          width -= 100;
        }
        if (compressedImgBytes.length > targetSize) {
          compressedImgBytes = bestImgBytes;
        }
      } else {
        // PNG with alpha or fallback: compress as much as possible
        let quality = 75;
        let width = imgMeta.width && imgMeta.width > 800 ? 800 : imgMeta.width || 800;
        while (quality >= minQuality && width >= minWidth) {
          let candidate = await sharp(imgBytes)
            .resize({ width })
            .png({ quality, compressionLevel: 9 })
            .toBuffer();
          if (candidate.length <= targetSize) {
            compressedImgBytes = candidate;
            break;
          }
          if (candidate.length < bestSize) {
            bestImgBytes = candidate;
            bestSize = candidate.length;
          }
          quality -= 10;
          width -= 100;
        }
        if (compressedImgBytes.length > targetSize) {
          compressedImgBytes = bestImgBytes;
        }
      }
      updateQuery += ', image = ?';
      queryParams.push(compressedImgBytes);
      await fs.remove(req.file.path);
    }
    
    updateQuery += ' WHERE id = ?';
    queryParams.push(id);
    
    await pool.query(updateQuery, queryParams);
    
    // Regenerate the section PDF with updated images
    await regenerateSectionPdf(tenderDir, newSection);
    
    // Regenerate merged PDF
    const outputPdfPath = path.join(__dirname, '../../uploads/merged-tender.pdf');
    await mergeTenderPdfs(tenderDir, outputPdfPath);
    
    res.json({ success: true, message: 'Image updated successfully' });
  } catch (err) {
    console.error('Error in PUT /api/tender/images/:id:', err);
    res.status(500).json({ 
      error: 'Failed to update image', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// DELETE /api/tender/images/:id - Delete tender image
router.delete('/images/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if the table exists
    const [tableCheck] = await pool.query("SHOW TABLES LIKE 'tender_images'");
    if (tableCheck.length === 0) {
      return res.status(500).json({ error: 'Tender images table does not exist' });
    }
    
    // Get sections data for filename generation
    const tenderDir = path.join(__dirname, '../../tender');
    await resetTempTenderDir();
    await copyOriginalsToTemp(tenderDir);
    const sectionFolders = await getSectionFolders(tenderDir);
    const sections = [];
    for (const folder of sectionFolders) {
      const sectionDir = path.join(tenderDir, folder);
      const { sectionName } = await getSectionPdfAndName(sectionDir);
      sections.push({ folder, sectionName });
    }
    
    // Get image data before deletion
    const [rows] = await pool.query(
      'SELECT section, filename FROM tender_images WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const image = rows[0];
    
    // Extract serial number from filename
    const filenameParts = image.filename.split('_');
    const serialNumber = filenameParts.length > 1 ? 
      parseInt(filenameParts[filenameParts.length - 1]) || 1 : 1;
    
    // Delete the image
    await pool.query('DELETE FROM tender_images WHERE id = ?', [id]);
    
    // Reorder remaining images in the same section
    const [remainingImages] = await pool.query(
      'SELECT id, filename FROM tender_images WHERE section = ? ORDER BY filename',
      [image.section]
    );
    
    // Update filenames for remaining images with higher serial numbers
    for (const img of remainingImages) {
      const imgFilenameParts = img.filename.split('_');
      const imgSerialNumber = imgFilenameParts.length > 1 ? 
        parseInt(imgFilenameParts[imgFilenameParts.length - 1]) || 1 : 1;
      
      if (imgSerialNumber > serialNumber) {
        const sectionName = sections.find(s => s.folder === image.section)?.sectionName || image.section;
        const newFilename = `${sectionName}_${imgSerialNumber - 1}`;
        await pool.query(
          'UPDATE tender_images SET filename = ? WHERE id = ?',
          [newFilename, img.id]
        );
      }
    }
    
    // Regenerate the section PDF with remaining images
    await regenerateSectionPdf(tenderDir, image.section);
    
    // Regenerate merged PDF
    const outputPdfPath = path.join(__dirname, '../../uploads/merged-tender.pdf');
    await mergeTenderPdfs(tenderDir, outputPdfPath);
    
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/tender/images/:id:', err);
    res.status(500).json({ 
      error: 'Failed to delete image', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// GET /api/tender/images/:id/blob - Serve image blob for preview
router.get('/images/:id/blob', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT image FROM tender_images WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Image not found' });
    const imgBytes = Buffer.from(rows[0].image);
    const imgType = imageType(imgBytes);
    if (!imgType) return res.status(400).json({ error: 'Invalid image data' });
    res.setHeader('Content-Type', imgType.mime);
    res.send(imgBytes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch image blob', details: err.message });
  }
});

// Update regenerateSectionPdf to accept a quality parameter and use it for image compression
async function regenerateSectionPdf(tenderDir: string, section: string, quality: number = 75) {
  try {
    const sectionFolder = path.join(TEMP_TENDER_DIR, section);
    const { pdfPath, sectionName } = await getSectionPdfAndName(sectionFolder);
    const originalPdfPath = path.join(tenderDir, section, `${sectionName}.pdf`);
    if (!await fs.pathExists(originalPdfPath)) {
      console.error(`Original PDF not found: ${originalPdfPath}`);
      return;
    }
    await fs.copyFile(originalPdfPath, pdfPath);
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const [images] = await pool.query(
      'SELECT image FROM tender_images WHERE section = ? ORDER BY filename',
      [section]
    );
    for (const imgRow of images) {
      const imgBytes = Buffer.from(imgRow.image);
      const compressedImgBytes = await compressImageSmart(imgBytes, quality);
      let img;
      if (await sharp(compressedImgBytes).metadata().then(meta => !meta.hasAlpha)) {
        img = await pdfDoc.embedJpg(compressedImgBytes);
      } else {
        img = await pdfDoc.embedPng(compressedImgBytes);
      }
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const imgDims = img.scaleToFit(width - 40, height - 40);
      page.drawImage(img, {
        x: (width - imgDims.width) / 2,
        y: (height - imgDims.height) / 2,
        width: imgDims.width,
        height: imgDims.height,
      });
    }
    const updatedPdfBytes = await pdfDoc.save();
    await fs.writeFile(pdfPath, updatedPdfBytes);
    console.log(`Regenerated TEMP PDF for section ${section} with ${images.length} images`);
  } catch (err) {
    console.error('Error in regenerateSectionPdf:', err);
  }
}

module.exports = router; 