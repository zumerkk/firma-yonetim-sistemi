// 🧪 Belge Takip → "Son İşlemler" kaydı, uçtan uca (bellek içi MongoDB + supertest)
//
// Hata (21.09.2026): dosyaTakipController `Activity.create({ user: req.user._id, entityType, details })`
// çağırıyordu; şema `user: {id, name, email, role}`, category ve title istiyor. Her kayıt
// doğrulamada düşüyor, hata yakalanıp yalnız konsola yazılıyordu → Belge Takip işlemleri
// Son İşlemler ekranına hiç ulaşmadı. Kayıt en-iyi-çaba kalmalı: yazılamazsa istek bozulmaz.

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Canlıdaki req.user tam User belgesi: e-posta her zaman dolu
const mockKullanici = { _id: '0000000000000000000000aa', adSoyad: 'Seda Durak', email: 'seda@gm.test', rol: 'admin', yetkiler: {} };
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = mockKullanici;
    next();
  }
}));

const dosyaTakipRoutes = require('../../routes/dosyaTakip');
const activityRoutes = require('../../routes/activity');
const DosyaTakip = require('../../models/DosyaTakip');
const Firma = require('../../models/Firma');
const Activity = require('../../models/Activity');
const { aktiviteKaydet } = require('../../utils/aktiviteKaydi');

jest.setTimeout(60000);

const { ObjectId } = mongoose.Types;
const firma = new ObjectId();
let mem;
let app;
let sira = 0;

// Model kancaları (otomatik takipId) bu testin konusu değil: doğrudan koleksiyona yazılır
const talepEkle = async (yama) => {
  const _id = new ObjectId();
  await DosyaTakip.collection.insertOne({
    _id,
    takipId: `DT2026${String(++sira).padStart(4, '0')}`,
    firma,
    firmaId: 'A000001',
    firmaUnvan: 'ÇINAR GIDA A.Ş.',
    talepTuru: 'Belge Başvuru Talebi',
    anaAsama: 'MURACAAT_ONCESI',
    durum: '2.1.1_GORUSULUYOR',
    durumGecmisi: [],
    aktif: true,
    ...yama
  });
  return _id;
};

const talepAktiviteleri = (id) => Activity.find({ 'targetResource.id': id }).sort({ _id: 1 }).lean();
const durumDegistir = (id, yeniDurum) =>
  request(app).patch(`/api/dosya-takip/${id}/durum`).send({ yeniDurum, aciklama: 'Evraklar tamamlandı' });

