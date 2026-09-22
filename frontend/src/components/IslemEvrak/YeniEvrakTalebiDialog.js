// 🧩 Yeni evrak talebi penceresi: firma + işlem türü (+ Şahıs/Şirket) + koşullu sorular
// İşlem & Evrak listesi ile Belge Takip › Firma Maili sekmesi AYNI pencereyi kullanır. Belge Takip'ten
// açılınca firma o talebin firmasıdır (değiştirilemez) ve talep Belge Takip talebine bağlanır.

import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Stack, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, MenuItem, Alert, Radio, RadioGroup, FormControlLabel, FormLabel, FormControl
} from '@mui/material';
import svc from '../../services/islemEvrakService';
import api from '../../utils/axios';

// 🔀 Koşul süzgeci — backend'deki islemEvrakService.kosullaSuz ile AYNI kural.
// Burada yalnızca ÖNİZLEME için kullanılıyor; kaydı her zaman backend süzüyor.
// İkisi ayrışırsa kullanıcı yanlış sayı görür, veri bozulmaz.
const kosulUygun = (e, cevaplar) => {
  const soruId = String(e.kosulSoruId || '').trim();
  if (!soruId) return true;
  const beklenen = String(e.kosulDeger || '').toUpperCase();
  if (!beklenen) return true;
  return String(cevaplar[soruId] || '').toUpperCase() === beklenen;
};

/**
 * @param {boolean}  open
 * @param {Function} onClose
 * @param {Function} onOlustu   (talep) => void — oluşturulan talep
 * @param {{_id: string, tamUnvan?: string}} [sabitFirma]  verilirse firma seçilemez
 * @param {string}   [dosyaTakipId]  Belge Takip talebi — evrak talebi ona bağlanır
 * @param {Function} [onHata]    (mesaj) => void
 */
