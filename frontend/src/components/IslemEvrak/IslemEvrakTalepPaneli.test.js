import React from 'react';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import Panel from './IslemEvrakTalepPaneli';
import svc from '../../services/islemEvrakService';

jest.mock('../../services/islemEvrakService', () => ({
  __esModule: true, default: { talepDetay: jest.fn(), turDetay: jest.fn(), talepGuncelle: jest.fn(), mailOnizle: jest.fn(), dosyaIndir: jest.fn(), ornekDosyaYukle: jest.fn(), mailGonder: jest.fn() }
}));

const talep = { _id: 't1', firmaAdi: 'Firma', islemTuru: 'tur1', dosyaTakip: 'dt1',
  istenenEvraklar: [{ _id: 'e1', ad: 'Vergi Levhası', zorunlu: true }], yuklenenEvraklar: [], mailAlicilar: ['firma@test.com'] };

beforeEach(() => {
  jest.clearAllMocks();
  svc.talepDetay.mockResolvedValue(talep);
  svc.turDetay.mockResolvedValue({});
  svc.talepGuncelle.mockImplementation(async (_id, body) => ({ ...talep, ...body }));
  svc.mailOnizle.mockResolvedValue({ to: ['firma@test.com'], cc: [], subject: 'Evrak Talebi', body: 'Taslak metni', smtpConfigured: true });
});

test('açılışta mail üretmez; metin ve seçimler kaydedildikten sonra ayrı taslak ekranı açılır', async () => {
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  const input = await screen.findByLabelText('Talep metni');
  expect(input).toHaveAttribute('maxlength', '3000');
  expect(svc.mailOnizle).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('İçerik')).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'Belgeleri hazırlayınız.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  // İçerik artık biçimli metin editörü (contentEditable, aria-label "İçerik") — müşteri 13.10.2026
  expect(await screen.findByLabelText('İçerik')).toHaveTextContent('Taslak metni');
  expect(svc.talepGuncelle).toHaveBeenCalledWith('t1', expect.objectContaining({ talepMetni: 'Belgeleri hazırlayınız.', istenenEvraklar: expect.any(Array) }));
  const editor = screen.getByLabelText('İçerik');
  editor.innerHTML = 'Elle <b>düzenlenen</b> mail';
  fireEvent.input(editor);
  fireEvent.blur(editor); // değer beklemeden üst bileşene geçer
  fireEvent.click(screen.getByRole('button', { name: 'Evraklara dön' }));
  await waitFor(() => expect(screen.queryByLabelText('İçerik')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByLabelText('İçerik')).toHaveTextContent('Elle düzenlenen mail');
  expect(screen.getByLabelText('İçerik')).toContainHTML('<b>düzenlenen</b>');
  expect(svc.mailOnizle).toHaveBeenCalledTimes(1);
});

