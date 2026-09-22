// 🔗 ORTAK YÜKLEME — toplu linkten gelen evrakın kopyalarını ekranda TEK satır olarak toplar
//
// Müşteri (21.09.2026): "Toplu link üzerinden dosya yükleyince bütün makineler için ayrı ayrı yüklenmiş
// gibi görünüyor. Bunu istenen makineler için tek/ortak bir yükleme gibi gösterme şansımız var mı?"
//
// Toplu link yüklenen dosyayı kapsadığı her makinenin klasörüne ve kaydına işliyor (makine klasörü
// eksiksiz kalsın, makine başına evrak sayısı doğru olsun — bu kalıyor). 3 makinelik linke 3 dosya
// yüklenince Evraklar sekmesinde 9 satır çıkıyordu. Kopyalar artık `ortakYuklemeId` paylaşıyor ve
// burada tek satıra iniyor. Bu alan eklenmeden önceki yüklemeler (canlıda 3 grup / 9 kayıt) aynı
// dosyanın aynı yükleyiciden kısa aralıkla farklı makinelere gelmesinden tanınıyor.

// Eski (kimliksiz) kopyalar: toplu yükleme dosyaları sırayla kaydediyor, büyük dosyada dakikalar sürebilir
const ESKI_KOPYA_PENCERESI_MS = 10 * 60 * 1000;

const surecKimligi = (d) => {
  const s = d.machineProcessId;
  if (!s) return '';
  return String(s._id || s);
};

const makineBilgisi = (d) => {
  const s = d.machineProcessId && typeof d.machineProcessId === 'object' && d.machineProcessId._id ? d.machineProcessId : null;
  return {
    machineProcessId: surecKimligi(d),
    siraNo: s ? (s.siraNo ?? null) : (d.machineSiraNo ?? null),
    machineName: s ? (s.machineName || '') : (d.machineName || ''),
    listType: s ? (s.listType || '') : (d.machineListType || '')
  };
};

const zaman = (d) => new Date(d.createdAt || 0).getTime();

/**
 * Evrak kayıtlarını ortak yüklemelere göre gruplar.
 * @param {Array} docs UploadedDocument (lean); machineProcessId populate edilmiş olabilir
 * @returns {Array<Array>} gruplar — her grup aynı yüklemenin kopyaları (tekil evrak tek elemanlı grup)
 */
function kopyaGruplari(docs) {
  const sirali = [...(docs || [])].sort((a, b) => zaman(a) - zaman(b));
  const gruplar = [];
  const kimlikli = new Map();
  const eskiAcik = new Map(); // eski anahtar → son açık grup

  for (const d of sirali) {
    if (d.ortakYuklemeId) {
      const g = kimlikli.get(d.ortakYuklemeId);
      if (g) g.push(d);
      else { const yeni = [d]; kimlikli.set(d.ortakYuklemeId, yeni); gruplar.push(yeni); }
      continue;
    }
    // Admin yüklemesi makine başına yapılır; yalnız link yüklemeleri kopya olabilir
    const surec = surecKimligi(d);
    if (d.uploadedByType === 'admin' || !surec) { gruplar.push([d]); continue; }
    const anahtar = [d.tesvikId, d.originalName || d.fileName, d.fileSize, d.documentType, d.uploadedByType, d.uploaderName].map(String).join('|');
    const acik = eskiAcik.get(anahtar);
    const uygun = acik
      && zaman(d) - zaman(acik[0]) <= ESKI_KOPYA_PENCERESI_MS
      && !acik.some((x) => surecKimligi(x) === surec);
    if (uygun) acik.push(d);
    else { const yeni = [d]; eskiAcik.set(anahtar, yeni); gruplar.push(yeni); }
  }
  return gruplar;
}

/**
 * Evraklar sekmesinin satırları: tekil evrak eskisi gibi, ortak yükleme tek satır.
 * Ortak satır: ilk kopyanın alanları + { ortak: true, ids, makineler } (indirme ilk kopyadan).
 */
function evraklariGrupla(docs) {
  return kopyaGruplari(docs)
    .map((grup) => {
      const ilk = grup[0];
      if (grup.length === 1) {
        const m = makineBilgisi(ilk);
        return {
          ...ilk,
          machineProcessId: m.machineProcessId || null,
          machineName: m.machineName,
          machineSiraNo: m.siraNo,
          machineListType: m.listType
        };
      }
      const makineler = grup.map(makineBilgisi).sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
      return {
        ...ilk,
        machineProcessId: null,
        machineName: '',
        machineSiraNo: null,
        machineListType: '',
        createdAt: grup[grup.length - 1].createdAt,
        ortak: true,
        ids: grup.map((d) => String(d._id)),
        makineler
      };
    })
    .sort((a, b) => zaman(b) - zaman(a));
}

/** Bir evrakın ait olduğu ortak yüklemenin bütün kopya kimlikleri (tekil evrakta yalnız kendisi) */
function ayniYuklemeninKopyalari(docs, evrakId) {
  const hedef = String(evrakId);
  const grup = kopyaGruplari(docs).find((g) => g.some((d) => String(d._id) === hedef));
  return grup ? grup.map((d) => String(d._id)) : [hedef];
}

module.exports = { evraklariGrupla, ayniYuklemeninKopyalari, kopyaGruplari, ESKI_KOPYA_PENCERESI_MS };
