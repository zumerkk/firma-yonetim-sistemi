// 📋 TEŞVİK MAKİNE LİSTESİ - /tesvikler
// Dashboard kartları + teşvik belgeleri tablosu (server-side sayfalama + filtre).
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Grid, Card, CardContent, Typography, TextField, MenuItem, Stack, Chip,
  InputAdornment, IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/tesvikMakineService';
import { formatDate, formatMoney } from './helpers';

const CARD_DEFS = [
  { key: 'totalCertificates', label: 'Toplam Teşvik Belgesi', color: '#1e40af' },
  { key: 'openMachineProcesses', label: 'Açık Makine İşlemi', color: '#0277bd' },
  { key: 'documentWaiting', label: 'Evrak Bekleyen Makine', color: '#ed6c02' },
  { key: 'kdvExemptionWaiting', label: 'KDV Muafiyet Bekleyen', color: '#ed6c02' },
  { key: 'invoiceDraftWaiting', label: 'Fatura Taslağı Bekleyen', color: '#ed6c02' },
  { key: 'overdueNoResponse', label: '7 Günü Geçen Cevapsız', color: '#d32f2f' },
  { key: 'mailsSentToday', label: 'Bugün Gönderilen Mail', color: '#2e7d32' },
  { key: 'completed', label: 'Tamamlanan İşlem', color: '#2e7d32' }
];

export default function TesvikMakineList() {
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [q, setQ] = useState('');
  const [model, setModel] = useState('');
  const [snack, setSnack] = useState(null);

  const loadDash = useCallback(() => { svc.dashboard().then(setDash).catch(() => {}); }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await svc.listCertificates({ q, tesvikModel: model || undefined, page: paginationModel.page + 1, limit: paginationModel.pageSize });
      setRows((res.data || []).map((r) => ({ id: `${r.tesvikModel}:${r.tesvikId}`, ...r })));
      setRowCount(res.pagination?.total || 0);
    } catch (e) { setSnack({ message: e?.response?.data?.message || 'Liste yüklenemedi', severity: 'error' }); }
    finally { setLoading(false); }
  }, [q, model, paginationModel]);

  useEffect(() => { loadDash(); }, [loadDash]);
  useEffect(() => { const t = setTimeout(loadList, 300); return () => clearTimeout(t); }, [loadList]);

  const columns = [
    { field: 'firmaAdi', headerName: 'Firma', flex: 1, minWidth: 220 },
    { field: 'belgeNo', headerName: 'Belge No', width: 110 },
    { field: 'belgeId', headerName: 'Belge ID', width: 110 },
    { field: 'belgeTarihi', headerName: 'Tarih', width: 110, valueGetter: (p) => formatDate(p.row.belgeTarihi) },
    { field: 'yatirimKonusu', headerName: 'Yatırım Konusu', width: 180 },
    { field: 'localTotal', headerName: 'Yerli Toplam', width: 140, valueGetter: (p) => formatMoney(p.row.localTotal, 'TRY') },
    { field: 'importTotalUsd', headerName: 'İthal Toplam', width: 140, valueGetter: (p) => formatMoney(p.row.importTotalUsd, 'USD') },
    { field: 'openProcesses', headerName: 'Açık İşlem', width: 100, type: 'number' },
    { field: 'documentWaiting', headerName: 'Bekleyen Evrak', width: 120, type: 'number' },
    { field: 'lastMailAt', headerName: 'Son Mail', width: 110, valueGetter: (p) => formatDate(p.row.lastMailAt) },
    { field: 'genelDurum', headerName: 'Genel Durum', width: 150, renderCell: (p) => <Chip size="small" label={p.row.genelDurumBadge?.label || p.value} sx={{ bgcolor: p.row.genelDurumBadge?.hex, color: '#fff' }} /> },
    { field: 'model', headerName: 'Tür', width: 90, valueGetter: (p) => p.row.tesvikModel === 'YeniTesvik' ? 'Yeni' : 'Eski' }
  ];

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <BuildCircleIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Teşvik Makine Teçhizat Yönetimi</Typography>
          <Tooltip title="Yenile"><IconButton onClick={() => { loadDash(); loadList(); }}><RefreshIcon /></IconButton></Tooltip>
        </Stack>

        {/* Dashboard kartları */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {CARD_DEFS.map((c) => (
            <Grid item xs={6} sm={4} md={3} key={c.key}>
              <Card sx={{ borderLeft: `4px solid ${c.color}` }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: c.color }}>{dash ? (dash[c.key] ?? 0) : '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filtreler */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField size="small" label="Firma / Belge No / Belge ID ara" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 280 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <TextField select size="small" label="Belge Türü" value={model} onChange={(e) => setModel(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="Tesvik">Eski Belge</MenuItem>
              <MenuItem value="YeniTesvik">Yeni Belge</MenuItem>
            </TextField>
          </Stack>
        </Paper>

        {/* Tablo */}
        <Paper sx={{ height: 600 }}>
          <DataGrid
            rows={rows} columns={columns} loading={loading}
            paginationMode="server" rowCount={rowCount}
            paginationModel={paginationModel} onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[25, 50, 100]} density="compact" disableRowSelectionOnClick
            onRowClick={(p) => navigate(`/tesvikler/${p.row.tesvikModel}/${p.row.tesvikId}`)}
            sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          />
        </Paper>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </LayoutWrapper>
  );
}
