// 🔗 MÜŞTERİ BELGE SAYFASI — /belge/:token (AUTH YOK)
//
// Müşteri (13.10.2026): firma kendi teşvik belgesini görür (belge ekranındaki sekmeler — evrak listesi
// hariç), yerli ve ithal listede makinelerine fatura (ithalde beyanname) kalemi girer. Kaydedilen kalem
// firmaya kilitlidir ("Onaylandı"); düzeltmeyi personel yapar. Sekmeler belge ekranıyla AYNI
// bileşenlerden çizilir — ekran ile müşteri linki ayrışmasın.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Grid, TextField, Table, TableHead, TableBody, TableRow, TableCell, Chip, Stack, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LockIcon from '@mui/icons-material/Lock';
import api, { uploadPost } from '../../utils/axios';
import { renk, SekmeSeridi, VeriTablosu } from '../../tasarim';
import { KunyePaneli, FinansalPaneli } from '../../components/Tesvik/BelgeBilgiPanelleri';
import { YatirimCinsiTablosu, UrunTablosu, OzelSartTablosu, DestekUnsuruTablosu } from '../../components/Tesvik/BelgeSekmeTablolari';
import TutarAlani from '../../components/common/TutarAlani';
import UploadProgress from '../../components/common/UploadProgress';

// Belge ekranının sekme sırası (ETUYS) — "Evrak Listesi" firmaya açılmaz
const BOLUMLER = [
  { anahtar: 'kunye', baslik: 'Belge Künye Bilgileri' },
  { anahtar: 'cins', baslik: 'Yatırım Cinsi' },
  { anahtar: 'urun', baslik: 'Ürün Bilgileri' },
  { anahtar: 'yerli', baslik: 'Yerli Liste' },
  { anahtar: 'ithal', baslik: 'İthal Liste' },
  { anahtar: 'finansal', baslik: 'Finansal Bilgiler' },
  { anahtar: 'sart', baslik: 'Özel Şartlar' },
  { anahtar: 'destek', baslik: 'Destek Unsurları' }
];

const para = (v, kod = 'TRY') => {
  try { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: kod, maximumFractionDigits: 2 }).format(Number(v) || 0); }
  catch (_) { return `${(Number(v) || 0).toLocaleString('tr-TR')} ${kod}`; }
};
const tarih = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '-');
const BOS_KALEM = { tarih: '', no: '', icerik: '', tutar: 0, adet: '' };
const GIREN_ANAHTARI = 'musteriBelge.giren';
const FATURA_EVRAK_TURLERI = [
  { alan: 'faturaPdf', tur: 'fatura_pdf', etiket: 'Fatura PDF', uzanti: '.pdf' },
  { alan: 'faturaXml', tur: 'fatura_xml', etiket: 'Fatura XML', uzanti: '.xml' },
  { alan: 'yevmiyePdf', tur: 'yevmiye_pdf', etiket: 'Yevmiye Kayıt PDF', uzanti: '.pdf' }
];
const EVRAK_SAYI_SINIRI = 6;
const EVRAK_BOYUT_SINIRI = 10 * 1024 * 1024;
const yeniIstekId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function MusteriBelgeSayfasi() {
  const { token } = useParams();
  return <BelgeGorunumu key={token} token={token} />;
}

