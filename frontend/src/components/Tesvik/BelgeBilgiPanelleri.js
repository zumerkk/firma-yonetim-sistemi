// 🪪 Belge görünümü — Künye ve Finansal sekmeleri (eski + yeni belge ortak)
//
// Alan listeleri utils/belgeKunye.js ve utils/belgeFinansal.js'te; müşteri PDF'i de aynı
// tanımları kullanıyor. Burada yalnız E-TUYS yerleşimi var: künyede solda Yatırımcı +
// Yatırım, sağda Belge paneli; finansalda solda yatırım tutarları, sağda makine/finansman.

import React from 'react';
import { Box } from '@mui/material';
import { AlanSatiri, BolumBasligi } from '../../tasarim';
import { kunyeBolumleri } from '../../utils/belgeKunye';
import { finansalBolumleri, finansalDegerYaz } from '../../utils/belgeFinansal';

const IKI_SUTUN = { display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: '0 28px' };

const Satirlar = ({ satirlar }) => satirlar.map((s) => (
  <AlanSatiri key={s.etiket} etiket={s.etiket} uzun={!!s.uzun}>{s.deger}</AlanSatiri>
));

export const KunyePaneli = ({ tesvik, tur, konuGoster, oecdGoster }) => {
  const { yatirimci, yatirim, belge } = kunyeBolumleri(tesvik, { tur, konuGoster, oecdGoster });
  return (
    <Box sx={IKI_SUTUN}>
      <Box>
        <BolumBasligi>Yatırımcı ile ilgili bilgiler</BolumBasligi>
        <Satirlar satirlar={yatirimci} />
        <BolumBasligi>Yatırım ile ilgili bilgiler</BolumBasligi>
        <Satirlar satirlar={yatirim} />
      </Box>
      <Box>
        <BolumBasligi>Belge ile ilgili bilgiler</BolumBasligi>
        <Satirlar satirlar={belge} />
      </Box>
    </Box>
  );
};

const FinansalGruplar = ({ gruplar }) => gruplar.map((g) => (
  <React.Fragment key={g.baslik}>
    <BolumBasligi>{g.baslik}</BolumBasligi>
    {g.satirlar.map((s) => (
      <AlanSatiri key={s.etiket} etiket={s.etiket} sayi={s.tur !== 'metin'} hesap={s.hesap}>
        {finansalDegerYaz(s)}
      </AlanSatiri>
    ))}
  </React.Fragment>
));

export const FinansalPaneli = ({ tesvik }) => {
  const { sol, sag } = finansalBolumleri(tesvik);
  return (
    <Box sx={IKI_SUTUN}>
      <Box><FinansalGruplar gruplar={sol} /></Box>
      <Box><FinansalGruplar gruplar={sag} /></Box>
    </Box>
  );
};
