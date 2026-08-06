// 🗂️ İŞLEM TÜRÜ YÖNETİMİ - /islem-evrak/turler
// Müşteri: "bu işlem türlerine kendimiz ekleme yapamıyoruz gibi"
// Backend CRUD'u (POST/PUT/DELETE /api/islem-evrak/turler) baştan vardı ama arayüzü yoktu;
// yeni bir işlem türü ancak seed ile eklenebiliyordu. Bu ekran o boşluğu kapatır.
//
// Yapı: solda tür listesi, sağda seçili türün editörü.
// Bir tür "varyantlı" (Şahıs/Şirket gibi) ya da "varyantsız" olabilir:
//   • varyant varsa evrak listesi ve mail metni varyant bazında tutulur
//   • varyant yoksa türün kendi listesi/metni kullanılır (IslemTuru.varyantCoz mantığı)

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, IconButton, Tooltip,
  MenuItem, Snackbar, Alert, Divider, List, ListItemButton, ListItemText,
  Accordion, AccordionSummary, AccordionDetails, Checkbox, FormControlLabel, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/islemEvrakService';

// Mail gövdesinde kullanılabilecek yer tutucular (islemEvrakService.mailOlustur ile aynı liste)
const PLACEHOLDERLAR = ['{firmaAdi}', '{islemAdi}', '{varyant}', '{evrakListesi}', '{uploadLink}', '{imza}'];

const bosEvrak = () => ({ ad: '', aciklama: '', zorunlu: true });
const bosVaryant = () => ({ kod: '', ad: '', mailKonusu: '', mailGovdesi: '', istenenEvraklar: [] });
const bosTur = () => ({
  _id: null, ad: '', aciklama: '', mailKonusu: '', mailGovdesi: '',
  istenenEvraklar: [], varyantlar: [], aktif: true, siraNo: 0
});

// Türkçe karakterleri sadeleştirip kod üretir (backend de aynı kuralı uyguluyor)
const kodTuret = (metin) => String(metin || '').toLowerCase()
  .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
  .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

