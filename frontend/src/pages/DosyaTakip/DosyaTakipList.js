// 📋 Dosya İş Akış Takip - Talep Listesi
// DataGrid tabanlı filtrelenebilir liste

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Box, Typography, Button, Chip, TextField, MenuItem,
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
    Clear as ClearIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDosyaTakip } from '../../contexts/DosyaTakipContext';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';

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
    'MURACAAT_ONCESI': { label: '2.1 Müracaat Öncesi', color: '#7c3aed' },
    'MURACAAT_SONRASI': { label: '2.2 Müracaat Sonrası', color: '#dc2626' },
    'KURUM_SONUCLANMA': { label: '2.3 Kurum Sonuçlanma', color: '#059669' },
    'TAMAMLANDI': { label: 'Tamamlandı', color: '#22c55e' }
};

const DosyaTakipList = () => {
    const navigate = useNavigate();
    const { talepler: rawTalepler, pagination, loading, error, clearError, fetchTalepler, fetchEnums, enumDegerleri, talepSil } = useDosyaTakip();
    const [search, setSearch] = useState('');
    const [filterAnaAsama, setFilterAnaAsama] = useState('');
    const [filterTalepTuru, setFilterTalepTuru] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, takipId: '' });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });

    // Talepler verisi - her zaman array olmalı
    const talepler = Array.isArray(rawTalepler) ? rawTalepler : [];

    useEffect(() => {
        fetchEnums();
    }, [fetchEnums]);

    const loadData = useCallback(() => {
        const params = {
            page: paginationModel.page + 1,
            limit: paginationModel.pageSize,
            search,
            anaAsama: filterAnaAsama,
            talepTuru: filterTalepTuru
        };
        fetchTalepler(params);
    }, [fetchTalepler, paginationModel, search, filterAnaAsama, filterTalepTuru]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = (e) => {
        if (e.key === 'Enter') loadData();
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

    const clearFilters = () => {
        setSearch('');
        setFilterAnaAsama('');
        setFilterTalepTuru('');
    };

    const columns = [
        {
            field: 'takipId',
            headerName: 'Takip ID',
            width: 130,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'firmaUnvan',
            headerName: 'Firma',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {params.value || params.row?.firma?.tamUnvan || '-'}
                </Typography>
            )
        },
        {
            field: 'talepTuru',
            headerName: 'Talep Türü',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'ytbNo',
            headerName: 'YTB No',
            width: 120,
            renderCell: (params) => (
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {params.value || '-'}
                </Typography>
            )
        },
        {
            field: 'anaAsama',
            headerName: 'Aşama',
            width: 170,
            renderCell: (params) => {
                const info = ANA_ASAMA_ETIKETLERI[params.value] || { label: params.value, color: '#6b7280' };
                return (
                    <Chip
                        label={info.label}
                        size="small"
                        sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: info.color,
                            background: `${info.color}12`,
                            border: `1px solid ${info.color}30`,
                            height: 24
                        }}
                    />
                );
            }
        },
        {
            field: 'durum',
            headerName: 'Durum',
            width: 180,
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
                            fontSize: '0.65rem',
                            height: 24,
                            maxWidth: 170,
                            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' }
                        }}
                    />
                );
            }
        },
        {
            field: 'createdAt',
            headerName: 'Oluşturma Tarihi',
            width: 130,
            renderCell: (params) => (
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {params.value ? new Date(params.value).toLocaleDateString('tr-TR') : '-'}
                </Typography>
            )
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
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/dosya-takip/${params.row._id}`); }} sx={{ color: '#3b82f6' }}>
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
                                Talep Listesi
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Toplam {pagination?.toplam || 0} talep
                            </Typography>
                        </Box>
                    </Box>
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

                {error && <Alert severity="error" onClose={clearError} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                {/* Filtreler */}
                <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Firma, Takip ID, YTB No ara..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleSearch}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment>,
                                    endAdornment: search && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => { setSearch(''); }}>
                                                <ClearIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="Ana Aşama"
                                value={filterAnaAsama}
                                onChange={(e) => setFilterAnaAsama(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                <MenuItem value="MURACAAT_ONCESI">2.1 Müracaat Öncesi</MenuItem>
                                <MenuItem value="MURACAAT_SONRASI">2.2 Müracaat Sonrası</MenuItem>
                                <MenuItem value="KURUM_SONUCLANMA">2.3 Kurum Sonuçlanma</MenuItem>
                                <MenuItem value="TAMAMLANDI">Tamamlandı</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="Talep Türü"
                                value={filterTalepTuru}
                                onChange={(e) => setFilterTalepTuru(e.target.value)}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            >
                                <MenuItem value="">Tümü</MenuItem>
                                {(enumDegerleri?.talepTurleri || []).map(t => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button fullWidth variant="outlined" size="small" onClick={loadData} startIcon={<RefreshIcon />}
                                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#e2e8f0', color: '#374151' }}>
                                    Yenile
                                </Button>
                                {(search || filterAnaAsama || filterTalepTuru) && (
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
                    <Box sx={{ width: '100%', minWidth: 0 }}>
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
                            onRowClick={(params) => navigate(`/dosya-takip/${params.row._id}`)}
                            localeText={trTR.components.MuiDataGrid.defaultProps.localeText}
                            autoHeight
                            sx={{
                                border: 'none',
                                width: '100%',
                                '& .MuiDataGrid-columnHeaders': {
                                    background: '#f8fafc',
                                    borderBottom: '2px solid #e2e8f0'
                                },
                                '& .MuiDataGrid-row:hover': {
                                    background: '#fefce8',
                                    cursor: 'pointer'
                                },
                                '& .MuiDataGrid-cell': {
                                    borderBottom: '1px solid #f1f5f9'
                                }
                            }}
                        />
                    </Box>
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
    );
};

export default DosyaTakipList;
