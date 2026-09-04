// 📋 Dosya İş Akış Takip - Talep Listesi
// DataGrid tabanlı filtrelenebilir liste

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Box, Typography, Button, Chip, TextField, MenuItem, ListSubheader,
    Paper, IconButton, InputAdornment, Grid, Tooltip,
    LinearProgress, Alert, Avatar, Dialog, DialogTitle,
    DialogContent, DialogActions
} from '@mui/material';
import { DataGrid, trTR } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Search as SearchIcon,
    FilterList as FilterListIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon,
    Clear as ClearIcon,
    Inventory2 as ArchiveIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDosyaTakip } from '../../contexts/DosyaTakipContext';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import UstKaydirmaCubugu from '../../components/common/UstKaydirmaCubugu';
import axios from '../../utils/axios';
import { ThemeProvider } from '@mui/material/styles';
import { etuysTema } from '../../tasarim';

// müşteri: tablodaki bütün yazılar (firma ismi, çipler, tarihler, başlıklar) tek boyut kullansın.
// Tek kaynak burasıdır — hücre renderer'larında ayrı fontSize yazmayın, bu sabiti kullanın.
// Not: <Typography variant="body2"> kendi font-size'ını bastığı için DataGrid seviyesinde
// tek bir CSS kuralı yetmiyor; her hücrede bu sabit geçiliyor.
const TABLO_FONT = '0.75rem';

// Filtre alanları da tabloyla aynı yazı boyutunu kullansın.
// Yüzen etiketler (InputLabel) bilerek dışarıda: MUI onları shrink halinde
// scale(0.75) ile küçültüyor, ayrıca çentik (legend) genişliğini etiket
// boyutundan hesapladığı için küçültmek kenarlıkta boşluk bırakıyor.
const FILTRE_SX = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: TABLO_FONT }
};

// Açılır menü seçenekleri portal içinde render edildiği için üstteki sx onlara
// ulaşmıyor; MenuProps ile ayrıca verilmesi gerekiyor.
const FILTRE_MENU_PROPS = {
    MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: TABLO_FONT } } } }
};

// Açılır menüdeki grup başlıkları ("En sık kullanılanlar" / "Tümü (A–Z)")
const GRUP_BASLIK_SX = {
    fontSize: TABLO_FONT,
    fontWeight: 700,
    lineHeight: '30px',
    color: '#64748b',
    background: '#f8fafc'
};

// Durum renkleri
const DURUM_RENKLERI = {
    mavi: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
    sari: { bg: '#fefce8', text: '#a16207', border: '#fde047' },
    turuncu: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
    kirmizi: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
    yesil: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
    gri: { bg: '#f9fafb', text: '#4b5563', border: '#d1d5db' },
    mor: { bg: '#faf5ff', text: '#7c3aed', border: '#c4b5fd' }
};

const ANA_ASAMA_ETIKETLERI = {
    'MURACAAT_ONCESI': { label: '1. Müracaat Öncesi', color: '#7c3aed' },
    'KURUM_DEGERLENDIRME': { label: '2. Kurum Değerlendirme', color: '#7c3aed' },
    'KURUM_EKSIK': { label: '3. Kurum Eksik', color: '#dc2626' },
    'MURACAAT_SONRASI': { label: '2. Kurum Değerlendirme', color: '#7c3aed' }, // eski kayıtlar (migration öncesi)
    'KURUM_SONUCLANMA': { label: '4. Sonuçlanma', color: '#059669' },
    'TAMAMLANDI': { label: 'Tamamlandı', color: '#22c55e' }
};

