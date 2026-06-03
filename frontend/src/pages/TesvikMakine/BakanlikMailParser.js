// 📥 BAKANLIK MAİL PARSER - /tesvikler/bakanlik-mail
// Gelen "Makine Teçhizat Talebi" mailini yapıştır → ayrıştır → sisteme işle.
// Eşleşmeyenler kuyrukta listelenir ve aday makinelerle elle bağlanır.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Grid, Typography, Stack, Button, TextField, MenuItem, Chip, IconButton,
  Tooltip, Snackbar, Alert, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LinkIcon from '@mui/icons-material/Link';
import LaunchIcon from '@mui/icons-material/Launch';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LayoutWrapper from '../../components/Layout/LayoutWrapper';
import svc from '../../services/tesvikMakineService';
import { formatDate, listTypeLabel } from './helpers';

const SAMPLE = 'Makine Adı: NST CİHAZI Gtip No: 901812000000 Barkod: 2wuhvj\nFirma Adı : ...\nBelge No : 518097\nBelge Id : 1023736';

export default function BakanlikMailParser() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [autoApply, setAutoApply] = useState(false);
  const [busy, setBusy] = useState('');
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [snack, setSnack] = useState(null);
  const [linkRec, setLinkRec] = useState(null);
  const notify = (message, severity = 'success') => setSnack({ message, severity });
  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';

  const loadQueue = useCallback(() => {
    svc.parserQueue(statusFilter || undefined).then(setQueue).catch(() => setQueue([]));
  }, [statusFilter]);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  const doParse = async () => {
    if (!text.trim()) return notify('Mail metni girin', 'warning');
    setBusy('parse');
    try { setParsed(await svc.parseMail(text)); }
    catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doIngest = async () => {
    if (!text.trim()) return notify('Mail metni girin', 'warning');
    setBusy('ingest');
    try {
      const res = await svc.ingestMail({ text, autoApply });
      setParsed({ parsed: res.parsed, match: res.match });
      notify(res.match ? (res.applied ? 'Eşleşti ve süreç başlatıldı' : 'Eşleşti, kuyruğa eklendi') : 'Eşleşme yok, kuyruğa eklendi', res.match ? 'success' : 'warning');
      loadQueue();
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doDelete = async (id) => {
    try { await svc.deleteParserQueue(id); loadQueue(); } catch (e) { notify(errMsg(e), 'error'); }
  };

  const columns = [
    { field: 'createdAt', headerName: 'Tarih', width: 140, valueGetter: (p) => formatDate(p.row.createdAt, true) },
    { field: 'firmaAdi', headerName: 'Firma', flex: 1, minWidth: 180, valueGetter: (p) => p.row.parsed?.firmaAdi || '-' },
    { field: 'belgeNo', headerName: 'Belge No', width: 100, valueGetter: (p) => p.row.parsed?.belgeNo || '-' },
    { field: 'belgeId', headerName: 'Belge ID', width: 100, valueGetter: (p) => p.row.parsed?.belgeId || '-' },
    { field: 'makineAdi', headerName: 'Makine', width: 160, valueGetter: (p) => p.row.parsed?.makineAdi || '-' },
    { field: 'barkod', headerName: 'Barkod', width: 100, valueGetter: (p) => p.row.parsed?.barkod || '-' },
    { field: 'status', headerName: 'Durum', width: 130, renderCell: (p) => <Chip size="small" label={statusLabel(p.value)} color={statusColor(p.value)} /> },
    {
      field: 'actions', headerName: 'İşlem', width: 200, sortable: false, renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          {(p.row.status === 'unmatched') && <Button size="small" startIcon={<LinkIcon />} onClick={() => setLinkRec(p.row)}>Bağla</Button>}
          {p.row.matched?.tesvikId && <Tooltip title="Belgeye git"><IconButton size="small" onClick={() => navigate(`/tesvikler/${p.row.matched.tesvikModel}/${p.row.matched.tesvikId}`)}><LaunchIcon fontSize="small" /></IconButton></Tooltip>}
          <Tooltip title="Sil"><IconButton size="small" color="error" onClick={() => doDelete(p.row._id)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      )
    }
  ];

  return (
    <LayoutWrapper>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/tesvikler')}><ArrowBackIcon /></IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>Bakanlık Mail Ayrıştırma</Typography>
          <Tooltip title="Kuyruğu yenile"><IconButton onClick={loadQueue}><RefreshIcon /></IconButton></Tooltip>
        </Stack>

        {/* Yapıştır + ayrıştır */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Mail Metnini Yapıştırın</Typography>
          <TextField fullWidth multiline minRows={5} placeholder={SAMPLE} value={text} onChange={(e) => setText(e.target.value)} />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <Button variant="outlined" onClick={doParse} disabled={busy === 'parse'} startIcon={<PlayArrowIcon />}>Ayrıştır (Önizle)</Button>
            <FormControlLabel control={<Checkbox checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} />} label="Eşleşirse süreci başlat + barkodu uygula" />
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" onClick={doIngest} disabled={busy === 'ingest'}>Sisteme İşle</Button>
          </Stack>

          {parsed && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={1}>
                <Pre label="Firma" value={parsed.parsed?.firmaAdi} />
                <Pre label="Belge No" value={parsed.parsed?.belgeNo} />
                <Pre label="Belge ID" value={parsed.parsed?.belgeId} />
                <Pre label="Makine Adı" value={parsed.parsed?.makineAdi} />
                <Pre label="GTİP" value={parsed.parsed?.gtipNo} />
                <Pre label="Barkod" value={parsed.parsed?.barkod} />
                <Pre label="Adres" value={parsed.parsed?.adres} md={12} />
              </Grid>
              <Box sx={{ mt: 1 }}>
                {parsed.match
                  ? <Alert severity="success">Eşleşme bulundu — Sıra/rowId: {parsed.match.rowId} · skor {parsed.match.score} ({parsed.match.via})</Alert>
                  : <Alert severity="warning">Otomatik eşleşme bulunamadı. "Sisteme İşle" ile kuyruğa ekleyip elle bağlayabilirsiniz.</Alert>}
              </Box>
            </Box>
          )}
        </Paper>

        {/* Kuyruk */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Parse Kuyruğu</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField select size="small" label="Durum" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="unmatched">Eşleşmeyen</MenuItem>
            <MenuItem value="matched">Eşleşen</MenuItem>
            <MenuItem value="manual_linked">Elle Bağlanan</MenuItem>
            <MenuItem value="applied">Uygulanan</MenuItem>
          </TextField>
        </Stack>
        <Paper sx={{ height: 460 }}>
          <DataGrid rows={queue} columns={columns} getRowId={(r) => r._id} density="compact" disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} />
        </Paper>
      </Box>

      <LinkDialog rec={linkRec} onClose={() => setLinkRec(null)} onLinked={() => { setLinkRec(null); loadQueue(); notify('Kayıt makineye bağlandı'); }} onError={(m) => notify(m, 'error')} />

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </LayoutWrapper>
  );
}

// Eşleşmeyen kaydı aday makinelerle bağlama dialogu
function LinkDialog({ rec, onClose, onLinked, onError }) {
  const [loading, setLoading] = useState(false);
  const [cand, setCand] = useState(null);
  const [sel, setSel] = useState('');
  const [applyBarcode, setApplyBarcode] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rec) { setCand(null); setSel(''); return; }
    setLoading(true);
    svc.parserCandidates(rec._id).then(setCand).catch(() => setCand({ found: false, machines: [] })).finally(() => setLoading(false));
  }, [rec]);

  const doLink = async () => {
    if (!sel) return;
    const m = cand.machines.find((x) => x.rowId === sel);
    setBusy(true);
    try {
      await svc.linkParserQueue(rec._id, { tesvikModel: cand.tesvikModel, tesvikId: cand.tesvikId, listType: m.listType, rowId: m.rowId, applyBarcode });
      onLinked();
    } catch (e) { onError(e?.response?.data?.message || 'Bağlama hatası'); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!rec} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Makineye Bağla</DialogTitle>
      <DialogContent dividers>
        {loading ? <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box> : !cand?.found ? (
          <Alert severity="warning">Parse edilen Belge No/ID ({rec?.parsed?.belgeNo}/{rec?.parsed?.belgeId}) ile eşleşen belge bulunamadı. Belge bilgisini kontrol edin.</Alert>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>Belge: <b>{cand.firmaName}</b></Typography>
            <TextField select fullWidth size="small" label="Makine Seç" value={sel} onChange={(e) => setSel(e.target.value)}>
              {cand.machines.map((m) => <MenuItem key={m.rowId} value={m.rowId}>{m.siraNo}. {m.machineName} ({listTypeLabel(m.listType)}) · GTİP {m.gtipNo || '-'}</MenuItem>)}
            </TextField>
            <FormControlLabel sx={{ mt: 1 }} control={<Checkbox checked={applyBarcode} onChange={(e) => setApplyBarcode(e.target.checked)} />} label="Parse edilen barkodu uygula (süreci başlat)" />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
        <Button variant="contained" onClick={doLink} disabled={!sel || busy || !cand?.found}>Bağla</Button>
      </DialogActions>
    </Dialog>
  );
}

function Pre({ label, value, md = 4 }) {
  return (
    <Grid item xs={6} md={md}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>{value || '-'}</Typography>
    </Grid>
  );
}
function statusLabel(s) { return { unmatched: 'Eşleşmeyen', matched: 'Eşleşen', manual_linked: 'Elle Bağlandı', applied: 'Uygulandı' }[s] || s; }
function statusColor(s) { return { unmatched: 'warning', matched: 'info', manual_linked: 'primary', applied: 'success' }[s] || 'default'; }
