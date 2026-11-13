import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableRow
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExcelJS from 'exceljs';
import svc from '../../services/tesvikMakineService';
import { formatMoney, saveBlobResponse } from './helpers';

const sonBolumler = [
  ['yerli', 'Yerli Gerçekleşme Bilgisi', 'Yerli Gerçekleşmesi'],
  ['ithal', 'İthal Gerçekleşme (Beyanname) Bilgisi', 'İthal Gerçekleşmesi'],
  ['kurFarki', 'Kur Farkı Faturası Gerçekleşme Bilgisi', 'Kur Farkı Faturası Gerçekleşmesi'],
  ['toplam', 'TOPLAM GERÇEKLEŞEN SON TUTAR', 'Tutar']
];

function ozetBolumleri(ozet) {
  const gruplar = ozet.gruplar.map(({ id, baslik, satirlar, toplamEtiketi, toplam }) => ({
    id,
    baslik,
    satirlar: [...satirlar, { id: 'toplam', etiket: toplamEtiketi, tutar: toplam, toplam: true }]
  }));
  return [...gruplar, ...sonBolumler.map(([id, baslik, etiket]) => ({
    id,
    baslik,
    satirlar: [{ id, etiket, tutar: ozet[id], toplam: true }]
  }))];
}

async function listeyiIndir(bolumler, kalemler, uyari) {
  const kitap = new ExcelJS.Workbook();
  const ozet = kitap.addWorksheet('Gerçekleşme Özeti');
  ozet.columns = [
    { header: 'Bölüm', width: 46 },
    { header: 'Gerçekleşme', width: 44 },
    { header: 'Tutar (TL)', width: 20, style: { numFmt: '#,##0.00' } }
  ];
  ozet.getRow(1).font = { bold: true };
  bolumler.forEach(({ baslik, satirlar }) => {
    satirlar.forEach(({ etiket, tutar, toplam }) => {
      const satir = ozet.addRow([baslik, etiket, tutar]);
      if (toplam) satir.font = { bold: true };
    });
  });
  if (uyari) {
    const satir = ozet.addRow([uyari]).number;
    ozet.mergeCells(satir, 1, satir, 3);
  }

  const liste = kitap.addWorksheet('Gerçekleşme Kalemleri', { views: [{ state: 'frozen', ySplit: 1 }] });
  liste.columns = [
    { header: 'Grup', width: 24 }, { header: 'Kategori', width: 40 },
    { header: 'Belge Tarihi', width: 16, style: { numFmt: 'dd.mm.yyyy' } }, { header: 'Belge No', width: 24 },
    { header: 'Açıklama', width: 50 }, { header: 'Adet', width: 12 },
    { header: 'Tutar (TL)', width: 20, style: { numFmt: '#,##0.00' } }
  ];
  liste.getRow(1).font = { bold: true };
  liste.autoFilter = 'A1:G1';
  kalemler.forEach(({ grup, kategori, tarih, no, icerik, adet, tutar }) => {
    const belgeTarihi = tarih ? new Date(tarih.slice(0, 10)) : null;
    liste.addRow([grup, kategori, belgeTarihi, no, icerik, adet ?? null, tutar]);
  });
  const data = await kitap.xlsx.writeBuffer();
  saveBlobResponse({ data }, 'Tüm Gerçekleşme Listesi.xlsx');
}

export default function GerceklesmeOzeti({ tesvikModel, tesvikId, yenileme }) {
  const [manuelYenileme, setManuelYenileme] = useState(0);
  const [sonuc, setSonuc] = useState(null);
  const [indirmeHatasi, setIndirmeHatasi] = useState('');
  const [indiriliyor, setIndiriliyor] = useState(false);
  const istekAnahtari = JSON.stringify([tesvikModel, tesvikId, yenileme, manuelYenileme]);

  useEffect(() => {
    const controller = new AbortController();
    svc.getGerceklesme(tesvikModel, tesvikId, { signal: controller.signal })
      .then((ozet) => {
        if (!Array.isArray(ozet?.gruplar)) throw new Error('Geçersiz gerçekleşme özeti');
        if (!controller.signal.aborted) setSonuc({ istekAnahtari, ozet });
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setSonuc({ istekAnahtari, hata: error?.response?.data?.message || 'Finansal tutarlar getirilemedi.' });
        }
      });
    return () => controller.abort();
  }, [tesvikModel, tesvikId, istekAnahtari]);

  const guncel = sonuc?.istekAnahtari === istekAnahtari ? sonuc : null;
  const ozet = guncel?.ozet;
  const bolumler = ozet ? ozetBolumleri(ozet) : [];
  const cevrilmemisKalemSayisi = ozet?.cevrilmemisIthalKalemSayisi || 0;
  const uyari = cevrilmemisKalemSayisi
    ? `TL karşılığı girilmemiş ${cevrilmemisKalemSayisi} ithal kalem, gerçekleşme tutarlarına dahil edilmedi.`
    : '';

  const indir = async () => {
    setIndirmeHatasi('');
    setIndiriliyor(true);
    try {
      await listeyiIndir(bolumler, ozet.kalemler || [], uyari);
    } catch {
      setIndirmeHatasi('Gerçekleşme listesi indirilemedi.');
    } finally {
      setIndiriliyor(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 1, sm: 2 } }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} disabled={!guncel}
            onClick={() => { setIndirmeHatasi(''); setManuelYenileme((deger) => deger + 1); }}>
            Finansal Tutarları Getir
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={!ozet || indiriliyor} onClick={indir}>
            Tüm Gerçekleşme Listesi
          </Button>
        </Stack>
        {!guncel && <Box sx={{ py: 2, textAlign: 'center' }}>
          <CircularProgress size={24} aria-label="Finansal tutarlar yükleniyor" />
        </Box>}
        {(guncel?.hata || indirmeHatasi) && <Alert severity="error">{guncel?.hata || indirmeHatasi}</Alert>}
        {uyari && <Alert severity="warning">{uyari}</Alert>}
        {ozet && <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Gerçekleşme özeti">
            {bolumler.map(({ id, baslik, satirlar }) => (
              <TableBody key={id}>
                <TableRow sx={{ bgcolor: id === 'toplam' ? 'action.selected' : 'action.hover' }}>
                  <TableCell component="th" scope="rowgroup" colSpan={2} sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    {baslik}
                  </TableCell>
                </TableRow>
                {satirlar.map(({ id: satirId, etiket, tutar, toplam }) => (
                  <TableRow key={satirId} sx={toplam ? { '& > *': { fontWeight: 700 } } : undefined}>
                    <TableCell component="th" scope="row">{etiket}</TableCell>
                    <TableCell align="right" sx={{ width: '28%', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(tutar, 'TRY')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ))}
          </Table>
        </TableContainer>}
      </Stack>
    </Paper>
  );
}
