// 🧪 TASARIM SİSTEMİ TESTLERİ
//
// Bu bileşenler Faz 3'te 48.395 satırlık ekran kodunun tamamına uygulanacak;
// bir hata tek ekranda değil her ekranda görünür. Testler o yüzden yalnız
// "patlamıyor mu" değil, TASARIM KURALLARINI de sabitliyor:
//   • sarı zemin gerçekten yalnız hesaplanan alanda ve seçili satırda mı
//   • sayılar sağa yaslı ve tabular-nums mı
//   • sekme sırası ETUYS'ünkiyle aynı mı
//   • boş liste sessizce kaybolmuyor mu
//
// Kural bozulursa burada yakalanır, müşteri ekranında değil.

import React from 'react';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import {
  etuysTema, renk,
  Panel, BolumBasligi, AlanSatiri, VeriTablosu,
  Sayfalama, AracCubugu, EylemSeridi, SekmeSeridi, DurumRozeti, SayiKutusu
} from './index';

const goster = (ui) => render(<ThemeProvider theme={etuysTema}>{ui}</ThemeProvider>);

// rgb(27, 110, 168) gibi çıktıları hex ile karşılaştırabilmek için
const rgbToHex = (rgb) => {
  const m = String(rgb).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return String(rgb).toUpperCase();
  return '#' + [1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('').toUpperCase();
};

describe('Panel', () => {
  test('başlığı ve içeriği gösterir', () => {
    goster(<Panel baslik="Yerli Makine Teçhizat Listesi">içerik burada</Panel>);
    expect(screen.getByText('Yerli Makine Teçhizat Listesi')).toBeInTheDocument();
    expect(screen.getByText('içerik burada')).toBeInTheDocument();
  });

  // MUI Collapse geçişle çalışır; içerik tıklamadan HEMEN sonra değil,
  // geçiş bitince DOM'dan düşer. Bu yüzden beklemek gerekiyor.
  test('katlanabilir panelde içerik gizlenir', async () => {
    goster(<Panel baslik="Test" katlanabilir>gizlenecek</Panel>);
    expect(screen.getByText('gizlenecek')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Daralt' }));
    await waitForElementToBeRemoved(() => screen.queryByText('gizlenecek'));
    expect(screen.getByRole('button', { name: 'Genişlet' })).toBeInTheDocument();
  });
});

describe('AlanSatiri — sarı kuralı', () => {
  test('normal alan sarı DEĞİL', () => {
    goster(<AlanSatiri etiket="Yerli">189.671.967</AlanSatiri>);
    const kutu = screen.getByText('189.671.967');
    expect(rgbToHex(getComputedStyle(kutu).backgroundColor)).not.toBe(renk.hesapZemin.toUpperCase());
  });

  test('hesaplanan alan SARI zemin alır', () => {
    goster(<AlanSatiri etiket="TOPLAM" hesap>629.027.019</AlanSatiri>);
    const kutu = screen.getByText('629.027.019');
    expect(rgbToHex(getComputedStyle(kutu).backgroundColor)).toBe(renk.hesapZemin.toUpperCase());
  });

  test('sayı alanı sağa yaslanır', () => {
    goster(<AlanSatiri etiket="Adet" sayi>110</AlanSatiri>);
    expect(getComputedStyle(screen.getByText('110')).textAlign).toBe('right');
  });

  test('değer verilmezse tire gösterir — boş kutu bırakmaz', () => {
    goster(<AlanSatiri etiket="SGK Sicil No" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('VeriTablosu', () => {
  const sutunlar = [
    { anahtar: 'sira', baslik: 'Sıra', sayi: true },
    { anahtar: 'ad', baslik: 'Adı ve Özelliği' },
    { anahtar: 'toplam', baslik: 'Toplam (TL)', sayi: true, bicim: (v) => Number(v).toLocaleString('tr-TR') }
  ];
  const satirlar = [
    { id: 1, sira: 1, ad: 'Trafo (Beton Köşk Hariç)', toplam: 1840000 },
    { id: 2, sira: 2, ad: '630 kVA Jeneratör', toplam: 25000 }
  ];

  test('başlık ve satırları basar', () => {
    goster(<VeriTablosu sutunlar={sutunlar} satirlar={satirlar} />);
    expect(screen.getByText('Adı ve Özelliği')).toBeInTheDocument();
    expect(screen.getByText('Trafo (Beton Köşk Hariç)')).toBeInTheDocument();
  });

  test('bicim fonksiyonu uygulanır — sayı TR biçiminde', () => {
    goster(<VeriTablosu sutunlar={sutunlar} satirlar={satirlar} />);
    expect(screen.getByText('1.840.000')).toBeInTheDocument();
  });

  test('seçili satır SARI — hesaplanan alanla aynı jeton', () => {
    goster(<VeriTablosu sutunlar={sutunlar} satirlar={satirlar} seciliMi={(s) => s.id === 1} />);
    const satir = screen.getByText('Trafo (Beton Köşk Hariç)').closest('tr');
    expect(rgbToHex(getComputedStyle(satir).backgroundColor)).toBe(renk.hesapZemin.toUpperCase());
  });

  test('boş liste sessizce kaybolmaz', () => {
    goster(<VeriTablosu sutunlar={sutunlar} satirlar={[]} />);
    expect(screen.getByText('Gösterilecek kayıt yok')).toBeInTheDocument();
  });

  test('satıra tıklama geri çağırımı tetikler', () => {
    const tik = jest.fn();
    goster(<VeriTablosu sutunlar={sutunlar} satirlar={satirlar} onSatirTik={tik} />);
    fireEvent.click(screen.getByText('630 kVA Jeneratör'));
    expect(tik).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });
});

describe('Sayfalama', () => {
  test('kayıt aralığını TR biçiminde yazar', () => {
    goster(<Sayfalama sayfa={1} toplamSayfa={83} toplamKayit={830} sayfaBoyutu={10} />);
    expect(screen.getByText(/Gösterilen Kayıtlar 1 – 10 \/ 830/)).toBeInTheDocument();
  });

  test('son sayfada aralık toplam kaydı aşmaz', () => {
    goster(<Sayfalama sayfa={83} toplamSayfa={83} toplamKayit={830} sayfaBoyutu={10} />);
    expect(screen.getByText(/821 – 830 \/ 830/)).toBeInTheDocument();
  });

  test('kayıt yoksa bunu söyler', () => {
    goster(<Sayfalama sayfa={1} toplamSayfa={1} toplamKayit={0} />);
    expect(screen.getByText('Gösterilecek kayıt yok')).toBeInTheDocument();
  });

  test('ilk sayfada geri düğmeleri pasif', () => {
    goster(<Sayfalama sayfa={1} toplamSayfa={5} toplamKayit={50} sayfaBoyutu={10} />);
    expect(screen.getByRole('button', { name: 'Önceki' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sonraki' })).not.toBeDisabled();
  });

  test('sayfa değişimi bildirilir', () => {
    const git = jest.fn();
    goster(<Sayfalama sayfa={2} toplamSayfa={5} toplamKayit={50} sayfaBoyutu={10} onSayfa={git} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki' }));
    expect(git).toHaveBeenCalledWith(3);
  });
});

describe('SekmeSeridi', () => {
  // ETUYS sırası — kullanıcı kararı: aynen korunacak
  const ETUYS = [
    'Belge Künye Bilgileri', 'Yatırım Cinsi', 'Ürün Bilgileri', 'Yerli Liste', 'İthal Liste',
    'Finansal Bilgiler', 'Özel Şartlar', 'Destek Unsurları', 'Proje Tanıtımı', 'Evrak Listesi'
  ];
  const sekmeler = ETUYS.map((baslik, i) => ({ anahtar: `s${i}`, baslik }));

  test('sekmeler ETUYS sırasında basılır', () => {
    goster(<SekmeSeridi sekmeler={sekmeler} etkin="s0" onDegis={() => {}} />);
    const basliklar = screen.getAllByRole('tab').map((t) => t.textContent);
    expect(basliklar).toEqual(ETUYS);
  });

  test('etkin sekme aria-selected taşır', () => {
    goster(<SekmeSeridi sekmeler={sekmeler} etkin="s5" onDegis={() => {}} />);
    expect(screen.getByText('Finansal Bilgiler')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Yerli Liste')).toHaveAttribute('aria-selected', 'false');
  });

  test('tıklama sekme değiştirir', () => {
    const degis = jest.fn();
    goster(<SekmeSeridi sekmeler={sekmeler} etkin="s0" onDegis={degis} />);
    fireEvent.click(screen.getByText('İthal Liste'));
    expect(degis).toHaveBeenCalledWith('s4');
  });

  test('ok tuşuyla gezinir ve başta sona sarar', () => {
    const degis = jest.fn();
    goster(<SekmeSeridi sekmeler={sekmeler} etkin="s0" onDegis={degis} />);
    fireEvent.keyDown(screen.getByText('Belge Künye Bilgileri'), { key: 'ArrowLeft' });
    expect(degis).toHaveBeenCalledWith('s9'); // sondan devam
  });
});

describe('DurumRozeti', () => {
  test('bilinen durumları Türkçe etiketler', () => {
    goster(<DurumRozeti durum="onay" />);
    expect(screen.getByText('Onay')).toBeInTheDocument();
  });

  test('bilinmeyen durumda tire gösterir — boş bırakmaz', () => {
    goster(<DurumRozeti durum="hicbiri" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('onay yeşil, red kırmızı — anlam renkleri ayrı', () => {
    const { unmount } = goster(<DurumRozeti durum="onay" />);
    expect(rgbToHex(getComputedStyle(screen.getByText('Onay')).color)).toBe(renk.onay.toUpperCase());
    unmount();
    goster(<DurumRozeti durum="red" />);
    expect(rgbToHex(getComputedStyle(screen.getByText('Red')).color)).toBe(renk.red.toUpperCase());
  });
});

describe('AracCubugu / EylemSeridi / BolumBasligi', () => {
  test('araç çubuğu sağ unsuru gösterir', () => {
    goster(<AracCubugu sagUnsur="830 satır">düğmeler</AracCubugu>);
    expect(screen.getByText('830 satır')).toBeInTheDocument();
  });

  test('eylem şeridi içeriğini basar', () => {
    goster(<EylemSeridi><button type="button">Kaydet</button></EylemSeridi>);
    expect(screen.getByText('Kaydet')).toBeInTheDocument();
  });

  test('bölüm başlığı basılır', () => {
    goster(<BolumBasligi>Yatırımcı ile ilgili bilgiler</BolumBasligi>);
    expect(screen.getByText('Yatırımcı ile ilgili bilgiler')).toBeInTheDocument();
  });
});

// SayiKutusu, ETUYS'te doğrudan karşılığı OLMAYAN tek bileşen — panel ekranları
// için referansın genel kurallarından türetildi. Karşılığı olmadığı için
// "gradyan/gölge/yuvarlak köşe yok" kuralının burada kayması en kolay yer;
// testler o yüzden görünümü doğrudan ölçüyor.
describe('SayiKutusu', () => {
  test('sayıyı TR biçiminde yazar — binlik nokta', () => {
    goster(<SayiKutusu etiket="Toplam Firma" deger={1840000} />);
    expect(screen.getByText('1.840.000')).toBeInTheDocument();
  });

  test('ETUYS "Olmayanlar" kuralı: gradyan, gölge, yuvarlak köşe yok', () => {
    goster(<SayiKutusu etiket="Toplam Firma" deger={12} />);
    const kutu = screen.getByText('Toplam Firma').closest('div').parentElement;
    const s = getComputedStyle(kutu);
    expect(s.backgroundImage === '' || s.backgroundImage === 'none').toBe(true);
    expect(s.boxShadow === '' || s.boxShadow === 'none').toBe(true);
    expect(parseFloat(s.borderRadius) || 0).toBe(0);
  });

  test('yüklenirken 0 değil iskelet gösterir — yanlış sayı okutmaz', () => {
    goster(<SayiKutusu etiket="Toplam Firma" deger={0} yukleniyor />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  test('değer yoksa tire — boş kutu bırakmaz', () => {
    goster(<SayiKutusu etiket="SGK" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  test('tıklanabilir kutu klavyeyle de çalışır', () => {
    const tik = jest.fn();
    goster(<SayiKutusu etiket="Aktif Firmalar" deger={5} onTik={tik} />);
    const dugme = screen.getByRole('button');
    fireEvent.keyDown(dugme, { key: 'Enter' });
    expect(tik).toHaveBeenCalled();
  });

  test('tıklanamaz kutu düğme rolü almaz — yanıltıcı olmaz', () => {
    goster(<SayiKutusu etiket="Toplam" deger={5} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('anlam rengi rakama uygulanır', () => {
    goster(<SayiKutusu etiket="Süresi Geçmiş" deger={3} vurgu="red" />);
    expect(rgbToHex(getComputedStyle(screen.getByText('3')).color)).toBe(renk.red.toUpperCase());
  });
});

describe('SayiKutusu — erişilebilirlik', () => {
  test('tıklanabilir kutu varsayılan olarak etiket+değeri duyurur', () => {
    goster(<SayiKutusu etiket="Toplam Talep" deger={12} onTik={() => {}} />);
    expect(screen.getByRole('button', { name: 'Toplam Talep: 12' })).toBeInTheDocument();
  });

  test('özel aria etiketi verilebilir', () => {
    goster(
      <SayiKutusu etiket="Aktif Talep" deger={7} onTik={() => {}}
        ariaEtiket="Aktif Talep: 7 talep — listeyi aç" />
    );
    expect(screen.getByRole('button', { name: 'Aktif Talep: 7 talep — listeyi aç' })).toBeInTheDocument();
  });
});
