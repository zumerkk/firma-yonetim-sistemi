// 🛠️ MAKİNE DETAY MODALI - "İşlem Başlat / Güncelle"
// Süreç oluşturma, tedarikçi/müşteri bilgisi, barkod (bakanlık otomasyon kodu) akışı,
// mail önizle/gönder, klasör & upload link, evrak yükleme, hatırlatma ve timeline.
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem,
  Switch, FormControlLabel, Box, Typography, Divider, Chip, IconButton, Snackbar, Alert,
  CircularProgress, List, ListItem, ListItemText, Tooltip, Stack,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import PreviewIcon from '@mui/icons-material/Preview';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FolderIcon from '@mui/icons-material/CreateNewFolder';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import svc from '../../services/tesvikMakineService';
import { StatusChip, formatDate, formatMoney, listTypeLabel, actionLabel } from './helpers';

const emptyForm = {
  barcode: '', supplierCompanyName: '', supplierTaxNumber: '', supplierEmails: '', supplierCcEmails: '',
  customerContactName: '', customerEmails: '', kdvExemptRequired: false, invoiceDescriptionAuto: true,
  autoSendEnabled: false, dueDate: '', notes: '', status: 'not_started'
};

function joinEmails(v) { return Array.isArray(v) ? v.join(', ') : (v || ''); }

