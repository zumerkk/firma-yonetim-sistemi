// 🎨 MUI TEMALARI
//
// Bu dosya İKİ tema dışa aktarır:
//
//   etuysTema   ✅ AKTİF — App.js'in global teması (Faz 4, 4 Eylül 2026).
//               Faz 1'de onaylanan tasarım dili, jetonlar.js'ten üretilir.
//
//   mevcutTema  Faz 2 öncesi görünüm. ARTIK KULLANILMIYOR ama BİLEREK DURUYOR:
//               App.js'te tek satır (`etuysTema` → `mevcutTema`) tüm uygulamayı
//               eski görünüme döndürür. Faz 3'te hiç incelenmemiş 26 ekran da
//               global anahtarla değişti; sorun çıkarsa geri dönüş yolu bu.
//               Bir süre sorunsuz gittikten sonra silinebilir.
//
// ── Geçiş nasıl yürüdü ─────────────────────────────────────────────────
// Global temayı bir anda değiştirmek 48.395 satırlık ekran kodunun tamamının
// görünümünü aynı saniyede değiştirirdi — hangi ekranın bozulduğunu anlamak
// imkânsız olurdu. Bunun yerine MUI'nin iç içe ThemeProvider desteği kullanıldı:
// Faz 3'te 19 ekran tek tek kendi etrafına sarmalandı, her adım ayrı PR'da
// doğrulandı (#100, #101, #103, #104, #105). Faz 4'te anahtar buraya alındı ve
// ekran bazlı sarmalayıcılar toplandı.
//
// ⚠️ `sx`, tema `styleOverrides`'ı EZER. Bir ekran hâlâ eski görünüyorsa
// büyük olasılıkla yerel `sx` içinde borderRadius/boxShadow/background vardır.

import { createTheme } from '@mui/material/styles';
import { renk, yazi, kenar } from './jetonlar';

// ═══════════════ ESKİ TEMA (yalnız geri dönüş için) ═══════════════
export const mevcutTema = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1e40af', light: '#3b82f6', dark: '#1e3a8a' },
    secondary: { main: '#059669', light: '#10b981', dark: '#047857' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1f2937', secondary: '#6b7280' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 600, fontSize: '1.75rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' }
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 8, fontWeight: 500 } }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }
      }
    }
  }
});