test('kayıt başarısızsa taslak açılmaz, metin ekranda kalır', async () => {
  svc.talepGuncelle.mockRejectedValue(new Error('Kayıt başarısız'));
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('Talep metni'), { target: { value: 'Korunacak metin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByText('Kayıt başarısız')).toBeInTheDocument();
  expect(screen.getByLabelText('Talep metni')).toHaveValue('Korunacak metin');
  expect(svc.mailOnizle).not.toHaveBeenCalled();
});

test('gönderim belirsizse aynı taslak kimliğiyle sonucu sorgular, SMTP reddi ve geçmiş uyarısı birlikte görünür', async () => {
  let ilkGonderimiBitir;
  const ilk = new Promise((_resolve, reject) => { ilkGonderimiBitir = reject; });
  svc.mailGonder.mockImplementationOnce(() => ilk).mockResolvedValueOnce({
    sent: true, talep, kabulEdilenler: ['firma@test.com'], reddedilenler: ['baska@test.com'],
    gecmisKaydedildi: false, linkeEklenemeyen: ['belge.pdf']
  });
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Mail Taslağı Hazırla' }));
  const gonder = await screen.findByRole('button', { name: 'SMTP ile Gönder' });
  fireEvent.click(gonder);
  await waitFor(() => expect(svc.mailGonder).toHaveBeenCalledTimes(1));
  expect(gonder).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Taslağı Kaydet' })).toBeDisabled();
  fireEvent.click(gonder);
  await act(async () => ilkGonderimiBitir(new Error('Network Error')));
  await screen.findByText(/Gönderim sonucu alınamadı/);
  fireEvent.click(gonder);
  await screen.findByText(/Gönderim geçmişine kayıt doğrulanamadı/);
  expect(screen.getByText(/Reddedilenler: baska@test.com/)).toHaveTextContent('belge.pdf');
  expect(svc.mailGonder).toHaveBeenCalledTimes(2);
  const anahtarlar = svc.mailGonder.mock.calls.map(([, payload]) => payload.istekId);
  expect(anahtarlar[0]).toBeTruthy();
  expect(anahtarlar[1]).toBe(anahtarlar[0]);
});

test('taslak silinirken şablon önizlemesi hata verirse kaydedilmiş taslak korunur', async () => {
  const kayitli = { ...talep, mailKonusu: 'Kaydedilmiş konu', mailGovdesi: 'Kaydedilmiş metin' };
  svc.talepDetay.mockResolvedValue(kayitli);
  svc.talepGuncelle.mockResolvedValue(kayitli);
  svc.mailOnizle.mockResolvedValueOnce({ to: ['firma@test.com'], subject: kayitli.mailKonusu, body: kayitli.mailGovdesi, smtpConfigured: true });
  svc.mailOnizle.mockRejectedValueOnce(new Error('Önizleme alınamadı'));
  const onay = jest.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mail Taslağı Hazırla' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Taslağı Sil' }));
    await screen.findByText('Önizleme alınamadı');
    expect(screen.getByLabelText('İçerik')).toHaveTextContent('Kaydedilmiş metin');
    expect(svc.talepGuncelle).not.toHaveBeenCalledWith('t1', { mailKonusu: '', mailGovdesi: '' });
  } finally { onay.mockRestore(); }
});

test('gelen evrakın Aç düğmesi dosyayı indirmeden uygulama içinde gösterir', async () => {
  svc.talepDetay.mockResolvedValue({ ...talep, yuklenenEvraklar: [{
    _id: 'dosya1', orijinalAd: 'Fatura.png', mimeType: 'image/png', yuklemeTarihi: '2026-10-17T10:00:00Z'
  }] });
  svc.dosyaIndir.mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }) });
  const eskiOlustur = URL.createObjectURL;
  const eskiBirak = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:guvenli-evrak');
  URL.revokeObjectURL = jest.fn();
  const indir = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const pencere = jest.spyOn(window, 'open').mockImplementation(() => {});
  try {
    const { unmount } = render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Fatura.png önizle' }));
    expect(await screen.findByRole('img', { name: 'Fatura.png' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(svc.dosyaIndir).toHaveBeenCalledWith('t1', 'dosya1', expect.any(AbortSignal));
    expect(indir).not.toHaveBeenCalled();
    expect(pencere).not.toHaveBeenCalled();
    unmount();
  } finally {
    indir.mockRestore(); pencere.mockRestore();
    URL.createObjectURL = eskiOlustur; URL.revokeObjectURL = eskiBirak;
  }
});


test('bir satırda seçilen birden fazla örnek tek yüklemede aynı evraka eklenir', async () => {
  const son = { ...talep, istenenEvraklar: [{ ...talep.istenenEvraklar[0], ornekDosyalar: [
    { dosyaAdi: 'bir.pdf', filePath: 'bir.pdf' }, { dosyaAdi: 'iki.docx', filePath: 'iki.docx' }
  ] }] };
  svc.ornekDosyaYukle.mockResolvedValue(son);
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  const input = await screen.findByLabelText('Vergi Levhası örnek ekle');
  expect(input).toHaveAttribute('multiple');
  fireEvent.change(input, { target: { files: [new File(['1'], 'bir.pdf'), new File(['2'], 'iki.docx')] } });
  await waitFor(() => expect(svc.ornekDosyaYukle).toHaveBeenCalled());
  const [id, evrakId, form] = svc.ornekDosyaYukle.mock.calls[0];
  expect([id, evrakId]).toEqual(['t1', 'e1']);
  expect(form.getAll('dosyalar').map((f) => f.name)).toEqual(['bir.pdf', 'iki.docx']);
  expect(await screen.findByText('bir.pdf')).toBeInTheDocument();
  expect(screen.getByText('iki.docx')).toBeInTheDocument();
  await screen.findByText('Örnek dosya eklendi — maile ek olarak eklenecek');
});

test('çoklu örnekli satır mail ekleri arasına alınır', async () => {
  const son = { ...talep, istenenEvraklar: [{ ...talep.istenenEvraklar[0], ornekDosyalar: [
    { dosyaAdi: 'bir.pdf', filePath: 'bir.pdf' }, { dosyaAdi: 'iki.docx', filePath: 'iki.docx' }
  ] }] };
  svc.talepDetay.mockResolvedValue(son);
  svc.talepGuncelle.mockResolvedValue(son);
  svc.mailGonder.mockResolvedValue({ talep: son, ekSayisi: 2 });
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Mail Taslağı Hazırla' }));
  expect(await screen.findByText('bir.pdf · iki.docx')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'SMTP ile Gönder' }));
  await waitFor(() => expect(svc.mailGonder).toHaveBeenCalledWith('t1', expect.objectContaining({ ekEvrakIdler: ['e1'] }), [], expect.any(Function)));
  await screen.findByText('Mail gönderildi · 2 ek ✅');
});


