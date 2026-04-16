const { IngestModule } = require('../types');

/**
 * Ingest mapper hedef alan listeleri (flat DTO).
 * Not: Nested alanlar (ör. Tesvik.yatirimBilgileri.*) burada düz alanlar gibi tutulur;
 * ingestor normalize aşamasında nested yapıya taşır.
 */
const TARGET_FIELDS = {
  [IngestModule.FIRMA]: [
    'vergiNoTC',
    'tamUnvan',
    'adres',
    'firmaIl',
    'firmaIlce',
    'kepAdresi',
    'ilkIrtibatKisi',
    'etuysYetkiBitisTarihi',
    'dysYetkiBitisTarihi',
  ],
  [IngestModule.DOSYA_TAKIP]: ['takipId', 'firmaId', 'vergiNoTC', 'firmaUnvan', 'talepTuru', 'durum', 'anaAsama', 'ytbNo', 'belgeId'],
  [IngestModule.TESVIK]: [
    'tesvikId',
    'gmId',
    'firmaId',
    'vergiNoTC',
    'yatirimciUnvan',
    'yatirimKonusu',
    'destekSinifi',
    'yerinIl',
    'yerinIlce',
    'belgeId',
    'belgeNo',
    'belgeTarihi',
  ],
  [IngestModule.YENI_TESVIK]: [
    'tesvikId',
    'gmId',
    'firmaId',
    'vergiNoTC',
    'yatirimciUnvan',
    'yatirimKonusu',
    'destekSinifi',
    'yerinIl',
    'yerinIlce',
    'belgeId',
    'belgeNo',
    'belgeTarihi',
    // Bonus sinyali (phase-2: mapping önerisi için)
    'bonusOrani',
    'bonusTutari',
  ],
};

module.exports = { TARGET_FIELDS };

