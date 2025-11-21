// Simple i18n utility
// In a real app, this would likely hook into a context or use a library like next-intl
// For MVP compliance, we use a simple object map.

type Locale = 'en' | 'es';
type TranslationKey = 
  | 'common.dashboard'
  | 'common.unknown_wizard'
  | 'landing.footer.rights'
  | 'landing.hero.title' // Example placeholder
  ;

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'common.dashboard': 'Dashboard',
    'common.unknown_wizard': 'Unknown Wizard',
    'landing.footer.rights': '© 2025 Mindspark Duel. All rights reserved.',
  },
  es: {
    'common.dashboard': 'Panel de Control',
    'common.unknown_wizard': 'Mago Desconocido',
    'landing.footer.rights': '© 2025 Mindspark Duel. Todos los derechos reservados.',
  }
};

// Default to English for now, could be detected from headers/cookies
const DEFAULT_LOCALE: Locale = 'en';

export function t(key: TranslationKey, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale][key] || key;
}
