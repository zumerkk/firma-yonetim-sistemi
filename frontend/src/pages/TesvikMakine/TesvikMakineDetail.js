// 📄 TEŞVİK MAKİNE DETAY - /tesvikler/:tesvikModel/:tesvikId
// Sekmeler: Künye · Yerli · İthal · Makine Talepleri · Evraklar · Mail Geçmişi · Hatırlatmalar · Geçmiş
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Tabs, Tab, Typography, Grid, Button, TextField, MenuItem, Stack, Chip,
  IconButton, Tooltip, Snackbar, Alert, CircularProgress, Menu, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/tesvikMakineService';
import MakineDetailModal from './MakineDetailModal';
import { StatusChip, formatDate, formatMoney, listTypeLabel } from './helpers';

export default function TesvikMakineDetail() {
  const { tesvikModel, tesvikId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(3); // Makine Talepleri varsayılan
  const [cert, setCert] = useState(null);
  const [machines, setMachines] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null);
  const notify = (message, severity = 'success') => setSnack({ message, severity });

  // Modal
  const [modalTarget, setModalTarget] = useState(null);

  // Filtreler
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fList, setFList] = useState('');
  const [fQuick, setFQuick] = useState(''); // '' | 'docs' | 'overdue'
  const [selection, setSelection] = useState([]);

  // Diğer sekme verileri
  const [docs, setDocs] = useState(null);
  const [mails, setMails] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [timeline, setTimeline] = useState(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    try {
      const [c, mc, mt] = await Promise.all([
        svc.getCertificate(tesvikModel, tesvikId),
        svc.getMachines(tesvikModel, tesvikId),
        meta ? Promise.resolve(meta) : svc.meta()
      ]);
      setCert(c); setMachines(mc.rows || []); if (!meta) setMeta(mt);
    } catch (e) { notify(e?.response?.data?.message || 'Yükleme hatası', 'error'); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tesvikModel, tesvikId]);

  useEffect(() => { loadCore(); }, [loadCore]);

  // Sekme verileri (ilk ziyarette yükle)
  useEffect(() => {
    if (tab === 4 && docs === null) svc.getCertDocuments(tesvikModel, tesvikId).then(setDocs).catch(() => setDocs([]));
    if (tab === 5 && mails === null) svc.getCertMails(tesvikModel, tesvikId).then(setMails).catch(() => setMails([]));
    if (tab === 6 && reminders === null) svc.getCertReminders(tesvikModel, tesvikId).then(setReminders).catch(() => setReminders({ processes: [], jobs: [] }));
    if (tab === 7 && timeline === null) svc.getCertTimeline(tesvikModel, tesvikId).then(setTimeline).catch(() => setTimeline([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const refreshAll = () => { setDocs(null); setMails(null); setReminders(null); setTimeline(null); loadCore(); };

  // Makine tablosu filtreleme
  const now = Date.now();
  const filteredRows = useMemo(() => {
    let rows = machines;
    if (q.trim()) { const s = q.toLocaleLowerCase('tr'); rows = rows.filter((r) => `${r.machineName} ${r.makineId} ${r.gtipNo} ${r.supplierCompanyName}`.toLocaleLowerCase('tr').includes(s)); }
    if (fStatus) rows = rows.filter((r) => r.status === fStatus);
    if (fList) rows = rows.filter((r) => r.listType === fList);
    if (fQuick === 'docs') rows = rows.filter((r) => r.statusBadge?.category === 'evrak');
    if (fQuick === 'overdue') rows = rows.filter((r) => r.nextReminderAt && new Date(r.nextReminderAt).getTime() < now && !(r.process?.reminderStopped));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines, q, fStatus, fList, fQuick]);

  const machineColumns = [
    { field: 'siraNo', headerName: 'Sıra', width: 70 },
    { field: 'listType', headerName: 'Tür', width: 80, renderCell: (p) => <Chip size="small" variant="outlined" label={listTypeLabel(p.value)} color={p.value === 'import' ? 'secondary' : 'default'} /> },
    { field: 'makineId', headerName: 'Makine ID', width: 100 },
    { field: 'gtipNo', headerName: 'GTİP', width: 120 },
    { field: 'machineName', headerName: 'Makine Adı', flex: 1, minWidth: 200 },
    { field: 'quantity', headerName: 'Adet', width: 80, valueGetter: (p) => `${p.row.quantity || 0} ${p.row.unit || ''}` },
    { field: 'totalPrice', headerName: 'Tutar', width: 130, valueGetter: (p) => formatMoney(p.row.totalPrice, p.row.currency) },
    { field: 'kdvExempt', headerName: 'KDV İst.', width: 90, renderCell: (p) => p.value ? <Chip size="small" color="success" label="Evet" /> : <Chip size="small" label="Hayır" variant="outlined" /> },
    { field: 'supplierCompanyName', headerName: 'Tedarikçi', width: 150, valueGetter: (p) => p.row.supplierCompanyName || '-' },
    { field: 'barcode', headerName: 'Barkod', width: 110, valueGetter: (p) => p.row.barcode || '-' },
    { field: 'status', headerName: 'Durum', width: 200, renderCell: (p) => <StatusChip badge={p.row.statusBadge} /> },
    { field: 'lastMailAt', headerName: 'Son Mail', width: 110, valueGetter: (p) => formatDate(p.row.lastMailAt) },
    { field: 'documentCount', headerName: 'Evrak', width: 80, valueGetter: (p) => p.row.documentCount || 0 },
    {
      field: 'actions', headerName: 'İşlem', width: 130, sortable: false, filterable: false,
      renderCell: (p) => <Button size="small" variant="contained" startIcon={<BuildCircleIcon />} onClick={() => openModal(p.row)}>İşlem</Button>
    }
  ];

  const openModal = (row) => setModalTarget({ tesvikModel, tesvikId, listType: row.listType, rowId: row.rowId, machine: row });

  // Toplu işlem
  const [bulkAnchor, setBulkAnchor] = useState(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkTemplate, setBulkTemplate] = useState('');
  const selectedTargets = () => selection.map((rid) => { const r = machines.find((m) => m.rowId === rid); return { tesvikModel, tesvikId, listType: r.listType, rowId: r.rowId }; });

  const runBulk = async (action, payload = {}) => {
    if (!selection.length) return notify('Önce makine seçin', 'warning');
    try {
      const res = await svc.bulk({ targets: selectedTargets(), action, payload });
      notify(`${res.succeeded}/${res.total} işlem başarılı`);
      setBulkAnchor(null); refreshAll();
    } catch (e) { notify(e?.response?.data?.message || 'Toplu işlem hatası', 'error'); }
  };

  if (loading && !cert) return <LayoutWrapper><Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box></LayoutWrapper>;

  const id = cert?.identity || {};

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Başlık */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <IconButton onClick={() => navigate('/tesvikler')}><ArrowBackIcon /></IconButton>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{id.firmaName || 'Teşvik Belgesi'}</Typography>
            <Typography variant="body2" color="text.secondary">
              Belge No: {id.documentNo || '-'} · Belge ID: {id.documentId || '-'} · {formatDate(id.documentDate)} · {tesvikModel === 'YeniTesvik' ? 'Yeni Belge' : 'Eski Belge'}
            </Typography>
          </Box>
          <Tooltip title="Yenile"><IconButton onClick={refreshAll}><RefreshIcon /></IconButton></Tooltip>
        </Stack>

        <Paper sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Belge Künyesi" />
            <Tab label={`Yerli Liste (${cert?.totals?.localCount || 0})`} />
            <Tab label={`İthal Liste (${cert?.totals?.importCount || 0})`} />
            <Tab label="Makine Talepleri" />
            <Tab label="Evraklar" />
            <Tab label="Mail Geçmişi" />
            <Tab label="Hatırlatmalar" />
            <Tab label="Notlar / Geçmiş" />
          </Tabs>
        </Paper>

        {/* 0 Künye */}
        {tab === 0 && (
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Field label="Firma / Yatırımcı Ünvanı" value={id.firmaName} md={8} />
              <Field label="Vergi No" value={id.taxNumber} md={4} />
              <Field label="Belge No" value={id.documentNo} md={4} />
              <Field label="Belge ID" value={id.documentId} md={4} />
              <Field label="Belge Tarihi" value={formatDate(id.documentDate)} md={4} />
              <Field label="Yatırım Konusu" value={id.investmentSubject} md={12} />
              <Field label="Adres" value={id.address} md={12} />
              <Field label="Yerli Toplam" value={formatMoney(cert?.totals?.localTotal, 'TRY')} md={4} />
              <Field label="İthal Toplam (USD)" value={formatMoney(cert?.totals?.importTotalUsd, 'USD')} md={4} />
            </Grid>
          </Paper>
        )}

        {/* 1 & 2 Yerli / İthal ham listeler */}
        {(tab === 1 || tab === 2) && (
          <Paper sx={{ height: 560 }}>
            <DataGrid
              rows={(tab === 1 ? cert?.yerli : cert?.ithal) || []}
              getRowId={(r) => r.rowId}
              columns={[
                { field: 'siraNo', headerName: 'Sıra', width: 70 },
                { field: 'makineId', headerName: 'Makine ID', width: 100 },
                { field: 'gtipNo', headerName: 'GTİP', width: 130 },
                { field: 'machineName', headerName: 'Makine Adı', flex: 1, minWidth: 220 },
                { field: 'quantity', headerName: 'Adet', width: 90, valueGetter: (p) => `${p.row.quantity || 0} ${p.row.unit || ''}` },
                { field: 'unitPrice', headerName: 'Birim Fiyat', width: 130, valueGetter: (p) => formatMoney(p.row.unitPrice, p.row.currency) },
                { field: 'totalPrice', headerName: 'Toplam', width: 140, valueGetter: (p) => formatMoney(p.row.totalPrice, p.row.currency) },
                { field: 'kdvExempt', headerName: 'KDV İst.', width: 90, valueGetter: (p) => p.row.kdvExempt ? 'Evet' : 'Hayır' }
              ]}
              density="compact" disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            />
          </Paper>
        )}

        {/* 3 Makine Talepleri */}
        {tab === 3 && (
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <TextField size="small" label="Ara" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 180 }} />
              <TextField select size="small" label="Durum" value={fStatus} onChange={(e) => setFStatus(e.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="">Tümü</MenuItem>
                {(meta?.statuses || []).map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Liste" value={fList} onChange={(e) => setFList(e.target.value)} sx={{ minWidth: 120 }}>
                <MenuItem value="">Tümü</MenuItem><MenuItem value="local">Yerli</MenuItem><MenuItem value="import">İthal</MenuItem>
              </TextField>
              <Chip label="Evrak Bekleyenler" color={fQuick === 'docs' ? 'warning' : 'default'} onClick={() => setFQuick(fQuick === 'docs' ? '' : 'docs')} />
              <Chip label="7 Günü Geçenler" color={fQuick === 'overdue' ? 'error' : 'default'} onClick={() => setFQuick(fQuick === 'overdue' ? '' : 'overdue')} />
              <Box sx={{ flex: 1 }} />
              <Button variant="outlined" disabled={!selection.length} onClick={(e) => setBulkAnchor(e.currentTarget)}>
                Toplu İşlem ({selection.length})
              </Button>
            </Stack>
            <Box sx={{ height: 560 }}>
              <DataGrid
                rows={filteredRows} columns={machineColumns} getRowId={(r) => r.rowId}
                checkboxSelection disableRowSelectionOnClick density="compact"
                rowSelectionModel={selection} onRowSelectionModelChange={setSelection}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              />
            </Box>
            <Menu anchorEl={bulkAnchor} open={!!bulkAnchor} onClose={() => setBulkAnchor(null)}>
              <Box sx={{ p: 2, width: 280 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Seçili {selection.length} makine</Typography>
                <TextField select fullWidth size="small" label="Durum Ata" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} sx={{ mb: 1 }}>
                  {(meta?.statuses || []).map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </TextField>
                <Button fullWidth size="small" variant="outlined" sx={{ mb: 1 }} disabled={!bulkStatus} onClick={() => runBulk('set_status', { status: bulkStatus })}>Durumu Uygula</Button>
                <Divider sx={{ my: 1 }} />
                <TextField select fullWidth size="small" label="Mail Gönder" value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value)} sx={{ mb: 1 }}>
                  {(meta?.templates || []).map((t) => <MenuItem key={t.code} value={t.code}>{t.name}</MenuItem>)}
                </TextField>
                <Button fullWidth size="small" variant="outlined" sx={{ mb: 1 }} disabled={!bulkTemplate} onClick={() => runBulk('send_mail', { templateCode: bulkTemplate })}>Mail Gönder</Button>
                <Divider sx={{ my: 1 }} />
                <Button fullWidth size="small" variant="outlined" sx={{ mb: 1 }} onClick={() => runBulk('create_folders')}>Klasör Oluştur</Button>
                <Button fullWidth size="small" variant="outlined" onClick={() => runBulk('upload_link')}>Upload Link Üret</Button>
              </Box>
            </Menu>
          </Paper>
        )}

        {/* 4 Evraklar */}
        {tab === 4 && (
          <Paper sx={{ height: 560 }}>
            <DataGrid rows={docs || []} loading={docs === null} getRowId={(r) => r._id}
              columns={[
                { field: 'createdAt', headerName: 'Tarih', width: 150, valueGetter: (p) => formatDate(p.row.createdAt, true) },
                { field: 'originalName', headerName: 'Dosya', flex: 1, minWidth: 200 },
                { field: 'documentType', headerName: 'Tür', width: 140 },
                { field: 'uploadedByType', headerName: 'Yükleyen', width: 110 },
                { field: 'uploaderName', headerName: 'Ad', width: 140 },
                { field: 'fileUrl', headerName: 'Aç', width: 80, renderCell: (p) => p.value ? <Button size="small" href={p.value} target="_blank">Aç</Button> : '-' }
              ]} density="compact" disableRowSelectionOnClick />
          </Paper>
        )}

        {/* 5 Mail Geçmişi */}
        {tab === 5 && (
          <Paper sx={{ height: 560 }}>
            <DataGrid rows={mails || []} loading={mails === null} getRowId={(r) => r._id}
              columns={[
                { field: 'createdAt', headerName: 'Tarih', width: 150, valueGetter: (p) => formatDate(p.row.createdAt, true) },
                { field: 'subject', headerName: 'Konu', flex: 1, minWidth: 220 },
                { field: 'toEmails', headerName: 'Kime', width: 200, valueGetter: (p) => (p.row.toEmails || []).join(', ') },
                { field: 'templateCode', headerName: 'Şablon', width: 180 },
                { field: 'status', headerName: 'Durum', width: 110, renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'sent' ? 'success' : p.value === 'failed' ? 'error' : 'default'} /> },
                { field: 'resend', headerName: '', width: 110, sortable: false, renderCell: (p) => (p.row.status !== 'sent') ? <Button size="small" onClick={async () => { try { await svc.resendMail(p.row._id); notify('Yeniden gönderildi'); setMails(null); } catch (e) { notify(e?.response?.data?.message || 'Hata', 'error'); } }}>Tekrar Gönder</Button> : null }
              ]} density="compact" disableRowSelectionOnClick />
          </Paper>
        )}

        {/* 6 Hatırlatmalar */}
        {tab === 6 && (
          <Paper sx={{ height: 560 }}>
            <DataGrid rows={reminders?.jobs || []} loading={reminders === null} getRowId={(r) => r._id}
              columns={[
                { field: 'dueAt', headerName: 'Vade', width: 150, valueGetter: (p) => formatDate(p.row.dueAt, true) },
                { field: 'status', headerName: 'Durum', width: 120, renderCell: (p) => <Chip size="small" label={p.value} color={p.value === 'sent' ? 'success' : p.value === 'failed' ? 'error' : p.value === 'skipped' ? 'default' : 'info'} /> },
                { field: 'reminderType', headerName: 'Tür', width: 160 },
                { field: 'skipReason', headerName: 'Atlama Nedeni', flex: 1, minWidth: 160 },
                { field: 'sentAt', headerName: 'Gönderim', width: 150, valueGetter: (p) => formatDate(p.row.sentAt, true) }
              ]} density="compact" disableRowSelectionOnClick />
          </Paper>
        )}

        {/* 7 Timeline */}
        {tab === 7 && (
          <Paper sx={{ height: 560 }}>
            <DataGrid rows={timeline || []} loading={timeline === null} getRowId={(r) => r._id}
              columns={[
                { field: 'createdAt', headerName: 'Tarih', width: 160, valueGetter: (p) => formatDate(p.row.createdAt, true) },
                { field: 'actionType', headerName: 'İşlem', width: 170 },
                { field: 'newStatusLabel', headerName: 'Yeni Durum', width: 200 },
                { field: 'note', headerName: 'Not', flex: 1, minWidth: 200 },
                { field: 'performedByLabel', headerName: 'Yapan', width: 160 }
              ]} density="compact" disableRowSelectionOnClick />
          </Paper>
        )}
      </Box>

      <MakineDetailModal open={!!modalTarget} target={modalTarget} meta={meta}
        onClose={() => setModalTarget(null)} onChanged={() => { svc.getMachines(tesvikModel, tesvikId).then((mc) => setMachines(mc.rows || [])); }} />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </LayoutWrapper>
  );
}

function Field({ label, value, md }) {
  return (
    <Grid item xs={12} md={md}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>{value || '-'}</Typography>
    </Grid>
  );
}