export default function MakineDetailModal({ open, onClose, target, meta, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [proc, setProc] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [timeline, setTimeline] = useState([]);
  const [folderInfo, setFolderInfo] = useState(null);
  const [uploadLink, setUploadLink] = useState('');
  const [templateCode, setTemplateCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [snack, setSnack] = useState(null);
  const fileRef = useRef(null);
  const [docType, setDocType] = useState('diger');

  const notify = (message, severity = 'success') => setSnack({ message, severity });

  const hydrate = (p) => {
    setProc(p);
    setForm({
      barcode: p.barcode || '', supplierCompanyName: p.supplierCompanyName || '',
      supplierTaxNumber: p.supplierTaxNumber || '', supplierEmails: joinEmails(p.supplierEmails),
      supplierCcEmails: joinEmails(p.supplierCcEmails), customerContactName: p.customerContactName || '',
      customerEmails: joinEmails(p.customerEmails), kdvExemptRequired: !!p.kdvExemptRequired,
      invoiceDescriptionAuto: p.invoiceDescriptionAuto !== false, autoSendEnabled: !!p.autoSendEnabled,
      dueDate: p.dueDate ? String(p.dueDate).slice(0, 10) : '', notes: p.notes || '', status: p.status || 'not_started'
    });
    if (p.uploadToken) setUploadLink(buildLink(p.uploadToken));
  };

  const buildLink = (token) => `${window.location.origin}/upload/tesvik/${token}`;

  useEffect(() => {
    if (!open || !target) return;
    setLoading(true); setUploadLink(''); setPreview(null); setFolderInfo(null);
    svc.ensureProcess({ tesvikModel: target.tesvikModel, tesvikId: target.tesvikId, listType: target.listType, rowId: target.rowId })
      .then(async (p) => {
        hydrate(p);
        const full = await svc.getProcess(p._id);
        setTimeline(full.timeline || []);
        setFolderInfo(full.folder || null);
        setProc(full.process); hydrate(full.process);
      })
      .catch((e) => notify(errMsg(e), 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  const errMsg = (e) => e?.response?.data?.message || e?.message || 'İşlem başarısız';
  const reloadTimeline = async (id) => { try { const f = await svc.getProcess(id); setTimeline(f.timeline || []); setFolderInfo(f.folder || null); setProc(f.process); } catch (_) {} };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setSwitch = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const doSave = async () => {
    setBusy('save');
    try {
      const updated = await svc.updateFields(proc._id, { ...form });
      hydrate(updated); notify('Bilgiler kaydedildi'); onChanged && onChanged();
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doStatus = async () => {
    setBusy('status');
    try {
      const r = await svc.updateStatus(proc._id, { status: form.status });
      setProc(r.data); notify('Durum güncellendi'); reloadTimeline(proc._id); onChanged && onChanged();
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };


  const doPreview = async () => {
    if (!templateCode) return notify('Şablon seçin', 'warning');
    setBusy('preview');
    try { const p = await svc.previewMail(proc._id, { templateCode }); setPreview(p); setPreviewOpen(true); }
    catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doSend = async () => {
    setBusy('send');
    try {
      // Önizlemede düzenlenen konu/içerik aynen gönderilir (müşteri isteği: anlık değişiklikler)
      await svc.sendMail(proc._id, { templateCode, subject: preview?.subject, body: preview?.body });
      notify('Mail SMTP ile gönderildi'); setPreviewOpen(false); reloadTimeline(proc._id); onChanged && onChanged();
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doUploadLink = async () => {
    setBusy('link');
    try { const r = await svc.createUploadLink(proc._id, {}); setUploadLink(r.uploadLink?.startsWith('http') ? r.uploadLink : buildLink(r.token)); notify('Yükleme linki üretildi'); reloadTimeline(proc._id); }
    catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doFolders = async () => {
    setBusy('folder');
    try { const f = await svc.ensureFolders(proc._id); setFolderInfo(f); notify('Evrak klasörü hazır'); reloadTimeline(proc._id); }
    catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const doUpload = async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setBusy('upload');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f)); // çoklu dosya (XML + PDF aynı anda)
      fd.append('documentType', docType);
      const res = await svc.adminUpload(proc._id, fd);
      notify(`${res?.length || files.length} evrak yüklendi`); reloadTimeline(proc._id); onChanged && onChanged();
    } catch (err) { notify(errMsg(err), 'error'); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; }
  };

  const toggleReminder = async () => {
    setBusy('rem');
    try {
      const r = proc.reminderStopped ? await svc.resumeReminders(proc._id) : await svc.stopReminders(proc._id);
      setProc(r); notify(r.reminderStopped ? 'Hatırlatmalar durduruldu' : 'Hatırlatmalar etkinleştirildi'); reloadTimeline(proc._id);
    } catch (e) { notify(errMsg(e), 'error'); } finally { setBusy(''); }
  };

  const copyLink = () => { navigator.clipboard?.writeText(uploadLink); notify('Link kopyalandı'); };

  const m = target?.machine || {};
  const allStatuses = meta?.statuses || [];
  // Dropdown'da gizli durumları gösterme; ancak mevcut durum gizliyse onu da ekle (Select boş kalmasın)
  const statusItems = allStatuses.filter((s) => !s.hidden || s.value === form.status);
  const templates = meta?.templates || [];
  const docTypes = meta?.documentTypes || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <QrCode2Icon color="primary" />
          <Typography variant="h6" component="span">Makine İşlemi</Typography>
          {proc && <StatusChip badge={proc.statusMeta || (meta?.categories ? null : null)} />}
        </Stack>
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading || !proc ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Box>
            {/* Kimlik özeti (readonly) */}
            <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1, mb: 2 }}>
              <Grid container spacing={1}>
                <Info label="Firma" value={proc.firmaName} xs={12} sm={6} />
                <Info label="Belge No / ID" value={`${proc.documentNo || '-'} / ${proc.documentId || '-'}`} xs={12} sm={6} />
                <Info label="Liste Türü" value={listTypeLabel(proc.listType)} xs={6} sm={3} />
                <Info label="Sıra No" value={proc.siraNo} xs={6} sm={3} />
                <Info label="Makine ID" value={proc.makineId || '-'} xs={6} sm={3} />
                <Info label="GTİP" value={proc.gtipNo || '-'} xs={6} sm={3} />
                <Info label="Makine Adı" value={proc.machineName} xs={12} sm={8} />
                <Info label="Tutar" value={`${formatMoney(proc.totalPrice, proc.currency)}`} xs={12} sm={4} />
              </Grid>
            </Box>

            {/* Tedarikçi */}
            <SectionTitle>Tedarikçi Bilgileri</SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Tedarikçi Vergi No" value={form.supplierTaxNumber} onChange={setField('supplierTaxNumber')} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Tedarikçi Mail(ler)" placeholder="a@x.com, b@x.com" value={form.supplierEmails} onChange={setField('supplierEmails')} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="CC Mail(ler)" value={form.supplierCcEmails} onChange={setField('supplierCcEmails')} /></Grid>
            </Grid>

            {/* Firma Yetkilisi */}
            <SectionTitle>Firma Yetkilisi</SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Yetkili Adı" value={form.customerContactName} onChange={setField('customerContactName')} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Mail(ler)" value={form.customerEmails} onChange={setField('customerEmails')} /></Grid>
            </Grid>

            {/* Ayarlar + durum */}
            <SectionTitle>Süreç Ayarları</SectionTitle>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5}>
                <TextField select fullWidth size="small" label="Durum" value={form.status} onChange={setField('status')}>
                  {statusItems.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}><FormControlLabel control={<Switch checked={form.kdvExemptRequired} onChange={setSwitch('kdvExemptRequired')} />} label="KDV muaf." /></Grid>
              <Grid item xs={6} sm={4}><FormControlLabel control={<Switch checked={form.invoiceDescriptionAuto} onChange={setSwitch('invoiceDescriptionAuto')} />} label="Fatura açıklaması oto." /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="Not" value={form.notes} onChange={setField('notes')} /></Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button variant="contained" onClick={doSave} disabled={busy === 'save'} startIcon={<SaveIcon />}>Kaydet</Button>
              <Button variant="outlined" onClick={doStatus} disabled={busy === 'status'}>Durumu Güncelle</Button>
            </Stack>

            {/* Mail */}
            <SectionTitle>Mail</SectionTitle>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth size="small" label="Mail Şablonu" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
                  {templates.map((t) => <MenuItem key={t.code} value={t.code}>{t.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}><Button fullWidth variant="outlined" onClick={doPreview} disabled={busy === 'preview' || !templateCode} startIcon={<PreviewIcon />}>Mail Önizle</Button></Grid>
              <Grid item xs={6} sm={3}><Button fullWidth variant="contained" color="primary" onClick={() => { if (!templateCode) return notify('Şablon seçin', 'warning'); doPreview(); }} startIcon={<SendIcon />}>SMTP ile Gönder</Button></Grid>
            </Grid>

            {/* Evrak & klasör */}
            <SectionTitle>Evrak, Klasör & Hatırlatma</SectionTitle>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="outlined" onClick={doFolders} disabled={busy === 'folder'} startIcon={<FolderIcon />}>Klasör Oluştur</Button>
              <Button variant="outlined" onClick={doUploadLink} disabled={busy === 'link'} startIcon={<ContentCopyIcon />}>Upload Link Üret</Button>
              <TextField select size="small" label="Evrak Türü" value={docType} onChange={(e) => setDocType(e.target.value)} sx={{ minWidth: 160 }}>
                {docTypes.map((dt) => <MenuItem key={dt.key} value={dt.key}>{dt.label}</MenuItem>)}
              </TextField>
              <Button variant="outlined" onClick={() => fileRef.current?.click()} disabled={busy === 'upload'} startIcon={<UploadFileIcon />}>Evrak Yükle</Button>
              <input type="file" ref={fileRef} hidden multiple accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.xml" onChange={doUpload} />
              <Button variant="outlined" color={proc.reminderStopped ? 'success' : 'warning'} onClick={toggleReminder} disabled={busy === 'rem'}
                startIcon={proc.reminderStopped ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}>
                {proc.reminderStopped ? 'Hatırlatmayı Aç' : 'Hatırlatmayı Durdur'}
              </Button>
            </Stack>
            {uploadLink && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField fullWidth size="small" value={uploadLink} InputProps={{ readOnly: true }} />
                <Tooltip title="Kopyala"><IconButton onClick={copyLink}><ContentCopyIcon /></IconButton></Tooltip>
              </Box>
            )}
            {folderInfo?.folderPath && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderOpenIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Evrak klasörü (sunucuda): <b>{folderInfo.folderPath}</b> — yüklenen dosyalar bu yapıda saklanır, "Evraklar" sekmesinden erişilir.
                </Typography>
              </Box>
            )}
            {proc.nextReminderAt && !proc.reminderStopped && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Sonraki hatırlatma: {formatDate(proc.nextReminderAt, true)}
              </Typography>
            )}

            {/* Timeline — varsayılan kapalı (yer kaplamasın) */}
            <Accordion disableGutters sx={{ mt: 2, bgcolor: '#fafafa' }} defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155' }}>
                  İşlem Geçmişi ({timeline.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
                  {timeline.length === 0 && <ListItem><ListItemText secondary="Henüz kayıt yok" /></ListItem>}
                  {timeline.map((t) => (
                    <ListItem key={t.id} divider>
                      <ListItemText
                        primary={`${actionLabel(t.actionType)}${t.newStatusLabel ? ' → ' + t.newStatusLabel : ''}`}
                        secondary={`${formatDate(t.at, true)} · ${t.by}${t.note ? ' · ' + t.note : ''}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Kapat</Button></DialogActions>

      {/* Mail önizleme dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mail Önizleme</DialogTitle>
        <DialogContent dividers>
          {preview && (
            <Box>
              {preview.missingRecipients && <Alert severity="warning" sx={{ mb: 1 }}>Alıcı (to) e-posta adresi yok. Önce tedarikçi/müşteri mailini girin.</Alert>}
              {preview.missing?.length > 0 && <Alert severity="warning" sx={{ mb: 1 }}>Eksik bilgi: {preview.missing.join(', ')}</Alert>}
              {!preview.smtpConfigured && <Alert severity="info" sx={{ mb: 1 }}>SMTP yapılandırılmamış — gönderim devre dışı.</Alert>}
              <Typography variant="caption" color="text.secondary">Kime: {(preview.to || []).join(', ') || '-'}{preview.cc?.length ? ' · CC: ' + preview.cc.join(', ') : ''}</Typography>
              {/* Müşteri isteği: gönderim öncesi konu/içerik serbestçe düzenlenebilir — düzenlenen hali gönderilir */}
              <TextField fullWidth size="small" label="Konu" value={preview.subject}
                onChange={(e) => setPreview((p) => ({ ...p, subject: e.target.value }))} sx={{ my: 1 }} />
              <TextField fullWidth multiline minRows={10} label="İçerik" value={preview.body}
                onChange={(e) => setPreview((p) => ({ ...p, body: e.target.value }))}
                helperText="Metni istediğiniz gibi düzenleyebilirsiniz — mail bu haliyle gönderilir." />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Kapat</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={doSend}
            disabled={busy === 'send' || !preview?.canSend}>SMTP ile Gönder</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack && <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert>}
      </Snackbar>
    </Dialog>
  );
}

function Info({ label, value, xs, sm }) {
  return (
    <Grid item xs={xs} sm={sm}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>{value ?? '-'}</Typography>
    </Grid>
  );
}
function SectionTitle({ children }) {
  return <><Divider sx={{ my: 2 }} /><Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#334155' }}>{children}</Typography></>;
}
