// 🎛️ TASARIM SİSTEMİ — CANLI KILAVUZ  (/tasarim-sistemi)
//
// Madde 6 / Faz 2. Bu sayfa üç işi birden yapıyor:
//   1. Ekip referansı — bir bileşenin nasıl göründüğü ve nasıl çağrıldığı
//   2. Çalışma zamanı doğrulaması — bileşenler burada render edilmezse
//      hiçbir yerde kullanılmadıkları için pakete bile girmez, hataları
//      Faz 3'e kadar gizli kalırdı
//   3. Müşteriye gösterilebilir somut ilerleme
//
// Menüde YOK; adresi bilen açar. Faz 3 bitince kalabilir (canlı kılavuz olarak)
// ya da kaldırılır — o zaman karar verilir.

import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import {
  renk, yazi, aralik, kenar,
  Panel, BolumBasligi, AlanSatiri, VeriTablosu,
  Sayfalama, AracCubugu, EylemSeridi, SekmeSeridi, DurumRozeti
} from '../../tasarim';

// ── Kılavuz içi başlık ──────────────────────────────────────────────
const Baslik = ({ no, children, aciklama }) => (
  <Box sx={{ mt: 5, mb: 2 }}>
    <Typography sx={{ fontSize: 11, letterSpacing: '.12em', color: renk.sessiz, textTransform: 'uppercase' }}>
      {no}
    </Typography>
    <Typography sx={{ fontSize: 19, fontWeight: 700, color: renk.murekkep, mt: 0.4 }}>
      {children}
    </Typography>
    {aciklama && (
      <Typography sx={{ fontSize: 13, color: renk.sessiz, mt: 0.6, maxWidth: 640 }}>
        {aciklama}
      </Typography>
    )}
  </Box>
);

const Jeton = ({ ad, deger, koyuYazi }) => (
  <Box sx={{ border: kenar.ince, backgroundColor: renk.yuzey, minWidth: 150 }}>
    <Box sx={{ height: 40, backgroundColor: deger, borderBottom: kenar.ince }} />
    <Box sx={{ p: 0.9 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: koyuYazi ? renk.murekkep : renk.murekkep }}>{ad}</Typography>
      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: renk.sessiz }}>{deger}</Typography>
    </Box>
  </Box>
);

// ── Örnek veri: gerçek belgeden (ST TURKUAZ, 578589) ────────────────
const MAKINELER = [
  { id: 1, sira: 1, makineId: 4215417, ad: 'Trafo (Beton Köşk Hariç)', miktar: 1, birim: 'ADET', birimFiyat: 1840000, toplam: 1840000, karar: 'onay' },
  { id: 2, sira: 2, makineId: 4215418, ad: '630 kVA Jeneratör', miktar: 1, birim: 'ADET', birimFiyat: 25000, toplam: 25000, karar: 'onay' },
  { id: 3, sira: 3, makineId: 4215419, ad: '100 kVA UPS', miktar: 1, birim: 'ADET', birimFiyat: 150000, toplam: 150000, karar: 'onay' },
  { id: 4, sira: 7, makineId: 4215423, ad: '120 Oda İçin Otomasyon Yazılımı', miktar: 1, birim: 'SET', birimFiyat: 200000, toplam: 200000, karar: 'beklemede' },
  { id: 5, sira: 8, makineId: 4215424, ad: 'Ağ Geçidi Arabirimi — KNX', miktar: 120, birim: 'ADET', birimFiyat: 25000, toplam: 3000000, karar: 'beklemede' }
];

const tl = (v) => Number(v || 0).toLocaleString('tr-TR');

const SEKMELER = [
  { anahtar: 'kunye', baslik: 'Belge Künye Bilgileri' },
  { anahtar: 'cins', baslik: 'Yatırım Cinsi' },
  { anahtar: 'urun', baslik: 'Ürün Bilgileri' },
  { anahtar: 'yerli', baslik: 'Yerli Liste' },
  { anahtar: 'ithal', baslik: 'İthal Liste' },
  { anahtar: 'finansal', baslik: 'Finansal Bilgiler' }
];

