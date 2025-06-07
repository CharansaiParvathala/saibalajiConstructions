
import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Location } from '@/lib/types';

interface MapViewProps {
  location: Location;
  className?: string;
}

export function MapView({ location, className = "" }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  
  // In a real app, you would integrate Google Maps or Leaflet here
  // For demo, we'll create a simple representation
  useEffect(() => {
    if (!mapRef.current) return;
    
    const mapEl = mapRef.current;
    const dot = document.createElement('div');
    
    dot.style.width = '12px';
    dot.style.height = '12px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = 'red';
    dot.style.position = 'absolute';
    
    // Calculate position based on latitude and longitude
    // This is just a placeholder visualization
    const latRange = 0.01; // Small range for demo
    const longRange = 0.01;
    
    const latPercent = ((location.latitude % latRange) / latRange) * 100;
    const longPercent = ((location.longitude % longRange) / longRange) * 100;
    
    dot.style.left = `${longPercent}%`;
    dot.style.top = `${latPercent}%`;
    
    mapEl.appendChild(dot);
    
    // Cleanup
    return () => {
      if (mapEl.contains(dot)) {
        mapEl.removeChild(dot);
      }
    };
  }, [location]);
  
  return (
    <Card className={`p-4 ${className}`}>
      <div className="font-semibold mb-2">Location</div>
      
      <div className="text-sm mb-3">
        Latitude: {location.latitude.toFixed(6)}<br/>
        Longitude: {location.longitude.toFixed(6)}
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-40 bg-muted rounded-md relative border overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('data:image/png;base64,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...') bg-repeat center center / cover"></div>
      </div>
    </Card>
  );
}
