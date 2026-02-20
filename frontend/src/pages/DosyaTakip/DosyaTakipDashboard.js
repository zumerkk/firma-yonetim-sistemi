// 📊 Dosya İş Akış Takip - Dashboard
// Ana istatistik ve özet sayfası

import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardActions,
    Button, Chip, LinearProgress, Avatar, IconButton,
    Paper, Divider, Alert
} from '@mui/material';
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
    Warning as WarningIcon,
    Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDosyaTakip } from '../../contexts/DosyaTakipContext';

// Layout
import LayoutWrapper from '../../components/Layout/LayoutWrapper';

// Renk eşleştirmeleri
const DURUM_RENKLERI = {
    mavi: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
    sari: { bg: '#fefce8', text: '#a16207', border: '#fde047' },
    turuncu: { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
    kirmizi: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
    yesil: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
    gri: { bg: '#f9fafb', text: '#4b5563', border: '#d1d5db' },
    mor: { bg: '#faf5ff', text: '#7c3aed', border: '#c4b5fd' }
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

    const statsCards = [
        {
            title: 'Toplam Talep',
            value: dashboardStats?.ozet?.toplamTalep || 0,
            icon: <AssignmentIcon />,
            gradient: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            shadowColor: 'rgba(30, 64, 175, 0.3)'
        },
        {
            title: 'Aktif Talep',
            value: dashboardStats?.ozet?.aktifTalep || 0,
            icon: <PlaylistAddCheckIcon />,
            gradient: 'linear-gradient(135deg, #7c2d12, #f59e0b)',
            shadowColor: 'rgba(245, 158, 11, 0.3)'
        },
        {
            title: 'Müracaat Öncesi',
            value: dashboardStats?.ozet?.muraacatOncesi || 0,
            icon: <HourglassEmptyIcon />,
            gradient: 'linear-gradient(135deg, #581c87, #7c3aed)',
            shadowColor: 'rgba(124, 58, 237, 0.3)'
        },
        {
            title: 'Müracaat Sonrası',
            value: dashboardStats?.ozet?.muraacatSonrasi || 0,
            icon: <AccountBalanceIcon />,
            gradient: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
            shadowColor: 'rgba(220, 38, 38, 0.3)'
        },
        {
            title: 'Kurum Sonuçlanma',
            value: dashboardStats?.ozet?.kurumSonuclanma || 0,
            icon: <ScheduleIcon />,
            gradient: 'linear-gradient(135deg, #064e3b, #059669)',
            shadowColor: 'rgba(5, 150, 105, 0.3)'
        },
        {
            title: 'Tamamlanan',
            value: dashboardStats?.ozet?.tamamlanan || 0,
            icon: <CheckCircleIcon />,
            gradient: 'linear-gradient(135deg, #14532d, #22c55e)',
            shadowColor: 'rgba(34, 197, 94, 0.3)'
        }
    ];

    return (
        <LayoutWrapper>
            <Box sx={{ p: { xs: 2, sm: 3 }, width: '100%', minWidth: 0 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                            📋 İş Akış Takip Sistemi
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                            Dosya talep ve iş akışı takip merkezi
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <IconButton
                            onClick={handleRefresh}
                            disabled={refreshing}
                            sx={{
                                background: 'rgba(255,255,255,0.9)',
                                border: '1px solid #e2e8f0',
                                '&:hover': { background: '#f1f5f9' }
                            }}
                        >
                            <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
                        </IconButton>
                        <Button
                            variant="outlined"
                            startIcon={<ListIcon />}
                            onClick={() => navigate('/dosya-takip/liste')}
                            sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#e2e8f0', color: '#374151' }}
                        >
                            Tüm Talepler
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/dosya-takip/yeni')}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #b45309, #d97706)',
                                    boxShadow: '0 6px 20px rgba(245, 158, 11, 0.45)'
                                }
                            }}
                        >
                            Yeni Talep Oluştur
                        </Button>
                    </Box>
                </Box>

                {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
                {error && (
                    <Alert severity="error" onClose={clearError} sx={{ mb: 3, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* İstatistik Kartları */}
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                    {statsCards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                            <Card sx={{
                                borderRadius: 3,
                                border: '1px solid rgba(226, 232, 240, 0.6)',
                                boxShadow: `0 4px 20px ${card.shadowColor}`,
                                transition: 'all 0.3s ease',
                                overflow: 'visible',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: `0 8px 30px ${card.shadowColor}`
                                }
                            }}>
                                <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Avatar sx={{
                                            width: 44,
                                            height: 44,
                                            background: card.gradient,
                                            boxShadow: `0 4px 12px ${card.shadowColor}`
                                        }}>
                                            {React.cloneElement(card.icon, { sx: { fontSize: 22 } })}
                                        </Avatar>
                                    </Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.25 }}>
                                        {card.value}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                                        {card.title}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Son Talepler ve Dağılım */}
                <Grid container spacing={3}>
                    {/* Son Talepler */}
                    <Grid item xs={12} lg={7}>
                        <Paper sx={{
                            borderRadius: 3,
                            border: '1px solid rgba(226, 232, 240, 0.6)',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>
                                    Son Talepler
                                </Typography>
                                <Button
                                    size="small"
                                    endIcon={<ArrowForwardIcon />}
                                    onClick={() => navigate('/dosya-takip/liste')}
                                    sx={{ textTransform: 'none', color: '#6b7280' }}
                                >
                                    Tümünü Gör
                                </Button>
                            </Box>
                            <Box sx={{ p: 0 }}>
                                {(!dashboardStats?.sonTalepler || dashboardStats.sonTalepler.length === 0) ? (
                                    <Box sx={{ p: 4, textAlign: 'center' }}>
                                        <AssignmentIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 1 }} />
                                        <Typography color="textSecondary">Henüz talep oluşturulmamış</Typography>
                                        <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            onClick={() => navigate('/dosya-takip/yeni')}
                                            sx={{ mt: 2, textTransform: 'none', borderRadius: 2 }}
                                        >
                                            İlk Talebi Oluştur
                                        </Button>
                                    </Box>
                                ) : (
                                    dashboardStats.sonTalepler.map((talep, index) => {
                                        const renk = DURUM_RENKLERI[talep.durumRengi] || DURUM_RENKLERI.mavi;
                                        return (
                                            <Box key={talep._id || index}>
                                                <Box
                                                    sx={{
                                                        px: 2.5,
                                                        py: 1.75,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s',
                                                        '&:hover': { background: '#f8fafc' }
                                                    }}
                                                    onClick={() => navigate(`/dosya-takip/${talep._id}`)}
                                                >
                                                    <Avatar sx={{
                                                        width: 36,
                                                        height: 36,
                                                        background: renk.bg,
                                                        color: renk.text,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        border: `1px solid ${renk.border}`
                                                    }}>
                                                        {talep.takipId?.slice(-3) || '?'}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {talep.firmaUnvan || 'Firma Bilgisi Yok'}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                                                            {talep.takipId} • {talep.talepTuru}
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={talep.durum?.replace(/_/g, ' ').replace(/^\d+\.\d+(\.\d+)*\s*/, '').substring(0, 20)}
                                                        size="small"
                                                        sx={{
                                                            background: renk.bg,
                                                            color: renk.text,
                                                            border: `1px solid ${renk.border}`,
                                                            fontWeight: 600,
                                                            fontSize: '0.65rem',
                                                            height: 24
                                                        }}
                                                    />
                                                </Box>
                                                {index < dashboardStats.sonTalepler.length - 1 && (
                                                    <Divider sx={{ mx: 2.5 }} />
                                                )}
                                            </Box>
                                        );
                                    })
                                )}
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Talep Türü Dağılımı */}
                    <Grid item xs={12} lg={5}>
                        <Paper sx={{
                            borderRadius: 3,
                            border: '1px solid rgba(226, 232, 240, 0.6)',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{ p: 2.5, borderBottom: '1px solid #f1f5f9' }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: '#1e293b' }}>
                                    <TrendingUpIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: '#f59e0b' }} />
                                    Talep Türü Dağılımı (Top 10)
                                </Typography>
                            </Box>
                            <Box sx={{ p: 2.5 }}>
                                {(!dashboardStats?.talepTuruDagilimi || dashboardStats.talepTuruDagilimi.length === 0) ? (
                                    <Box sx={{ textAlign: 'center', py: 3 }}>
                                        <WarningIcon sx={{ fontSize: 40, color: '#d1d5db', mb: 1 }} />
                                        <Typography color="textSecondary" variant="body2">Henüz veri yok</Typography>
                                    </Box>
                                ) : (
                                    dashboardStats.talepTuruDagilimi.map((item, index) => {
                                        const maxSayi = Math.max(...dashboardStats.talepTuruDagilimi.map(d => d.sayi));
                                        const yuzde = maxSayi > 0 ? (item.sayi / maxSayi) * 100 : 0;
                                        const renkler = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#6366f1', '#14b8a6'];
                                        return (
                                            <Box key={index} sx={{ mb: 2 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" sx={{ color: '#374151', fontWeight: 500, fontSize: '0.72rem', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item._id}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: renkler[index % renkler.length] }}>
                                                        {item.sayi}
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={yuzde}
                                                    sx={{
                                                        height: 6,
                                                        borderRadius: 3,
                                                        backgroundColor: '#f1f5f9',
                                                        '& .MuiLinearProgress-bar': {
                                                            borderRadius: 3,
                                                            background: `linear-gradient(90deg, ${renkler[index % renkler.length]}, ${renkler[index % renkler.length]}88)`
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </LayoutWrapper>
    );
};

export default DosyaTakipDashboard;
