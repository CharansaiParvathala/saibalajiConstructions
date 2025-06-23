import JSZip from 'jszip';
import { Project } from '@/lib/types';
import { getProjectImagesForExport } from '@/lib/api/api-client';

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

export const exportProjectImages = async (options: ExportOptions): Promise<void> => {
  try {
    console.log('Starting image export for project:', options.project.title);
    console.log('Project ID:', options.project.id);
    
    // Fetch all project images from MySQL with timestamps
    console.log('Calling API endpoint for project images...');
    const projectImages = await getProjectImagesForExport(options.project.id);
    console.log('API response received:', projectImages);
    
    if (!projectImages || (!projectImages.progressImages?.length && !projectImages.paymentImages?.length)) {
      throw new Error('No images found for this project');
    }

    const zip = new JSZip();
    
    // Combine all images and sort by creation time
    const allImages: Array<{
      id: number;
      created_at: string;
      image_data: string;
      type: 'progress' | 'payment';
      original_name?: string;
    }> = [];

    // Add progress images
    if (projectImages.progressImages) {
      for (const img of projectImages.progressImages) {
        allImages.push({
          id: img.id,
          created_at: img.created_at,
          image_data: img.image_data,
          type: 'progress',
          original_name: `progress_${img.progress_id}_${img.id}`
        });
      }
    }

    // Add payment images
    if (projectImages.paymentImages) {
      for (const img of projectImages.paymentImages) {
        allImages.push({
          id: img.id,
          created_at: img.created_at,
          image_data: img.image_data,
          type: 'payment',
          original_name: img.expense_id ? `payment_expense_${img.expense_id}_${img.id}` : `payment_${img.payment_request_id}_${img.id}`
        });
      }
    }

    // Sort images by creation time (oldest first)
    allImages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    console.log('Sorted images by creation time:', allImages.length);
    // Log details of the first few images received
    console.log('Sample of received image data:', allImages.slice(0, 3).map(img => ({ id: img.id, type: img.type, data_length: img.image_data?.length })));

    // Process each image
    for (let i = 0; i < allImages.length; i++) {
      const image = allImages[i];
      const sequenceNumber = i + 1; // Start from 1

      try {
        console.log(`Processing image ${sequenceNumber}:`, {
          id: image.id,
          type: image.type,
          image_data_type: typeof image.image_data,
          image_data_length: image.image_data?.length,
          image_data_sample: typeof image.image_data === 'string' ? image.image_data.substring(0, 50) : image.image_data
        });

        // Check if image data is valid
        if (!image.image_data || typeof image.image_data !== 'string') {
          console.error('Invalid image data for image:', image.id);
          continue;
        }

        // Create the full base64 data URL
        const dataUrl = `data:image/jpeg;base64,${image.image_data}`;

          // Resize image if aspect ratio is specified
        let processedImage = dataUrl;
          if (options.aspectRatio) {
          const { width, height } = getOutputSize(options.aspectRatio);
            processedImage = await resizeImage(processedImage, {
            width,
            height,
              aspectRatio: options.aspectRatio
            });
          }

        // Determine file extension
        const fileExtension = 'jpg'; // Default to jpg for processed images

        // Create sequential filename
        const fileName = `${sequenceNumber}.${fileExtension}`;
        
        // Extract base64 data from processed image
          const imageData = processedImage.split(',')[1];
        console.log(`Zipping image ${sequenceNumber}: FileName: ${fileName}, Data Length: ${imageData?.length}`);
        
        // Add to zip
          zip.file(fileName, imageData, { base64: true });
        console.log(`Added image ${sequenceNumber}: ${fileName} (original: ${image.original_name}, created: ${image.created_at})`);
          
        } catch (error) {
        console.error(`Error processing image ${sequenceNumber}:`, error);
      }
    }

    if (allImages.length === 0) {
      throw new Error('No valid images found to export');
    }

    console.log('Total images processed:', allImages.length);

    // Generate and download zip file
    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.project.title.replace(/[^a-zA-Z0-9]/g, '_')}_images_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('Image export completed successfully');
  } catch (error) {
    console.error('Error exporting images:', error);
    throw error;
  }
}; 