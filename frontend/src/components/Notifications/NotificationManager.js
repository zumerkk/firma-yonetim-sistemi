// 🔔 NOTIFICATION MANAGER - ENTERPRISE NOTIFICATION SYSTEM
// Advanced notification management with email/SMS integration

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  // ListItemSecondaryAction,    // Commented out - unused import
  IconButton,
  // Tooltip,                    // Commented out - unused import
  Divider,
  Tab,
  Tabs,
  // TabPanel                    // Commented out - unused import
} from '@mui/material';
import {
  Notifications as NotificationIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Settings as SettingsIcon,
  Send as SendIcon,
  // Schedule as ScheduleIcon,     // Commented out - unused import
  Group as GroupIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  // Delete as DeleteIcon,        // Commented out - unused import
  // Add as AddIcon               // Commented out - unused import
} from '@mui/icons-material';
import api from '../../utils/axios';

const NotificationManager = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // 📧 Notification Configuration
  const [notificationConfig, setNotificationConfig] = useState({
    type: 'email', // email, sms, push
    recipients: [],
    subject: '',
    message: '',
    template: '',
    priority: 'medium',
    scheduled: false,
    scheduleDate: null,
    recurring: false,
    recurringType: 'daily'
  });

  // ⚙️ System Settings
  const [systemSettings, setSystemSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    smtpServer: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smsProvider: 'twilio',
    smsApiKey: '',
    autoNotifications: {
      newFirma: true,
      tesvikStatusChange: true,
      systemAlerts: true,
      weeklyReports: false
    }
  });

  // 📋 Templates
  const [templates, /*setTemplates*/] = useState([   // setTemplates commented out - unused variable
    {
      id: 'welcome',
      name: 'Hoş Geldiniz',
      subject: 'Sisteme Hoş Geldiniz',
      content: 'Merhaba {name}, sistemimize hoş geldiniz!',
      type: 'email',
      category: 'user'
    },
    {
      id: 'tesvik_approved',
      name: 'Teşvik Onaylandı',
      subject: 'Teşvik Belgeniz Onaylandı',
      content: 'Sayın {name}, {tesvikId} numaralı teşvik belgeniz onaylanmıştır.',
      type: 'email',
      category: 'tesvik'
    },
    {
      id: 'system_maintenance',
      name: 'Sistem Bakımı',
      subject: 'Sistem Bakım Bildirimi',
      content: 'Sistem bakımı {date} tarihinde yapılacaktır.',
      type: 'email',
      category: 'system'
    }
  ]);

  // 👥 Recipients
  const [recipients, /*setRecipients*/] = useState([   // setRecipients commented out - unused variable
    { id: 1, name: 'Tüm Kullanıcılar', type: 'group', count: 25 },
    { id: 2, name: 'Admin Kullanıcılar', type: 'group', count: 3 },
    { id: 3, name: 'Firma Yöneticileri', type: 'group', count: 15 }
  ]);

  // 📊 Load system settings
  useEffect(() => {
    if (open) {
      loadSystemSettings();
    }
  }, [open]);

  const loadSystemSettings = async () => {
    try {
      const response = await api.get('/admin/notification-settings');
      if (response.data.success) {
        setSystemSettings(response.data.data);
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
  };

  // 📧 Send notification
  const handleSendNotification = async () => {
    if (!notificationConfig.recipients.length) {
      setError('Lütfen en az bir alıcı seçin');
      return;
    }

    if (!notificationConfig.subject || !notificationConfig.message) {
      setError('Konu ve mesaj alanları zorunludur');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/notifications/send', {
        type: notificationConfig.type,
        recipients: notificationConfig.recipients,
        subject: notificationConfig.subject,
        message: notificationConfig.message,
        priority: notificationConfig.priority,
        scheduled: notificationConfig.scheduled,
        scheduleDate: notificationConfig.scheduleDate
      });

      if (response.data.success) {
        setSuccess(`Bildirim ${notificationConfig.recipients.length} alıcıya gönderildi`);
        resetForm();
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Bildirim gönderilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // 💾 Save system settings
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const response = await api.put('/admin/notification-settings', systemSettings);
      if (response.data.success) {
        setSuccess('Ayarlar başarıyla kaydedildi');
      }
    } catch (error) {
      setError('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // 🧹 Reset form
  const resetForm = () => {
    setNotificationConfig({
      type: 'email',
      recipients: [],
      subject: '',
      message: '',
      template: '',
      priority: 'medium',
      scheduled: false,
      scheduleDate: null,
      recurring: false,
      recurringType: 'daily'
    });
  };

  // 📝 Apply template
  const applyTemplate = (template) => {
    setNotificationConfig(prev => ({
      ...prev,
      subject: template.subject,
      message: template.content,
      template: template.id,
      type: template.type
    }));
  };

  // 🎨 Get priority color - commented out (unused function)
  /*const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#f97316',
      critical: '#dc2626'
    };
    return colors[priority] || '#6b7280';
  };*/

  // 📱 Tab Panel Component
  const TabPanel = ({ children, value, index, ...other }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`notification-tabpanel-${index}`}
        aria-labelledby={`notification-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <NotificationIcon color="primary" />
        Bildirim Yöneticisi
        <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Bildirim Gönder" icon={<SendIcon />} />
            <Tab label="Şablonlar" icon={<EditIcon />} />
            <Tab label="Sistem Ayarları" icon={<SettingsIcon />} />
          </Tabs>
        </Box>

        {/* Send Notification Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Notification Type & Recipients */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📧 Bildirim Detayları
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Bildirim Türü</InputLabel>
                <Select
                  value={notificationConfig.type}
                  onChange={(e) => setNotificationConfig(prev => ({ ...prev, type: e.target.value }))}
                  label="Bildirim Türü"
                >
                  <MenuItem value="email">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon /> E-posta
                    </Box>
                  </MenuItem>
                  <MenuItem value="sms">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SmsIcon /> SMS
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Öncelik</InputLabel>
                <Select
                  value={notificationConfig.priority}
                  onChange={(e) => setNotificationConfig(prev => ({ ...prev, priority: e.target.value }))}
                  label="Öncelik"
                >
                  <MenuItem value="low">Düşük</MenuItem>
                  <MenuItem value="medium">Orta</MenuItem>
                  <MenuItem value="high">Yüksek</MenuItem>
                  <MenuItem value="critical">Kritik</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                👥 Alıcılar
              </Typography>
              <List>
                {recipients.map((recipient) => (
                  <ListItem
                    key={recipient.id}
                    button
                    selected={notificationConfig.recipients.includes(recipient.id)}
                    onClick={() => {
                      const isSelected = notificationConfig.recipients.includes(recipient.id);
                      setNotificationConfig(prev => ({
                        ...prev,
                        recipients: isSelected
                          ? prev.recipients.filter(id => id !== recipient.id)
                          : [...prev.recipients, recipient.id]
                      }));
                    }}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
                  >
                    <ListItemIcon>
                      {recipient.type === 'group' ? <GroupIcon /> : <PersonIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={recipient.name}
                      secondary={`${recipient.count} kişi`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>

            {/* Message Content */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📝 Mesaj İçeriği
              </Typography>

              <TextField
                fullWidth
                label="Konu"
                value={notificationConfig.subject}
                onChange={(e) => setNotificationConfig(prev => ({ ...prev, subject: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Mesaj"
                multiline
                rows={8}
                value={notificationConfig.message}
                onChange={(e) => setNotificationConfig(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Mesajınızı buraya yazın..."
                sx={{ mb: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notificationConfig.scheduled}
                    onChange={(e) => setNotificationConfig(prev => ({ ...prev, scheduled: e.target.checked }))}
                  />
                }
                label="Zamanlanmış Gönderim"
              />

              {notificationConfig.scheduled && (
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Gönderim Tarihi"
                  value={notificationConfig.scheduleDate || ''}
                  onChange={(e) => setNotificationConfig(prev => ({ ...prev, scheduleDate: e.target.value }))}
                  sx={{ mt: 2 }}
                  InputLabelProps={{ shrink: true }}
                />
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Templates Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📋 Bildirim Şablonları
          </Typography>

          <Grid container spacing={2}>
            {templates.map((template) => (
              <Grid item xs={12} md={6} key={template.id}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Typography variant="h6">
                        {template.name}
                      </Typography>
                      <Chip
                        label={template.category}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>Konu:</strong> {template.subject}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {template.content.substring(0, 100)}...
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => applyTemplate(template)}
                      startIcon={<EditIcon />}
                    >
                      Kullan
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* System Settings Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ⚙️ Sistem Ayarları
          </Typography>

          <Grid container spacing={3}>
            {/* General Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Genel Ayarlar
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={systemSettings.emailEnabled}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                  />
                }
                label="E-posta Bildirimleri"
                sx={{ display: 'block', mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={systemSettings.smsEnabled}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                  />
                }
                label="SMS Bildirimleri"
                sx={{ display: 'block', mb: 1 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={systemSettings.pushEnabled}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, pushEnabled: e.target.checked }))}
                  />
                }
                label="Push Bildirimleri"
                sx={{ display: 'block', mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Otomatik Bildirimler
              </Typography>

              {Object.entries(systemSettings.autoNotifications).map(([key, value]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        autoNotifications: {
                          ...prev.autoNotifications,
                          [key]: e.target.checked
                        }
                      }))}
                    />
                  }
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}
            </Grid>

            {/* SMTP Settings */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                SMTP Ayarları
              </Typography>

              <TextField
                fullWidth
                label="SMTP Sunucu"
                value={systemSettings.smtpServer}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpServer: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="SMTP Port"
                type="number"
                value={systemSettings.smtpPort}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="SMTP Kullanıcı"
                value={systemSettings.smtpUser}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="SMTP Şifre"
                type="password"
                value={systemSettings.smtpPassword}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                sx={{ mb: 2 }}
              />
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          İptal
        </Button>
        
        {activeTab === 0 && (
          <Button
            onClick={handleSendNotification}
            variant="contained"
            disabled={loading}
            startIcon={<SendIcon />}
          >
            {loading ? 'Gönderiliyor...' : 'Bildirim Gönder'}
          </Button>
        )}
        
        {activeTab === 2 && (
          <Button
            onClick={handleSaveSettings}
            variant="contained"
            disabled={loading}
            startIcon={<SettingsIcon />}
          >
            {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NotificationManager;