
import React from 'react';
import { useLanguage } from '@/context/language-context';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage, languageOptions } = useLanguage();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">{language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languageOptions.map(option => (
          <DropdownMenuItem 
            key={option.id}
            onClick={() => {
              setLanguage(option.id);
              // Force reload to ensure all components are re-rendered with new language
              window.location.reload();
            }}
            className="flex items-center justify-between"
          >
            <span>{option.nativeName}</span>
            {language === option.id && <span className="ml-2">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
