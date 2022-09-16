const { assert } = require('console');
const https = require('https');

const GEARS_URLS = {
  'Character': [
    'https://tennis-clash.fandom.com/wiki/Jonah',
    'https://tennis-clash.fandom.com/wiki/Hope',
    'https://tennis-clash.fandom.com/wiki/Florence',
    'https://tennis-clash.fandom.com/wiki/Leo',
    'https://tennis-clash.fandom.com/wiki/Kaito',
    'https://tennis-clash.fandom.com/wiki/Viktoria',
    'https://tennis-clash.fandom.com/wiki/Diana',
    'https://tennis-clash.fandom.com/wiki/Mei-Li',
    'https://tennis-clash.fandom.com/wiki/Luc',
    'https://tennis-clash.fandom.com/wiki/Abeke',
    'https://tennis-clash.fandom.com/wiki/Omar',
  ],
  'Racket': [
    'https://tennis-clash.fandom.com/wiki/Starter_Racket',
    'https://tennis-clash.fandom.com/wiki/The_Bullseye',
    'https://tennis-clash.fandom.com/wiki/The_Eagle',
    'https://tennis-clash.fandom.com/wiki/The_Hammer',
    'https://tennis-clash.fandom.com/wiki/The_Outback',
    'https://tennis-clash.fandom.com/wiki/The_Panther',
    'https://tennis-clash.fandom.com/wiki/The_Patriot',
    'https://tennis-clash.fandom.com/wiki/The_Samurai',
    'https://tennis-clash.fandom.com/wiki/Zeus',
  ],
  'Grip': [
    'https://tennis-clash.fandom.com/wiki/Starter_Grip',
    'https://tennis-clash.fandom.com/wiki/Tactical_Grip',
    'https://tennis-clash.fandom.com/wiki/The_Cobra',
    'https://tennis-clash.fandom.com/wiki/The_Forge',
    'https://tennis-clash.fandom.com/wiki/The_Katana',
    'https://tennis-clash.fandom.com/wiki/The_Machete',
    'https://tennis-clash.fandom.com/wiki/The_Talon',
    'https://tennis-clash.fandom.com/wiki/The_Titan',
    'https://tennis-clash.fandom.com/wiki/The_Warrior',
  ],
  'Shoe': [
    'https://tennis-clash.fandom.com/wiki/Starter_Shoes',
    'https://tennis-clash.fandom.com/wiki/The_Anvil',
    'https://tennis-clash.fandom.com/wiki/The_Ballistic',
    'https://tennis-clash.fandom.com/wiki/The_Feather',
    'https://tennis-clash.fandom.com/wiki/The_Hades_Treads',
    'https://tennis-clash.fandom.com/wiki/The_Hunter',
    'https://tennis-clash.fandom.com/wiki/The_Piranha',
    'https://tennis-clash.fandom.com/wiki/The_Raptor',
    'https://tennis-clash.fandom.com/wiki/The_Shuriken',
  ],
  'Wristband': [
    'https://tennis-clash.fandom.com/wiki/Starter_Band',
    'https://tennis-clash.fandom.com/wiki/Jolly_Roger',
    'https://tennis-clash.fandom.com/wiki/The_Gladiator',
    'https://tennis-clash.fandom.com/wiki/The_Kodiak',
    'https://tennis-clash.fandom.com/wiki/The_Koi',
    'https://tennis-clash.fandom.com/wiki/The_Macaw',
    'https://tennis-clash.fandom.com/wiki/The_Rocket',
    'https://tennis-clash.fandom.com/wiki/The_Shield',
    'https://tennis-clash.fandom.com/wiki/The_Tomahawk',
  ],
  'Nutrition': [
    'https://tennis-clash.fandom.com/wiki/Starter_Protein',
    'https://tennis-clash.fandom.com/wiki/Antioxidants',
    'https://tennis-clash.fandom.com/wiki/Carboload',
    'https://tennis-clash.fandom.com/wiki/Increased_Hydration',
    'https://tennis-clash.fandom.com/wiki/Keto_Sourcing',
    'https://tennis-clash.fandom.com/wiki/Lean_Protein',
    'https://tennis-clash.fandom.com/wiki/Macrobiotic',
    'https://tennis-clash.fandom.com/wiki/Natural_Energy',
    'https://tennis-clash.fandom.com/wiki/Vegan_Diet',
  ],
  'Workout': [
    'https://tennis-clash.fandom.com/wiki/Starter_Training',
    'https://tennis-clash.fandom.com/wiki/Endurance',
    'https://tennis-clash.fandom.com/wiki/Lunges',
    'https://tennis-clash.fandom.com/wiki/Mountain_Climber',
    'https://tennis-clash.fandom.com/wiki/Plyometrics',
    'https://tennis-clash.fandom.com/wiki/Powerlifting',
    'https://tennis-clash.fandom.com/wiki/Resistance_Band',
    'https://tennis-clash.fandom.com/wiki/Sprint',
    'https://tennis-clash.fandom.com/wiki/Weight_lifting',
  ],
};

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          resolve(data);
        } catch (e) {
          reject(e.message);
        }
      });
    }).on("error", (err) => {
      reject(err.message);
    });
  });
}

