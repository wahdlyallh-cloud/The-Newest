import { useLanguage } from '../lib/languages';

export function useTranslation() {
  const { currentLanguage, setLanguage, t, isRTL } = useLanguage();

  return {
    lang: currentLanguage,
    currentLanguage,
    setLanguage,
    t, // الدالة التي تجلب النص والمترجم المحمي
    isRTL, // اتجاه الصفحة (RTL / LTR)
  };
}
export default useTranslation;
