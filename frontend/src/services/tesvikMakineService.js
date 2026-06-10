// 🛠️ Teşvik Makine Teçhizat Yönetimi - Frontend API servisi
import api from '../utils/axios';

const base = '/tesvik-makine';
const d = (r) => r.data?.data;

const tesvikMakineService = {
  // Meta & dashboard
  meta: () => api.get(`${base}/meta`).then(d),
  dashboard: () => api.get(`${base}/dashboard`).then(d),
  notifications: () => api.get(`${base}/notifications`).then((r) => r.data),
  markNotificationsSeen: (ids) => api.post(`${base}/notifications/seen`, { ids }).then((r) => r.data),

  // Sertifika (teşvik belgesi)
  listCertificates: (params = {}) => api.get(`${base}/certificates`, { params }).then((r) => r.data),
  getCertificate: (m, id) => api.get(`${base}/certificates/${m}/${id}`).then(d),
  getMachines: (m, id) => api.get(`${base}/certificates/${m}/${id}/machines`).then(d),
  getCertMails: (m, id) => api.get(`${base}/certificates/${m}/${id}/mails`).then(d),
  getCertDocuments: (m, id) => api.get(`${base}/certificates/${m}/${id}/documents`).then(d),
  getCertReminders: (m, id) => api.get(`${base}/certificates/${m}/${id}/reminders`).then(d),
  getCertTimeline: (m, id) => api.get(`${base}/certificates/${m}/${id}/timeline`).then(d),

  // Süreç (makine)
  ensureProcess: (body) => api.post(`${base}/process`, body).then(d),
  getProcess: (id) => api.get(`${base}/process/${id}`).then(d),
  updateFields: (id, body) => api.patch(`${base}/process/${id}/fields`, body).then(d),
  updateStatus: (id, body) => api.patch(`${base}/process/${id}/status`, body).then((r) => r.data),
  setBarcode: (id, body) => api.post(`${base}/process/${id}/barcode`, body).then(d),
  previewMail: (id, body) => api.post(`${base}/process/${id}/mail/preview`, body).then(d),
  sendMail: (id, body) => api.post(`${base}/process/${id}/mail/send`, body).then(d),
  resendMail: (mailLogId) => api.post(`${base}/mail/${mailLogId}/resend`).then(d),
  ensureFolders: (id) => api.post(`${base}/process/${id}/folders`).then(d),
  createUploadLink: (id, body = {}) => api.post(`${base}/process/${id}/upload-link`, body).then(d),
  adminUpload: (id, formData) => api.post(`${base}/process/${id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(d),
  stopReminders: (id) => api.post(`${base}/process/${id}/reminders/stop`).then(d),
  resumeReminders: (id) => api.post(`${base}/process/${id}/reminders/resume`).then(d),

  // Evrak indir (auth'lu blob) & sil
  downloadDocument: (id) => api.get(`${base}/document/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id) => api.delete(`${base}/document/${id}`).then((r) => r.data),

  // Toplu işlem & raporlar
  bulk: (body) => api.post(`${base}/bulk`, body).then(d),
  reports: (type) => api.get(`${base}/reports/${type}`).then(d),

  // Şablon & SMTP & hatırlatma (admin)
  listTemplates: () => api.get(`${base}/templates`).then(d),
  updateTemplate: (code, body) => api.put(`${base}/templates/${code}`, body).then(d),
  testSmtp: (to) => api.post(`${base}/smtp/test`, { to }).then((r) => r.data),
  runReminders: () => api.post(`${base}/reminders/run`).then(d),

  // Bakanlık mail parser
  parseMail: (text) => api.post(`${base}/parser/parse`, { text }).then(d),
  ingestMail: (body) => api.post(`${base}/parser/ingest`, body).then(d),
  parserQueue: (status) => api.get(`${base}/parser/queue`, { params: { status } }).then(d),
  parserCandidates: (id) => api.get(`${base}/parser/queue/${id}/candidates`).then(d),
  linkParserQueue: (id, body) => api.post(`${base}/parser/queue/${id}/link`, body).then(d),
  deleteParserQueue: (id) => api.delete(`${base}/parser/queue/${id}`).then((r) => r.data),

  // Public (token tabanlı — auth gerektirmez)
  publicInfo: (token) => api.get(`/tesvik-evrak/${token}`).then(d),
  publicUpload: (token, formData) => api.post(`/tesvik-evrak/${token}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
};

export default tesvikMakineService;
