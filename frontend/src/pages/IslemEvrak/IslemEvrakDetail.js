// 🧩 İŞLEM VE EVRAK YÖNETİMİ - Talep detayı (/islem-evrak/:id)
// Müşteri sheet'indeki akış tek ekranda:
//   1) İstenenler listesi — ekle/çıkar/düzenle, örnek dosya iliştir
//   2) Mail — düzenle, örnek dosyaları ekle, gönder
//   3) Gelen evraklar — firmanın linkten yüklediği dosyalar

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, Chip, IconButton, Tooltip,
  Checkbox, FormControlLabel, MenuItem, Snackbar, Alert, CircularProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import UploadProgress from '../../components/common/UploadProgress';
import svc from '../../services/islemEvrakService';
import usePanoDosyaYapistir from '../../hooks/usePanoDosyaYapistir';
import { tasi } from '../../utils/dizi';

// 📎 Toplu örnek yükleme — dosya adını evrak adıyla eşleştirme
// Müşteri: "mail düzenlerken bunları manuel eklememiz gerekiyor, arkadaşlara kafa
// karıştırıcı geldi, daha kolay yükleme yolu bulabilir miyiz?" Tek tek satır satır
// "Örnek" düğmesine basmak yerine hepsi bir kerede bırakılıp otomatik eşleştiriliyor.
const sadelestir = (metin) => (metin || '')
  .replace(/\.[^.]+$/, '')                       // uzantıyı at
  .toLocaleLowerCase('tr')
  .replace(/[ı]/g, 'i').replace(/[ş]/g, 's').replace(/[ç]/g, 'c')
  .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ö]/g, 'o')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Ortak kelime oranı: kısa olan tarafa göre normalize edilir ki
// "SGK.pdf" ile "SGK Borcu Yoktur Yazısı" eşleşebilsin
const eslesmePuani = (dosyaAdi, evrakAdi) => {
  const kelimeler = (m) => sadelestir(m).split(' ').filter((k) => k.length > 2);
  const a = kelimeler(dosyaAdi); const b = kelimeler(evrakAdi);
  if (!a.length || !b.length) return 0;
  // Tam eşitlik yerine önek eşleşmesi: Türkçe ekler yüzünden dosya adı ile evrak adı
  // sık sık "taahhutname" / "taahhutnamesi" gibi ayrışıyor.
  const uyuyor = (k) => b.some((x) => x === k || (k.length >= 4 && (x.startsWith(k) || k.startsWith(x))));
  const ortak = a.filter(uyuyor).length;
  return ortak / Math.min(a.length, b.length);
};

// Her dosyayı en iyi eşleşen SATIRA atar; bir satır iki dosya almaz
const dosyalariEslestir = (dosyalar, evraklar) => {
  const kullanilan = new Set();
  return dosyalar.map((file) => {
    let enIyi = -1; let enIyiPuan = 0.34; // eşiğin altındakini kullanıcı seçsin
    evraklar.forEach((e, i) => {
      if (kullanilan.has(i)) return;
      const p = eslesmePuani(file.name, e.ad);
      if (p > enIyiPuan) { enIyiPuan = p; enIyi = i; }
    });
    if (enIyi >= 0) kullanilan.add(enIyi);
    return { file, evrakIndex: enIyi };
  });
};

const IslemEvrakDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [talep, setTalep] = useState(null);
  const [tur, setTur] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [yukleme, setYukleme] = useState(null); // örnek dosya yükleme göstergesi
  const [snack, setSnack] = useState(null);

  // İstenen evrak listesi (yerel düzenleme — Kaydet ile gönderilir)
  const [evraklar, setEvraklar] = useState([]);
  // Mail alanları
  const [mail, setMail] = useState({ to: '', cc: '', subject: '', body: '', uploadLink: '', smtpConfigured: true });
  // 📎 Ek seçimi: örnek dosyası olan her evrak VARSAYILAN OLARAK eklenir; burada yalnızca
  // kullanıcının elle KALDIRDIKLARI tutulur. Böylece yeni yüklenen bir örnek dosya ayrıca
  // seçilmeye gerek kalmadan maile girer.
  // Önceki tasarım "seçilenler" listesiydi ve örnek dosya yüklendiğinde bu liste
  // güncellenmediği için boş kalıyordu; backend boş diziyi "hiçbirini ekleme" olarak
  // yorumladığından ek hiç gitmiyordu (müşteri: "Örnek dosya yüklememe rağmen ekte görünmüyor").
  const [kaldirilanEkler, setKaldirilanEkler] = useState([]);
  // 📎 Toplu örnek yükleme dialogu: [{ file, evrakIndex }]
  const [topluDialog, setTopluDialog] = useState({ open: false, eslesmeler: [] });

  // Maile gidecek ekler: örnek dosyası olan evraklar eksi kullanıcının kaldırdıkları.
  // `mailGonder` bu değeri kullandığı için erken (talep null iken de) türetilir.
  const ekAdaylari = (talep?.istenenEvraklar || []).filter((e) => e.ornekDosya?.dosyaAdi);
  const gidecekEkIdler = ekAdaylari
    .map((e) => String(e._id))
    .filter((x) => !kaldirilanEkler.includes(x));

  const notify = (message, severity = 'success') => setSnack({ message, severity });
  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';

  const yukle = useCallback(async () => {
    setLoading(true);
    try {
      const t = await svc.talepDetay(id);
      setTalep(t);
      setEvraklar(t.istenenEvraklar || []);
      const tt = await svc.turDetay(t.islemTuru).catch(() => null);
      setTur(tt);
      const m = await svc.mailOnizle(id);
      setMail({
        to: (m.to || []).join(', '),
        cc: (m.cc || []).join(', '),
        subject: m.subject || '',
        body: m.body || '',
        uploadLink: m.uploadLink || '',
        smtpConfigured: m.smtpConfigured
      });
      // Varsayılan zaten "hepsi ekli" (kaldirilanEkler boş) — ayrıca seçim gerekmez
    } catch (e) { notify(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { yukle(); }, [yukle]);

  // ── İstenen evraklar
  const evrakEkle = () => setEvraklar((p) => [...p, { ad: '', aciklama: '', zorunlu: true }]);
  const evrakSil = (i) => setEvraklar((p) => p.filter((_, j) => j !== i));
  const evrakDegistir = (i, alan, deger) =>
    setEvraklar((p) => p.map((e, j) => (j === i ? { ...e, [alan]: deger } : e)));

  // Müşteri: "istenen evrakları sıralayabilelim önem sırasına vs göre."
  // Sıra = dizi sırası; mail listesi de aynı sırayla numaralanıyor. Taşımadan sonra
  // "Kaydet" gerekiyor — evraklariKaydet tüm diziyi gönderdiği için sıra korunuyor.
  const evrakTasi = (i, yon) => setEvraklar((p) => tasi(p, i, yon));

  // Evrak listesi değişince mail gövdesindeki {evrakListesi} bayatlar.
  // Kaydedilmiş taslak YOKSA metni şablondan tazeleriz; VARSA kullanıcının yazdığına
  // dokunmayız — bunun yerine ekranda "taslak güncel değil" uyarısı gösterilir.
  const mailMetniniTazele = async (guncelTalep) => {
    if (guncelTalep?.mailGovdesi) return; // kullanıcı taslağı var, ezme
    try {
      const m = await svc.mailOnizle(id);
      setMail((p) => ({ ...p, subject: m.subject || '', body: m.body || '' }));
    } catch (e) { /* önizleme tazelenemezse mevcut metin kalsın */ }
  };

  const evraklariKaydet = async () => {
    const temiz = evraklar.filter((e) => String(e.ad || '').trim());
    setBusy('evrak');
    try {
      const g = await svc.talepGuncelle(id, { istenenEvraklar: temiz });
      setTalep(g); setEvraklar(g.istenenEvraklar || []);
      await mailMetniniTazele(g);
      notify('İstenen evrak listesi kaydedildi');
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const varyantDegistir = async (kod) => {
    if (!window.confirm('Evrak listesi bu türün şablonuyla yeniden oluşturulacak. Devam edilsin mi?')) return;
    setBusy('varyant');
    try {
      const g = await svc.varyantUygula(id, kod);
      setTalep(g); setEvraklar(g.istenenEvraklar || []);
      notify(`${g.varyantAd || 'Varsayılan'} şablonu uygulandı`);
      const m = await svc.mailOnizle(id);
      setMail((p) => ({ ...p, subject: m.subject, body: m.body }));
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  // Satırdan örnek dosya seçildi. Satır henüz kaydedilmemişse (_id yok) önce listeyi
  // kaydedip sunucudan _id alırız; kullanıcı "önce Kaydet'e bas" diye uğraşmasın.
  const ornekSecildi = async (index, file, ev) => {
    if (ev?.target) ev.target.value = ''; // aynı dosya tekrar seçilebilsin
    if (!file) return;

    const satir = evraklar[index];
    if (satir?._id) return ornekYukle(satir._id, file);

    if (!String(satir?.ad || '').trim()) {
      notify('Örnek eklemeden önce evrak adını yazın.', 'warning');
      return;
    }

    setBusy(`ornek-yeni-${index}`);
    try {
      // Kaydetmede adı boş satırlar elenir; hedef satırın kaydedilmiş listedeki
      // konumunu referans eşitliğiyle buluruz (indeks kayması olmasın).
      const temiz = evraklar.filter((x) => String(x.ad || '').trim());
      const hedefIndex = temiz.indexOf(satir);
      const g = await svc.talepGuncelle(id, { istenenEvraklar: temiz });
      setTalep(g); setEvraklar(g.istenenEvraklar || []);

      const yeniId = g.istenenEvraklar?.[hedefIndex]?._id;
      if (!yeniId) { notify('Satır kaydedildi ama kimliği alınamadı, tekrar deneyin.', 'error'); return; }
      await ornekYukle(yeniId, file);
    } catch (e) {
      notify(errMsg(e), 'error');
    } finally { setBusy(''); }
  };

  const ornekYukle = async (evrakId, file) => {
    if (!file) return;
    setBusy(`ornek-${evrakId}`);
    setYukleme({ fileName: file.name, pct: 0, loaded: 0, total: file.size });
    try {
      const fd = new FormData();
      fd.append('dosyalar', file);
      const g = await svc.ornekDosyaYukle(id, evrakId, fd,
        (p) => setYukleme((o) => (o ? { ...o, ...p } : o)));
      setTalep(g); setEvraklar(g.istenenEvraklar || []);
      await mailMetniniTazele(g);
      notify('Örnek dosya eklendi — maile ek olarak eklenecek');
    } catch (e) { notify(e?.kullaniciMesaji || errMsg(e), 'error'); } finally { setBusy(''); setYukleme(null); }
  };

  // ── 📎 Toplu örnek yükleme
  const topluDosyaSecildi = (dosyalar) => {
    const liste = Array.from(dosyalar || []);
    if (!liste.length) return;
    const adliSatirlar = evraklar.filter((e) => String(e.ad || '').trim());
    if (!adliSatirlar.length) {
      notify('Önce evrak satırlarını ekleyin, sonra örnekleri toplu bırakın.', 'warning');
      return;
    }
    setTopluDialog({ open: true, eslesmeler: dosyalariEslestir(liste, evraklar) });
  };

  const topluEslesmeDegistir = (i, evrakIndex) =>
    setTopluDialog((o) => ({
      ...o,
      eslesmeler: o.eslesmeler.map((x, j) => (j === i ? { ...x, evrakIndex } : x))
    }));

  const topluYukle = async () => {
    const secililer = topluDialog.eslesmeler.filter((x) => x.evrakIndex >= 0);
    if (!secililer.length) { notify('Eşleştirilmiş dosya yok.', 'warning'); return; }
    setTopluDialog({ open: false, eslesmeler: [] });
    setBusy('toplu');
    try {
      // Satırların _id'si olmadan örnek yüklenemiyor → önce hepsini kaydet
      const temiz = evraklar.filter((x) => String(x.ad || '').trim());
      const g = await svc.talepGuncelle(id, { istenenEvraklar: temiz });
      setTalep(g); setEvraklar(g.istenenEvraklar || []);

      let basarili = 0; let hatali = 0;
      for (let i = 0; i < secililer.length; i++) {
        const { file, evrakIndex } = secililer[i];
        // Kaydetmede adsız satırlar elendiği için hedefi ada göre buluyoruz
        const hedefAd = evraklar[evrakIndex]?.ad;
        const kayitli = (g.istenenEvraklar || []).find((e) => e.ad === hedefAd);
        if (!kayitli?._id) { hatali += 1; continue; }
        setYukleme({ fileName: file.name, pct: 0, loaded: 0, total: file.size, index: i + 1, count: secililer.length });
        try {
          const sonuc = await svc.ornekDosyaYukle(id, kayitli._id, (() => {
            const fd = new FormData(); fd.append('dosyalar', file); return fd;
          })(), (pr) => setYukleme((o) => (o ? { ...o, ...pr } : o)));
          setTalep(sonuc); setEvraklar(sonuc.istenenEvraklar || []);
          basarili += 1;
        } catch (_) { hatali += 1; }
      }
      await yukle();
      notify(
        hatali === 0
          ? `${basarili} örnek dosya eklendi — maile ek olarak gidecek`
          : `${basarili} eklendi, ${hatali} başarısız.`,
        hatali === 0 ? 'success' : (basarili ? 'warning' : 'error')
      );
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); setYukleme(null); }
  };

  // Panodan yapıştırarak da örnek eklenebilsin (ekran görüntüsü/kopyalanan dosya)
  usePanoDosyaYapistir((dosyalar) => topluDosyaSecildi(dosyalar), { aktif: !loading && !busy });

  // ── Mail taslağı (gm modüller: "Maili istediğimiz gibi düzenleyip/kaydedip/silebilelim")
  const virgullu = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  const mailTaslakKaydet = async () => {
    setBusy('mail-kaydet');
    try {
      const g = await svc.talepGuncelle(id, {
        mailKonusu: mail.subject,
        mailGovdesi: mail.body,
        mailAlicilar: virgullu(mail.to),
        mailCc: virgullu(mail.cc)
      });
      setTalep(g);
      notify('Mail taslağı kaydedildi');
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  // Taslağı sil → konu/gövde boşaltılır, önizleme tekrar şablondan üretilir
  const mailTaslakSil = async () => {
    if (!window.confirm('Kaydedilmiş mail taslağı silinecek ve metin şablondan yeniden üretilecek. Devam edilsin mi?')) return;
    setBusy('mail-kaydet');
    try {
      await svc.talepGuncelle(id, { mailKonusu: '', mailGovdesi: '' });
      const m = await svc.mailOnizle(id);
      setMail((p) => ({ ...p, subject: m.subject || '', body: m.body || '' }));
      notify('Taslak silindi — şablon metni yüklendi');
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  // ── Mail
  const mailGonder = async () => {
    setBusy('mail');
    try {
      const sonuc = await svc.mailGonder(id, {
        to: mail.to, cc: mail.cc, subject: mail.subject, body: mail.body, ekEvrakIdler: gidecekEkIdler
      });
      setTalep(sonuc.talep);
      notify(`Mail gönderildi${sonuc.ekSayisi ? ` · ${sonuc.ekSayisi} ek` : ''} ✅`);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const linkKopyala = () => {
    if (mail.uploadLink) {
      navigator.clipboard?.writeText(mail.uploadLink);
      notify('Yükleme linki kopyalandı');
    }
  };

  // 📥 Dosyayı blob olarak indir. Göreli fileUrl'i href vermek frontend origin'ine
  // çözülüp SPA'nın index.html'ini indiriyordu (müşteri: "belgeler açılmıyor/indirilmiyor").
  const dosyaIndir = async (dosyaId, ad) => {
    setBusy(`indir-${dosyaId}`);
    try {
      const res = await svc.dosyaIndir(id, dosyaId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = ad || 'dosya';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      // Blob hata gövdesi JSON'dur; okunabilir mesajı çıkar
      let mesaj = 'Dosya indirilemedi.';
      try { mesaj = JSON.parse(await e?.response?.data?.text())?.message || mesaj; } catch (x) { /* düz metin */ }
      notify(mesaj, 'error');
    } finally { setBusy(''); }
  };

  const yuklenenSil = async (dosyaId) => {
    if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;
    try {
      const g = await svc.yuklenenSil(id, dosyaId);
      setTalep(g);
      notify('Dosya silindi');
    } catch (e) { notify(errMsg(e), 'error'); }
  };

  if (loading) {
    return (
      <LayoutWrapper>
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
      </LayoutWrapper>
    );
  }
  if (!talep) {
    return (
      <LayoutWrapper>
        <Box sx={{ p: 4 }}><Alert severity="error">Talep bulunamadı.</Alert></Box>
      </LayoutWrapper>
    );
  }

  const ornekliEvraklar = ekAdaylari;

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
        {/* Başlık */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/islem-evrak')}><ArrowBackIcon /></IconButton>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{talep.firmaAdi}</Typography>
            <Typography variant="body2" color="text.secondary">
              {talep.islemTuruAdi}{talep.varyantAd ? ` · ${talep.varyantAd}` : ''}
            </Typography>
          </Box>
          {tur?.varyantlar?.length > 0 && (
            <TextField
              select size="small" label="Tür" value={talep.varyantKod || ''}
              onChange={(e) => varyantDegistir(e.target.value)}
              disabled={busy === 'varyant'} sx={{ minWidth: 150 }}
            >
              {tur.varyantlar.map((v) => <MenuItem key={v.kod} value={v.kod}>{v.ad}</MenuItem>)}
            </TextField>
          )}
          <Tooltip title={mail.uploadLink || 'Link üretilecek'}>
            <Chip icon={<ContentCopyIcon />} label="Yükleme linki" onClick={linkKopyala} color="info" size="small" />
          </Tooltip>
          <Tooltip title="Yenile"><IconButton onClick={yukle}><RefreshIcon /></IconButton></Tooltip>
        </Paper>

        {/* 1) İstenen evraklar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>1. İstenen Evraklar ({evraklar.length})</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<AddIcon />} onClick={evrakEkle}>Satır Ekle</Button>
              <Button size="small" variant="contained" startIcon={<SaveIcon />}
                onClick={evraklariKaydet} disabled={busy === 'evrak'}>Kaydet</Button>
            </Stack>
          </Stack>

          {/* 📎 Toplu örnek yükleme — satır satır "Örnek" düğmesine basmak yerine
              hepsini bir kerede bırak, sistem dosya adına göre satırlara dağıtsın */}
          <Box
            component="label"
            onDragOver={(ev) => ev.preventDefault()}
            onDrop={(ev) => { ev.preventDefault(); topluDosyaSecildi(ev.dataTransfer?.files); }}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 0.25, py: 1.5, px: 2, mb: 1.5, textAlign: 'center',
              border: '2px dashed #e2e8f0', background: '#fafafa',
              cursor: busy === 'toplu' ? 'not-allowed' : 'pointer',
              opacity: busy === 'toplu' ? 0.6 : 1
            }}
          >
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
              <AttachFileIcon sx={{ fontSize: 16, verticalAlign: 'text-bottom', mr: 0.5 }} />
              Örnek dosyaları buraya toplu bırakın
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Tıklayıp çoklu seçebilir veya Ctrl/⌘+V ile yapıştırabilirsiniz • dosyalar
              adlarına göre satırlara otomatik eşleştirilir, onaydan önce düzeltebilirsiniz
            </Typography>
            <input hidden multiple type="file"
              onChange={(ev) => { topluDosyaSecildi(ev.target.files); if (ev.target) ev.target.value = ''; }}
              disabled={busy === 'toplu'} />
          </Box>

          {/* 📤 Örnek/şablon dosya yükleme göstergesi */}
          <UploadProgress active={!!yukleme} {...(yukleme || {})} />

          <Stack spacing={1}>
            {evraklar.map((e, i) => (
              <Box key={e._id || i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap', pb: 1, borderBottom: '1px dashed #e2e8f0' }}>
                <Typography variant="caption" sx={{ mt: 1.2, minWidth: 18, textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>
                  {i + 1}.
                </Typography>
                <Tooltip title={e.geldiMi ? 'Firmadan geldi' : 'Bekleniyor'}>
                  {e.geldiMi
                    ? <CheckCircleIcon sx={{ color: '#059669', mt: 1 }} />
                    : <RadioButtonUncheckedIcon sx={{ color: '#cbd5e1', mt: 1 }} />}
                </Tooltip>
                <TextField
                  size="small" placeholder="Evrak adı" value={e.ad || ''}
                  onChange={(ev) => evrakDegistir(i, 'ad', ev.target.value)}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <TextField
                  size="small" placeholder="Açıklama (opsiyonel)" value={e.aciklama || ''}
                  onChange={(ev) => evrakDegistir(i, 'aciklama', ev.target.value)}
                  sx={{ flex: 1.4, minWidth: 220 }}
                />
                <Tooltip title="İşaret kaldırılırsa bu evrak mailde listelenmez ve firma portalinde de görünmez">
                  <FormControlLabel
                    control={<Checkbox size="small" checked={e.zorunlu !== false}
                      onChange={(ev) => evrakDegistir(i, 'zorunlu', ev.target.checked)} />}
                    label={<Typography variant="caption">Mailde iste</Typography>}
                  />
                </Tooltip>
                {/* Buton kaydedilmemiş satırlarda da görünür: eskiden `e._id &&` ile gizleniyordu,
                    "Satır Ekle" ile eklenen satırda hiç çıkmıyordu (müşteri: "sonradan satır
                    ekleyince örnek yükleyemiyoruz"). Artık satır önce otomatik kaydedilir. */}
                {(
                  <Tooltip title={e.ornekDosya?.dosyaAdi
                    ? `Örnek: ${e.ornekDosya.dosyaAdi}`
                    : (e._id ? 'Örnek/şablon dosya ekle' : 'Örnek ekle — satır önce otomatik kaydedilir')}>
                    <Button component="label" size="small" variant={e.ornekDosya?.dosyaAdi ? 'contained' : 'outlined'}
                      color={e.ornekDosya?.dosyaAdi ? 'success' : 'primary'}
                      startIcon={<AttachFileIcon />} disabled={busy.startsWith('ornek-')}>
                      {e.ornekDosya?.dosyaAdi ? 'Örnek ✓' : 'Örnek'}
                      <input hidden type="file" onChange={(ev) => ornekSecildi(i, ev.target.files?.[0], ev)} />
                    </Button>
                  </Tooltip>
                )}
                <Stack direction="row" spacing={0} alignItems="center">
                  <Tooltip title="Yukarı taşı">
                    <span>
                      <IconButton size="small" disabled={i === 0} onClick={() => evrakTasi(i, -1)} sx={{ p: 0.25 }}>
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Aşağı taşı">
                    <span>
                      <IconButton size="small" disabled={i === evraklar.length - 1} onClick={() => evrakTasi(i, 1)} sx={{ p: 0.25 }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
                <Tooltip title="Satırı sil">
                  <IconButton size="small" color="error" onClick={() => evrakSil(i)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Tooltip>
                {e.isteyenAdi && (
                  <Typography variant="caption" color="text.secondary" sx={{ width: '100%', pl: 4.5 }}>
                    İsteyen: {e.isteyenAdi}
                    {e.istenmeTarihi ? ` · ${new Date(e.istenmeTarihi).toLocaleDateString('tr-TR')}` : ''}
                  </Typography>
                )}
              </Box>
            ))}
            {evraklar.length === 0 && (
              <Typography variant="body2" color="text.secondary">Henüz evrak eklenmedi. "Satır Ekle" ile başlayın.</Typography>
            )}
          </Stack>
        </Paper>

        {/* 2) Mail */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>2. Mail Gönderimi</Typography>
          {!mail.smtpConfigured && <Alert severity="info" sx={{ mb: 1 }}>SMTP yapılandırılmamış — gönderim devre dışı.</Alert>}
          {/* Taslak durumu görünür olsun: kullanıcı "kaydetmiyor" sanmasın */}
          {talep.mailGovdesi ? (
            <Alert severity="success" sx={{ mb: 1 }}>
              Kaydedilmiş taslak kullanılıyor — sayfayı yenilesen de bu metin kalır.
              Evrak listesini değiştirdiysen metni elle güncelle ya da <strong>Taslağı Sil</strong> ile şablondan yeniden üret.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 1 }}>
              Metin şablondan üretiliyor. Düzenlemelerinin kalıcı olması için <strong>Taslağı Kaydet</strong>'e bas —
              aksi halde sayfa yenilendiğinde şablon metni geri gelir.
            </Alert>
          )}

          {ornekliEvraklar.length > 0 && (
            <Box sx={{ mb: 1.5, p: 1.25, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                Maile eklenecek örnek dosyalar:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {ornekliEvraklar.map((e) => {
                  const secili = !kaldirilanEkler.includes(String(e._id));
                  return (
                    <Chip
                      key={e._id} size="small"
                      label={e.ornekDosya.dosyaAdi}
                      color={secili ? 'primary' : 'default'}
                      variant={secili ? 'filled' : 'outlined'}
                      onClick={() => setKaldirilanEkler((p) =>
                        secili ? [...p, String(e._id)] : p.filter((x) => x !== String(e._id)))}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          <Stack spacing={1.5}>
            <TextField label="Kime" size="small" fullWidth value={mail.to}
              onChange={(e) => setMail((p) => ({ ...p, to: e.target.value }))}
              placeholder="firma@ornek.com (virgülle birden fazla)" />
            <TextField label="CC" size="small" fullWidth value={mail.cc}
              onChange={(e) => setMail((p) => ({ ...p, cc: e.target.value }))} placeholder="isteğe bağlı" />
            <TextField label="Konu" size="small" fullWidth value={mail.subject}
              onChange={(e) => setMail((p) => ({ ...p, subject: e.target.value }))} />
            <TextField label="İçerik" fullWidth multiline minRows={12} value={mail.body}
              onChange={(e) => setMail((p) => ({ ...p, body: e.target.value }))}
              helperText="Metni istediğiniz gibi düzenleyebilirsiniz — mail bu haliyle gönderilir." />
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              {talep.mailGonderimSayisi > 0
                ? `${talep.mailGonderimSayisi} kez gönderildi · Son: ${new Date(talep.sonMailTarihi).toLocaleString('tr-TR')}`
                : 'Henüz gönderilmedi'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" startIcon={<SaveIcon />} onClick={mailTaslakKaydet} disabled={busy === 'mail-kaydet'}>
                Taslağı Kaydet
              </Button>
              <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={mailTaslakSil}
                disabled={busy === 'mail-kaydet' || !talep.mailGovdesi}>
                Taslağı Sil
              </Button>
              <Button variant="contained" startIcon={busy === 'mail' ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={mailGonder} disabled={busy === 'mail' || !mail.smtpConfigured || !mail.to.includes('@')}>
                SMTP ile Gönder
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* 3) Gelen evraklar */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            3. Firmadan Gelen Evraklar ({(talep.yuklenenEvraklar || []).length})
          </Typography>
          {(talep.yuklenenEvraklar || []).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Henüz yükleme yok. Firma maildeki bağlantıdan dosya yükleyince burada listelenir.
            </Typography>
          )}
          <Stack spacing={1}>
            {(talep.yuklenenEvraklar || []).map((y) => (
              <Box key={y._id} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px dashed #e2e8f0', pb: 0.75 }}>
                {y.istenenEvrakAdi && <Chip size="small" variant="outlined" label={y.istenenEvrakAdi} />}
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {new Date(y.yuklemeTarihi).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }} noWrap>{y.orijinalAd || y.dosyaAdi}</Typography>
                {y.yukleyenAdi && <Typography variant="caption" color="text.secondary">{y.yukleyenAdi}</Typography>}
                <Button size="small" onClick={() => dosyaIndir(y._id, y.orijinalAd || y.dosyaAdi)}
                  disabled={busy === `indir-${y._id}`}>
                  {busy === `indir-${y._id}` ? 'İndiriliyor…' : 'Aç'}
                </Button>
                <Tooltip title="Sil">
                  <IconButton size="small" color="error" onClick={() => yuklenenSil(y._id)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Divider sx={{ my: 2, opacity: 0 }} />
      </Box>

      {/* 📎 Toplu örnek yükleme — eşleştirme onayı.
          Otomatik eşleştirme yanılabilir; yüklemeden önce kullanıcı görüp düzeltir. */}
      <Dialog open={topluDialog.open} onClose={() => setTopluDialog({ open: false, eslesmeler: [] })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Örnek dosyaları eşleştir
          <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 400 }}>
            {topluDialog.eslesmeler.length} dosya • dosya adına göre önerildi, değiştirebilirsiniz
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {topluDialog.eslesmeler.map((x, i) => (
              <Box key={`${x.file.name}-${i}`}>
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                  {x.file.name}
                  <Typography component="span" variant="caption" sx={{ color: '#94a3b8', ml: 1 }}>
                    {(x.file.size / 1024).toFixed(1)} KB
                  </Typography>
                </Typography>
                <TextField
                  select fullWidth size="small" sx={{ mt: 0.5 }}
                  value={x.evrakIndex}
                  onChange={(ev) => topluEslesmeDegistir(i, Number(ev.target.value))}
                  error={x.evrakIndex < 0}
                  helperText={x.evrakIndex < 0 ? 'Eşleşme bulunamadı — satır seçin veya atlanacak' : ' '}
                >
                  <MenuItem value={-1}><em>Bu dosyayı atla</em></MenuItem>
                  {evraklar.map((e, j) => (
                    <MenuItem key={e._id || j} value={j} disabled={!String(e.ad || '').trim()}>
                      {e.ad || '(adsız satır)'}{e.ornekDosya?.dosyaAdi ? ' — mevcut örneğin üzerine yazılır' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopluDialog({ open: false, eslesmeler: [] })} sx={{ textTransform: 'none' }}>Vazgeç</Button>
          <Button variant="contained" onClick={topluYukle}
            disabled={!topluDialog.eslesmeler.some((x) => x.evrakIndex >= 0)}
            sx={{ textTransform: 'none' }}>
            {`Yükle (${topluDialog.eslesmeler.filter((x) => x.evrakIndex >= 0).length})`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : null}
      </Snackbar>
    </LayoutWrapper>
  );
};

export default IslemEvrakDetail;
