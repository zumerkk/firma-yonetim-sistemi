import React, { useState } from 'react';
import { Box, TablePagination } from '@mui/material';
import { VeriTablosu } from '../../tasarim';
import { birimEtiketi, kullanilmisEtiketi } from '../../utils/makineFormat';

const sayi = (v) => (Number(v) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 8 });
const para = (v, kod) => `${sayi(v)} ${kod}`;

// Yalnız görünen sayfayı çizer; yüzlerce makine belge ekranını yavaşlatmaz.
export default function BelgeMakineListesi({ satirlar = [], ithal = false }) {
  const [sayfa, setSayfa] = useState(0);
  const [adet, setAdet] = useState(10);
  const sonSayfa = Math.max(0, Math.ceil(satirlar.length / adet) - 1);
  const etkinSayfa = Math.min(sayfa, sonSayfa);
  const sutunlar = [
    { anahtar: 'siraNo', baslik: 'Sıra', genislik: 55 },
    { anahtar: 'makineId', baslik: 'Makine ID', bicim: (v) => v || '-' },
    ...(ithal ? [{ anahtar: 'gtipKodu', baslik: 'GTİP', bicim: (v) => v || '-' }] : []),
    { anahtar: 'adiVeOzelligi', baslik: 'Adı ve Özelliği', sar: true },
    { anahtar: 'miktar', baslik: 'Miktar', sayi: true, bicim: sayi },
    { anahtar: 'birim', baslik: 'Birim', bicim: (v) => birimEtiketi(v) || '-' },
    { anahtar: 'birimFiyat', baslik: 'Birim Fiyat', sayi: true,
      bicim: (_, r) => ithal ? para(r.birimFiyatiFob, r.gumrukDovizKodu || 'USD') : para(r.birimFiyatiTl, 'TL') },
    { anahtar: 'toplam', baslik: ithal ? 'FOB Toplam ($)' : 'Toplam (TL)', sayi: true,
      bicim: (_, r) => para(ithal ? r.toplamTutarFobUsd : r.toplamTutariTl, ithal ? 'USD' : 'TL') },
    ...(ithal ? [{ anahtar: 'kullanilmisMakine', baslik: 'Kullanılmış', bicim: (v) => kullanilmisEtiketi(v) }] : [])
  ];
  return (
    <Box>
      <VeriTablosu satirlar={satirlar.slice(etkinSayfa * adet, (etkinSayfa + 1) * adet)} sutunlar={sutunlar}
        anahtarAl={(r, i) => r.rowId || r._id || i} enAzGenislik={900}
        bosMetin={ithal ? 'Bu belgede ithal makine yok.' : 'Bu belgede yerli makine yok.'} />
      <TablePagination component="div" count={satirlar.length} page={etkinSayfa} rowsPerPage={adet}
        onPageChange={(_, yeni) => setSayfa(yeni)} rowsPerPageOptions={[10, 25, 50]}
        onRowsPerPageChange={(e) => { setAdet(Number(e.target.value)); setSayfa(0); }}
        labelRowsPerPage="Sayfada" labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
        getItemAriaLabel={(tip) => tip === 'next' ? 'Sonraki sayfa' : 'Önceki sayfa'}
        sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end' } }} />
    </Box>
  );
}