export default function YeniEvrakTalebiDialog({ open, onClose, onOlustu, sabitFirma = null, dosyaTakipId = null, onHata }) {
  const [turler, setTurler] = useState([]);
  const [firmalar, setFirmalar] = useState([]);
  const [firmaArama, setFirmaArama] = useState('');
  const [seciliFirma, setSeciliFirma] = useState(null);
  const [seciliTur, setSeciliTur] = useState('');
  const [seciliVaryant, setSeciliVaryant] = useState('');
  // 🔀 Sihirbaz cevapları: { soruId: 'EVET' | 'HAYIR' }
  const [cevaplar, setCevaplar] = useState({});
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    if (!open) return;
    svc.turler().then((d) => setTurler(d || [])).catch(() => setTurler([]));
  }, [open]);

  // Firma araması (firma sabit değilse)
  useEffect(() => {
    if (!open || sabitFirma) return undefined;
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/firma', { params: { arama: firmaArama || undefined, limit: 50 } });
        setFirmalar(r.data?.data?.firmalar || r.data?.data || []);
      } catch { setFirmalar([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [firmaArama, open, sabitFirma]);

  const firma = sabitFirma || seciliFirma;
  const secilenTur = turler.find((t) => t._id === seciliTur);
  const sorular = secilenTur?.sorular || [];
  const tumSorularCevaplandi = sorular.every((s) => cevaplar[s.id]);

  // Seçilen varyantın (yoksa türün) evrak listesi — yalnızca ÖNİZLEME sayısı için.
  // Talebe hangi evrakların gireceğine backend karar veriyor (IslemTuru.varyantCoz).
  const adayEvraklar = (() => {
    const v = (secilenTur?.varyantlar || []).find((x) => x.kod === seciliVaryant);
    return (v && v.istenenEvraklar?.length) ? v.istenenEvraklar : (secilenTur?.istenenEvraklar || []);
  })();
  // Koşul süzgecinden geçen evraklar — pencerede yalnızca SAYISI gösteriliyor. Hangilerinin isteneceği
  // talep ekranındaki "1. İstenen Evraklar" bölümünde seçiliyor (müşteri: "talebi oluşturunca açılan
  // kısma sekme gibi yapsak").
  const uygunEvraklar = adayEvraklar.filter((e) => kosulUygun(e, cevaplar));

  const sifirla = () => {
    setSeciliFirma(null); setSeciliTur(''); setSeciliVaryant(''); setCevaplar({}); setHata('');
  };
  const kapat = () => { sifirla(); onClose?.(); };

  const olustur = async () => {
    if (!firma || !seciliTur) { setHata('Firma ve işlem türü seçin.'); return; }
    setKaydediyor(true);
    setHata('');
    try {
      const talep = await svc.talepOlustur({
        firmaId: firma._id,
        islemTuruId: seciliTur,
        varyantKod: seciliVaryant || undefined,
        dosyaTakipId: dosyaTakipId || undefined,
        // secilenIndeksler GÖNDERİLMİYOR: koşul süzgecinden geçen her evrak talebe gelsin, ayıklama
        // talep ekranında yapılsın. Backend bu alanı opsiyonel tutuyor (verilmezse eski davranış).
        cevaplar: sorular.map((s) => ({ soruId: s.id, deger: cevaplar[s.id] })).filter((c) => c.deger)
      });
      sifirla();
      onOlustu?.(talep);
    } catch (e) {
      const mesaj = e?.response?.data?.message || e?.message || 'Talep oluşturulamadı';
      setHata(mesaj);
      onHata?.(mesaj);
    } finally { setKaydediyor(false); }
  };

  return (
    <Dialog open={open} onClose={kapat} maxWidth="sm" fullWidth>
      <DialogTitle>Yeni Evrak Talebi</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {sabitFirma ? (
            <TextField label="Firma" size="small" value={sabitFirma.tamUnvan || ''} disabled
              helperText={dosyaTakipId ? 'Belge Takip talebinin firması — evrak talebi bu talebe bağlanır' : undefined} />
          ) : (
            <Autocomplete
              options={firmalar}
              value={seciliFirma}
              onChange={(e, v) => setSeciliFirma(v)}
              onInputChange={(e, v, reason) => { if (reason === 'input') setFirmaArama(v); }}
              getOptionLabel={(f) => f.tamUnvan || ''}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              filterOptions={(x) => x}
              renderInput={(params) => <TextField {...params} label="Firma" size="small" placeholder="Firma ara..." />}
            />
          )}
          <TextField
            select size="small" label="İşlem Türü" value={seciliTur}
            onChange={(e) => { setSeciliTur(e.target.value); setSeciliVaryant(''); setCevaplar({}); }}
          >
            {turler.map((t) => <MenuItem key={t._id} value={t._id}>{t.ad}</MenuItem>)}
          </TextField>
          {secilenTur?.varyantlar?.length > 0 && (
            <TextField
              select size="small" label="Tür (Şahıs / Şirket)" value={seciliVaryant}
              onChange={(e) => { setSeciliVaryant(e.target.value); }}
              helperText="Seçime göre istenen evraklar ve mail metni değişir"
            >
              {secilenTur.varyantlar.map((v) => <MenuItem key={v.kod} value={v.kod}>{v.ad}</MenuItem>)}
            </TextField>
          )}

          {/* 🔀 Koşullu sorular — yalnızca şablonda soru tanımlıysa çıkar */}
          {sorular.length > 0 && (
            <Box sx={{ border: '1px solid #e2e8f0', p: 1.5, background: '#f8fafc' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                Yatırım Bilgileri ({sorular.filter((q) => cevaplar[q.id]).length}/{sorular.length} cevaplandı)
              </Typography>
              <Stack spacing={1.5}>
                {sorular.map((soru) => (
                  <FormControl key={soru.id}>
                    <FormLabel sx={{ fontSize: '0.8rem', color: '#334155', '&.Mui-focused': { color: '#334155' } }}>
                      {soru.metin}
                    </FormLabel>
                    <RadioGroup
                      row
                      value={cevaplar[soru.id] || ''}
                      onChange={(e) => setCevaplar((o) => ({ ...o, [soru.id]: e.target.value }))}
                    >
                      <FormControlLabel value="EVET" control={<Radio size="small" />}
                        label={<Typography variant="body2">Evet</Typography>} />
                      <FormControlLabel value="HAYIR" control={<Radio size="small" />}
                        label={<Typography variant="body2">Hayır</Typography>} />
                    </RadioGroup>
                  </FormControl>
                ))}
              </Stack>
              <Alert severity={tumSorularCevaplandi ? 'success' : 'info'} sx={{ mt: 1.5, py: 0.5 }}>
                {tumSorularCevaplandi
                  ? `Bu cevaplara göre ${uygunEvraklar.length} evrak uygun (toplam ${adayEvraklar.length} tanımlı).`
                  : 'Tüm soruları cevaplayın; istenecek evrak listesi cevaplara göre belirlenecek.'}
              </Alert>
            </Box>
          )}

          {seciliTur && tumSorularCevaplandi && uygunEvraklar.length > 0 && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              <b>{uygunEvraklar.length} evrak</b> bu talebe eklenecek. Hangilerinin
              isteneceğini ve sıralamayı, talep açıldıktan sonra
              “1. İstenen Evraklar” bölümünden (“Mailde iste”) düzenleyebilirsiniz.
            </Alert>
          )}
          {hata && <Alert severity="error" sx={{ py: 0.5 }}>{hata}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={kapat}>Vazgeç</Button>
        <Button variant="contained" onClick={olustur}
          disabled={kaydediyor || !firma || !seciliTur || !tumSorularCevaplandi}>
          {sorular.length > 0 && !tumSorularCevaplandi
            ? `${sorular.length - sorular.filter((q) => cevaplar[q.id]).length} soru kaldı`
            : 'Talebi Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
