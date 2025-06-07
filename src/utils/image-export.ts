import JSZip from 'jszip';
import { Project, ProgressUpdate } from '@/lib/types';
import { getProgressUpdatesByProjectId } from '@/lib/storage';

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

      // If aspect ratio is specified, calculate dimensions to maintain aspect ratio
      if (options.aspectRatio) {
        const sourceRatio = img.width / img.height;
        const targetRatio = options.aspectRatio.width / options.aspectRatio.height;

        if (sourceRatio > targetRatio) {
          // Image is wider than target ratio
          targetWidth = Math.round(targetHeight * targetRatio);
        } else {
          // Image is taller than target ratio
          targetHeight = Math.round(targetWidth / targetRatio);
        }
      }

      // Set canvas size to target dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw image with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate position to center the image
      const x = (canvas.width - targetWidth) / 2;
      const y = (canvas.height - targetHeight) / 2;

      // Draw the image
      ctx.drawImage(img, x, y, targetWidth, targetHeight);

      // Convert to base64
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};

export const exportProjectImages = async (options: ExportOptions): Promise<void> => {
  try {
    console.log('Starting image export for project:', options.project.name);
    const updates = await getProgressUpdatesByProjectId(options.project.id);
    
    if (!updates || updates.length === 0) {
      throw new Error('No progress updates found for this project');
    }
    console.log('Found progress updates:', updates.length);

    const zip = new JSZip();
    let imageCounter = 1;
    let totalImages = 0;

    // Process each progress update
    for (const update of updates) {
      console.log('Processing update:', update.id);
      if (!update.photos || !Array.isArray(update.photos)) {
        console.log('No photos in update:', update.id);
        continue;
      }
      console.log('Photos in update:', update.photos.length);

      // Process each photo
      for (const photo of update.photos) {
        if (!photo.dataUrl) {
          console.log('No dataUrl in photo');
          continue;
        }

        try {
          // Resize image if aspect ratio is specified
          let processedImage = photo.dataUrl;
          if (options.aspectRatio) {
            processedImage = await resizeImage(processedImage, {
              width: 1920, // Base width
              height: 1080, // Base height
              aspectRatio: options.aspectRatio
            });
          }

          // Determine file extension from the image data
          const fileExtension = processedImage.startsWith('data:image/jpeg') ? 'jpg' :
                              processedImage.startsWith('data:image/png') ? 'png' :
                              'jpg';

          // Add to zip with sequential numbering
          const fileName = `${imageCounter}.${fileExtension}`;
          const imageData = processedImage.split(',')[1];
          zip.file(fileName, imageData, { base64: true });
          console.log('Added image to zip:', fileName);
          
          imageCounter++;
          totalImages++;
        } catch (error) {
          console.error('Error processing image:', error);
        }
      }
    }

    if (totalImages === 0) {
      throw new Error('No valid images found to export');
    }

    console.log('Total images processed:', totalImages);

    // Generate and download zip file
    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.project.name}_images.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting images:', error);
    throw error;
  }
}; 