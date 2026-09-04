// 📊 DOSYA İŞ AKIŞ TAKİP PANELİ — ETUYS diline geçirildi (madde 6 / Faz 3)
//
// Önce: 7 kart, her biri 135° gradyan + 44px avatar + renkli gölge + hover'da
// 4px yukarı zıplama; listede avatar; dağılımda gradyanlı ilerleme çubuğu.
// etuys/README.md "Olmayanlar": gradyan, gölge, yuvarlak köşeli kart, emoji.
//
// Korunanlar (bilerek):
//   • Kartların `hedef` linkleri — müşteri isteği, aşağıdaki nota bakın
//   • aria-label'lar — sadeleştirme erişilebilirlikten feragat değil
//   • Dağılımdaki oran çubuğu — büyüklük karşılaştırması bilgi taşıyor;
//     yalnız gradyanı ve yuvarlak köşesi gitti, tek renk düz çubuk kaldı

import React, { useEffect, useState } from 'react';
import { Box, Grid, Button, IconButton, LinearProgress, Alert } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import {
    Assignment as AssignmentIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon,
    HourglassEmpty as HourglassEmptyIcon,
    CheckCircle as CheckCircleIcon,
    Add as AddIcon,
    List as ListIcon,
    TrendingUp as TrendingUpIcon,
    ArrowForward as ArrowForwardIcon,
    Refresh as RefreshIcon,
    AccountBalance as AccountBalanceIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDosyaTakip } from '../../contexts/DosyaTakipContext';

// Layout
import LayoutWrapper from '../../components/Layout/LayoutWrapper';

import {
    etuysTema, renk, yazi, aralik,
    Panel, SayiKutusu, VeriTablosu, DurumRozeti
} from '../../tasarim';

// Sunucunun `durumRengi` alanı → jeton anlam adı. Eskiden bu dosyada 7 renk için
// bg/text/border üçlüsü elle yazılıydı; artık tek kaynak jetonlar.js.
const DURUM_ANLAMI = {
    yesil: 'onay',
    sari: 'beklemede',
    turuncu: 'beklemede',
    mor: 'beklemede',
    kirmizi: 'red',
    mavi: 'notr',   // rozette bilinmeyen anahtar → nötr
    gri: 'notr'
};