beforeAll(async () => {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  await Firma.collection.insertOne({ _id: firma, firmaId: 'A000001', tamUnvan: 'ÇINAR GIDA A.Ş.' });

  app = express();
  app.use(express.json());
  app.use('/api/dosya-takip', dosyaTakipRoutes);
  app.use('/api/activities', activityRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
});

describe('durum değişikliği Son İşlemler kaydı düşer', () => {
  test('kayıt şemaya uygun: kullanıcı, Belge Takip kategorisi, hedef talep ve durum geçişi', async () => {
    const id = await talepEkle();

    const r = await durumDegistir(id, '2.1.4_MURACAAT_HAZIRLANIYOR');
    expect(r.status).toBe(200);

    const kayitlar = await talepAktiviteleri(id);
    expect(kayitlar).toHaveLength(1);
    const [akt] = kayitlar;
    expect(akt).toMatchObject({
      action: 'update',
      category: 'dosyaTakip',
      status: 'success',
      title: 'Belge Takip Durumu Değiştirildi',
      description: `Seda Durak talep durumunu değiştirdi: ${r.body.data.takipId} → Müracaat Hazırlanıyor`,
      user: { name: 'Seda Durak', email: 'seda@gm.test', role: 'admin' },
      targetResource: { type: 'dosyaTakip', name: 'ÇINAR GIDA A.Ş.', firmaId: 'A000001' },
      changes: { fields: [{ field: 'durum', oldValue: 'Görüşülüyor', newValue: 'Müracaat Hazırlanıyor' }] }
    });
    expect(String(akt.user.id)).toBe(mockKullanici._id);
    expect(String(akt.targetResource.id)).toBe(String(id));
    // supertest ::ffff:127.0.0.1 ile gelir; modelin IP doğrulayıcısı bu biçimi reddederdi
    expect(['127.0.0.1', '::1']).toContain(akt.metadata.ip);
  });

  test('kayıt Son İşlemler API\'sinde Belge Takip süzgeciyle görünür', async () => {
    const id = await talepEkle();
    await durumDegistir(id, '2.1.2_BEKLE_EVRAK_TAMAM_FIYAT');

    const liste = await request(app).get('/api/activities?kategori=dosyaTakip&limit=100');
    expect(liste.status).toBe(200);
    const bulunan = liste.body.data.activities.filter((a) => a.targetResource?.id === String(id));
    expect(bulunan).toHaveLength(1);

    const secenekler = await request(app).get('/api/activities/filter-options');
    expect(secenekler.body.data.categories).toContain('dosyaTakip');
  });

  test('kayıt yazılamasa da istek başarılı döner ve durum kaydedilir', async () => {
    const id = await talepEkle();
    const konsol = jest.spyOn(console, 'error').mockImplementation(() => {});
    const kayit = jest.spyOn(Activity, 'logActivity').mockRejectedValueOnce(new Error('bağlantı koptu'));
    try {
      const r = await durumDegistir(id, '2.1.5_BAKANLIK_ODEMESI_BEKLENIYOR');
      expect(r.status).toBe(200);
      expect(kayit).toHaveBeenCalledTimes(1);
      expect(konsol).toHaveBeenCalledWith('🚨 Aktivite kaydı hatası:', 'bağlantı koptu');
    } finally {
      kayit.mockRestore();
      konsol.mockRestore();
    }
    expect((await DosyaTakip.findById(id).lean()).durum).toBe('2.1.5_BAKANLIK_ODEMESI_BEKLENIYOR');
    expect(await talepAktiviteleri(id)).toHaveLength(0);
  });
});

test('talep oluşturma, güncelleme ve silme de kaydedilir', async () => {
  const olustur = await request(app).post('/api/dosya-takip').send({
    firma: String(firma), firmaId: 'A000001', firmaUnvan: 'ÇINAR GIDA A.Ş.', talepTuru: 'Belge Başvuru Talebi'
  });
  expect(olustur.status).toBe(201);
  const id = olustur.body.data._id;

  expect((await request(app).put(`/api/dosya-takip/${id}`).send({ durumAciklamasi: 'Firma arandı' })).status).toBe(200);
  expect((await request(app).delete(`/api/dosya-takip/${id}`)).status).toBe(200);

  const kayitlar = await talepAktiviteleri(id);
  expect(kayitlar.map((a) => [a.action, a.title])).toEqual([
    ['create', 'Belge Takip Talebi Oluşturuldu'],
    ['update', 'Belge Takip Talebi Güncellendi'],
    ['delete', 'Belge Takip Talebi Silindi']
  ]);
  expect(kayitlar.every((a) => a.category === 'dosyaTakip' && a.user.email === 'seda@gm.test')).toBe(true);
});

describe('aktiviteKaydet isteğe bağlı alanlar yüzünden kaydı kaybetmez', () => {
  const istek = (yama) => ({ user: mockKullanici, ip: '127.0.0.1', get: () => undefined, ...yama });
  const kayit = (yama) => ({ action: 'update', category: 'dosyaTakip', title: 'Deneme', description: 'Deneme', ...yama });

  test('kısaltılmış IPv6 adresi atlanır, kayıt yazılır', async () => {
    const akt = await aktiviteKaydet(istek({ ip: '2a02:e0:3::1' }), kayit());
    expect(akt).not.toBeNull();
    expect(akt.metadata.ip).toBeUndefined();
  });

  test('200 karakteri aşan firma ünvanı kırpılır, kayıt yazılır', async () => {
    const unvan = 'UZUN ÜNVANLI SANAYİ VE TİCARET ANONİM ŞİRKETİ '.repeat(6);
    const akt = await aktiviteKaydet(istek(), kayit({ targetResource: { type: 'dosyaTakip', name: unvan } }));
    expect(akt).not.toBeNull();
    expect(akt.targetResource.name).toBe(unvan.slice(0, 200).trim());
  });
});
