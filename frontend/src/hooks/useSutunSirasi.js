// ↔️ Sütun başlığını tutup sürükleyerek yerini değiştirme
//
// Müşteri (01.10.2026, Belge Takip listesi): "şu kısmı tutup sürüklenebilir yapabilir miyiz.
// mesela kontrol panelini öne almak istiyorum bazen".
//
// Kurulu @mui/x-data-grid MIT sürümünde sütun taşıma yok (DataGridPro özelliği). Burada her
// sütunun başlığı HTML5 sürükle-bırak ile sarılıyor; sıra `columns` dizisinin sırası olarak
// grid'e geri veriliyor. Sıra kullanıcının tarayıcısında hatırlanır (kişisel tercih — başka
// kullanıcıyı etkilemez); tarayıcı depolaması kapalıysa yalnız oturum boyunca geçerli olur.

import React, { useCallback, useMemo, useState } from 'react';

const VERI_TURU = 'application/x-sutun-alani';

const oku = (anahtar) => {
  try {
    const ham = window.localStorage.getItem(anahtar);
    const dizi = ham ? JSON.parse(ham) : null;
    return Array.isArray(dizi) ? dizi.filter((x) => typeof x === 'string') : null;
  } catch {
    return null;
  }
};

const yaz = (anahtar, sira) => {
  try {
    if (sira) window.localStorage.setItem(anahtar, JSON.stringify(sira));
    else window.localStorage.removeItem(anahtar);
  } catch { /* depolama kapalı: sıra yalnız bu oturumda kalır */ }
};

// Geniş tabloda en sağdaki sütun (İşlemler, E-TUYS Takip) en başa taşınacakken ikisi aynı anda
// ekrana sığmıyor. Başlık şeridi kaydırılamaz (overflow: hidden) olduğundan tarayıcının
// sürükleme sırasındaki kendiliğinden kaydırması burada çalışmaz; imleç kenara gelince
// grid'in yatay kaydırıcısını biz kaydırıyoruz (dragover ~50 ms'de bir gelir).
const KENAR_PX = 70;
const kenardaKaydir = (e) => {
  const kaydirici = e.currentTarget.closest('.MuiDataGrid-main')?.querySelector('.MuiDataGrid-virtualScroller');
  if (!kaydirici) return;
  const { left, right } = kaydirici.getBoundingClientRect();
  if (e.clientX > right - KENAR_PX) kaydirici.scrollLeft += 40;
  else if (e.clientX < left + KENAR_PX) kaydirici.scrollLeft -= 40;
};

// Kayıtlı sıraya göre diz. Kayıtta olmayan (sonradan eklenmiş) sütun, varsayılan
// sıradaki komşusunun ardına girer; artık var olmayan alan yok sayılır.
export const sutunlariSirala = (columns, sira) => {
  if (!Array.isArray(sira) || !sira.length) return columns;
  const alanlar = new Set(columns.map((c) => c.field));
  const sonuc = sira.filter((f) => alanlar.has(f));
  columns.forEach((c, i) => {
    if (sonuc.includes(c.field)) return;
    const onceki = columns.slice(0, i).reverse().find((p) => sonuc.includes(p.field));
    sonuc.splice(onceki ? sonuc.indexOf(onceki.field) + 1 : 0, 0, c.field);
  });
  const harita = new Map(columns.map((c) => [c.field, c]));
  return sonuc.map((f) => harita.get(f));
};

// `kaynak` sütununu `hedef` sütununun yerine taşı (hedef sağa/sola kayar)
export const sutunTasi = (alanlar, kaynak, hedef) => {
  const i = alanlar.indexOf(kaynak);
  const j = alanlar.indexOf(hedef);
  if (i < 0 || j < 0 || i === j) return alanlar;
  const yeni = alanlar.filter((f) => f !== kaynak);
  yeni.splice(j, 0, kaynak);
  return yeni;
};

export default function useSutunSirasi(anahtar, columns) {
  const [sira, setSira] = useState(() => oku(anahtar));
  const [hedefAlan, setHedefAlan] = useState(null);

  const sirali = useMemo(() => sutunlariSirala(columns, sira), [columns, sira]);

  const tasi = useCallback((kaynak, hedef) => {
    const yeni = sutunTasi(sirali.map((c) => c.field), kaynak, hedef);
    setSira(yeni);
    yaz(anahtar, yeni);
  }, [anahtar, sirali]);

  const sifirla = useCallback(() => {
    setSira(null);
    yaz(anahtar, null);
  }, [anahtar]);

  const sutunlar = useMemo(() => sirali.map((c) => ({
    ...c,
    renderHeader: (params) => (
      <span
        draggable
        title="Tutup sürükleyerek sütunun yerini değiştirebilirsiniz"
        onDragStart={(e) => {
          e.dataTransfer.setData(VERI_TURU, c.field);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(VERI_TURU)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (hedefAlan !== c.field) setHedefAlan(c.field);
          kenardaKaydir(e);
        }}
        onDragLeave={() => setHedefAlan((h) => (h === c.field ? null : h))}
        onDrop={(e) => {
          e.preventDefault();
          setHedefAlan(null);
          const kaynak = e.dataTransfer.getData(VERI_TURU);
          if (kaynak) tasi(kaynak, c.field);
        }}
        onDragEnd={() => setHedefAlan(null)}
        style={{
          display: 'block',
          width: '100%',
          cursor: 'grab',
          userSelect: 'none',
          fontWeight: 'inherit',
          // bırakılacak yer: hedef başlığın solunda mavi çizgi
          boxShadow: hedefAlan === c.field ? 'inset 3px 0 0 #2563eb' : 'none',
          paddingLeft: hedefAlan === c.field ? 6 : 0
        }}
      >
        {c.renderHeader ? c.renderHeader(params) : (c.headerName ?? c.field)}
      </span>
    )
  })), [sirali, hedefAlan, tasi]);

  return { sutunlar, sifirla, ozelSira: Array.isArray(sira) && sira.length > 0 };
}
