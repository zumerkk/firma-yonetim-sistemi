// 🎛️ TASARIM SİSTEMİ — tek giriş noktası
//
// Madde 6 / Faz 2 çıktısı. Kullanım:
//
//   import { Panel, AlanSatiri, VeriTablosu, renk } from '../../tasarim';
//
// Faz 4'ten (4 Eylül 2026) beri etuysTema App.js'in GLOBAL teması; ekran bazlı
// ThemeProvider sarmalayıcısına gerek yok, hepsi kaldırıldı. Bir ekran hâlâ eski
// görünüyorsa sebebi tema değil, yerel `sx` — `sx` styleOverrides'ı ezer.

export { default as jetonlar, renk, yazi, aralik, kenar, stil, durumStili } from './jetonlar';
export { mevcutTema, etuysTema } from './muiTema';

export { default as Panel } from './bilesenler/Panel';
export { default as BolumBasligi } from './bilesenler/BolumBasligi';
export { default as AlanSatiri } from './bilesenler/AlanSatiri';
export { default as VeriTablosu } from './bilesenler/VeriTablosu';
export { default as Sayfalama } from './bilesenler/Sayfalama';
export { default as AracCubugu } from './bilesenler/AracCubugu';
export { default as EylemSeridi } from './bilesenler/EylemSeridi';
export { default as SekmeSeridi } from './bilesenler/SekmeSeridi';
export { default as DurumRozeti } from './bilesenler/DurumRozeti';
export { default as SayiKutusu } from './bilesenler/SayiKutusu';
