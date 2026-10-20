// Eski tek örnekli kayıtlar ve yeni çoklu örnekler aynı ekranlarda açılır.
export const ornekDosyalari = (evrak) => (Array.isArray(evrak?.ornekDosyalar)
  ? evrak.ornekDosyalar : [evrak?.ornekDosya])
  .filter((dosya) => dosya && (dosya.dosyaAdi || dosya.fileUrl || dosya.filePath));
