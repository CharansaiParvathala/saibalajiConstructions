import { getProgressImage, getPaymentRequestImage } from '../api/api-client';

/**
 * Convert base64 string to blob URL for displaying images
 */
export const base64ToBlobUrl = (base64String: string, mimeType: string = 'image/jpeg'): string => {
  try {
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error converting base64 to blob URL:', error);
    return '';
  }
};

/**
 * Get progress image from database and return blob URL
 */
export const getProgressImageUrl = async (imageId: number): Promise<string> => {
  try {
    console.log(`Fetching progress image with ID: ${imageId}`);
    const blob = await getProgressImage(imageId);
    const url = URL.createObjectURL(blob);
    console.log(`Successfully created blob URL for progress image ${imageId}:`, url);
    return url;
  } catch (error) {
    console.error(`Error fetching progress image ${imageId}:`, error);
    return '';
  }
};

/**
 * Get payment request image from database and return blob URL
 */
export const getPaymentRequestImageUrl = async (imageId: number): Promise<string> => {
  try {
    console.log(`Fetching payment request image with ID: ${imageId}`);
    const blob = await getPaymentRequestImage(imageId);
    const url = URL.createObjectURL(blob);
    console.log(`Successfully created blob URL for payment request image ${imageId}:`, url);
    return url;
  } catch (error) {
    console.error(`Error fetching payment request image ${imageId}:`, error);
    return '';
  }
};

/**
 * Clean up blob URLs to prevent memory leaks
 */
export const revokeBlobUrl = (blobUrl: string): void => {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl);
  }
};

/**
 * Display image from base64 data or fetch from database
 */
export const displayImage = async (
  imageData: string | number, 
  type: 'base64' | 'progress' | 'payment-request' = 'base64'
): Promise<string> => {
  if (type === 'base64' && typeof imageData === 'string') {
    return base64ToBlobUrl(imageData);
  } else if (type === 'progress' && typeof imageData === 'number') {
    return await getProgressImageUrl(imageData);
  } else if (type === 'payment-request' && typeof imageData === 'number') {
    return await getPaymentRequestImageUrl(imageData);
  }
  
  return '';
}; 