const DosyaTakipDashboard = () => {
    const navigate = useNavigate();
    const { dashboardStats, fetchDashboard, loading, error, clearError } = useDosyaTakip();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboard();
        setRefreshing(false);
    };

    // müşteri: "bunlara da tıkladığımızda müracaatları önümüze getirsin"
    // Her kartın `hedef`i, kartın saydığı kümeyle birebir aynı listeyi açar
    // (sayaç tanımları: dosyaTakipController.getDashboardIstatistikleri).
    // Not: liste normalde sonuçlanan/tamamlananı gizler; bu yüzden arşiv aşamalarına
    // giden kartlar açık `anaAsama` gönderir — o filtre arşiv gizlemesini ezer.
    const statsCards = [
        {
            title: 'Toplam Talep',
            value: dashboardStats?.ozet?.toplamTalep || 0,
            hedef: '/dosya-takip/liste?kapsam=tumu', // arşivdekiler dahil hepsi
            icon: <AssignmentIcon />
        },
        {
            title: 'Aktif Talep',
            value: dashboardStats?.ozet?.aktifTalep || 0,
            hedef: '/dosya-takip/liste?kapsam=aktif', // yalnız "Tamamlandı" hariç
            icon: <PlaylistAddCheckIcon />,
            vurgu: 'bekle'
        },
        {
            title: '1. Müracaat Öncesi',
            value: dashboardStats?.ozet?.muraacatOncesi || 0,
            hedef: '/dosya-takip/liste?anaAsama=MURACAAT_ONCESI',
            icon: <HourglassEmptyIcon />,
            vurgu: 'bekle'
        },
        {
            title: '2. Kurum Değerlendirme',
            value: dashboardStats?.ozet?.kurumDegerlendirme ?? dashboardStats?.ozet?.muraacatSonrasi ?? 0,
            // Sunucu bu değeri eski MURACAAT_SONRASI kayıtlarıyla birlikte eşler
            hedef: '/dosya-takip/liste?anaAsama=KURUM_DEGERLENDIRME',
            icon: <AccountBalanceIcon />,
            vurgu: 'bekle'
        },
        {
            title: '3. Kurum Eksik',
            value: dashboardStats?.ozet?.kurumEksik || 0,
            hedef: '/dosya-takip/liste?anaAsama=KURUM_EKSIK',
            icon: <HourglassEmptyIcon />,
            vurgu: 'red'
        },
        {
            title: '4. Sonuçlanma',
            value: dashboardStats?.ozet?.kurumSonuclanma || 0,
            hedef: '/dosya-takip/liste?anaAsama=KURUM_SONUCLANMA',
            icon: <ScheduleIcon />,
            vurgu: 'bekle'
        },
        {
            title: 'Tamamlanan',
            value: dashboardStats?.ozet?.tamamlanan || 0,
            hedef: '/dosya-takip/liste?anaAsama=TAMAMLANDI',
            icon: <CheckCircleIcon />,
            vurgu: 'onay'
        }
    ];

    return (
        // Tema yalnız BU ekranı sarıyor; global tema değişmiyor.
        <ThemeProvider theme={etuysTema}>
        <LayoutWrapper>
            <Box sx={{ p: { xs: 1.5, sm: 2 }, width: '100%', minWidth: 0, backgroundColor: renk.zemin }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: `${aralik.grup}px`, gap: 1, flexWrap: 'wrap' }}>
                    <Box>
                        <Box sx={{ fontSize: `${yazi.buyuk}px`, fontWeight: yazi.cokKalin, color: renk.murekkep }}>
                            İş Akış Takip Sistemi
                        </Box>
                        <Box sx={{ fontSize: `${yazi.etiket}px`, color: renk.sessiz, mt: 0.2 }}>
                            Dosya talep ve iş akışı takip merkezi
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center' }}>
                        <IconButton onClick={handleRefresh} disabled={refreshing} size="small" aria-label="Yenile"
                            sx={{ border: `1px solid ${renk.cizgi}`, borderRadius: 0, color: renk.sessiz }}>
                            <RefreshIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Button variant="outlined" size="small" startIcon={<ListIcon />}
                            onClick={() => navigate('/dosya-takip/liste')}>
                            Tüm Talepler
                        </Button>
                        <Button variant="contained" size="small" startIcon={<AddIcon />}
                            onClick={() => navigate('/dosya-takip/yeni')}>
                            Yeni Talep Oluştur
                        </Button>
                    </Box>
                </Box>

                {loading && <LinearProgress sx={{ mb: 1, height: 2 }} />}
                {error && (
                    <Alert severity="error" onClose={clearError} sx={{ mb: 2, borderRadius: 0 }}>
                        {error}
                    </Alert>
                )}

                {/* Özet kutuları — hepsi tıklanabilir, saydığı kümeyle aynı listeyi açar */}
                <Grid container spacing={1.2} sx={{ mb: `${aralik.grup}px` }}>
                    {statsCards.map((kart) => (
                        <Grid item xs={12} sm={6} md={4} lg={12 / 7} key={kart.title}>
                            <SayiKutusu
                                etiket={kart.title}
                                deger={kart.value}
                                ikon={kart.icon}
                                vurgu={kart.vurgu}
                                yukleniyor={loading && !dashboardStats}
                                onTik={() => navigate(kart.hedef)}
                                ariaEtiket={`${kart.title}: ${kart.value} talep — listeyi aç`}
                            />
                        </Grid>
                    ))}
                </Grid>

                <Grid container spacing={1.2}>
                    <Grid item xs={12} lg={7}>
                        <Panel
                            baslik="Son Talepler"
                            ikon={<AssignmentIcon sx={{ fontSize: 14 }} />}
                            bosluksuz
                            sagUnsur={
                                <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => navigate('/dosya-takip/liste')}
                                    sx={{ fontSize: `${yazi.kucuk}px`, py: 0, minHeight: 0 }}>
                                    Tümünü Gör
                                </Button>
                            }
                        >
                            <VeriTablosu
                                sutunlar={[
                                    { anahtar: 'takipId', baslik: 'Takip No', genislik: 110 },
                                    { anahtar: 'firmaUnvan', baslik: 'Firma Unvanı',
                                      bicim: (v) => v || 'Firma Bilgisi Yok' },
                                    { anahtar: 'talepTuru', baslik: 'Talep Türü', genislik: 150 },
                                    { anahtar: 'durum', baslik: 'Durum', genislik: 160,
                                      // Durum metni "1.2.3 Bir Şey" biçiminde geliyor; baştaki
                                      // numarayı atıp okunur kısmı bırakıyoruz (eski davranış).
                                      // Renk sunucunun `durumRengi` alanından geliyor; eskiden
                                      // bu dosyada 7 renk için bg/text/border elle yazılıydı.
                                      bicim: (v, satir) => (
                                        <DurumRozeti
                                          durum={DURUM_ANLAMI[satir.durumRengi]}
                                          metin={(v || '—').replace(/_/g, ' ').replace(/^\d+\.\d+(\.\d+)*\s*/, '')}
                                        />
                                      ) }
                                ]}
                                satirlar={dashboardStats?.sonTalepler || []}
                                onSatirTik={(satir) => navigate(`/dosya-takip/${satir._id}`)}
                                bosMetin="Henüz talep oluşturulmamış"
                            />
                        </Panel>
                    </Grid>

                    <Grid item xs={12} lg={5}>
                        <Panel
                            baslik="Talep Türü Dağılımı (İlk 10)"
                            ikon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                            bosluksuz
                        >
                            <VeriTablosu
                                sutunlar={[
                                    { anahtar: '_id', baslik: 'Talep Türü' },
                                    { anahtar: 'sayi', baslik: 'Adet', sayi: true, genislik: 60 },
                                    { anahtar: 'oran', baslik: 'Oran', genislik: 90,
                                      // Düz tek renk çubuk: büyüklük karşılaştırması kalıyor,
                                      // gradyan ve yuvarlak köşe gidiyor.
                                      bicim: (_v, satir) => {
                                        const liste = dashboardStats?.talepTuruDagilimi || [];
                                        const enBuyuk = Math.max(1, ...liste.map((d) => d.sayi || 0));
                                        const yuzde = Math.round(((satir.sayi || 0) / enBuyuk) * 100);
                                        return (
                                          <Box aria-label={`%${yuzde}`} sx={{ backgroundColor: renk.yuzeyAlt, height: 8 }}>
                                            <Box sx={{ width: `${yuzde}%`, height: '100%', backgroundColor: renk.ana }} />
                                          </Box>
                                        );
                                      } }
                                ]}
                                satirlar={dashboardStats?.talepTuruDagilimi || []}
                                anahtarAl={(s2, i) => s2?._id ?? i}
                                bosMetin="Henüz veri yok"
                            />
                        </Panel>
                    </Grid>
                </Grid>
            </Box>
        </LayoutWrapper>
        </ThemeProvider>
    );
};

export default DosyaTakipDashboard;
