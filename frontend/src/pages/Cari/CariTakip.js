// 💳 CARİ HESAPLAR / ÖDEME TAKİP
//
// Müşteri: "Sol sütunda belge takip'in altına Cari hesaplar/faturalar-ödeme takip gibi bir
// modül ekleyemeyi düşünüyoruz. Firma seçince ödeme takip listesi gelsin ödenen tutar-kalan
// vs gibi klasik cari tablo olarak düşündük, normalde excel'e tutuyoruz biz örnek tablo
// ekledim bunun daha kullanışlı olanını gibi. çok sık kullanacağımız bir modül olmayacak."
//
// Excel'deki sütunlar üç hareket türüne karşılık geliyor: FATURA (no/tarih/tutar),
// MAKBUZ/DEKONT (firma adına ödenen), ÖDEME GELEN; ALACAK/BORÇ BAKİYESİ satır satır
// hesaplanıyor. Belge Takip › Ödemeler sekmesinden girilenler de burada (aynı defter).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
    Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton,
    InputAdornment, LinearProgress, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon, Close as CloseIcon, FileDownload as ExcelIcon, Search as SearchIcon
} from '@mui/icons-material';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import axios from '../../utils/axios';
import cariService from '../../services/cariService';
import CariHareketFormu from '../../components/Cari/CariHareketFormu';
import CariDefterTablosu from '../../components/Cari/CariDefterTablosu';
import { hareketDosyasiAc } from '../../components/Cari/cariDosya';
import {
    HAREKET_TURU, bakiyeRengi, hareketBasligi, paraYaz, talepEtiketi, tarihYaz
} from '../../utils/cariFormat';

const OZET_KARTLARI = [
    { anahtar: 'toplamFatura', etiket: 'Kesilen Fatura', renk: HAREKET_TURU.fatura.renk },
    { anahtar: 'toplamOdenen', etiket: 'Firma Adına Ödenen', renk: HAREKET_TURU.odenen.renk },
    { anahtar: 'toplamGelen', etiket: 'Gelen Ödeme', renk: HAREKET_TURU.gelen.renk }
];

const bakiyeAciklamasi = (n) => (n > 0 ? 'Firmadan alacak' : n < 0 ? 'Fazla ödeme' : 'Hesap kapalı');
const kucukHarf = (s) => String(s || '').toLocaleLowerCase('tr');
const baslikSx = {
    fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', background: '#f8fafc'
};
const tutarSx = { whiteSpace: 'nowrap', textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

function OzetKarti({ etiket, tutar, renk, alt }) {
    return (
        <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderLeft: `3px solid ${renk}` }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {etiket}
            </Typography>
            <Typography sx={{ fontWeight: 800, color: renk, fontSize: { xs: '1rem', sm: '1.15rem' }, fontVariantNumeric: 'tabular-nums' }}>
                {paraYaz(tutar)}
            </Typography>
            {alt && <Typography variant="caption" sx={{ color: '#64748b' }}>{alt}</Typography>}
        </Paper>
    );
}

// Excel çıktısı — müşterinin kendi tablosuna yakın sütunlar
function excelAktar(defter) {
    const satirlar = defter.hareketler.map((h) => ({
        'TARİH': tarihYaz(h.tarih),
        'TÜR': HAREKET_TURU[h.tur]?.etiket || h.tur,
        'FATURA NO': h.tur === 'fatura' ? h.faturaNo || '' : '',
        'BELGE / BANKA': h.tur === 'odenen' ? h.belgeAdi : (h.tur === 'gelen' ? h.banka : ''),
        'TALEP': talepEtiketi(h.dosyaTakip),
        'BORÇ (FATURA + ÖDENEN)': h.tur === 'gelen' ? '' : h.tutar,
        'ALACAK (GELEN ÖDEME)': h.tur === 'gelen' ? h.tutar : '',
        'ALACAK / BORÇ BAKİYESİ': h.bakiye,
        'NOT': h.aciklama || ''
    }));
    const o = defter.ozet || {};
    satirlar.push({});
    satirlar.push({
        'TARİH': 'TOPLAM',
        'BORÇ (FATURA + ÖDENEN)': (o.toplamFatura || 0) + (o.toplamOdenen || 0),
        'ALACAK (GELEN ÖDEME)': o.toplamGelen || 0,
        'ALACAK / BORÇ BAKİYESİ': o.bakiye || 0
    });

    const ws = XLSX.utils.json_to_sheet(satirlar);
    ws['!cols'] = [12, 10, 16, 32, 36, 22, 22, 24, 30].map((wch) => ({ wch }));
    // Tutar sütunları sayı olarak kalsın ama binlik ayraçla görünsün
    const aralik = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= aralik.e.r; r += 1) {
        [5, 6, 7].forEach((c) => {
            const hucre = ws[XLSX.utils.encode_cell({ r, c })];
            if (hucre && hucre.t === 'n') hucre.z = '#,##0.00';
        });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cari');
    const unvan = (defter.firma?.tamUnvan || 'Firma').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60).trim();
    const gun = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
    XLSX.writeFile(wb, `Cari - ${unvan} - ${gun}.xlsx`);
}