// ── Evrak listesi editörü (hem tür hem varyant seviyesinde kullanılır)
const EvrakListesiEditoru = ({ evraklar, onChange, baslik }) => (
  <Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
        {baslik} ({evraklar.length})
      </Typography>
      <Button size="small" startIcon={<AddIcon />} onClick={() => onChange([...evraklar, bosEvrak()])}>
        Evrak Ekle
      </Button>
    </Stack>

    {evraklar.length === 0 && (
      <Typography variant="caption" color="text.secondary">
        Henüz evrak eklenmedi.
      </Typography>
    )}

    <Stack spacing={1}>
      {evraklar.map((e, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            size="small" label="Evrak adı" value={e.ad || ''} sx={{ flex: '1 1 220px' }}
            onChange={(ev) => onChange(evraklar.map((x, j) => (j === i ? { ...x, ad: ev.target.value } : x)))}
          />
          <TextField
            size="small" label="Açıklama" value={e.aciklama || ''} sx={{ flex: '2 1 280px' }}
            onChange={(ev) => onChange(evraklar.map((x, j) => (j === i ? { ...x, aciklama: ev.target.value } : x)))}
          />
          <FormControlLabel
            sx={{ mr: 0 }}
            control={
              <Checkbox
                size="small" checked={e.zorunlu !== false}
                onChange={(ev) => onChange(evraklar.map((x, j) => (j === i ? { ...x, zorunlu: ev.target.checked } : x)))}
              />
            }
            label={<Typography variant="caption">Zorunlu</Typography>}
          />
          {/* Örnek dosya bilgisi salt okunur: dosya yükleme talep ekranından yapılır */}
          {e.ornekDosya?.dosyaAdi && (
            <Tooltip title={`Örnek dosya: ${e.ornekDosya.dosyaAdi}`}>
              <Chip size="small" color="success" variant="outlined" label="Örnek ✓" />
            </Tooltip>
          )}
          <Tooltip title="Satırı sil">
            <IconButton size="small" color="error" onClick={() => onChange(evraklar.filter((_, j) => j !== i))}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Stack>
  </Box>
);

const IslemTuruYonetimi = () => {
  const navigate = useNavigate();
  const [turler, setTurler] = useState([]);
  const [seciliId, setSeciliId] = useState(null);
  const [form, setForm] = useState(bosTur());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [snack, setSnack] = useState(null);

  const notify = (message, severity = 'success') => setSnack({ message, severity });
  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';

  const listeyiYukle = useCallback(async (secilecekId) => {
    setLoading(true);
    try {
      // hepsi=1 → pasifleştirilmiş türler de görünsün (tekrar aktifleştirilebilsinler)
      const d = await svc.turler({ hepsi: '1' });
      setTurler(d || []);
      const hedef = secilecekId || (d && d[0]?._id) || null;
      if (hedef) {
        const tam = await svc.turDetay(hedef);
        setSeciliId(hedef);
        setForm({ ...bosTur(), ...tam });
      }
    } catch (e) { notify(errMsg(e), 'error'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { listeyiYukle(); }, [listeyiYukle]);

  const turSec = async (id) => {
    try {
      const tam = await svc.turDetay(id);
      setSeciliId(id);
      setForm({ ...bosTur(), ...tam });
    } catch (e) { notify(errMsg(e), 'error'); }
  };

  const yeniTur = () => { setSeciliId(null); setForm(bosTur()); };

  const alan = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const kaydet = async () => {
    if (!String(form.ad || '').trim()) { notify('İşlem adı zorunludur.', 'warning'); return; }
    // Varyant kodları benzersiz ve dolu olmalı — varyantCoz koda göre eşleşme yapıyor
    const kodlar = (form.varyantlar || []).map((v) => v.kod);
    if (kodlar.some((k) => !String(k || '').trim())) { notify('Her varyantın kodu olmalı.', 'warning'); return; }
    if (new Set(kodlar).size !== kodlar.length) { notify('Varyant kodları benzersiz olmalı.', 'warning'); return; }

    setBusy('kaydet');
    try {
      const govde = {
        ad: form.ad, aciklama: form.aciklama,
        mailKonusu: form.mailKonusu, mailGovdesi: form.mailGovdesi,
        istenenEvraklar: form.istenenEvraklar, varyantlar: form.varyantlar,
        aktif: form.aktif !== false, siraNo: Number(form.siraNo) || 0
      };
      const kayit = seciliId
        ? await svc.turGuncelle(seciliId, govde)
        : await svc.turOlustur({ ...govde, kod: kodTuret(form.ad) });
      notify(seciliId ? 'İşlem türü güncellendi' : 'İşlem türü oluşturuldu');
      await listeyiYukle(kayit?._id || seciliId);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const sil = async () => {
    if (!seciliId) return;
    if (!window.confirm('Bu işlem türü silinecek. Taleplerde kullanılıyorsa silinmez, pasifleştirilir. Devam edilsin mi?')) return;
    setBusy('sil');
    try {
      const r = await svc.turSil(seciliId);
      notify(r?.message || 'İşlem türü silindi');
      setSeciliId(null); setForm(bosTur());
      await listeyiYukle();
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  // Varyant yardımcıları
  const varyantDegistir = (i, yama) =>
    alan('varyantlar', form.varyantlar.map((v, j) => (j === i ? { ...v, ...yama } : v)));

  const varyantEkle = () => alan('varyantlar', [...(form.varyantlar || []), bosVaryant()]);
  const varyantSil = (i) => alan('varyantlar', form.varyantlar.filter((_, j) => j !== i));

  // Türün kendi evrak listesini varyanta kopyala (sıfırdan yazmak yerine)
  const varyantaKopyala = (i) =>
    varyantDegistir(i, { istenenEvraklar: (form.istenenEvraklar || []).map((e) => ({ ...e })) });

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/islem-evrak')}><ArrowBackIcon /></IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>İşlem Türü Yönetimi</Typography>
            <Typography variant="caption" color="text.secondary">
              Talep açarken seçilecek işlem türlerini, istenen evrakları ve mail şablonlarını burada tanımlarsın.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={yeniTur}>Yeni Tür</Button>
        </Stack>

        {loading && <CircularProgress size={22} sx={{ mb: 2 }} />}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {/* Sol: tür listesi */}
          <Paper sx={{ p: 1, width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
            <List dense disablePadding>
              {turler.map((t) => (
                <ListItemButton
                  key={t._id} selected={t._id === seciliId} onClick={() => turSec(t._id)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={t.ad}
                    secondary={`${(t.varyantlar || []).length} varyant · ${(t.istenenEvraklar || []).length} evrak`}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                  />
                  {t.aktif === false && <Chip size="small" label="Pasif" sx={{ height: 18, fontSize: '0.6rem' }} />}
                </ListItemButton>
              ))}
              {turler.length === 0 && !loading && (
                <Typography variant="caption" sx={{ p: 1, display: 'block' }} color="text.secondary">
                  Henüz işlem türü yok. "Yeni Tür" ile ekle.
                </Typography>
              )}
            </List>
          </Paper>

          {/* Sağ: editör */}
          <Paper sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {seciliId ? 'Türü Düzenle' : 'Yeni İşlem Türü'}
              </Typography>
              <Stack direction="row" spacing={1}>
                {seciliId && (
                  <Button size="small" color="error" startIcon={<DeleteOutlineIcon />}
                    onClick={sil} disabled={busy === 'sil'}>Sil</Button>
                )}
                <Button size="small" variant="contained" startIcon={<SaveIcon />}
                  onClick={kaydet} disabled={busy === 'kaydet'}>Kaydet</Button>
              </Stack>
            </Stack>

            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField size="small" label="İşlem Adı" value={form.ad}
                  onChange={(e) => alan('ad', e.target.value)} sx={{ flex: '2 1 260px' }} required />
                <TextField size="small" label="Sıra No" type="number" value={form.siraNo}
                  onChange={(e) => alan('siraNo', e.target.value)} sx={{ width: 110 }} />
                <TextField size="small" select label="Durum" value={form.aktif !== false ? '1' : '0'}
                  onChange={(e) => alan('aktif', e.target.value === '1')} sx={{ width: 130 }}>
                  <MenuItem value="1">Aktif</MenuItem>
                  <MenuItem value="0">Pasif</MenuItem>
                </TextField>
              </Stack>

              <TextField size="small" label="Açıklama" value={form.aciklama}
                onChange={(e) => alan('aciklama', e.target.value)} fullWidth />

              <Divider />

              {/* Varsayılan (varyantsız) tanım */}
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                VARSAYILAN TANIM — varyant seçilmediğinde bu kullanılır
              </Typography>
              <TextField size="small" label="Mail Konusu" value={form.mailKonusu}
                onChange={(e) => alan('mailKonusu', e.target.value)} fullWidth />
              <TextField size="small" label="Mail Gövdesi" value={form.mailGovdesi}
                onChange={(e) => alan('mailGovdesi', e.target.value)} fullWidth multiline minRows={6}
                helperText={`Yer tutucular: ${PLACEHOLDERLAR.join('  ')}`} />
              <EvrakListesiEditoru
                baslik="İstenen Evraklar (varsayılan)"
                evraklar={form.istenenEvraklar || []}
                onChange={(v) => alan('istenenEvraklar', v)}
              />

              <Divider />

              {/* Varyantlar */}
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                  VARYANTLAR — ör. Şahıs / Şirket ({(form.varyantlar || []).length})
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={varyantEkle}>Varyant Ekle</Button>
              </Stack>

              {(form.varyantlar || []).map((v, i) => (
                <Accordion key={i} defaultExpanded={!v.ad} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {v.ad || 'Yeni varyant'}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {(v.istenenEvraklar || []).length} evrak
                      </Typography>
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <TextField size="small" label="Varyant Adı" value={v.ad || ''} sx={{ flex: '1 1 180px' }}
                          onChange={(e) => varyantDegistir(i, {
                            ad: e.target.value,
                            // Kod boşken addan türet; kullanıcı elle yazdıysa dokunma
                            kod: v.kod ? v.kod : kodTuret(e.target.value)
                          })} />
                        <TextField size="small" label="Kod" value={v.kod || ''} sx={{ flex: '1 1 140px' }}
                          onChange={(e) => varyantDegistir(i, { kod: e.target.value })}
                          helperText="Benzersiz, boşluksuz (ör. sahis)" />
                        <Tooltip title="Varsayılan evrak listesini bu varyanta kopyala">
                          <span>
                            <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => varyantaKopyala(i)}>
                              Listeyi Kopyala
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Varyantı sil">
                          <IconButton size="small" color="error" onClick={() => varyantSil(i)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <TextField size="small" label="Mail Konusu (boşsa varsayılan kullanılır)"
                        value={v.mailKonusu || ''} fullWidth
                        onChange={(e) => varyantDegistir(i, { mailKonusu: e.target.value })} />
                      <TextField size="small" label="Mail Gövdesi (boşsa varsayılan kullanılır)"
                        value={v.mailGovdesi || ''} fullWidth multiline minRows={5}
                        onChange={(e) => varyantDegistir(i, { mailGovdesi: e.target.value })}
                        helperText={`Yer tutucular: ${PLACEHOLDERLAR.join('  ')}`} />

                      <EvrakListesiEditoru
                        baslik="İstenen Evraklar (bu varyant)"
                        evraklar={v.istenenEvraklar || []}
                        onChange={(list) => varyantDegistir(i, { istenenEvraklar: list })}
                      />
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}

              <Alert severity="info" variant="outlined">
                Örnek/şablon dosyalar (ör. taahhütname) talep ekranından yüklenir; buradaki
                "Örnek ✓" işareti yalnızca bilgi amaçlıdır.
              </Alert>
            </Stack>
          </Paper>
        </Box>
      </Box>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack?.severity || 'success'} onClose={() => setSnack(null)}>{snack?.message}</Alert>
      </Snackbar>
    </LayoutWrapper>
  );
};

export default IslemTuruYonetimi;
