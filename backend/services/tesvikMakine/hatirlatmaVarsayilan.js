// 🔕 HATIRLATMA VARSAYILANI — kapalı
//
// Müşteri (15.09.2026): "Hatırlatmalar da otomatik olarak kapalı gelsin biz manuel açabilelim
// istersek." Yeni süreçler modelde kapalı başlıyor (MachineProcess.reminderStopped: true).
// Bu fonksiyon ESKİ süreçleri aynı duruma getirir: o güne kadar hatırlatma her süreçte
// kendiliğinden açıktı ve tedarikçilere otomatik hatırlatma maili gidiyordu.
//
// Elle açılmış süreçlere DOKUNULMAZ: reminderManuallyEnabledAt dolu olanlar ya da geçmişte
// "Hatırlatmalar yeniden etkinleştirildi" kaydı bulunanlar. Bu sayede her açılışta güvenle çalışır.

const MachineProcess = require('../../models/MachineProcess');
const MachineProcessLog = require('../../models/MachineProcessLog');
const ReminderJob = require('../../models/ReminderJob');
const { PROCESS_ACTION } = require('../../constants/tesvikMakineMail');

// machineProcessService.resumeReminders'ın yazdığı kayıt notu (geçmiş elle açmaları tanımak için)
const ELLE_ACILDI_NOTU = 'Hatırlatmalar yeniden etkinleştirildi';

async function hatirlatmalariVarsayilanKapat() {
  const elleAcilanlar = await MachineProcessLog.distinct('machineProcessId', { note: ELLE_ACILDI_NOTU });
  const hedefler = await MachineProcess.find({
    reminderStopped: { $ne: true },
    reminderManuallyEnabledAt: null,
    _id: { $nin: elleAcilanlar }
  }).select('_id rowId').lean();
  if (!hedefler.length) return { kapatilan: 0 };

  const ids = hedefler.map((p) => p._id);
  await MachineProcess.updateMany({ _id: { $in: ids } }, { $set: { reminderStopped: true, nextReminderAt: null } });
  await ReminderJob.updateMany(
    { machineProcessId: { $in: ids }, status: 'pending' },
    { $set: { status: 'skipped', skipReason: 'varsayilan_kapali' } }
  );
  // Zaman çizelgesinde görünsün: "hatırlatma neden durdu?" sorusunun cevabı
  await MachineProcessLog.insertMany(hedefler.map((p) => ({
    machineProcessId: p._id,
    rowId: p.rowId,
    actionType: PROCESS_ACTION.REMINDER_STOPPED,
    note: 'Hatırlatmalar varsayılan olarak kapatıldı (gerekirse makine detayından açılabilir)',
    performedByLabel: 'Sistem'
  })));
  return { kapatilan: ids.length };
}

module.exports = { hatirlatmalariVarsayilanKapat, ELLE_ACILDI_NOTU };
