import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Upload from './IslemEvrakPublicUpload';
import svc from '../../services/islemEvrakService';
jest.mock('../../services/islemEvrakService', () => ({ __esModule: true, default: { publicBilgi: jest.fn(), publicYukle: jest.fn(), publicNedenKaydet: jest.fn(), publicOrnekIndir: jest.fn(), publicMailEkiIndir: jest.fn(), publicEkBelgeSil: jest.fn(), publicEkBelgeEkle: jest.fn() } }));
const bilgi = { firmaAdi: 'Test Firma', islemAdi: 'Yeni Belge', maxUploadMB: 100, istenenEvraklar: [{ id: 'a', ad: 'Vergi Levhası' }, { id: 'b', ad: 'İmza Sirküleri' }] };
const ac = () => render(<MemoryRouter initialEntries={['/evrak/token1']}><Routes><Route path="/evrak/:token" element={<Upload />} /></Routes></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); svc.publicBilgi.mockResolvedValue(bilgi); });
test('satırdaki dosya doğrudan o evrakla gönderilir', async () => {
  svc.publicYukle.mockResolvedValue({ message: 'Dosyanız yüklendi.' });
  ac();
  const input = await screen.findByLabelText('İmza Sirküleri yükle');
  const file = new File(['icerik'], 'imza.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(svc.publicYukle).toHaveBeenCalled());
  const [token, form] = svc.publicYukle.mock.calls[0];
  expect(token).toBe('token1');
  expect(form.get('istenenEvrakId')).toBe('b');
  expect(form.get('dosyalar').name).toBe('imza.pdf');
  await screen.findByText('Dosyanız yüklendi.');
});
test('neden girildiğinde sunucuya kaydedilir ve durum yenilenir', async () => {
  svc.publicNedenKaydet.mockResolvedValue({ message: 'Neden kaydedildi.' });
  ac();
  const buttons = await screen.findAllByRole('button', { name: 'Yükleyemiyorum' });
  fireEvent.click(buttons[0]);
  fireEvent.change(screen.getByLabelText('Vergi Levhası yüklenememe nedeni'), { target: { value: 'Belge henüz düzenlenmedi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Nedeni kaydet' }));
  await waitFor(() => expect(svc.publicNedenKaydet).toHaveBeenCalledWith('token1', { istenenEvrakId: 'a', neden: 'Belge henüz düzenlenmedi' }));
  await screen.findByText('Neden kaydedildi.');
  expect(svc.publicBilgi).toHaveBeenCalledTimes(2);
});
// Müşteri (09.10.2026): eksik / hatalı gelen evrak aynı bağlantıdan yeniden istenir — firma notu görür
test('tekrar istenen evrak kırmızı notla gösterilir', async () => {
  svc.publicBilgi.mockResolvedValue({ ...bilgi, istenenEvraklar: [
    { id: 'a', ad: 'Vergi Levhası', geldiMi: true },
    { id: 'b', ad: 'İmza Sirküleri', geldiMi: false, tekrarIstendi: true, tekrarIstemeNotu: 'Noter onaylı olmalı' }
  ] });
  ac();
  expect(await screen.findByText('Eksik / hatalı iletildi, lütfen tekrar yükleyin: Noter onaylı olmalı')).toBeInTheDocument();
  expect(screen.getByText('Tekrar yükleyin')).toBeInTheDocument();
});


test('gönderilen mailin konusu ve biçimi görünür; etkin HTML ve tehlikeli bağlantılar temizlenir', async () => {
  svc.publicBilgi.mockResolvedValue({ ...bilgi, gonderilenMail: {
    konu: 'Revize evrak talebi', govde: '<p>Sayın <b>Yetkili</b></p><script>kotu()</script><img src=x onerror="kotu()"><a href="javascript:alert(1)" onclick="kotu()">Tıkla</a><iframe src="https://kotu.test"></iframe>'
  } });
  ac();
  const bolum = await screen.findByRole('region', { name: 'Gönderilen mail' });
  expect(bolum).toHaveTextContent('Revize evrak talebi');
  expect(bolum).toContainHTML('<b>Yetkili</b>');
  expect(bolum.querySelector('script, img, iframe, [onclick], [onerror]')).toBeNull();
  expect(bolum.querySelector('a')).not.toHaveAttribute('href');
});

test('aynı evrakın birden fazla örneği kendi indeksiyle indirilir', async () => {
  svc.publicBilgi.mockResolvedValue({ ...bilgi, istenenEvraklar: [{ id: 'a', ad: 'Taahhütname', ornekDosyalar: [
    { indeks: 0, dosyaAdi: 'Şahıs.docx' }, { indeks: 1, dosyaAdi: 'Şirket.docx' }
  ] }] });
  svc.publicOrnekIndir.mockResolvedValue({ data: new Blob(['ornek']) });
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:ornek'); URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    ac();
    fireEvent.click(await screen.findByRole('button', { name: 'Şirket.docx' }));
    await waitFor(() => expect(svc.publicOrnekIndir).toHaveBeenCalledWith('token1', 'a', 1));
    expect(screen.getByRole('button', { name: 'Şahıs.docx' })).toBeInTheDocument();
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ornek'));
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; click.mockRestore(); }
});

// Müşteri (23.10.2026): önceki mailler kapalı, en yenisi açık; maile özel ekler linkte indirilebilir
test('gönderilen mailler: en yeni açık, öncekiler kapalı; ekler kendi mailinin altında', async () => {
  svc.publicBilgi.mockResolvedValue({ ...bilgi, gonderilenMailler: [
    { konu: 'Eksik evraklar', tur: 'devam', tarih: '2026-10-22T09:00:00Z', govde: '<p>İkinci mail</p>', ekler: [] },
    { konu: 'Evrak talebi', tur: 'ilk', tarih: '2026-10-20T09:00:00Z', govde: '<p>Birinci mail</p>', ekler: [{ id: 'e1', dosyaAdi: 'Vekaletname.pdf' }] }
  ] });
  svc.publicMailEkiIndir.mockResolvedValue({ data: new Blob(['x']) });
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:ek'); URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    ac();
    const bolum = await screen.findByRole('region', { name: 'Gönderilen mail' });
    expect(bolum).toHaveTextContent('Gönderilen mailler (2)');
    expect(screen.getByText('İkinci mail')).toBeVisible();
    const eski = screen.getByRole('button', { name: /İlk talep · 20\.10\.2026 · Evrak talebi/ });
    expect(eski).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(eski);
    await waitFor(() => expect(eski).toHaveAttribute('aria-expanded', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Vekaletname.pdf' }));
    await waitFor(() => expect(svc.publicMailEkiIndir).toHaveBeenCalledWith('token1', 'e1'));
  } finally { URL.createObjectURL = create; URL.revokeObjectURL = revoke; click.mockRestore(); }
});

test('firmanın eklediği belge onayla listeden kaldırılır', async () => {
  svc.publicBilgi.mockResolvedValue({ ...bilgi, ekBelgeler: [{ id: 'k1', ad: 'Test belgesi', geldiMi: true }] });
  svc.publicEkBelgeSil.mockResolvedValue({ message: 'Belge listeden kaldırıldı.' });
  const onay = jest.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    ac();
    fireEvent.click(await screen.findByRole('button', { name: 'Test belgesi kaldır' }));
    await waitFor(() => expect(svc.publicEkBelgeSil).toHaveBeenCalledWith('token1', 'k1'));
    expect(onay.mock.calls[0][0]).toContain('danışmanınızda kalır');
    await screen.findByText('Belge listeden kaldırıldı.');
  } finally { onay.mockRestore(); }
});
