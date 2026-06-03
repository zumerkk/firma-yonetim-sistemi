// ⏰ REMINDER SERVICE - Hatırlatma cron giriş noktası
// Her gün çalışır: vadesi gelmiş pending jobları işler.
//  - Durum completed/invoice_approved/cancelled veya reminderStopped ise → skipped
//  - Son maildan sonra evrak yüklendi / durum ilerledi ise → skipped (cevap algılandı)
//  - Aksi halde hatırlatma gönder, bir sonraki 7-günlük hatırlatmayı planla

const ReminderJob = require('../../models/ReminderJob');
const MachineProcess = require('../../models/MachineProcess');
const MailLog = require('../../models/MailLog');
const UploadedDocument = require('../../models/UploadedDocument');
const MachineProcessLog = require('../../models/MachineProcessLog');
const status = require('../../constants/tesvikMakineStatus');
const { PROCESS_ACTION, REMINDER_TYPE } = require('../../constants/tesvikMakineMail');
const mps = require('./machineProcessService');

async function hasResponseSince(proc, anchorDate) {
  if (!anchorDate) return false;
  const docCount = await UploadedDocument.countDocuments({ machineProcessId: proc._id, createdAt: { $gt: anchorDate } });
  if (docCount > 0) return true;
  // Maildan sonra anlamlı bir durum değişikliği olduysa cevap sayılır
  const statusChange = await MachineProcessLog.countDocuments({
    machineProcessId: proc._id,
    actionType: PROCESS_ACTION.STATUS_CHANGE,
    createdAt: { $gt: anchorDate }
  });
  return statusChange > 0;
}

async function scheduleNext(proc, mailLogId) {
  if (proc.reminderStopped || status.isReminderSuppressed(proc.status)) return null;
  // Zaten bekleyen bir job varsa yenisini ekleme (yığılmayı önle)
  const pending = await ReminderJob.findOne({ machineProcessId: proc._id, status: 'pending' }).lean();
  if (pending) return pending;
  const due = new Date();
  due.setDate(due.getDate() + mps.reminderDays());
  proc.nextReminderAt = due;
  await proc.save();
  return ReminderJob.create({ machineProcessId: proc._id, mailLogId, dueAt: due, status: 'pending', reminderType: REMINDER_TYPE.NO_RESPONSE });
}

// Ana cron fonksiyonu
async function processDueReminders({ now = new Date(), limit = 200 } = {}) {
  const summary = { scanned: 0, sent: 0, skipped: 0, failed: 0 };
  const jobs = await ReminderJob.find({ status: 'pending', dueAt: { $lte: now } }).sort({ dueAt: 1 }).limit(limit);
  summary.scanned = jobs.length;

  for (const job of jobs) {
    try {
      const proc = await MachineProcess.findById(job.machineProcessId);
      if (!proc) { job.status = 'skipped'; job.skipReason = 'process_missing'; await job.save(); summary.skipped++; continue; }

      if (proc.reminderStopped) { job.status = 'skipped'; job.skipReason = 'reminder_stopped'; await job.save(); summary.skipped++; continue; }
      if (status.isReminderSuppressed(proc.status)) { job.status = 'skipped'; job.skipReason = `status:${proc.status}`; await job.save(); summary.skipped++; continue; }

      const originalMail = job.mailLogId ? await MailLog.findById(job.mailLogId).lean() : null;
      const anchor = (originalMail && originalMail.sentAt) || job.createdAt;
      if (await hasResponseSince(proc, anchor)) {
        job.status = 'skipped'; job.skipReason = 'response_detected'; await job.save(); summary.skipped++; continue;
      }

      // Gönder
      job.attemptCount = (job.attemptCount || 0) + 1;
      try {
        await mps.sendReminderForJob(proc, originalMail);
        job.status = 'sent'; job.sentAt = new Date(); await job.save();
        summary.sent++;
        await scheduleNext(proc, job.mailLogId);
      } catch (sendErr) {
        job.status = 'failed'; job.lastError = sendErr.message || 'Gönderim hatası'; await job.save();
        summary.failed++;
      }
    } catch (err) {
      summary.failed++;
      try { job.status = 'failed'; job.lastError = err.message; await job.save(); } catch (_) {}
      console.error('🚨 [reminderService] job hatası:', err && err.message);
    }
  }
  return summary;
}

module.exports = { processDueReminders, hasResponseSince, scheduleNext };