test('örnek kaldırma yalnız seçilen dosyayı listeden çıkarır', async () => {
  const son = { ...talep, istenenEvraklar: [{ ...talep.istenenEvraklar[0], ornekDosyalar: [
    { dosyaAdi: 'bir.pdf', filePath: 'bir.pdf' }, { dosyaAdi: 'iki.docx', filePath: 'iki.docx' }
  ] }] };
  svc.talepDetay.mockResolvedValue(son);
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.click(await screen.findByLabelText('bir.pdf örneğini kaldır'));
  expect(screen.queryByText('bir.pdf')).not.toBeInTheDocument();
  expect(screen.getByText('iki.docx')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Kaydet' })[0]);
  await waitFor(() => expect(svc.talepGuncelle).toHaveBeenCalledWith('t1', {
    istenenEvraklar: [expect.objectContaining({ ornekDosyalar: [{ dosyaAdi: 'iki.docx', filePath: 'iki.docx' }] })]
  }));
  await screen.findByText('İstenen evrak listesi kaydedildi');
});


test('örnek listesi kaydedilmeden kalan örneğin eski indeksinden dosya açılmaz', async () => {
  const son = { ...talep, istenenEvraklar: [{ ...talep.istenenEvraklar[0], ornekDosyalar: [
    { dosyaAdi: 'A.pdf', filePath: 'A.pdf' }, { dosyaAdi: 'B.pdf', filePath: 'B.pdf' }
  ] }] };
  svc.talepDetay.mockResolvedValue(son);
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.click(await screen.findByLabelText('A.pdf örneğini kaldır'));
  fireEvent.click(screen.getByText('B.pdf'));
  expect(svc.dosyaIndir).not.toHaveBeenCalled();
  expect(screen.getByText('B.pdf').parentElement).toHaveAttribute('title', 'İndirmek için önce değişiklikleri kaydedin.');
  fireEvent.click(screen.getAllByRole('button', { name: 'Kaydet' })[0]);
  await screen.findByText('İstenen evrak listesi kaydedildi');
  expect(screen.getByText('B.pdf').parentElement).toHaveAttribute('title', 'Örneği aç');
});

test('otomatik kayıt sürerken kaldırılan örnek, yüklemeden önce kaydedilir ve mail ekine geri gelmez', async () => {
  const ornek = (dosyaAdi) => ({ dosyaAdi, filePath: dosyaAdi });
  let kayitli = { ...talep,
    yuklenenEvraklar: [{ _id: 'gelen1', orijinalAd: 'gelen.pdf', istenenEvrakId: 'e1', yuklemeTarihi: '2026-11-05' }],
    istenenEvraklar: [
    { ...talep.istenenEvraklar[0], ornekDosyalar: [ornek('yanlis.pdf'), ornek('kalacak.pdf')] },
    { _id: 'e2', ad: 'İmza Sirküleri', zorunlu: true, ornekDosyalar: [ornek('diger.pdf')], tekrarIstemeTarihi: '2026-11-05' }
  ] };
  let ilkKaydiBitir;
  const ilkKayit = new Promise((resolve) => { ilkKaydiBitir = resolve; });
  svc.talepDetay.mockResolvedValue(kayitli);
  svc.talepGuncelle.mockImplementation(async (_id, body) => {
    kayitli = { ...kayitli, ...body };
    return kayitli;
  });
  svc.talepGuncelle.mockImplementationOnce(async (_id, body) => {
    await ilkKayit;
    kayitli = { ...kayitli, ...body };
    return kayitli;
  });
  svc.ornekDosyaYukle.mockImplementation(async (_id, evrakId, form) => {
    kayitli = { ...kayitli, istenenEvraklar: kayitli.istenenEvraklar.map((e) => e._id === evrakId
      ? { ...e, ornekDosyalar: [...e.ornekDosyalar, ...form.getAll('dosyalar').map((f) => ornek(f.name))] }
      : e) };
    return kayitli;
  });

  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  await screen.findByText('yanlis.pdf');
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  await waitFor(() => expect(svc.talepGuncelle).toHaveBeenCalledTimes(1), { timeout: 2000 });
  fireEvent.click(screen.getByLabelText('yanlis.pdf örneğini kaldır'));
  fireEvent.change(screen.getAllByPlaceholderText('Açıklama (opsiyonel)')[1], { target: { value: 'Korunan açıklama' } });
  fireEvent.change(screen.getByLabelText('Talep metni'), { target: { value: 'Kaydedilmemiş talep metni' } });
  fireEvent.click(screen.getByRole('button', { name: 'Satır Ekle' }));
  const dosyaSec = screen.getByLabelText('Vergi Levhası örnek ekle');
  fireEvent.change(dosyaSec, { target: { files: [new File(['x'], 'dogru.pdf')] } });
  expect(dosyaSec).toBeDisabled();
  for (const name of [/Dosya eksik ya da yanlış/, 'Geri al', 'Tümünü İndir (ZIP)', 'Mail Taslağı Hazırla']) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
  expect(svc.ornekDosyaYukle).not.toHaveBeenCalled();
  await act(async () => ilkKaydiBitir());

  expect(await screen.findByText('dogru.pdf')).toBeInTheDocument();
  expect(screen.queryByText('yanlis.pdf')).not.toBeInTheDocument();
  expect(screen.getByText('diger.pdf')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Korunan açıklama')).toBeInTheDocument();
  expect(screen.getByLabelText('Talep metni')).toHaveValue('Kaydedilmemiş talep metni');
  expect(screen.getAllByPlaceholderText('Evrak adı')[2]).toHaveValue('');
  const mailButonu = screen.getByRole('button', { name: 'Mail Taslağı Hazırla' });
  await waitFor(() => expect(mailButonu).toBeEnabled());
  fireEvent.click(mailButonu);
  expect(await screen.findByText('kalacak.pdf · dogru.pdf')).toBeInTheDocument();
  expect(screen.queryByText(/yanlis\.pdf/)).not.toBeInTheDocument();
});

test('örnek kaldırma kaydedilemezse yeni örnek sunucudaki eski listeye yüklenmez', async () => {
  svc.talepDetay.mockResolvedValue({ ...talep, istenenEvraklar: [{ ...talep.istenenEvraklar[0],
    ornekDosya: { dosyaAdi: 'eski.pdf', filePath: 'eski.pdf' } }] });
  svc.talepGuncelle.mockRejectedValue(new Error('Örnek listesi kaydedilemedi'));
  render(<MemoryRouter><Panel talepId="t1" gomulu /></MemoryRouter>);
  fireEvent.click(await screen.findByLabelText('eski.pdf örneğini kaldır'));
  fireEvent.change(screen.getByLabelText('Vergi Levhası örnek ekle'), {
    target: { files: [new File(['x'], 'yeni.pdf')] }
  });
  expect(await screen.findByText('Örnek listesi kaydedilemedi')).toBeInTheDocument();
  expect(svc.ornekDosyaYukle).not.toHaveBeenCalled();
  expect(screen.queryByText('eski.pdf')).not.toBeInTheDocument();
});
