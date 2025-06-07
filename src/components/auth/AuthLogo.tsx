
import React from 'react';

interface AuthLogoProps {
  className?: string;
  alt?: string;
}

export const AuthLogo: React.FC<AuthLogoProps> = ({ className = '', alt = 'Sai Balaji Construction' }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <img 
          src="/lovable-uploads/a723c9c5-8174-41c6-b9d7-2d8646801ec6.png" 
          alt={alt} 
          className="h-16 w-auto object-contain" 
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div 
          className="h-16 w-16 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl hidden"
          style={{ display: 'none' }}
        >
          SBC
        </div>
      </div>
      <span className="font-bold text-lg mt-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
        Sai Balaji Construction
      </span>
    </div>
  );
};
