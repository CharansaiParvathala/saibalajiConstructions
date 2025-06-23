import JSZip from 'jszip';
import { Project } from '@/lib/types';
import { getFinalSubmissionImagesForExport } from '@/lib/api/api-client';

interface ExportOptions {
  project: Project;
  aspectRatio?: {
    width: number;
    height: number;
  };
  outputDirectory: string;
}

interface ResizeOptions {
  width: number;
  height: number;
  aspectRatio?: {
    width: number;
    height: number;
  };
}

function getOutputSize(aspectRatio?: { width: number; height: number }): { width: number; height: number } {
  if (!aspectRatio) return { width: 1200, height: 900 };
  const base = 1200;
  const ratio = aspectRatio.width / aspectRatio.height;
  if (ratio >= 1) {
    // Landscape or square
    return { width: base, height: Math.round(base / ratio) };
  } else {
    // Portrait
    return { width: Math.round(base * ratio), height: base };
  }
}

const resizeImage = (dataUrl: string, options: ResizeOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      let targetWidth = options.width;
      let targetHeight = options.height;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Stretch the full image to the canvas
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};

export const exportFinalSubmissionImages = async (options: ExportOptions): Promise<void> => {
  try {
    console.log('Starting final submission image export for project:', options.project.title);
    const images = await getFinalSubmissionImagesForExport(options.project.id);
    if (!images || !images.length) throw new Error('No final submission images found for this project');
    const zip = new JSZip();
    // Sort by created_at
    images.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const sequenceNumber = i + 1;
      if (!image.image_data || typeof image.image_data !== 'string') {
        console.error('Invalid image data for final image:', image.id);
        continue;
      }
      const dataUrl = `data:image/jpeg;base64,${image.image_data}`;
      let processedImage = dataUrl;
      if (options.aspectRatio) {
        const { width, height } = getOutputSize(options.aspectRatio);
        processedImage = await resizeImage(processedImage, {
          width,
          height,
          aspectRatio: options.aspectRatio
        });
      }
      const fileExtension = 'jpg';
      const fileName = `${sequenceNumber}.${fileExtension}`;
      const imageData = processedImage.split(',')[1];
      zip.file(fileName, imageData, { base64: true });
      console.log(`Added final image ${sequenceNumber}: ${fileName} (created: ${image.created_at})`);
    }
    if (images.length === 0) throw new Error('No valid final images found to export');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.project.title.replace(/[^a-zA-Z0-9]/g, '_')}_final_images_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    console.log('Final image export completed successfully');
  } catch (error) {
    console.error('Error exporting final submission images:', error);
    throw error;
  }
}; 