export default function CariTakip() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const firmaParam = searchParams.get('firma') || '';

    const [ozetler, setOzetler] = useState([]);
    const [ozetYukleniyor, setOzetYukleniyor] = useState(true);
    const [filtre, setFiltre] = useState('');

    const [firmaArama, setFirmaArama] = useState('');
    const [firmaSecenekleri, setFirmaSecenekleri] = useState([]);
    const [aramaYukleniyor, setAramaYukleniyor] = useState(false);

    const [defter, setDefter] = useState(null);
    const [defterYukleniyor, setDefterYukleniyor] = useState(false);
    const [hata, setHata] = useState('');

    const [duzenlenen, setDuzenlenen] = useState(null);
    const [silinecek, setSilinecek] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const mesaj = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

    const ozetleriYukle = useCallback(async () => {
        try {
            const r = await cariService.firmaOzetleri();
            setOzetler(Array.isArray(r?.data) ? r.data : []);
        } catch (err) {
            setHata(err?.response?.data?.message || 'Cari hesaplar yüklenemedi.');
        } finally {
            setOzetYukleniyor(false);
        }
    }, []);

    const defteriYukle = useCallback(async (firmaId) => {
        if (!firmaId) {
            setDefter(null);
            return;
        }
        setDefterYukleniyor(true);
        try {
            const r = await cariService.firmaDefteri(firmaId);
            const d = r?.data || {};
            setDefter({
                firma: d.firma || null,
                hareketler: Array.isArray(d.hareketler) ? d.hareketler : [],
                ozet: d.ozet || null,
                talepler: Array.isArray(d.talepler) ? d.talepler : []
            });
            setHata('');
        } catch (err) {
            setDefter(null);
            setHata(err?.response?.data?.message || 'Firmanın carisi yüklenemedi.');
        } finally {
            setDefterYukleniyor(false);
        }
    }, []);

    useEffect(() => { ozetleriYukle(); }, [ozetleriYukle]);
    useEffect(() => { defteriYukle(firmaParam); }, [firmaParam, defteriYukle]);

    // Firma arama — Belge Takip formundaki aramayla aynı uç
    useEffect(() => {
        const q = firmaArama.trim();
        if (q.length < 2) {
            setFirmaSecenekleri([]);
            return undefined;
        }
        let iptal = false;
        const zamanlayici = setTimeout(async () => {
            setAramaYukleniyor(true);
            try {
                const { data } = await axios.get('/firma', { params: { arama: q, limit: 20 } });
                const liste = data?.data?.firmalar || data?.firmalar || [];
                if (!iptal) setFirmaSecenekleri(Array.isArray(liste) ? liste : []);
            } catch (_) {
                if (!iptal) setFirmaSecenekleri([]);
            } finally {
                if (!iptal) setAramaYukleniyor(false);
            }
        }, 300);
        return () => {
            iptal = true;
            clearTimeout(zamanlayici);
        };
    }, [firmaArama]);

    const firmaSec = (firmaId) => setSearchParams(firmaId ? { firma: firmaId } : {});

    const yenile = () => Promise.all([defteriYukle(firmaParam), ozetleriYukle()]);

    const ekle = async (alanlar, dosya) => {
        try {
            await cariService.hareketEkle({ ...alanlar, firma: firmaParam }, dosya);
            await yenile();
            mesaj(`${HAREKET_TURU[alanlar.tur]?.etiket || 'Hareket'} kaydedildi`);
            return true;
        } catch (err) {
            mesaj(err?.response?.data?.message || 'Kaydedilemedi.', 'error');
            return false;
        }
    };

    const guncelle = async (alanlar, dosya) => {
        if (!duzenlenen) return false;
        try {
            const degisim = { ...alanlar };
            delete degisim.tur; // tür değişmez
            await cariService.hareketGuncelle(duzenlenen._id, degisim, dosya);
            setDuzenlenen(null);
            await yenile();
            mesaj('Hareket güncellendi');
            return true;
        } catch (err) {
            mesaj(err?.response?.data?.message || 'Güncellenemedi.', 'error');
            return false;
        }
    };

    const sil = async () => {
        const h = silinecek;
        setSilinecek(null);
        if (!h) return;
        try {
            await cariService.hareketSil(h._id);
            await yenile();
            mesaj('Hareket silindi');
        } catch (err) {
            mesaj(err?.response?.data?.message || 'Silinemedi.', 'error');
        }
    };

    const dosyaAc = async (h, indir) => {
        try {
            await hareketDosyasiAc(h, indir);
        } catch (_) {
            mesaj('Belge açılamadı.', 'error');
        }
    };

    const suzulmus = useMemo(() => {
        const q = kucukHarf(filtre.trim());
        return q ? ozetler.filter((f) => kucukHarf(f.firmaUnvan).includes(q)) : ozetler;
    }, [ozetler, filtre]);

    const toplamBakiye = useMemo(
        () => suzulmus.reduce((t, f) => t + Math.round((Number(f.bakiye) || 0) * 100), 0) / 100,
        [suzulmus]
    );

    return (
        <LayoutWrapper>
            <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
                {/* Başlık + firma arama */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                        <IconButton
                            onClick={() => (firmaParam ? firmaSec('') : navigate('/dosya-takip/liste'))}
                            sx={{ border: '1px solid #e2e8f0' }}
                            aria-label="Geri"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>Cari Hesaplar / Ödeme Takip</Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Kesilen faturalar, firma adına ödenen belgeler ve gelen ödemeler — firma bazlı bakiye
                            </Typography>
                        </Box>
                    </Box>

                    <Autocomplete
                        sx={{ width: { xs: '100%', sm: 420 } }}
                        options={firmaSecenekleri}
                        value={null}
                        inputValue={firmaArama}
                        onInputChange={(e, deger, sebep) => {
                            if (sebep === 'input') setFirmaArama(deger);
                            if (sebep === 'reset') setFirmaArama('');
                        }}
                        onChange={(e, firma) => firma?._id && firmaSec(firma._id)}
                        filterOptions={(x) => x}
                        getOptionLabel={(f) => f?.tamUnvan || f?.firmaId || ''}
                        isOptionEqualToValue={(a, b) => a._id === b._id}
                        loading={aramaYukleniyor}
                        noOptionsText={firmaArama.trim().length < 2 ? 'En az 2 harf yazın' : 'Firma bulunamadı'}
                        renderOption={(props, f) => (
                            <li {...props} key={f._id}>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{f.tamUnvan}</Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                        {f.firmaId}{f.vergiNoTC ? ` • VKN: ${f.vergiNoTC}` : ''}
                                    </Typography>
                                </Box>
                            </li>
                        )}
                        renderInput={(params) => (
                            <TextField {...params} size="small" label="Firma seç" placeholder="Firma adı veya ID yazın..." />
                        )}
                    />
                </Box>

                {hata && <Alert severity="error" onClose={() => setHata('')} sx={{ mb: 2 }}>{hata}</Alert>}

                {!firmaParam && (
                    <Paper sx={{ border: '1px solid #e2e8f0' }}>
                        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Hareketi Olan Firmalar</Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    Satıra tıklayınca firmanın cari tablosu açılır. Yeni firma için yukarıdan arayın.
                                </Typography>
                            </Box>
                            <TextField
                                size="small" placeholder="Listede ara..." value={filtre}
                                onChange={(e) => setFiltre(e.target.value)}
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                                sx={{ width: { xs: '100%', sm: 280 } }}
                            />
                        </Box>
                        {ozetYukleniyor && <LinearProgress />}
                        <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 780 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={baslikSx}>Firma</TableCell>
                                        <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>Kesilen Fatura</TableCell>
                                        <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>Ödenen</TableCell>
                                        <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>Gelen</TableCell>
                                        <TableCell sx={{ ...baslikSx, textAlign: 'right' }}>Bakiye</TableCell>
                                        <TableCell sx={baslikSx}>Son Hareket</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {!ozetYukleniyor && suzulmus.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ textAlign: 'center', color: '#94a3b8', py: 4 }}>
                                                {ozetler.length === 0
                                                    ? 'Henüz cari hareket yok. Yukarıdan firma seçip ilk faturayı veya ödemeyi girebilirsiniz; Belge Takip › Ödemeler sekmesinden girilenler de burada listelenir.'
                                                    : 'Aramaya uyan firma yok.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {suzulmus.map((f) => (
                                        <TableRow key={f.firma} hover onClick={() => firmaSec(f.firma)} sx={{ cursor: 'pointer' }}>
                                            <TableCell sx={{ fontWeight: 500 }}>{f.firmaUnvan || '—'}</TableCell>
                                            <TableCell sx={tutarSx}>{paraYaz(f.toplamFatura)}</TableCell>
                                            <TableCell sx={{ ...tutarSx, color: HAREKET_TURU.odenen.renk }}>{paraYaz(f.toplamOdenen)}</TableCell>
                                            <TableCell sx={{ ...tutarSx, color: HAREKET_TURU.gelen.renk }}>{paraYaz(f.toplamGelen)}</TableCell>
                                            <TableCell sx={{ ...tutarSx, fontWeight: 700, color: bakiyeRengi(f.bakiye) }}>{paraYaz(f.bakiye)}</TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap', color: '#64748b' }}>{tarihYaz(f.sonHareketTarihi)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {suzulmus.length > 1 && (
                                        <TableRow sx={{ background: '#f8fafc', '& td': { fontWeight: 700, borderBottom: 0 } }}>
                                            <TableCell colSpan={4} sx={{ textAlign: 'right', color: '#475569' }}>Toplam Bakiye</TableCell>
                                            <TableCell sx={{ ...tutarSx, color: bakiyeRengi(toplamBakiye) }}>{paraYaz(toplamBakiye)}</TableCell>
                                            <TableCell />
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                )}

                {firmaParam && defterYukleniyor && !defter && <LinearProgress sx={{ mb: 2 }} />}

                {firmaParam && defter && (
                    <>
                        <Paper sx={{ p: 2, mb: 2, border: '1px solid #e2e8f0' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start', mb: 2 }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                                        {defter.firma?.tamUnvan}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                        {[defter.firma?.firmaId, defter.firma?.vergiNoTC && `VKN: ${defter.firma.vergiNoTC}`].filter(Boolean).join(' · ')}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                        size="small" variant="outlined" startIcon={<ExcelIcon />}
                                        onClick={() => excelAktar(defter)} disabled={!defter.hareketler.length}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Excel’e Aktar
                                    </Button>
                                    <Button size="small" startIcon={<CloseIcon />} onClick={() => firmaSec('')} sx={{ textTransform: 'none' }}>
                                        Tüm Firmalar
                                    </Button>
                                </Box>
                            </Box>
                            <Grid container spacing={1.5}>
                                {OZET_KARTLARI.map((k) => (
                                    <Grid item xs={6} md={3} key={k.anahtar}>
                                        <OzetKarti etiket={k.etiket} tutar={defter.ozet?.[k.anahtar]} renk={k.renk} />
                                    </Grid>
                                ))}
                                <Grid item xs={6} md={3}>
                                    <OzetKarti
                                        etiket="Bakiye"
                                        tutar={defter.ozet?.bakiye}
                                        renk={bakiyeRengi(defter.ozet?.bakiye || 0)}
                                        alt={bakiyeAciklamasi(defter.ozet?.bakiye || 0)}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            {['fatura', 'odenen', 'gelen'].map((tur) => (
                                <Grid item xs={12} md={4} key={tur}>
                                    <CariHareketFormu tur={tur} onKaydet={ekle} talepler={defter.talepler} notAlani />
                                </Grid>
                            ))}
                        </Grid>

                        {defterYukleniyor && <LinearProgress sx={{ mb: 1 }} />}
                        <CariDefterTablosu
                            gorunum="firma"
                            hareketler={defter.hareketler}
                            ozet={defter.ozet}
                            onDuzenle={setDuzenlenen}
                            onSil={setSilinecek}
                            onDosya={dosyaAc}
                        />
                    </>
                )}

                <Dialog open={!!duzenlenen} onClose={() => setDuzenlenen(null)} fullWidth maxWidth="xs">
                    <DialogTitle sx={{ color: HAREKET_TURU[duzenlenen?.tur]?.renk }}>
                        {HAREKET_TURU[duzenlenen?.tur]?.etiket || 'Hareket'} — Düzenle
                    </DialogTitle>
                    <DialogContent sx={{ pt: '8px !important' }}>
                        {duzenlenen && (
                            <CariHareketFormu
                                key={duzenlenen._id}
                                tur={duzenlenen.tur}
                                baslangic={duzenlenen}
                                talepler={defter?.talepler || []}
                                notAlani
                                cerceve={false}
                                onKaydet={guncelle}
                            />
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDuzenlenen(null)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={!!silinecek} onClose={() => setSilinecek(null)}>
                    <DialogTitle>Hareket silinsin mi?</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2">
                            {silinecek && `${tarihYaz(silinecek.tarih)} · ${hareketBasligi(silinecek)} · ${paraYaz(silinecek.tutar)}`}
                        </Typography>
                        {silinecek?.dosya && (
                            <Typography variant="caption" sx={{ color: '#dc2626' }}>Yüklü belge de silinir.</Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSilinecek(null)} sx={{ textTransform: 'none' }}>Vazgeç</Button>
                        <Button color="error" variant="contained" onClick={sil} sx={{ textTransform: 'none' }}>Sil</Button>
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </LayoutWrapper>
    );
}