async function get_and_parse(url) {
  const item = {
    url,
    name: '',
    foundIn: '',
    rarity: '',
    imageUrl: '',
    upgrade: {},
    skills: {}
  };
  const s = await get(url);

  let meta = 'class="page-header__title" id="firstHeading">';
  let i = s.indexOf(meta) + meta.length;
  let j = s.indexOf('</h1>', i);
  item.name = s.substring(i, j).trim();

  meta = '>Found in</h3>';
  i = s.indexOf(meta);
  if (i !== -1) {
    meta = '<div class="pi-data-value pi-font">';
    i = s.indexOf(meta, i) + meta.length;
    j = s.indexOf('</div>', i);
    item.foundIn = s.substring(i, j);
  }

  meta = '>Rarity</h3>';
  i = s.indexOf(meta);
  if (i !== -1) {
    meta = '<div class="pi-data-value pi-font">';
    i = s.indexOf(meta, i) + meta.length;
    j = s.indexOf('</div>', i);
    item.rarity = s.substring(i, j);
  }

  meta = 'href="https://static.wikia.nocookie.net/tennis-clash/images';
  i = s.indexOf(meta) + 6;
  j = s.indexOf('"', i);
  item.imageUrl = s.substring(i, j).replace('static.', 'vignette.');

  const read_row = (startIdx, endIdx, prefix) => {
    const cols = [];
    while (true) {
      const idx = s.indexOf(prefix, startIdx);
      if (idx == -1 || idx >= endIdx) return cols;
      let end = s.indexOf('\n', idx);
      const endBr = s.indexOf('<br', idx);
      if (endBr != -1) end = Math.min(end, endBr);
      cols.push(s.substring(idx + prefix.length, end));
      startIdx = idx + 1;
    }
  };

  // Upgrade costs
  const startUpgrade = s.indexOf('id="Upgrade_');
  if (startUpgrade != -1) {
    const endUpgrade = s.indexOf('</th></tr>', startUpgrade);
    const levels = read_row(startUpgrade, endUpgrade, '<th>');
    for (let l = 1; l < levels.length; l++)
      if (+levels[l] != l) console.error('Level', l, url);

    const endCards = s.indexOf('</td></tr>', endUpgrade);
    const cards = read_row(endUpgrade, endCards, '<td>');
    if (cards[0] != 'Cards') console.error('Cards', cards[0], url);
    item.upgrade[cards.shift()] = cards;

    const endPrice = s.indexOf('</table>', endCards);
    const price = read_row(endCards, endPrice, '<td>');
    if (price[0] != 'Price') console.error('Price', price[0], url);
    item.upgrade[price.shift()] = price;
  }

  // Skills
  const startSkill = s.indexOf('id="Skills_');
  const endSkill = s.indexOf('</table>', startSkill);
  const skillLevels = read_row(startSkill, endSkill, '<th>');
  for (let l = 1; l < skillLevels.length; l++)
    if (+skillLevels[l] != l) console.error('Skills', +skillLevels[l], l, url);

  for (let i = startSkill; ;) {
    const endAttr = s.indexOf('</td></tr>', i);
    if (endAttr == -1 || endAttr >= endSkill) break;
    const attr = read_row(i, endAttr, '<td>');
    item.skills[attr.shift()] = attr;
    for (let j = 0; j < attr.length; j++)
      attr[j] = +attr[j] || 0;
    i = endAttr + 1;
  }
  return item;
}

(async () => {
  // const url = 'https://tennis-clash.fandom.com/wiki/The_Kodiak';
  // return console.log(JSON.stringify(await get_and_parse(url), null, 2));
  const GEARS = {};
  for (const [category, urls] of Object.entries(GEARS_URLS)) {
    const items = GEARS[category] = [];
    for (const url of urls) {
      for (let nTry = 0; ; nTry++) {
        try {
          items.push(await get_and_parse(url));
          break;
        } catch (e) {
          if (nTry > 5) throw e;
          console.warn('Retry', nTry, url);
        }
      }
    }
  }
  console.log('export const GEARS = ' + JSON.stringify(GEARS, null, 2) + ';');
})();
