
import { useState } from 'react';
import { toast } from '@/components/ui/sonner';

export const useCamera = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  // This function is now simplified since we're not using camera capture anymore
  const captureImage = async (): Promise<string | null> => {
    toast.error("Camera functionality has been removed");
    return null;
  };

  return {
    isCapturing,
    captureImage
  };
};