function BelgeGorunumu({ token }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');
  const [aktif, setAktif] = useState('kunye');
  const [secili, setSecili] = useState(null); // kalem penceresindeki makine

  useEffect(() => {
    let iptal = false;
    api.get(`/musteri-belge/${token}`)
      .then((r) => { if (!iptal) setVeri(r.data?.data || null); })
      .catch((e) => { if (!iptal) setHata(e?.response?.data?.message || 'Bağlantı açılamadı. Lütfen danışmanınızla iletişime geçin.'); });
    return () => { iptal = true; };
  }, [token]);

  useEffect(() => { document.title = veri ? `Teşvik Belgesi ${veri.belge.belgeYonetimi?.belgeNo || ''}` : 'Teşvik Belgesi'; }, [veri]);

  // Kalem kaydedilince yalnız o makine güncellenir (sayfa yeniden yüklenmez)
  const makineyiGuncelle = (m) => {
    setVeri((v) => {
      const anahtar = m.listType === 'import' ? 'ithal' : 'yerli';
      return { ...v, makineler: { ...v.makineler, [anahtar]: v.makineler[anahtar].map((x) => (x.rowId === m.rowId ? m : x)) } };
    });
    setSecili((onceki) => onceki?.listType === m.listType && onceki?.rowId === m.rowId ? m : onceki);
  };

  if (hata) return <Kabuk><Alert severity="error">{hata}</Alert></Kabuk>;
  if (!veri) return <Kabuk><Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box></Kabuk>;

  const { belge, tur, etiketler, makineler } = veri;
  const by = belge.belgeYonetimi || {};
  const konuGoster = (kod) => (etiketler.konu ? `${kod} — ${etiketler.konu}` : kod);
  const oecdGoster = (kod) => etiketler.oecd || kod || '-';

  return (
    <Kabuk>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {belge.yatirimciUnvan || belge.firma?.tamUnvan || 'Teşvik Belgesi'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Yatırım Teşvik Belgesi · Belge No: {by.belgeNo || '-'} · Belge Id: {by.belgeId || '-'}
        </Typography>
      </Box>

      <SekmeSeridi sekmeler={BOLUMLER.map((b) => (b.anahtar === 'yerli' ? { ...b, baslik: `Yerli Liste (${makineler.yerli.length})` }
        : b.anahtar === 'ithal' ? { ...b, baslik: `İthal Liste (${makineler.ithal.length})` } : b))}
        etkin={aktif} onDegis={setAktif} />
      <Box sx={{ border: `1px solid ${renk.cizgi}`, borderTop: 'none', backgroundColor: renk.yuzey, p: { xs: 1, sm: 1.75 } }}>
        {aktif === 'kunye' && <KunyePaneli tesvik={belge} tur={tur} konuGoster={tur === 'yeni' ? konuGoster : undefined} oecdGoster={oecdGoster} />}
        {aktif === 'cins' && <YatirimCinsiTablosu tesvik={belge} />}
        {aktif === 'urun' && <UrunTablosu tesvik={belge} tur={tur} />}
        {(aktif === 'yerli' || aktif === 'ithal') && (
          <MakineListesi ithal={aktif === 'ithal'} satirlar={aktif === 'ithal' ? makineler.ithal : makineler.yerli} onSec={setSecili} />
        )}
        {aktif === 'finansal' && <FinansalPaneli tesvik={belge} />}
        {aktif === 'sart' && <OzelSartTablosu tesvik={belge} />}
        {aktif === 'destek' && <DestekUnsuruTablosu tesvik={belge} />}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
        Bu sayfa GM Planlama tarafından yalnız sizinle paylaşılmıştır. Bilgilerde hata görürseniz danışmanınıza bildirin.
      </Typography>

      {secili && (
        <KalemPenceresi key={`${secili.listType}:${secili.rowId}`} token={token} makine={secili}
          onClose={() => setSecili(null)} onKaydedildi={makineyiGuncelle} />
      )}
    </Kabuk>
  );
}

function Kabuk({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', py: { xs: 1, sm: 3 }, px: { xs: 1, sm: 2 } }}>
      <Paper sx={{ maxWidth: 1280, mx: 'auto', p: { xs: 1.5, sm: 3 } }}>{children}</Paper>
    </Box>
  );
}

function MakineListesi({ ithal, satirlar, onSec }) {
  const kod = ithal ? 'USD' : 'TRY';
  const sutunlar = useMemo(() => [
    { anahtar: 'siraNo', baslik: 'Sıra', genislik: 56 },
    { anahtar: 'makineId', baslik: 'Makine ID', genislik: 100, bicim: (v) => v || '-' },
    ...(ithal ? [{ anahtar: 'gtipNo', baslik: 'GTİP', genislik: 120, bicim: (v) => v || '-' }] : []),
    { anahtar: 'adi', baslik: 'Adı ve Özelliği', sar: true, bicim: (v) => v || '-' },
    { anahtar: 'miktar', baslik: 'Miktar', genislik: 110, bicim: (_, m) => `${m.miktar || 0} ${m.birim || ''}` },
    { anahtar: 'birimFiyat', baslik: 'Birim Fiyatı', genislik: 140, sayi: true, bicim: (v, m) => para(v, m.birimParaBirimi || kod) },
    { anahtar: 'toplam', baslik: ithal ? 'FOB Toplam ($)' : 'Toplam (TL)', genislik: 150, sayi: true, bicim: (v) => para(v, kod) },
    {
      anahtar: 'fatura', baslik: ithal ? 'Beyanname' : 'Fatura', genislik: 200,
      bicim: (_, m) => (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" sx={{ fontSize: 12 }}>
            {m.kalemler.length ? `${m.kalemler.length} kalem · ${para(m.faturaToplami, kod)}` : '—'}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ py: 0, fontSize: 11, whiteSpace: 'nowrap' }}
            onClick={(e) => { e.stopPropagation(); onSec(m); }}>
            {m.kalemler.length ? 'Gör / Ekle' : 'Kalem Gir'}
          </Button>
        </Stack>
      )
    }
  ], [ithal, kod, onSec]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {ithal
          ? 'Makinenizin satırındaki "Kalem Gir" ile gümrük beyannamesi bilgisini girebilirsiniz.'
          : 'Makinenizin satırındaki "Kalem Gir" ile kestiğiniz/aldığınız faturanın bilgisini girebilirsiniz. Bir makineye birden fazla fatura kalemi girilebilir.'}
      </Typography>
      <VeriTablosu enAzGenislik={760} satirlar={satirlar} anahtarAl={(m) => m.rowId} sutunlar={sutunlar} onSatirTik={onSec}
        bosMetin={ithal ? 'Bu belgede ithal makine yok' : 'Bu belgede yerli makine yok'} />
    </Box>
  );
}

