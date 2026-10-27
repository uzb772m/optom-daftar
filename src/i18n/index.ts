import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './uz.json';
import ru from './ru.json';

const savedLang = localStorage.getItem('optom_lang') || 'uz';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru }
    },
    lng: savedLang,
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false
    }
  });

export function changeAppLanguage(lang: 'uz' | 'ru') {
  localStorage.setItem('optom_lang', lang);
  i18n.changeLanguage(lang);
}

export default i18n;
