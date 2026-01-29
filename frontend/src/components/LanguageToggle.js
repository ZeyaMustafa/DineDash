import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const getCurrentLang = () => {
    // Handle language codes like 'en-US' by getting just the first part
    const lang = i18n.language || 'en';
    return lang.startsWith('hi') ? 'hi' : 'en';
  };

  const toggleLanguage = () => {
    const currentLang = getCurrentLang();
    const newLang = currentLang === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const currentLang = getCurrentLang();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
      data-testid="language-toggle"
      aria-label={`Switch to ${currentLang === 'en' ? 'Hindi' : 'English'}`}
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-medium">
        {currentLang === 'en' ? 'हिंदी' : 'English'}
      </span>
    </Button>
  );
};

export default LanguageToggle;
