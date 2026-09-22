// 💳 Belge Takip › Ödemeler — mini cari tablo
//
// Müşteri: "Ödemeler kısmına bir sistem ekleyelim ileride de ekstra bir sekme olarak cari
// takip yapmak amacıyla başlangıcı olsun". Buradan girilen her hareket talebe bağlı
// olarak firmanın carisine yazılır; Cari Hesaplar modülünde de görünür.

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, Typography
} from '@mui/material';
import { AccountBalanceWallet as CariIcon } from '@mui/icons-material';
import cariService from '../../services/cariService';
import CariHareketFormu from './CariHareketFormu';
import CariDefterTablosu from './CariDefterTablosu';
import { hareketDosyasiAc } from './cariDosya';
import { HAREKET_TURU, hareketBasligi, paraYaz, tarihYaz } from '../../utils/cariFormat';

export default function TalepCariPaneli({ talepId, firmaId, onMesaj }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [defter, setDefter] = useState({ hareketler: [], ozet: null });
    const [yukleniyor, setYukleniyor] = useState(true);
    const [hata, setHata] = useState('');
    const [duzenlenen, setDuzenlenen] = useState(null);
    const [silinecek, setSilinecek] = useState(null);

    const mesaj = (metin, tur = 'success') => onMesaj?.(metin, tur);

    const yukle = useCallback(async () => {
        if (!talepId) return;
        try {
            const r = await cariService.talepDefteri(talepId);
            setDefter({
                hareketler: Array.isArray(r?.data?.hareketler) ? r.data.hareketler : [],
                ozet: r?.data?.ozet || null
            });
            setHata('');
        } catch (err) {
            setHata(err?.response?.data?.message || 'Ödeme hareketleri yüklenemedi.');
        } finally {
            setYukleniyor(false);
        }
    }, [talepId]);

    useEffect(() => {
        setYukleniyor(true);
        yukle();
    }, [yukle]);

    const ekle = async (alanlar, dosya) => {
        try {
            await cariService.hareketEkle({ ...alanlar, dosyaTakip: talepId }, dosya);
            await yukle();
            mesaj(alanlar.tur === 'gelen' ? 'Gelen ödeme eklendi' : 'Hizmet ve yatırım ödemesi eklendi');
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
            await yukle();
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
            await yukle();
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

    return (
        <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Ödeme Hareketleri</Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Hizmet ve yatırım ödemeleri kırmızı, bankaya gelenler yeşil. Kayıtlar firmanın carisine de işlenir.
                    </Typography>
                </Box>
                {firmaId && (
                    <Button
                        size="small" variant="outlined" startIcon={<CariIcon />}
                        // Müşteri (21.09.2026): cari hesaptaki "Geri" bu talebin Ödemeler sekmesine dönsün.
                        // Detay sayfasının kendi durumu (listeye dönüş filtresi) da taşınır.
                        onClick={() => navigate(`/cari-takip?firma=${firmaId}`, {
                            state: {
                                geriDon: {
                                    yol: `${location.pathname}?sekme=odemeler`,
                                    state: location.state,
                                    etiket: 'Belge Takip › Ödemeler'
                                }
                            }
                        })}
                        sx={{ textTransform: 'none' }}
                    >
                        Firmanın Cari Hesabı
                    </Button>
                )}
            </Box>

            {hata && <Alert severity="error" sx={{ mb: 1.5 }}>{hata}</Alert>}

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                    <CariHareketFormu tur="odenen" onKaydet={ekle} />
                </Grid>
                <Grid item xs={12} md={6}>
                    <CariHareketFormu tur="gelen" onKaydet={ekle} />
                </Grid>
            </Grid>

            {yukleniyor && <LinearProgress sx={{ mb: 1 }} />}
            <CariDefterTablosu
                gorunum="talep"
                hareketler={defter.hareketler}
                ozet={defter.ozet}
                onDuzenle={setDuzenlenen}
                onSil={setSilinecek}
                onDosya={dosyaAc}
            />

            <Dialog open={!!duzenlenen} onClose={() => setDuzenlenen(null)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ color: HAREKET_TURU[duzenlenen?.tur]?.renk }}>
                    {duzenlenen?.tur === 'gelen' ? 'Gelen Ödemeyi Düzenle' : 'Hizmet ve Yatırım Ödemesini Düzenle'}
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {duzenlenen && (
                        <CariHareketFormu key={duzenlenen._id} tur={duzenlenen.tur} baslangic={duzenlenen} cerceve={false} onKaydet={guncelle} />
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
        </Box>
    );
}