const TasarimSistemi = () => {
  const [sekme, setSekme] = useState('kunye');
  const [sayfa, setSayfa] = useState(1);
  const [seciliId, setSeciliId] = useState(1);

  return (
    <LayoutWrapper>
      {/* Kılavuzun kendisi de ETUYS temasıyla sarılı — Faz 3'te her ekran
          aynı şekilde sarmalanacak. Kullanım örneği yerine geçiyor. */}
        <Box sx={{ p: 3, backgroundColor: renk.zemin, minHeight: '100%' }}>

          <Typography sx={{ fontSize: 26, fontWeight: 700, color: renk.murekkep }}>
            Tasarım Sistemi
          </Typography>
          <Typography sx={{ fontSize: 14, color: renk.sessiz, mt: 0.8, maxWidth: 680 }}>
            Madde 6 / Faz 2 çıktısı. ETUYS'ten çıkarılan görünüm kurallarının
            çalışan hali. Bu bileşenler Faz 3'te ekranlara tek tek uygulanacak;
            bugünkü ekranların görünümü henüz değişmedi.
          </Typography>

          {/* ── Renk ── */}
          <Baslik no="01" aciklama="Vurgu rengi (mavi) ile anlam renkleri (yeşil/sarı/kırmızı) ayrı tutulur: mavi “burası etkin”, yeşil “onaylandı” demek.">
            Renk jetonları
          </Baslik>
          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
            <Jeton ad="Ana" deger={renk.ana} />
            <Jeton ad="Bölüm başlığı" deger={renk.yuzeyAlt} />
            <Jeton ad="Hesaplanan / seçili" deger={renk.hesapZemin} />
            <Jeton ad="Zemin" deger={renk.zemin} />
            <Jeton ad="Onay" deger={renk.onay} />
            <Jeton ad="Beklemede" deger={renk.bekle} />
            <Jeton ad="Red" deger={renk.red} />
            <Jeton ad="Mürekkep" deger={renk.murekkep} />
          </Box>

          {/* ── Sekme ── */}
          <Baslik no="02" aciklama="Sıra ETUYS'ünkiyle aynı. Ok tuşlarıyla da gezilebilir.">
            Sekme şeridi
          </Baslik>
          <SekmeSeridi sekmeler={SEKMELER} etkin={sekme} onDegis={setSekme} />
          <Box sx={{ border: kenar.ince, borderTop: 'none', backgroundColor: renk.yuzey, p: `${aralik.panelIc}px` }}>
            <Typography sx={{ fontSize: 13, color: renk.sessiz }}>
              Etkin bölüm: <b style={{ color: renk.murekkep }}>{SEKMELER.find((s) => s.anahtar === sekme)?.baslik}</b>
            </Typography>
          </Box>

          {/* ── Form ── */}
          <Baslik no="03" aciklama="SARI zemin = sistem hesaplıyor, kullanıcı yazamaz. Bugün bu ayrım hiç yok; kullanıcı hesaplanan alana yazmayı deniyor.">
            Form alanları
          </Baslik>
          <Panel baslik="Finansal Bilgiler" katlanabilir>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: `0 ${aralik.sutun}px` }}>
              <Box>
                <BolumBasligi>Makine Teçhizat Giderleri</BolumBasligi>
                <AlanSatiri etiket="İthal" sayi>0</AlanSatiri>
                <AlanSatiri etiket="Yerli" sayi>189.671.967</AlanSatiri>
                <AlanSatiri etiket="Toplam Makine Teçhizat" sayi hesap>189.671.967</AlanSatiri>
              </Box>
              <Box>
                <BolumBasligi>Finansman</BolumBasligi>
                <AlanSatiri etiket="Toplam Yabancı Kaynak" sayi>590.994.970</AlanSatiri>
                <AlanSatiri etiket="Özkaynaklar" sayi hesap>38.032.049</AlanSatiri>
                <AlanSatiri etiket="TOPLAM FİNANSMAN" sayi hesap>629.027.019</AlanSatiri>
                <AlanSatiri etiket="Boş alan örneği">{null}</AlanSatiri>
              </Box>
            </Box>
          </Panel>

          {/* ── Tablo ── */}
          <Baslik no="04" aciklama="Zebra yok, taşan metin kırpılır, sayılar sağa yaslı ve hizalı. Seçili satır hesaplanan alanla aynı sarı — ikisinin de anlamı “sistem işaretledi”.">
            Veri tablosu, araç çubuğu ve sayfalama
          </Baslik>
          <Panel baslik="Yerli Makine Teçhizat Listesi" katlanabilir bosluksuz>
            <Box sx={{ p: `${aralik.panelIc}px`, pb: 0 }}>
              <AracCubugu sagUnsur={`5 satır · Toplam ${tl(5215000)} ₺`}>
                <Button variant="contained">Satır Ekle</Button>
                <Button variant="outlined">Toplu Tarih</Button>
                <Button variant="outlined">Excel'e Aktar</Button>
              </AracCubugu>
            </Box>
            <VeriTablosu
              enAzGenislik={900}
              satirlar={MAKINELER}
              seciliMi={(s) => s.id === seciliId}
              onSatirTik={(s) => setSeciliId(s.id)}
              sutunlar={[
                { anahtar: 'sira', baslik: 'Sıra', sayi: true, genislik: 60 },
                { anahtar: 'makineId', baslik: 'Makine ID', sayi: true, genislik: 90 },
                { anahtar: 'ad', baslik: 'Adı ve Özelliği' },
                { anahtar: 'miktar', baslik: 'Miktar', sayi: true, genislik: 70 },
                { anahtar: 'birim', baslik: 'Birim', genislik: 80 },
                { anahtar: 'birimFiyat', baslik: 'Birim Fiyatı (TL)', sayi: true, bicim: (v) => tl(v) },
                { anahtar: 'toplam', baslik: 'Toplam (TL)', sayi: true, bicim: (v) => tl(v) },
                { anahtar: 'karar', baslik: 'Karar', genislik: 110, bicim: (v) => <DurumRozeti durum={v} /> }
              ]}
            />
            <Sayfalama
              sayfa={sayfa}
              toplamSayfa={83}
              toplamKayit={830}
              sayfaBoyutu={10}
              onSayfa={setSayfa}
              onYenile={() => {}}
            />
          </Panel>

          {/* ── Boş tablo ── */}
          <Baslik no="05" aciklama="Boş liste sessizce kaybolmaz; ne olduğunu söyler.">
            Boş durum
          </Baslik>
          <Panel baslik="İthal Makine Teçhizat Listesi" bosluksuz>
            <VeriTablosu
              satirlar={[]}
              sutunlar={[
                { anahtar: 'sira', baslik: 'Sıra', sayi: true },
                { anahtar: 'ad', baslik: 'Adı ve Özelliği' },
                { anahtar: 'toplam', baslik: 'Toplam (FOB $)', sayi: true }
              ]}
            />
            <Sayfalama sayfa={1} toplamSayfa={1} toplamKayit={0} />
          </Panel>

          {/* ── Durum ── */}
          <Baslik no="06">Durum rozetleri</Baslik>
          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', mb: 3 }}>
            <DurumRozeti durum="onay" />
            <DurumRozeti durum="kismi_onay" />
            <DurumRozeti durum="red" />
            <DurumRozeti durum="beklemede" />
          </Box>

          {/* ── Eylem şeridi ── */}
          <Baslik no="07" aciklama="Kaydet/güncelle eylemleri sayfanın rastgele bir köşesinde değil, hep formun altında aynı şeritte durur.">
            Eylem şeridi
          </Baslik>
          <EylemSeridi>
            <Button variant="contained">Kaydet</Button>
            <Button variant="outlined">Vazgeç</Button>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: yazi.kucuk, color: renk.sessiz }}>
              Son kayıt: 02.09.2026 13:03
            </Typography>
          </EylemSeridi>

          <Box sx={{ mt: 5, pt: 2, borderTop: kenar.ince }}>
            <Typography sx={{ fontSize: 12, color: renk.sessiz, maxWidth: 680 }}>
              Bu bileşenler <code>frontend/src/tasarim/</code> altında.
              Değerler tek kaynaktan (<code>jetonlar.js</code>) geliyor — bir renk
              kararı değiştiğinde tüm sistemde aynı anda değişir.
            </Typography>
          </Box>
        </Box>
    </LayoutWrapper>
  );
};

export default TasarimSistemi;
