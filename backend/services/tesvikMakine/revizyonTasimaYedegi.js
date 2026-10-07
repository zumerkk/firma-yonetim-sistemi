// Taşıma yedeği: kayıpsız BSON Extended JSON -> gzip -> AES-256-GCM.
// Anahtar ve arşiv kullanıcıya özel (0600), her çalışma klasörü 0700'dır.
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const readline = require('readline');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { EJSON } = require('mongoose').mongo.BSON;
const { veriHash, ozet } = require('./revizyonTasima');

const MAGIC = Buffer.from('GMREV1\n');
const IV_BOYUTU = 12;
const TAG_BOYUTU = 16;
const HEADER_BOYUTU = MAGIC.length + IV_BOYUTU;

const ejsonSatir = (veri) => `${JSON.stringify(EJSON.serialize(veri, { relaxed: false }))}\n`;

async function yedekOlustur({ kaynaklar, dizin, secim = {} }) {
  const damga = new Date().toISOString().replace(/[:.]/g, '-');
  await fsp.mkdir(dizin, { recursive: true, mode: 0o700 });
  const calismaDizini = await fsp.mkdtemp(path.join(dizin, `revizyon-${damga}-`));
  await fsp.chmod(calismaDizini, 0o700);
  const arsivPath = path.join(calismaDizini, 'kaynak.jsonl.gz.enc');
  const anahtarPath = path.join(calismaDizini, 'anahtar.key');
  const anahtar = crypto.randomBytes(32);
  const iv = crypto.randomBytes(IV_BOYUTU);
  await fsp.writeFile(anahtarPath, anahtar.toString('hex'), { mode: 0o600, flag: 'wx' });
  const fd = await fsp.open(arsivPath, 'wx', 0o600);
  await fd.write(Buffer.concat([MAGIC, iv]));
  let count = 0;
  let revizyonAdedi = 0;
  let gecmisByte = 0;
  const toplamHash = crypto.createHash('sha256');
  async function* satirlar() {
    yield ejsonSatir({ type: 'header', version: 1, createdAt: new Date(), secim });
    for await (const kaynak of kaynaklar) {
      const belgeOzeti = ozet(kaynak); // Hatalı kaynakta herhangi bir DB yazımı yapılmaz.
      const record = {
        type: 'record', ...kaynak,
        parentHash: veriHash(kaynak.parent),
        gecmisHash: belgeOzeti.gecmisHash
      };
      const satir = ejsonSatir(record);
      toplamHash.update(satir);
      count++;
      revizyonAdedi += belgeOzeti.revizyonAdedi;
      gecmisByte += belgeOzeti.gecmisByte;
      yield satir;
    }
    yield ejsonSatir({ type: 'manifest', count, sha256: toplamHash.digest('hex') });
  }
  const cipher = crypto.createCipheriv('aes-256-gcm', anahtar, iv);
  try {
    // fd'nin konumu header sonunda; kapanışı pipeline yönetir.
    await pipeline(Readable.from(satirlar()), zlib.createGzip({ level: 6 }), cipher, fd.createWriteStream());
    await fsp.appendFile(arsivPath, cipher.getAuthTag());
    const dogrulama = await yedegiDogrula({ arsivPath, anahtarPath });
    if (dogrulama.count !== count) throw new Error('Yedek belge sayısı doğrulanamadı.');
    return { arsivPath, anahtarPath, count, revizyonAdedi, gecmisByte, boyut: (await fsp.stat(arsivPath)).size };
  } catch (error) {
    await fd.close().catch(() => {});
    await fsp.unlink(arsivPath).catch(() => {});
    await fsp.unlink(anahtarPath).catch(() => {});
    throw error;
  } finally { anahtar.fill(0); }
}

async function* yedektenOku({ arsivPath, anahtarPath }) {
  const anahtar = Buffer.from((await fsp.readFile(anahtarPath, 'utf8')).trim(), 'hex');
  if (anahtar.length !== 32) throw new Error('Yedek anahtarı geçersiz.');
  const fd = await fsp.open(arsivPath, 'r');
  let satirlar;
  let akisSozu;
  let kaynak;
  let decipher;
  let gunzip;
  try {
    const stat = await fd.stat();
    if (stat.size <= HEADER_BOYUTU + TAG_BOYUTU) throw new Error('Yedek arşivi eksik.');
    const header = Buffer.alloc(HEADER_BOYUTU);
    const tag = Buffer.alloc(TAG_BOYUTU);
    await fd.read(header, 0, header.length, 0);
    await fd.read(tag, 0, tag.length, stat.size - TAG_BOYUTU);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Yedek biçimi geçersiz.');
    decipher = crypto.createDecipheriv('aes-256-gcm', anahtar, header.subarray(MAGIC.length));
    decipher.setAuthTag(tag);
    kaynak = fd.createReadStream({ start: HEADER_BOYUTU, end: stat.size - TAG_BOYUTU - 1 });
    gunzip = zlib.createGunzip();
    // Pipeline reddini hemen yakala: tüketici async generator okuyana kadar sahipsiz kalmasın.
    let akisHatasi;
    akisSozu = pipeline(kaynak, decipher, gunzip).catch((e) => { akisHatasi = e; });
    satirlar = readline.createInterface({ input: gunzip, crlfDelay: Infinity });
    const toplamHash = crypto.createHash('sha256');
    let count = 0;
    let headerGoruldu = false;
    let manifest = null;
    for await (const satir of satirlar) {
      if (!satir) continue;
      const kayit = EJSON.parse(satir, { relaxed: false });
      if (kayit.type === 'header') {
        if (headerGoruldu || count || manifest || Number(kayit.version) !== 1) throw new Error('Yedek başlığı geçersiz.');
        headerGoruldu = true;
      } else if (kayit.type === 'record') {
        if (!headerGoruldu || manifest) throw new Error('Yedek kayıt sırası geçersiz.');
        if (veriHash(kayit.parent) !== kayit.parentHash || veriHash(kayit.parent.makineRevizyonlari || []) !== kayit.gecmisHash) {
          throw new Error('Yedek içeriğinin hash doğrulaması başarısız.');
        }
        ozet(kayit);
        toplamHash.update(`${satir}\n`);
        count++;
        yield kayit;
      } else if (kayit.type === 'manifest') {
        if (!headerGoruldu || manifest) throw new Error('Yedek manifesti geçersiz.');
        manifest = kayit;
      } else { throw new Error('Yedek kayıt türü geçersiz.'); }
    }
    await akisSozu;
    if (akisHatasi) throw akisHatasi;
    if (!manifest || Number(manifest.count) !== count || manifest.sha256 !== toplamHash.digest('hex')) {
      throw new Error('Yedek tamamlanmamış veya kayıt sayısı/hash uyuşmuyor.');
    }
  } finally {
    satirlar?.close();
    // Tüketici bir DB çelişkisinde erken çıkarsa kalan arşiv backpressure'da
    // beklemesin: akışları kapat, sonra pipeline temizliğinin bitmesini bekle.
    kaynak?.destroy();
    decipher?.destroy();
    gunzip?.destroy();
    if (akisSozu) await akisSozu;
    await fd.close().catch(() => {});
    anahtar.fill(0);
  }
}

// Authentication tag ve tüm kayıtlar DB yazılmadan önce ayrıca okunup doğrulanır.
async function yedegiDogrula(secenekler) {
  let count = 0;
  for await (const _kayit of yedektenOku(secenekler)) count++;
  return { count };
}

module.exports = { yedekOlustur, yedektenOku, yedegiDogrula };
