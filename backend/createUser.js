const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  const email = 'yigit.yildirim@gmplanlama.com';
  
  let user = await User.findOne({ email });
  if (user) {
    console.log('Kullanıcı zaten mevcut:', email);
    process.exit(0);
  }

  user = new User({
    adSoyad: 'Yiğit Yıldırım',
    email: email,
    sifre: 'GmPlanlama123!',
    rol: 'admin',
    yetkiler: {
      firmaEkle: true,
      firmaDuzenle: true,
      firmaSil: true,
      belgeEkle: true,
      belgeDuzenle: true,
      belgeSil: true,
      raporGoruntule: true,
      yonetimPaneli: true
    }
  });

  await user.save();
  console.log('Kullanıcı başarıyla oluşturuldu:', email, 'Şifre: GmPlanlama123!');
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
