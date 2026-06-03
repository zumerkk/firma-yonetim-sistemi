// 🧪 Teşvik Makine - Saf birim testleri (DB gerektirmez)
const engine = require('../../services/tesvikMakine/mailTemplateEngine');
const parser = require('../../services/tesvikMakine/ministryMailParser');
const storage = require('../../services/tesvikMakine/storageService');
const tokenSvc = require('../../services/tesvikMakine/uploadTokenService');
const status = require('../../constants/tesvikMakineStatus');

describe('mailTemplateEngine - placeholder replacement', () => {
  test('bilinen placeholderları değiştirir, bilinmeyeni bırakır', () => {
    expect(engine.render('{firmaAdi} - {makineAdi}', { firmaAdi: 'ACME', makineAdi: 'CNC' })).toBe('ACME - CNC');
    expect(engine.render('No {x}', {})).toBe('No {x}');
  });

  test('0 değeri geçerli sayılır, boş string eksik sayılır', () => {
    expect(engine.hasValue(0)).toBe(true);
    expect(engine.render('{n}', { n: 0 })).toBe('0');
    expect(engine.hasValue('')).toBe(false);
    expect(engine.hasValue('  ')).toBe(false);
  });

  test('validate eksik placeholderları raporlar', () => {
    const r = engine.validate('{a} {b} {c}', { a: '1', b: '' });
    expect(r.ok).toBe(false);
    expect(r.missing.sort()).toEqual(['b', 'c']);
  });

  test('renderTemplate subject+body birleşik eksikleri verir, Türkçe korunur', () => {
    const out = engine.renderTemplate(
      { subjectTemplate: '{firmaAdi} - GTİP', bodyTemplate: 'Şirket: {firmaAdi}, Eksik: {yok}' },
      { firmaAdi: 'ÖZ ÇİÇEK A.Ş.' }
    );
    expect(out.subject).toBe('ÖZ ÇİÇEK A.Ş. - GTİP');
    expect(out.body).toContain('ÖZ ÇİÇEK A.Ş.');
    expect(out.missing).toEqual(['yok']);
    expect(out.ok).toBe(false);
  });
});

describe('ministryMailParser - parse', () => {
  test('tek satır (inline) gövde', () => {
    const p = parser.parse('Makine Adı: NST CİHAZI Gtip No: 901812000000 Barkod: 2wuhvj');
    expect(p.makineAdi).toBe('NST CİHAZI');
    expect(p.gtipNo).toBe('901812000000');
    expect(p.barkod).toBe('2wuhvj');
  });

  test('çok satırlı + G.T.İ.P + noktalı gtip + URL', () => {
    const body = [
      'Firma Adı : ADIYAMAN ÖZEL SEVGİ SAĞLIK HİZMETLERİ TİCARET VE SANAYİ ANONİM ŞİRKETİ',
      'Belge No : 518097',
      'Belge Id : 1023736',
      'Makine Adı : MR CİHAZI',
      'G.T.İ.P No: 9018.13.00.00.00',
      'Barkod : ab12CD',
      'Adres: https://etuys.sanayi.gov.tr/etuysListeDogrulama'
    ].join('\n');
    const p = parser.parse(body);
    expect(p.firmaAdi).toContain('ADIYAMAN');
    expect(p.firmaAdi).toContain('ŞİRKETİ');
    expect(p.belgeNo).toBe('518097');
    expect(p.belgeId).toBe('1023736');
    expect(p.makineAdi).toBe('MR CİHAZI');
    expect(p.gtipNo).toBe('901813000000');
    expect(p.barkod).toBe('ab12CD');
    expect(p.adres).toBe('https://etuys.sanayi.gov.tr/etuysListeDogrulama');
  });

  test('büyük/küçük harf ve "GTİP No" varyasyonu', () => {
    const p = parser.parse('makine adı: pompa GTİP No : 8413700000 barkod: XyZ9');
    expect(p.makineAdi.toLowerCase()).toBe('pompa');
    expect(p.gtipNo).toBe('8413700000');
    expect(p.barkod).toBe('XyZ9');
  });
});