const DosyaTakipList = () => {
    const navigate = useNavigate();
    const { talepler: rawTalepler, pagination, loading, error, clearError, fetchTalepler, fetchEnums, enumDegerleri, talepSil } = useDosyaTakip();
    const [personeller, setPersoneller] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, takipId: '' });

    // 🔗 BÜTÜN filtreler + sayfa URL'de tutulur — tek kaynak burasıdır.
    // Müşteri: "isim yazarak filtre yapıyorum, bir belgenin içine giriyorum, geri
    // dediğimde filtre kalkıyor tekrar başa geliyorum; filtre hep kalsa".
    // Sebep: detaydan dönüldüğünde bileşen yeniden kurulduğu için bileşen state'inde
    // tutulan filtreler sıfırlanıyordu. URL'de tutulunca hem "Geri" düğmesinde hem
    // tarayıcının geri tuşunda hem de sayfa yenilemede korunuyor.
    const [searchParams, setSearchParams] = useSearchParams();

    // Aynı olay içinde art arda parametreYaz çağrılabilsin diye son yazılan sorgu
    // burada tutulur. Gerekli, çünkü react-router'ın setSearchParams'ı — fonksiyonel
    // biçimi dahil — o render'ın searchParams'ını okuyor (useCallback bağımlılığı
    // [navigate, searchParams]). Ref olmadan ikinci çağrı birincinin yazdığını
    // görmez ve üzerine yazar; "Arşiv" düğmesi tam olarak bu yüzden çalışmıyordu.
    // searchParams değişince (yeni render) temel kendiliğinden tazeye döner.
    const sonYazilanSorgu = useRef(null);

    // Boş değerli parametre URL'den silinir (adres temiz kalsın).
    // Filtre değişince sayfa başa döner: 3. sayfadayken filtreleyip boş liste görmeyi önler.
    const parametreYaz = useCallback((degisiklikler, { sayfayiSifirla = true } = {}) => {
        const onceki = sonYazilanSorgu.current;
        const temel = (onceki && onceki.temel === searchParams) ? onceki.sonuc : searchParams;
        const sp = new URLSearchParams(temel);
        Object.entries(degisiklikler).forEach(([ad, deger]) => {
            if (deger === '' || deger === null || deger === undefined) sp.delete(ad);
            else sp.set(ad, String(deger));
        });
        if (sayfayiSifirla) sp.delete('sayfa');
        sonYazilanSorgu.current = { temel: searchParams, sonuc: sp };
        setSearchParams(sp, { replace: true });
    }, [searchParams, setSearchParams]);

    const arsivModu = searchParams.get('arsiv') === '1';
    const filterAnaAsama = searchParams.get('anaAsama') || '';
    const kapsam = searchParams.get('kapsam') || '';
    const filterTalepTuru = searchParams.get('talepTuru') || '';
    // 👤 Personel filtreleri (müşteri: "Müracaat hazırlayan ve Takibi yapanları isim isim filtreleyebilelim")
    const filterHazirlayan = searchParams.get('hazirlayan') || '';
    const filterTakipEden = searchParams.get('takipEden') || '';
    const aramaTerimi = searchParams.get('q') || '';
    const sayfa = Math.max(0, (parseInt(searchParams.get('sayfa'), 10) || 1) - 1);
    const sayfaBoyutu = parseInt(searchParams.get('limit'), 10) || 50;

    // Sunucuda 'kapsam' arşiv modundan önce değerlendiriliyor; temizlenmezse
    // karttan gelindiğinde arşiv düğmesi hiçbir şey yapmıyormuş gibi görünür.
    const setArsivModu = (acik) => parametreYaz({ arsiv: acik ? '1' : '', kapsam: '' });
    // Elle aşama seçmek kart kapsamını geçersiz kılar
    const setFilterAnaAsama = (deger) => parametreYaz({ anaAsama: deger, kapsam: '' });

    // 🔍 Arama kutusu yazarken anlık tepki versin diye yerel state'te; URL'e 400 ms
    // sonra yazılır. Her tuşta yazmak hem replaceState'i tarayıcı sınırına dayıyor
    // hem de her tuşta sunucuya istek gönderiyordu.
    const [search, setSearch] = useState(aramaTerimi);
    const sonYazilanArama = useRef(aramaTerimi);
    useEffect(() => {
        if (search === sonYazilanArama.current) return undefined;
        const zamanlayici = setTimeout(() => {
            sonYazilanArama.current = search;
            parametreYaz({ q: search });
        }, 400);
        return () => clearTimeout(zamanlayici);
    }, [search, parametreYaz]);
    // URL dışarıdan değiştiyse (tarayıcı geri tuşu, Temizle) kutuyu senkronla.
    // Kendi yazdığımız değer sonYazilanArama ile ayırt edilir; olmazsa iki efekt
    // birbiriyle çekişip kullanıcı yazdıkça kutuyu sıfırlardı.
    useEffect(() => {
        if (aramaTerimi !== sonYazilanArama.current) {
            sonYazilanArama.current = aramaTerimi;
            setSearch(aramaTerimi);
        }
    }, [aramaTerimi]);

    // DataGrid nesne bekliyor; loadData bağımlılıklarında ise ilkel değerler kullanılır
    // (her render'da yeni nesne referansı sonsuz fetch döngüsü açardı).
    const paginationModel = useMemo(() => ({ page: sayfa, pageSize: sayfaBoyutu }), [sayfa, sayfaBoyutu]);
    const setPaginationModel = (model) => {
        const m = typeof model === 'function' ? model({ page: sayfa, pageSize: sayfaBoyutu }) : model;
        parametreYaz(
            { sayfa: m.page > 0 ? m.page + 1 : '', limit: m.pageSize !== 50 ? m.pageSize : '' },
            { sayfayiSifirla: false }
        );
    };

    // Talepler verisi - her zaman array olmalı
    const talepler = Array.isArray(rawTalepler) ? rawTalepler : [];

    // 🔤 Talep türü menüsü: üstte en sık kullanılanlar, altında tam liste A–Z
    // (müşteri: "hem alfabetik hem de en sık kullandıklarımıza göre").
    // Sıklık sunucudan gerçek veriyle geliyor; gelmezse menü yalnız alfabetik kalır.
    const sikTalepTurleri = useMemo(
        () => enumDegerleri?.talepTurleriSik || [],
        [enumDegerleri]
    );
    // localeCompare('tr') şart: Türkçe alfabede Ç>C, Ğ>G, I<İ, Ö>O, Ş>S, Ü>U sırası
    // varsayılan sıralamayla tutmuyor (ör. "Çelik" listenin sonuna düşer).
    const alfabetikTalepTurleri = useMemo(
        () => [...(enumDegerleri?.talepTurleri || [])].sort((a, b) => a.localeCompare(b, 'tr')),
        [enumDegerleri]
    );

    useEffect(() => {
        fetchEnums();
    }, [fetchEnums]);

    // Personel filtresi dropdown'ını doldur (Detail ekranındaki loadUsers ile aynı uç)
    useEffect(() => {
        let iptal = false;
        axios.get('/dosya-takip/personel-listesi')
            .then((res) => { if (!iptal) setPersoneller(res.data?.data || []); })
            .catch((err) => console.error('Personel listesi alınamadı:', err));
        return () => { iptal = true; };
    }, []);

    const loadData = useCallback(() => {
        const params = {
            page: sayfa + 1,
            limit: sayfaBoyutu,
            search: aramaTerimi,
            anaAsama: filterAnaAsama,
            talepTuru: filterTalepTuru,
            hazirlayan: filterHazirlayan,
            takipEden: filterTakipEden,
            // arsiv=1 → yalnızca sonuçlanan/tamamlanan; boş → bunlar ana listeden gizli
            arsiv: arsivModu ? '1' : '',
            // 'tumu' / 'aktif' → dashboard kartlarından gelen kapsam
            kapsam
        };
        fetchTalepler(params);
    }, [fetchTalepler, sayfa, sayfaBoyutu, aramaTerimi, filterAnaAsama, filterTalepTuru, filterHazirlayan, filterTakipEden, arsivModu, kapsam]);

    // Detaya giderken listenin tüm sorgusu taşınır; detaydaki "Geri" aynı filtreli
    // listeye döner. Henüz URL'e yazılmamış (400 ms'lik gecikmede bekleyen) arama
    // metni de eklenir: yazıp hemen satıra tıklandığında kaybolmasın.
    const detayaGit = (talepId) => {
        const sp = new URLSearchParams(searchParams);
        if (search) sp.set('q', search); else sp.delete('q');
        navigate(`/dosya-takip/${talepId}`, {
            state: { listeQuery: sp.toString() ? `?${sp.toString()}` : '' }
        });
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Enter beklemeden 400 ms'lik gecikmeyi atlayıp aramayı hemen uygula
    const handleSearch = (e) => {
        if (e.key !== 'Enter') return;
        sonYazilanArama.current = search;
        parametreYaz({ q: search });
    };

    const handleDelete = async () => {
        try {
            await talepSil(deleteDialog.id);
            setDeleteDialog({ open: false, id: null, takipId: '' });
            loadData();
        } catch (err) {
            console.error('Silme hatası:', err);
        }
    };

    // Tek seferde yazılır: parametreYaz'ı arka arkaya çağırmak işe yaramaz, her çağrı
    // aynı (eski) searchParams kapanışını okuduğu için yalnızca sonuncusu geçerli olurdu.
    const clearFilters = () => {
        sonYazilanArama.current = '';
        setSearch('');
        const sp = new URLSearchParams();
        if (arsivModu) sp.set('arsiv', '1'); // arşiv görünümü korunur, sadece filtreler temizlenir
        setSearchParams(sp, { replace: true });
    };

    const columns = [
        // müşteri: Takip ID kolonu kaldırıldı
        // müşteri: Aşama ve Durum, Belge No'nun soluna alındı
        // Sıra: Firma → Talep Türü → Aşama → Durum → Belge No → İl/İlçe → ...
        {
            field: 'firmaUnvan',
            headerName: 'Firma',
            flex: 1,
            // Genişliği daraltmayın: font küçüldüğü için aynı 200px'de artık
            // daha fazla karakter sığıyor — daraltmak bu kazancı geri alır.
            minWidth: 200,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontSize: TABLO_FONT, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {params.value || params.row?.firma?.tamUnvan || '-'}
                </Typography>
            )
        },
        {
            field: 'talepTuru',
            headerName: 'Talep Türü',
            flex: 0.9,
            // 200'ün altına inmeyin: "İthal Teçhizat Devir Revize Talebi" gibi uzun
            // talep türleri 12px'de ~179px yer kaplıyor, dar sütunda kesiliyor.
            minWidth: 200,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontSize: TABLO_FONT, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'anaAsama',
            headerName: 'Aşama',
            // "2. Kurum Değerlendirme" çipi 12px'de ~140px; çip dolgusu + hücre
            // boşluğu ile birlikte 180 altına inince kesiliyor.
            width: 180,
            renderCell: (params) => {
                const info = ANA_ASAMA_ETIKETLERI[params.value] || { label: params.value, color: '#6b7280' };
                return (
                    <Chip
                        label={info.label}
                        size="small"
                        sx={{
                            fontSize: TABLO_FONT,
                            fontWeight: 600,
                            color: info.color,
                            background: `${info.color}12`,
                            border: `1px solid ${info.color}30`,
                            height: 22,
                            maxWidth: '100%',
                            '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' }
                        }}
                    />
                );
            }
        },
        {
            field: 'durum',
            headerName: 'Durum',
            // "Fiyat Tamam - Evrak Bekle" 12px'de ~151px; alt sınır ~190.
            width: 195,
            renderCell: (params) => {
                const renk = DURUM_RENKLERI[params.row.durumRengi] || DURUM_RENKLERI.mavi;
                const etiket = params.row.durumEtiketi || params.value;
                return (
                    <Chip
                        label={etiket?.substring(0, 25)}
                        size="small"
                        sx={{
                            background: renk.bg,
                            color: renk.text,
                            border: `1px solid ${renk.border}`,
                            fontWeight: 600,
                            fontSize: TABLO_FONT,
                            height: 22,
                            maxWidth: '100%',
                            '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' }
                        }}
                    />
                );
            }
        },
        {
            field: 'ytbNo',
            headerName: 'Belge No',
            width: 100,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: '#64748b' }}>
                    {params.value || '-'}
                </Typography>
            )
        },
        {
            field: 'ilIlce',
            headerName: 'İl / İlçe',
            width: 140,
            sortable: false,
            renderCell: (params) => {
                const il = params.row.firma?.firmaIl || '';
                const ilce = params.row.firma?.firmaIlce || '';
                const metin = [il, ilce].filter(Boolean).join(' / ');
                return (
                    <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: metin ? '#475569' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metin || '-'}</Typography>
                );
            }
        },
        {
            field: 'muraacatHazirlayan',
            headerName: 'Müracaat Hazırlayan',
            flex: 0.7,
            // Başlık metni içerikten uzun: 12px kalın "Müracaat Hazırlayan" ~133px,
            // 150'nin altında başlık kesiliyor.
            minWidth: 150,
            valueGetter: (params) => params.row.muraacatOncesi?.muraacatHazirlayanPersonel?.adSoyad || params.row.muraacatOncesi?.muraacatHazirlayanAdi || '',
            renderCell: (params) => {
                const ad = params.row.muraacatOncesi?.muraacatHazirlayanPersonel?.adSoyad
                    || params.row.muraacatOncesi?.muraacatHazirlayanAdi;
                return (
                    <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: ad ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ad || '-'}
                    </Typography>
                );
            }
        },
        {
            field: 'takibiYapan',
            headerName: 'Takibi Yapan',
            flex: 0.7,
            minWidth: 130,
            valueGetter: (params) => params.row.muraacatSonrasi?.takibiYapanPersonel?.adSoyad || params.row.muraacatSonrasi?.takibiYapanAdi || '',
            renderCell: (params) => {
                const ad = params.row.muraacatSonrasi?.takibiYapanPersonel?.adSoyad
                    || params.row.muraacatSonrasi?.takibiYapanAdi;
                return (
                    <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: ad ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ad || '-'}
                    </Typography>
                );
            }
        },
        {
            field: 'createdAt',
            headerName: 'Oluşturma Tarihi',
            // Tarih 10 karakter ama başlık uzun; 130 başlığın sığdığı alt sınır.
            width: 130,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: '#64748b' }}>
                    {params.value ? new Date(params.value).toLocaleDateString('tr-TR') : '-'}
                </Typography>
            )
        },
        {
            // müşteri: "Resmi Müracaat Eksik Son Gün" talep listesinde oluşturma tarihinin yanında görünsün
            field: 'resmiMuracaatEksikSonGun',
            headerName: 'Resmi Müracaat Eksik Son Gün',
            width: 165,
            sortable: false, // nested alan; sunucu tarafı sıralama bu yolu desteklemiyor
            valueGetter: (params) => params.row?.zamanlama?.resmiMuracaatEksikSonGun || null,
            renderCell: (params) => {
                if (!params.value) return <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: '#94a3b8' }}>-</Typography>;
                const tarih = new Date(params.value);
                // Son gün geçtiyse dikkat çeksin
                const gecti = tarih.setHours(23, 59, 59, 999) < Date.now();
                return (
                    <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: gecti ? '#dc2626' : '#64748b', fontWeight: gecti ? 700 : 400 }}>
                        {new Date(params.value).toLocaleDateString('tr-TR')}
                    </Typography>
                );
            }
        },
        {
            // müşteri: sonuçlananlara sonuçlanma / son işlem tarihi eklensin
            field: 'sonuclanmaTarihi',
            headerName: 'Sonuçlanma',
            width: 130,
            renderCell: (params) => {
                const sonuclanma = params.value;
                if (sonuclanma) {
                    return (
                        <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: '#059669', fontWeight: 600 }}>
                            {new Date(sonuclanma).toLocaleDateString('tr-TR')}
                        </Typography>
                    );
                }
                // Henüz sonuçlanmadıysa son işlem tarihini göster (gri)
                const sonIslem = params.row?.updatedAt;
                return (
                    <Typography variant="body2" sx={{ fontSize: TABLO_FONT, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sonIslem ? `${new Date(sonIslem).toLocaleDateString('tr-TR')} (son işlem)` : '-'}
                    </Typography>
                );
            }
        },
        {
            field: 'actions',
            headerName: 'İşlemler',
            width: 100,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Detay">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); detayaGit(params.row._id); }} sx={{ color: '#3b82f6' }}>
                            <VisibilityIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, id: params.row._id, takipId: params.row.takipId });
                            }}
                            sx={{ color: '#ef4444' }}
                        >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ];

    return (
    // 📋 ETUYS teması — DataGrid'in görünümü buradan geliyor.
    // Grid'in KENDİSİ değişmedi: sıralama, filtreleme, sütun boyutlandırma ve
    // seçim aynen duruyor. Yalnız giydiriliyor (tasarim/muiTema.js → MuiDataGrid).
        <ThemeProvider theme={etuysTema}>
        <LayoutWrapper>
            <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton onClick={() => navigate('/dosya-takip')} sx={{ border: '1px solid #e2e8f0' }}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                {arsivModu ? 'Arşiv — Sonuçlanan Talepler' : 'Talep Listesi'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {arsivModu
                                    ? `Toplam ${pagination?.toplam || 0} sonuçlanmış talep`
                                    : `Toplam ${pagination?.toplam || 0} aktif talep`}
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        {/* 🗄️ Arşiv geçişi — sonuçlananlar ana listeyi kalabalıklaştırmasın */}
                        <Button
                            variant={arsivModu ? 'contained' : 'outlined'}
                            startIcon={<ArchiveIcon />}
                            // setArsivModu zaten sayfayı başa alıyor (parametreYaz
                            // varsayılan olarak 'sayfa'yı siler); ayrıca çağrı gereksiz.
                            onClick={() => setArsivModu(!arsivModu)}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                ...(arsivModu
                                    ? { background: 'linear-gradient(135deg, #047857, #059669)', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)' }
                                    : { borderColor: '#cbd5e1', color: '#475569' })
                            }}
                        >
                            {arsivModu ? 'Aktif Talepler' : 'Arşiv'}
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/dosya-takip/yeni')}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                            }}
                        >
                            Yeni Talep
                        </Button>
                    </Box>
                </Box>

                {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                {/* Filtreler */}
                <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Firma, Takip ID, Belge No ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearch}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment>,
                                    endAdornment: search && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => { sonYazilanArama.current = ''; setSearch(''); parametreYaz({ q: '' }); }}>
                                                <ClearIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                sx={FILTRE_SX}
                            />
                        </Grid>
                        <Grid item xs={12} md={2.5}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="Ana Aşama"
                                value={filterAnaAsama}
                                onChange={(e) => setFilterAnaAsama(e.target.value)}
                                sx={FILTRE_SX}
                                SelectProps={FILTRE_MENU_PROPS}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                <MenuItem value="MURACAAT_ONCESI">1. Müracaat Öncesi</MenuItem>
                                <MenuItem value="KURUM_DEGERLENDIRME">2. Kurum Değerlendirme</MenuItem>
                                <MenuItem value="KURUM_EKSIK">3. Kurum Eksik</MenuItem>
                                <MenuItem value="KURUM_SONUCLANMA">4. Sonuçlanma</MenuItem>
                                <MenuItem value="TAMAMLANDI">Tamamlandı</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={2.5}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="Talep Türü"
                                value={filterTalepTuru}
                                onChange={(e) => parametreYaz({ talepTuru: e.target.value })}
                                sx={FILTRE_SX}
                                SelectProps={FILTRE_MENU_PROPS}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {sikTalepTurleri.length > 0 && (
                                    <ListSubheader sx={GRUP_BASLIK_SX}>En sık kullanılanlar</ListSubheader>
                                )}
                                {sikTalepTurleri.map(t => (
                                    <MenuItem key={`sik-${t}`} value={t}>{t}</MenuItem>
                                ))}
                                {sikTalepTurleri.length > 0 && (
                                    <ListSubheader sx={GRUP_BASLIK_SX}>Tümü (A–Z)</ListSubheader>
                                )}
                                {alfabetikTalepTurleri.map(t => (
                                    <MenuItem key={`az-${t}`} value={t}>{t}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        {/* 👤 müşteri: müracaat hazırlayan / takibi yapan isim isim filtrelenebilsin */}
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="Müracaat Hazırlayan"
                                value={filterHazirlayan}
                                onChange={(e) => parametreYaz({ hazirlayan: e.target.value })}
                                sx={FILTRE_SX}
                                SelectProps={FILTRE_MENU_PROPS}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                <MenuItem value="YOK">— Atanmamış —</MenuItem>
                                {personeller.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>{p.adSoyad}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="Takibi Yapan"
                                value={filterTakipEden}
                                onChange={(e) => parametreYaz({ takipEden: e.target.value })}
                                sx={FILTRE_SX}
                                SelectProps={FILTRE_MENU_PROPS}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                <MenuItem value="YOK">— Atanmamış —</MenuItem>
                                {personeller.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>{p.adSoyad}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button fullWidth variant="outlined" size="small" onClick={loadData} startIcon={<RefreshIcon />}
                                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#e2e8f0', color: '#374151' }}>
                                    Yenile
                                </Button>
                                {(search || filterAnaAsama || kapsam || filterTalepTuru || filterHazirlayan || filterTakipEden) && (
                                    <Button size="small" onClick={clearFilters} sx={{ minWidth: 'auto', color: '#ef4444' }}>
                                        Temizle
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* DataGrid */}
                <Paper sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    overflow: 'hidden',
                    width: '100%',
                    minWidth: 0
                }}>
                    {/* müşteri: yatay kaydırma çubuğunun bir eşi tablonun üstünde de olsun */}
                    <UstKaydirmaCubugu>
                        <DataGrid
                            rows={talepler}
                            columns={columns}
                            getRowId={(row) => row._id}
                            loading={loading}
                            paginationMode="server"
                            rowCount={pagination?.toplam || 0}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            pageSizeOptions={[25, 50, 100]}
                            disableRowSelectionOnClick
                            onRowClick={(params) => detayaGit(params.row._id)}
                            localeText={trTR.components.MuiDataGrid.defaultProps.localeText}
                            autoHeight
                            // müşteri: tablo daha kompakt olsun (varsayılan 52 / 56)
                            rowHeight={40}
                            columnHeaderHeight={40}
                            // "Sayfa başına satır" açılır listesi portal içinde açıldığı için
                            // aşağıdaki sx ona ulaşmıyor; boyut buradan veriliyor.
                            slotProps={{
                                pagination: {
                                    SelectProps: {
                                        sx: { fontSize: TABLO_FONT },
                                        MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: TABLO_FONT } } } }
                                    }
                                }
                            }}
                            sx={{
                                border: 'none',
                                width: '100%',
                                '& .MuiDataGrid-columnHeaders': {
                                    background: '#f8fafc',
                                    borderBottom: '2px solid #e2e8f0'
                                },
                                // Başlıklar da hücrelerle aynı boyutta olsun
                                '& .MuiDataGrid-columnHeaderTitle': {
                                    fontSize: TABLO_FONT,
                                    fontWeight: 600
                                },
                                '& .MuiDataGrid-row:hover': {
                                    background: '#fefce8',
                                    cursor: 'pointer'
                                },
                                // DataGrid varsayılanı 0 10px; 8px'e çekmek hem sıkıştırıyor
                                // hem de her hücreye 4px fazladan metin alanı bırakıyor.
                                '& .MuiDataGrid-cell': {
                                    borderBottom: '1px solid #f1f5f9',
                                    px: 1
                                },
                                '& .MuiDataGrid-columnHeader': {
                                    px: 1
                                },
                                // Alt bilgi (sayfalama) da aynı boyutta kalsın
                                '& .MuiTablePagination-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                    fontSize: TABLO_FONT
                                },
                                // "Kayıt yok" katmanı da aynı boyutta olsun
                                '& .MuiDataGrid-overlay': {
                                    fontSize: TABLO_FONT
                                },
                                // Satırlar 40px'e inince alt şerit 52px kalıyordu
                                '& .MuiDataGrid-footerContainer': {
                                    minHeight: 44
                                }
                            }}
                        />
                    </UstKaydirmaCubugu>
                </Paper>

                {/* Silme Dialog */}
                <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, takipId: '' })}>
                    <DialogTitle sx={{ fontWeight: 600 }}>Talep Silme Onayı</DialogTitle>
                    <DialogContent>
                        <Typography>
                            <strong>{deleteDialog.takipId}</strong> numaralı talebi silmek istediğinize emin misiniz?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialog({ open: false, id: null, takipId: '' })} sx={{ textTransform: 'none' }}>
                            İptal
                        </Button>
                        <Button onClick={handleDelete} color="error" variant="contained" sx={{ textTransform: 'none', borderRadius: 2 }}>
                            Sil
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </LayoutWrapper>
        </ThemeProvider>
    );
};

export default DosyaTakipList;
