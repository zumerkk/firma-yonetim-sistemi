// 📊 TEŞVİK MAKİNE RAPORLARI - /tesvikler/raporlar
// Firma bazlı · Tedarikçi bazlı bekleyen dönüşler · KDV muafiyet bekleyen · Fatura taslağı bekleyen
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Tabs, Tab, Typography, Stack, Button, IconButton, Tooltip, Snackbar, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/tesvikMakineService';
import { formatDate, exportCsv } from './helpers';

const REPORTS = [
  {
    type: 'firms', label: 'Firma Bazlı',
    columns: [
      { field: '_id', headerName: 'Firma', flex: 1, minWidth: 240, header: 'Firma' },
      { field: 'total', headerName: 'Toplam Makine', width: 140, type: 'number', header: 'Toplam' },
      { field: 'open', headerName: 'Açık İşlem', width: 130, type: 'number', header: 'Açık' },
      { field: 'completed', headerName: 'Tamamlanan', width: 130, type: 'number', header: 'Tamamlanan' }
    ]
  },
  {
    type: 'suppliers', label: 'Tedarikçi Bazlı Bekleyen',
    columns: [
      { field: '_id', headerName: 'Tedarikçi', flex: 1, minWidth: 240, header: 'Tedarikçi' },
      { field: 'open', headerName: 'Bekleyen İşlem', width: 150, type: 'number', header: 'Bekleyen' },
      { field: 'lastMailAt', headerName: 'Son Mail', width: 150, valueGetter: (p) => formatDate(p.row.lastMailAt), header: 'Son Mail', value: (r) => formatDate(r.lastMailAt) }
    ]
  },
  {
    type: 'kdv-waiting', label: 'KDV Muafiyet Bekleyen',
    columns: machineWaitingColumns()
  },
  {
    type: 'invoice-draft-waiting', label: 'Fatura Taslağı Bekleyen',
    columns: machineWaitingColumns()
  }
];

function machineWaitingColumns() {
  return [
    { field: 'firmaName', headerName: 'Firma', flex: 1, minWidth: 200, header: 'Firma' },
    { field: 'documentNo', headerName: 'Belge No', width: 110, header: 'Belge No' },
    { field: 'siraNo', headerName: 'Sıra', width: 70, header: 'Sıra' },
    { field: 'machineName', headerName: 'Makine', width: 200, header: 'Makine' },
    { field: 'supplierCompanyName', headerName: 'Tedarikçi', width: 160, header: 'Tedarikçi' },
    { field: 'lastMailAt', headerName: 'Son Mail', width: 120, valueGetter: (p) => formatDate(p.row.lastMailAt), header: 'Son Mail', value: (r) => formatDate(r.lastMailAt) },
    { field: 'nextReminderAt', headerName: 'Sonraki Hatırlatma', width: 160, valueGetter: (p) => formatDate(p.row.nextReminderAt), header: 'Sonraki Hatırlatma', value: (r) => formatDate(r.nextReminderAt) }
  ];
}

export default function TesvikRaporlar() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState(null);

  const def = REPORTS[tab];

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await svc.reports(def.type)) || []); }
    catch (e) { setSnack({ message: e?.response?.data?.message || 'Rapor yüklenemedi', severity: 'error' }); setRows([]); }
    finally { setLoading(false); }
  }, [def.type]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const cols = def.columns.map((c) => ({ header: c.header || c.headerName, value: c.value || c.field }));
    exportCsv(`tesvik_rapor_${def.type}`, cols, rows);
  };

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/tesvikler')}><ArrowBackIcon /></IconButton>
          <AssessmentIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Teşvik Makine Raporları</Typography>
          <Tooltip title="Yenile"><IconButton onClick={load}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={!rows.length}>CSV / Excel</Button>
        </Stack>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            {REPORTS.map((r) => <Tab key={r.type} label={r.label} />)}
          </Tabs>
        </Paper>

        <Paper sx={{ height: 600 }}>
          <DataGrid
            rows={rows} columns={def.columns} loading={loading}
            getRowId={(r) => r._id || `${r.documentNo}-${r.siraNo}-${r.machineName}`}
            density="compact" disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
            pageSizeOptions={[25, 50, 100]}
          />
        </Paper>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </LayoutWrapper>
  );
}