describe('storageService - folder path normalize', () => {
  test('Türkçe korunur, tehlikeli karakterler atılır, boşluk → _', () => {
    const s = storage.normalizeSegment('NST CİHAZI / çok**uzun?<isim>');
    expect(s).toBe('NST_CİHAZI_çokuzunisim');
    expect(s).not.toMatch(/[/\\*?<>:"|]/);
  });

  test('80 karakter sınırı', () => {
    const long = 'A'.repeat(200);
    expect(storage.normalizeSegment(long, 80).length).toBeLessThanOrEqual(80);
  });

  test('dosya adı uzantıyı korur', () => {
    expect(storage.normalizeFileName('kdv yazısı.PDF')).toBe('kdv_yazısı.pdf');
  });

  test('machineFolderName: SiraNo_Ad_GTIP', () => {
    expect(storage.machineFolderName({ siraNo: 3, machineName: 'NST CİHAZI ÖZEL', gtipNo: '901812000000' }))
      .toBe('3_NST_CİHAZI_ÖZEL_901812000000');
  });

  test('certificateFolderRel: Tesvikler/{firma}/{belgeNo}-{belgeId}', () => {
    const rel = storage.certificateFolderRel({ firmaName: 'ACME SAĞLIK A.Ş.', documentNo: '518097', documentId: '1023736' });
    expect(rel.startsWith('Tesvikler/')).toBe(true);
    expect(rel).toContain('518097-1023736');
    expect(rel).toContain('SAĞLIK');
  });

  test('boş değer güvenli', () => {
    expect(storage.normalizeSegment('')).toBe('_');
    expect(storage.normalizeSegment(null)).toBe('_');
  });
});

describe('uploadTokenService - güvenlik', () => {
  test('token uzun ve benzersiz (tahmin edilemez)', () => {
    const a = tokenSvc.generateToken();
    const b = tokenSvc.generateToken();
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
  });

  test('computeExpiry: 0/boş → süresiz (null), pozitif → ileri tarih', () => {
    const prev = process.env.UPLOAD_TOKEN_DAYS; delete process.env.UPLOAD_TOKEN_DAYS;
    expect(tokenSvc.computeExpiry()).toBeNull();
    expect(tokenSvc.computeExpiry(0)).toBeNull();
    const exp = tokenSvc.computeExpiry(7);
    expect(exp.getTime()).toBeGreaterThan(Date.now());
    if (prev !== undefined) process.env.UPLOAD_TOKEN_DAYS = prev;
  });

  test('isExpired: null süresiz, geçmiş süreli, gelecek geçerli', () => {
    expect(tokenSvc.isExpired(null)).toBe(false);
    expect(tokenSvc.isExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(tokenSvc.isExpired(new Date(Date.now() + 100000))).toBe(false);
  });
});

describe('status constants - tek merkez', () => {
  test('17 durum + geçerlilik', () => {
    expect(status.STATUS_VALUES.length).toBe(17);
    expect(status.isValidStatus('waiting_kdv_exemption')).toBe(true);
    expect(status.isValidStatus('boş_durum')).toBe(false);
  });

  test('badge kategorileri (renk)', () => {
    expect(status.getStatusBadge('not_started').category).toBe('bekliyor');
    expect(status.getStatusBadge('waiting_kdv_exemption').category).toBe('evrak');
    expect(status.getStatusBadge('blocked').category).toBe('sorunlu');
    expect(status.getStatusBadge('completed').category).toBe('tamamlandi');
  });

  test('hatırlatma bastırılan durumlar', () => {
    expect(status.isReminderSuppressed('completed')).toBe(true);
    expect(status.isReminderSuppressed('invoice_approved')).toBe(true);
    expect(status.isReminderSuppressed('cancelled')).toBe(true);
    expect(status.isReminderSuppressed('inquiry_sent')).toBe(false);
  });

  test('statusOptions sıralı ve dolu', () => {
    const opts = status.statusOptions();
    expect(opts.length).toBe(17);
    expect(opts[0].value).toBe('not_started');
  });
});
