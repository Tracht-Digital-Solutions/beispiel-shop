import type { Category, Localized, Product } from './types';
const l = (de: string, en: string): Localized => ({ de, en });
const colors = {
  chalk: { name: l('Kreide', 'Chalk'), hex: '#e8e4d8' },
  washed: { name: l('Washed Black', 'Washed black'), hex: '#424341' },
  grey: { name: l('Betongrau', 'Concrete grey'), hex: '#8b8d89' },
  white: { name: l('Weiß', 'White'), hex: '#f2f0e9' },
  charcoal: { name: l('Anthrazit', 'Charcoal'), hex: '#30312e' },
  orange: { name: l('Signalorange', 'Signal orange'), hex: '#d55b27' },
  stone: { name: l('Stein', 'Stone'), hex: '#b4ae9e' },
  black: { name: l('Schwarz', 'Black'), hex: '#1d1e1c' },
};
type Seed = [string, string, Category, number, keyof typeof colors, number, Localized, Localized];
const seeds: Seed[] = [
  [
    'heavy-tee',
    'Heavyweight Tee',
    'tees',
    4900,
    'chalk',
    1,
    l(
      'Schwerer Jersey. Entspannte Silhouette. Das Essential für jeden Tag, mit überschnittener Schulter und einem gerippten Kragen.',
      'Heavy jersey. Relaxed silhouette. An everyday essential with dropped shoulders and a ribbed neckline.',
    ),
    l('100 % Baumwolle · 280 g/m²', '100% cotton · 280 gsm'),
  ],
  [
    'faded-tee',
    'Faded Studio Tee',
    'tees',
    4500,
    'washed',
    2,
    l(
      'Ein verwaschener Look, der bleibt. Locker geschnittenes Shirt mit weichem Griff und bewusst reduzierten Details.',
      'A washed-in look that stays. A loose-cut tee with a soft feel and deliberately pared-back details.',
    ),
    l('100 % Baumwolle · 240 g/m²', '100% cotton · 240 gsm'),
  ],
  [
    'studio-tee',
    'Concrete Studio Tee',
    'tees',
    4500,
    'grey',
    3,
    l(
      'Klare Linien in Betongrau. Der gerade Schnitt und die breite Halsblende bringen Ruhe in jedes Outfit.',
      'Clean lines in concrete grey. A straight cut and substantial neck rib bring balance to any outfit.',
    ),
    l('100 % Baumwolle · 260 g/m²', '100% cotton · 260 gsm'),
  ],
  [
    'line-tee',
    'Signal Line Tee',
    'tees',
    5200,
    'white',
    4,
    l(
      'Ein orangefarbener Streifen als klares Statement. Schweres weißes Shirt mit geradem Saum und weitem Ärmel.',
      'One orange stripe makes a clear statement. A heavyweight white tee with a straight hem and wide sleeves.',
    ),
    l('100 % Baumwolle · 280 g/m²', '100% cotton · 280 gsm'),
  ],
  [
    'concrete-hoodie',
    'Concrete Hoodie',
    'hoodies',
    9900,
    'charcoal',
    1,
    l(
      'Volumen trifft Struktur. Schwerer Hoodie mit doppellagiger Kapuze, Kängurutasche und einer entspannten, kastigen Passform.',
      'Volume meets structure. A heavyweight hoodie with a double-layer hood, kangaroo pocket and relaxed boxy fit.',
    ),
    l('100 % Baumwolle · 450 g/m²', '100% cotton · 450 gsm'),
  ],
  [
    'signal-hoodie',
    'Signal Hoodie',
    'hoodies',
    10900,
    'orange',
    2,
    l(
      'Farbe für graue Straßen. Der weiche, schwere Hoodie verbindet ein warmes Orange mit einer großzügigen Silhouette.',
      'Colour for grey streets. This soft, heavyweight hoodie pairs warm orange with a generous silhouette.',
    ),
    l('100 % Baumwolle · 450 g/m²', '100% cotton · 450 gsm'),
  ],
  [
    'zip-hoodie',
    'Studio Zip Hoodie',
    'hoodies',
    11900,
    'grey',
    3,
    l(
      'Eine Schicht für jeden Rhythmus. Durchgehender Reißverschluss, geteilte Fronttasche und ein schwerer, weicher Griff.',
      'A layer for every rhythm. Full-length zip, split front pocket and a substantial, soft feel.',
    ),
    l('100 % Baumwolle · 420 g/m²', '100% cotton · 420 gsm'),
  ],
  [
    'raw-sweat',
    'Raw Crewneck',
    'hoodies',
    8900,
    'chalk',
    4,
    l(
      'Weniger Details, mehr Charakter. Cremefarbenes Sweatshirt mit Rundhals, stabilen Rippbündchen und weicher Innenseite.',
      'Fewer details, more character. A cream crewneck with substantial rib trims and a soft interior.',
    ),
    l('100 % Baumwolle · 400 g/m²', '100% cotton · 400 gsm'),
  ],
  [
    'cargo-pant',
    'Utility Cargo',
    'pants',
    12900,
    'black',
    1,
    l(
      'Gemacht für Bewegung. Weite Cargohose mit aufgesetzten Taschen, robustem Twill und verstellbaren Beinabschlüssen.',
      'Made for movement. Wide cargo pants with patch pockets, robust twill and adjustable hems.',
    ),
    l('100 % Baumwolltwill · 320 g/m²', '100% cotton twill · 320 gsm'),
  ],
  [
    'wide-denim',
    'Faded Wide Denim',
    'pants',
    13900,
    'washed',
    2,
    l(
      'Denim mit Haltung. Weites, gerades Bein, klassische fünf Taschen und eine dezente schwarze Waschung.',
      'Denim with attitude. A wide straight leg, classic five-pocket construction and a subtle black wash.',
    ),
    l('100 % Baumwolle · 13 oz Denim', '100% cotton · 13 oz denim'),
  ],
  [
    'carpenter-pant',
    'Stone Carpenter',
    'pants',
    11900,
    'stone',
    3,
    l(
      'Workwear neu gedacht. Gerades Bein, Werkzeugtasche und doppelte Nähte in einem ruhigen Steinton.',
      'Workwear reimagined. A straight leg, tool pocket and double stitching in a quiet stone shade.',
    ),
    l('100 % Baumwollcanvas · 340 g/m²', '100% cotton canvas · 340 gsm'),
  ],
  [
    'track-pant',
    'Everyday Track Pant',
    'pants',
    8900,
    'charcoal',
    4,
    l(
      'Vom ersten Kaffee bis zum letzten Zug. Lockere Hose mit elastischem Bund, Kordelzug und seitlichen Taschen.',
      'From first coffee to last train. Relaxed pants with an elastic waist, drawstring and side pockets.',
    ),
    l('80 % Baumwolle, 20 % Polyester · 300 g/m²', '80% cotton, 20% polyester · 300 gsm'),
  ],
  [
    'utility-cap',
    'Utility Cap',
    'accessories',
    3500,
    'black',
    1,
    l(
      'Sechs Panels. Eine klare Form. Schwarze Cap mit gebogenem Schirm und verstellbarem Verschluss.',
      'Six panels. One clean shape. A black cap with a curved peak and adjustable back strap.',
    ),
    l('100 % Baumwolltwill', '100% cotton twill'),
  ],
  [
    'crossbody-bag',
    'Transit Crossbody',
    'accessories',
    5900,
    'black',
    2,
    l(
      'Alles dabei, Hände frei. Kompakte Umhängetasche mit zwei Reißverschlussfächern und verstellbarem Gurt.',
      'Essentials close. Hands free. A compact crossbody with two zipped compartments and an adjustable strap.',
    ),
    l('100 % Nylon · 24 × 16 × 7 cm', '100% nylon · 24 × 16 × 7 cm'),
  ],
  [
    'rib-beanie',
    'Signal Rib Beanie',
    'accessories',
    2900,
    'orange',
    3,
    l(
      'Ein kleiner Akzent mit großer Wirkung. Weiche Rippstrickmütze mit breitem Umschlag in Signalorange.',
      'A small accent with a big impact. A soft rib-knit beanie with a wide turn-up in signal orange.',
    ),
    l('100 % Baumwolle · Rippstrick', '100% cotton · rib knit'),
  ],
  [
    'crew-socks',
    'Essential Crew Socks',
    'accessories',
    1900,
    'chalk',
    4,
    l(
      'Die Grundlage für jeden Look. Cremefarbene Crew-Socken mit Rippstruktur, gepolsterter Sohle und verstärkter Ferse.',
      'The foundation of every look. Cream crew socks with ribbing, cushioned soles and reinforced heels.',
    ),
    l('80 % Baumwolle, 18 % Polyamid, 2 % Elasthan', '80% cotton, 18% polyamide, 2% elastane'),
  ],
];
export const products: Product[] = seeds.map(
  ([slug, name, category, price, color, look, description, material], i) => {
    const sizes =
      category === 'accessories'
        ? slug === 'crew-socks'
          ? ['36–40', '41–46']
          : ['One size']
        : ['XS', 'S', 'M', 'L', 'XL'];
    return {
      id: `b01-${String(i + 1).padStart(2, '0')}`,
      slug,
      name,
      category,
      price,
      description,
      material,
      look,
      care:
        category === 'accessories' && slug !== 'crew-socks'
          ? l('Schonende Handwäsche. An der Luft trocknen.', 'Gentle hand wash. Air dry.')
          : l(
              'Bei 30 °C auf links waschen. Nicht im Trockner trocknen. Mit ähnlichen Farben waschen.',
              'Wash inside out at 30°C. Do not tumble dry. Wash with similar colours.',
            ),
      fit:
        category === 'accessories'
          ? l(
              'Flexible Passform. Details siehe Größenhilfe.',
              'Flexible fit. See size guide for details.',
            )
          : l(
              'Unisex · Relaxed Fit. Für einen körpernäheren Sitz eine Größe kleiner wählen.',
              'Unisex · Relaxed fit. Choose one size down for a closer fit.',
            ),
      image: `/images/${slug}.webp`,
      lifestyle: `/images/look-${look}.webp`,
      imageAlt: l(
        `${name} in ${colors[color].name.de} – Produktansicht`,
        `${name} in ${colors[color].name.en} – product view`,
      ),
      badge: i % 4 === 0 ? 'new' : i % 3 === 0 ? 'essential' : undefined,
      variants: sizes.map((size, j) => ({
        id: `${slug}-${color}-${size.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        color,
        colorHex: colors[color].hex,
        colorName: colors[color].name,
        size,
        stock: i === 0 && j === 0 ? 0 : i === 4 && j === 4 ? 0 : 8 + j,
      })),
    };
  },
);
export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getVariant = (id: string) => {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === id);
    if (variant) return { product, variant };
  }
};