function KalemPenceresi({ token, makine, onClose, onKaydedildi }) {
  const ithal = makine.listType === 'import';
  const kod = ithal ? 'USD' : 'TRY';
  const etiket = ithal ? { tarih: 'Beyanname Tarihi', no: 'Beyanname No' } : { tarih: 'Fatura Tarihi', no: 'Fatura Sayısı' };
  const [form, setForm] = useState(BOS_KALEM);
  const [giren, setGiren] = useState(() => { try { return localStorage.getItem(GIREN_ANAHTARI) || ''; } catch (_) { return ''; } });
  const [islem, setIslem] = useState('');
  const devamEdenIstek = useRef(null);
  const [evrakKalemiId, setEvrakKalemiId] = useState(null);
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const alan = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => () => devamEdenIstek.current?.abort(), []);

  const islemiBaslat = (tur) => {
    if (devamEdenIstek.current) return null;
    const denetim = new AbortController();
    devamEdenIstek.current = denetim;
    setIslem(tur);
    return denetim;
  };

  const islemiBitir = (denetim) => {
    if (devamEdenIstek.current !== denetim) return;
    devamEdenIstek.current = null;
    if (!denetim.signal.aborted) setIslem('');
  };

  const kapat = () => { if (!devamEdenIstek.current) onClose(); };

  const makineYaniti = (r) => {
    const guncel = r.data?.data;
    if (guncel?.rowId !== makine.rowId || guncel?.listType !== makine.listType || !Array.isArray(guncel?.kalemler)) {
      throw new Error('Makine bilgileri güncellenemedi. Lütfen tekrar deneyin.');
    }
    return guncel;
  };

  const kaydet = async () => {
    if (devamEdenIstek.current) return;
    // Firma kaydettiği kalemi düzeltemez — gönderimden önce son kez sorulur
    if (!window.confirm(`Kalem kaydedilsin mi?\n\n${etiket.no}: ${form.no}\nTutar: ${para(form.tutar, kod)}\n\nKaydedilen kalemi siz düzeltemezsiniz; hata olursa danışmanınıza bildirin.`)) return;
    const denetim = islemiBaslat('kalem');
    if (!denetim) return;
    setHata(''); setBilgi('');
    try {
      const r = await api.post(`/musteri-belge/${token}/fatura-kalemi`, {
        listType: makine.listType, rowId: makine.rowId, ...form, tutar: Number(form.tutar) || 0, adet: Number(form.adet) || 0, giren
      }, { signal: denetim.signal });
      if (denetim.signal.aborted) return;
      const guncel = makineYaniti(r);
      try { localStorage.setItem(GIREN_ANAHTARI, giren); } catch (_) { /* gizli sekme */ }
      setForm(BOS_KALEM);
      setBilgi('Kalem kaydedildi. Teşekkür ederiz.');
      onKaydedildi(guncel);
      if (!ithal && guncel.yeniKalemId) setEvrakKalemiId(guncel.yeniKalemId);
    } catch (e) {
      if (!denetim.signal.aborted) setHata(e?.response?.data?.message || e?.message || 'Kaydedilemedi. Lütfen tekrar deneyin.');
    } finally { islemiBitir(denetim); }
  };

  const evrakYukle = async (kalemId, formData, onProgress) => {
    const denetim = islemiBaslat('evrak');
    if (!denetim) return false;
    try {
      const r = await uploadPost(`/musteri-belge/${encodeURIComponent(token)}/fatura-kalemi/${encodeURIComponent(kalemId)}/evrak`,
        formData, { onProgress, signal: denetim.signal });
      if (denetim.signal.aborted) return false;
      onKaydedildi(makineYaniti(r));
      return true;
    } catch (e) {
      if (denetim.signal.aborted) return false;
      throw e;
    } finally { islemiBitir(denetim); }
  };

  return (
    <Dialog open onClose={kapat} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
        {ithal ? 'Beyanname Kalemleri' : 'Fatura Kalemleri'}
        <IconButton onClick={kapat} disabled={!!islem} sx={{ position: 'absolute', right: 8, top: 8 }} aria-label="Kapat"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ bgcolor: '#f8fafc', p: 1.5, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{makine.siraNo}. {makine.adi}</Typography>
          <Typography variant="caption" color="text.secondary">
            {makine.makineId ? `Makine ID ${makine.makineId} · ` : ''}{ithal && makine.gtipNo ? `GTİP ${makine.gtipNo} · ` : ''}
            {makine.miktar} {makine.birim} · Birim: {para(makine.birimFiyat, makine.birimParaBirimi || kod)} · Toplam: {para(makine.toplam, kod)}
          </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Kayıtlı Kalemler ({makine.kalemler.length})</Typography>
        {makine.kalemler.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Henüz kalem girilmedi.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto', mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{etiket.tarih}</TableCell><TableCell>{etiket.no}</TableCell><TableCell>Kalem İçeriği</TableCell>
                  <TableCell align="right">Tutar</TableCell><TableCell align="right">Adet</TableCell><TableCell>Durum</TableCell>
                  {!ithal && <TableCell>Evraklar</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {makine.kalemler.map((k) => {
                  const yuklenebilir = !ithal && k.kaynak === 'firma' && !!k._id;
                  const evraklarAcik = yuklenebilir && String(evrakKalemiId) === String(k._id);
                  return (
                    <React.Fragment key={k._id}>
                      <TableRow>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tarih(k.tarih)}</TableCell>
                        <TableCell>{k.no || '-'}</TableCell>
                        <TableCell sx={{ wordBreak: 'break-word' }}>{k.icerik || '-'}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{para(k.tutar, kod)}</TableCell>
                        <TableCell align="right">{k.adet || 0}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip size="small" icon={<LockIcon sx={{ fontSize: 14 }} />} color={k.kaynak === 'firma' ? 'success' : 'default'}
                            label={k.kaynak === 'firma' ? `Onaylandı${k.girenAdi ? ` · ${k.girenAdi}` : ''}` : 'Danışman girdi'} />
                        </TableCell>
                        {!ithal && (
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {yuklenebilir && (
                              <Button size="small" startIcon={<AttachFileIcon />} disabled={!!islem} aria-expanded={evraklarAcik}
                                onClick={() => setEvrakKalemiId(evraklarAcik ? null : k._id)}>
                                {k.evraklar?.length ? `Evraklar (${k.evraklar.length})` : 'Evrak Yükle'}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      {evraklarAcik && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <FaturaEvrakPaneli kalem={k} rowId={makine.rowId} islem={islem} onYukle={evrakYukle} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Toplam</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{para(makine.faturaToplami, kod)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{makine.faturaAdedi}</TableCell>
                  <TableCell />
                  {!ithal && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}

        <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 1, p: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Yeni Kalem</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" type="date" required label={etiket.tarih} InputLabelProps={{ shrink: true }} value={form.tarih} onChange={alan('tarih')} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth size="small" required label={etiket.no} value={form.no} onChange={alan('no')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Kalem İçeriği" value={form.icerik} onChange={alan('icerik')} />
            </Grid>
            <Grid item xs={8} sm={4}>
              <TutarAlani fullWidth size="small" required label="Kalem Tutarı" value={form.tutar} simge={ithal ? '$' : '₺'}
                onChange={(v) => setForm((f) => ({ ...f, tutar: v }))} />
            </Grid>
            <Grid item xs={4} sm={2}>
              <TextField fullWidth size="small" type="number" label="Adet" value={form.adet} onChange={alan('adet')} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" required label="Adınız Soyadınız" value={giren} onChange={(e) => setGiren(e.target.value)} />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Kaydedilen kalem onaylanmış sayılır, sizin tarafınızdan düzeltilemez veya silinemez.
          </Typography>
        </Box>
        {hata && <Alert severity="error" sx={{ mt: 2 }}>{hata}</Alert>}
        {bilgi && <Alert severity="success" sx={{ mt: 2 }}>{bilgi}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={kapat} disabled={!!islem}>Kapat</Button>
        <Button variant="contained" onClick={kaydet}
          disabled={!!islem || !form.tarih || !form.no.trim() || !(Number(form.tutar) > 0) || !giren.trim()}
          startIcon={islem === 'kalem' ? <CircularProgress size={16} color="inherit" /> : null}>
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function FaturaEvrakPaneli({ kalem, rowId, islem, onYukle }) {
  const [dosyalar, setDosyalar] = useState({});
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [ilerleme, setIlerleme] = useState(null);
  const istekId = useRef(null);
  const panel = useRef(null);
  const adet = Object.values(dosyalar).reduce((toplam, liste) => toplam + liste.length, 0);

  useEffect(() => { panel.current?.scrollIntoView?.({ block: 'nearest' }); }, []);

  const secimiGuncelle = (alan, liste) => {
    setDosyalar((onceki) => ({ ...onceki, [alan]: liste }));
    istekId.current = null;
    setHata('');
    setBilgi('');
  };

  const dosyaSec = (tur, e) => {
    const secilen = Array.from(e.target.files || []);
    e.target.value = '';
    if (islem || !secilen.length) return;
    if (adet + secilen.length > EVRAK_SAYI_SINIRI) {
      setHata(`Bir seferde en fazla ${EVRAK_SAYI_SINIRI} dosya yükleyebilirsiniz.`);
      return;
    }
    const yanlisUzanti = secilen.find((dosya) => !dosya.name.toLowerCase().endsWith(tur.uzanti));
    if (yanlisUzanti) {
      setHata(`${tur.etiket} için ${tur.uzanti.toUpperCase()} dosyası seçin.`);
      return;
    }
    const buyukDosya = secilen.find((dosya) => dosya.size > EVRAK_BOYUT_SINIRI);
    if (buyukDosya) {
      setHata(`${buyukDosya.name} 10 MB sınırını aşıyor.`);
      return;
    }
    secimiGuncelle(tur.alan, [...(dosyalar[tur.alan] || []), ...secilen]);
  };

  const yukle = async () => {
    if (islem || !adet) return;
    setHata('');
    setBilgi('');
    setIlerleme({ pct: 0 });
    const fd = new FormData();
    fd.append('rowId', rowId);
    // Aynı seçimle tekrar denendiğinde, yanıt kaybolsa bile yükleme yinelenmez.
    if (!istekId.current) istekId.current = yeniIstekId();
    fd.append('istekId', istekId.current);
    FATURA_EVRAK_TURLERI.forEach(({ alan }) => (dosyalar[alan] || []).forEach((dosya) => fd.append(alan, dosya)));
    try {
      if (!await onYukle(kalem._id, fd, setIlerleme)) return;
      setDosyalar({});
      istekId.current = null;
      setBilgi('Evraklar yüklendi.');
    } catch (e) {
      setHata(e?.kullaniciMesaji || e?.response?.data?.message || e?.message || 'Evraklar yüklenemedi. Lütfen tekrar deneyin.');
    } finally { setIlerleme(null); }
  };

  return (
    <Box ref={panel} sx={{ p: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Fatura Evrakları · {kalem.no || 'Fatura'}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Bir seferde en fazla 6 dosya, dosya başına en fazla 10 MB yükleyebilirsiniz.
      </Typography>
      <Grid container spacing={1}>
        {FATURA_EVRAK_TURLERI.map((tur) => {
          const yuklenenler = (kalem.evraklar || []).filter((evrak) => evrak.tur === tur.tur);
          return (
            <Grid item key={tur.alan} xs={12} sm={4}>
              <Button component="label" size="small" variant="outlined" startIcon={<AttachFileIcon />} disabled={!!islem}>
                {tur.etiket}
                <input hidden type="file" multiple accept={tur.uzanti} aria-label={tur.etiket}
                  disabled={!!islem} onChange={(e) => dosyaSec(tur, e)} />
              </Button>
              {yuklenenler.length > 0 && (
                <Box component="ul" aria-label={`${tur.etiket} yüklenen dosyalar`} sx={{ m: 0, mt: 0.5, pl: 2 }}>
                  {yuklenenler.map((evrak) => (
                    <Typography key={evrak._id} component="li" variant="caption" sx={{ overflowWrap: 'anywhere' }}>{evrak.dosyaAdi}</Typography>
                  ))}
                </Box>
              )}
              {(dosyalar[tur.alan] || []).map((dosya, indeks) => (
                <Chip key={`${dosya.name}:${indeks}`} size="small" label={dosya.name} title={dosya.name} sx={{ mt: 0.5, mr: 0.5, maxWidth: '100%' }}
                  onDelete={islem ? undefined : () => secimiGuncelle(tur.alan, dosyalar[tur.alan].filter((_, i) => i !== indeks))} />
              ))}
            </Grid>
          );
        })}
      </Grid>
      <Button size="small" variant="contained" onClick={yukle} disabled={!!islem || !adet} sx={{ mt: 1 }}>
        Dosyaları Yükle
      </Button>
      <UploadProgress active={islem === 'evrak'} {...(ilerleme || {})} fileName={`${adet} dosya`} />
      {hata && <Alert severity="error" sx={{ mt: 1 }}>{hata}</Alert>}
      {bilgi && <Alert severity="success" sx={{ mt: 1 }}>{bilgi}</Alert>}
    </Box>
  );
}
