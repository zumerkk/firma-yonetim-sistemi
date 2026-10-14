// 🧪 Mail editörü — HTML süzgeci ve düz metin dönüşümü (müşteri, 13.10.2026: "mail düzenleme aparatı")
import { htmlMi, htmlTemizle, metniHtmleCevir, editoreHazirla, htmlMetin } from './mailHtml';

test('şablon metni HTML sayılmaz; editör çıktısı sayılır', () => {
  expect(htmlMi('Sayın Yetkili,\n1 < 2')).toBe(false);
  expect(htmlMi('Sayın <b>Yetkili</b>')).toBe(true);
});

test('düz metin: satır sonları <br>, bağlantılar tıklanabilir, özel karakterler kaçar', () => {
  expect(metniHtmleCevir('A & B\nhttps://gmplansis.com/evrak/x')).toBe('A &amp; B<br><a href="https://gmplansis.com/evrak/x">https://gmplansis.com/evrak/x</a>');
});

test('yapıştırılan/kayıtlı HTML izinli listeye göre süzülür', () => {
  const temiz = htmlTemizle('<p class="MsoNormal" style="color: red; position: fixed">Merhaba <o:p>Word</o:p></p>'
    + '<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">bağ</a><img src=x onerror=alert(1)>');
  expect(temiz).toBe('<p style="color: red">Merhaba Word</p><a>bağ</a>');
});

test('editöre hazırlık ve görünen metin', () => {
  expect(editoreHazirla('Satır 1\nSatır 2')).toBe('Satır 1<br>Satır 2');
  expect(htmlMetin('<p><br></p>').trim()).toBe('');
  expect(htmlMetin('Sayın&nbsp;<b>Yetkili</b>')).toBe('Sayın Yetkili');
});
