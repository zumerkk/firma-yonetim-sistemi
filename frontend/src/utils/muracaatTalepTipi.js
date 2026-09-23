export const muracaatTalepTipi = (belge = {}) => {
  const value = belge.belgeYonetimi?.belgeMuracaatTalepTipi || belge.kunyeBilgileri?.talepSonuc || '';
  return String(value).trim().toLocaleLowerCase('tr-TR') === 'sonuç' ? 'Yatırım Teşvik Belgesi' : value;
};