// ═══════════════ ETUYS TEMASI — AKTİF GLOBAL TEMA ═══════════════
export const etuysTema = createTheme({
  palette: {
    mode: 'light',
    primary: { main: renk.ana, dark: renk.anaKoyu, light: renk.anaHafif },
    success: { main: renk.onay },
    warning: { main: renk.bekle },
    error: { main: renk.red },
    background: { default: renk.zemin, paper: renk.yuzey },
    text: { primary: renk.murekkep, secondary: renk.sessiz, disabled: renk.soluk },
    divider: renk.cizgi
  },

  typography: {
    fontFamily: yazi.aile,
    fontSize: yazi.govde,
    // Başlıklar ETUYS ölçeğinde: ekranda 25+ alan varken büyük başlık yer yiyor
    h1: { fontSize: '1.15rem', fontWeight: yazi.cokKalin, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.05rem', fontWeight: yazi.cokKalin },
    h3: { fontSize: '0.95rem', fontWeight: yazi.kalin },
    body1: { fontSize: `${yazi.govde}px`, lineHeight: yazi.satirYuksekligi },
    body2: { fontSize: `${yazi.etiket}px`, lineHeight: yazi.satirYuksekligi },
    caption: { fontSize: `${yazi.kucuk}px` },
    button: { textTransform: 'none', fontWeight: yazi.kalin }
  },

  shape: { borderRadius: kenar.yaricap },

  // Gölge basamaklarının tamamı kapatıldı: ETUYS'te gölge yok ve bugünkü
  // arayüzü "kalabalık" gösteren sebeplerden biri bu.
  shadows: Array(25).fill('none'),

  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: kenar.yaricapKucuk,
          fontWeight: yazi.kalin,
          fontSize: `${yazi.etiket}px`,
          paddingTop: 4,
          paddingBottom: 4
        }
      }
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: kenar.ince, borderRadius: kenar.yaricap } }
    },

    // ── YÜZEN YÜZEYLER ──────────────────────────────────────────────────
    // Düz yüzeyler düz kalır; yüzen yüzeyler yüzdüğünü belli eder.
    //
    // Neden istisna: MUI'de Dialog, Menu, Select/Autocomplete açılır listesi ve
    // Drawer'ın hepsi Paper. Yukarıdaki kural onlara da uygulanınca ölçüldü:
    //     DIALOG  gölge:none  kenarlık:1px solid #DCE3E9  zemin:beyaz
    //     MENU    gölge:none  kenarlık:1px solid #DCE3E9  zemin:beyaz
    // Beyaz bir tablonun üstüne açılan menü, arkasından yalnız 1px açık gri
    // ile ayrılıyordu — pratikte yüzdüğü anlaşılmıyor.
    //
    // ETUYS bu soruyu CEVAPLAMIYOR: onun açılır listeleri yerel tarayıcı
    // select'i, yani yüzen katmanı işletim sistemi çiziyor (ve gölgesi var).
    // ETUYS düz görünümü yalnız KENDİ çizdiği yüzeylere uyguluyor. Biz MUI ile
    // o yüzeyleri kendimiz çizdiğimiz için, "gölge yok" kuralını buraya
    // taşımak referansı taklit etmek değil, hiç almadığı bir kararı ona
    // atfetmek olurdu. Bkz. etuys/Screenshot 2026-09-02 130333.png
    //
    // Gölge ölçülü: ETUYS'ün sakinliğini bozmayacak kadar, katmanı belli
    // edecek kadar. Kenarlık da bir ton koyu (alanCizgi).
    MuiDialog: {
      styleOverrides: {
        paper: { border: kenar.alan, boxShadow: '0 2px 10px rgba(27, 39, 51, 0.18)' }
      }
    },
    // Popover, Menu / Select / Autocomplete açılır listelerinin ortak tabanı
    MuiPopover: {
      styleOverrides: {
        paper: { border: kenar.alan, boxShadow: '0 2px 8px rgba(27, 39, 51, 0.16)' }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { border: kenar.alan, boxShadow: '0 2px 8px rgba(27, 39, 51, 0.16)' }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: kenar.alan, boxShadow: '0 0 10px rgba(27, 39, 51, 0.12)' }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: kenar.ince, borderRadius: kenar.yaricap } }
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: kenar.yaricap, fontSize: `${yazi.govde}px`, backgroundColor: renk.yuzey },
        notchedOutline: { borderColor: renk.alanCizgi }
      }
    },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: `${yazi.govde}px`, padding: '5px 9px', borderColor: renk.cizgi },
        head: {
          backgroundColor: renk.yuzeyAlt,
          fontWeight: yazi.kalin,
          fontSize: `${yazi.tabloBaslik}px`,
          whiteSpace: 'nowrap'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: yazi.kalin, fontSize: `${yazi.kucuk}px`, height: 20 }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: `${yazi.etiket}px`,
          fontWeight: yazi.orta,
          minHeight: 34
        }
      }
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: `${yazi.kucuk}px` } }
    },

    // 📋 DataGrid — liste ekranlarının çoğu bunu kullanıyor (FirmaList,
    // DosyaTakipList, TesvikMakineList).
    //
    // ⚠️ DataGrid'i VeriTablosu ile DEĞİŞTİRMİYORUZ. Sıralama, filtreleme,
    // sütun boyutlandırma, satır seçimi ve sanallaştırmayı hazır getiriyor;
    // bunları görsel uyum uğruna elden çıkarmak, kullanıcının fiilen kullandığı
    // işlevi tasarım tutarlılığına feda etmek olurdu. Onun yerine giydiriyoruz:
    // kural burada bir kez yazılıyor, ekranların JSX'ine hiç dokunulmuyor.
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: kenar.ince,
          borderRadius: kenar.yaricap,
          fontSize: `${yazi.govde}px`,
          backgroundColor: renk.yuzey
        },
        columnHeaders: {
          backgroundColor: renk.yuzeyAlt,
          borderBottom: kenar.ince,
          borderRadius: 0,
          minHeight: '32px !important',
          maxHeight: '32px !important'
        },
        columnHeaderTitle: {
          fontSize: `${yazi.tabloBaslik}px`,
          fontWeight: yazi.kalin,
          color: renk.murekkep
        },
        cell: {
          borderColor: renk.cizgi,
          padding: '0 9px',
          fontVariantNumeric: 'tabular-nums'
        },
        // ETUYS'te zebra YOK; hover yalnız zemini değiştirir, satır oynamaz.
        row: {
          '&:hover': { backgroundColor: renk.anaHafif },
          // 🟡 Seçili satır sarı — hesaplanan alanla AYNI sarı.
          // VeriTablosu da bunu yapıyor; iki tablo bileşeni aynı dili konuşmalı.
          '&.Mui-selected': {
            backgroundColor: renk.hesapZemin,
            '&:hover': { backgroundColor: renk.hesapZemin }
          }
        },
        footerContainer: {
          borderTop: kenar.ince,
          minHeight: '34px',
          fontSize: `${yazi.kucuk}px`
        },
        columnSeparator: { color: renk.cizgi }
      }
    }
  }
});

export default mevcutTema;
