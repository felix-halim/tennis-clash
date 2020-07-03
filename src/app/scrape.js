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
    'https://tennis-clash.fandom.com/wiki/Neutral_Energy',
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

  let meta = '<h1 class="page-header__title">';
  let i = s.indexOf(meta) + meta.length;
  let j = s.indexOf('</h1>', i);
  item.name = s.substring(i, j);

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

  meta = '<meta property="og:image" content="';
  i = s.indexOf(meta) + meta.length;
  j = s.indexOf('" />', i);
  item.imageUrl = s.substring(i, j);

  // Upgrade costs
  const startUpgrade = s.indexOf('<table class="article-table">');
  const endUpgrade = s.indexOf('</table>', i);
  let levelStartI = s.indexOf('</th><th>', startUpgrade) + 9;
  let levelStart = +s.substring(levelStartI, s.indexOf('\n', levelStartI));
  for (i = startUpgrade; i !== -1 && !item.name.startsWith('Starter'); ) {
    i = s.indexOf('<td>', i) + 4;
    if (i === 3 || i >= endUpgrade) break;
    j = s.indexOf('\n', i);
    let attr = s.substring(i, j);
    const end = s.indexOf('</td></tr>', j);
    const upgrade = [];
    for (let level = 1; ; level++) {
      if (level < levelStart) { upgrade.push(""); continue; }
      const k = s.indexOf('</td><td>', i);
      if (k === -1 || k >= end) break;
      i = k + 9;
      j = s.indexOf('\n', i);
      const value = s.substring(i, j);
      upgrade.push(value);
    }
    item.upgrade[attr] = upgrade;
  }

  // Skills
  const startSkill = startUpgrade + (item.name.startsWith('Starter') ? 0 : 1);
  i = s.indexOf('<table class="article-table">', startSkill);
  levelStartI = s.indexOf('</th><th>', startUpgrade) + 9;
  levelStart = +s.substring(levelStartI, s.indexOf('\n', levelStartI));
  while (i !== -1) {
    i = s.indexOf('<td>', i) + 4;
    if (i === 3) break;
    j = s.indexOf('\n', i);
    let attr = s.substring(i, j);
    const end = s.indexOf('</td></tr>', j);
    const skills = [];
    for (let level = 1; ; level++) {
      if (level < levelStart) { skills.push(0); continue; }
      const k = s.indexOf('</td><td>', i);
      if (k === -1 || k >= end) break;
      i = k + 9;
      j = s.indexOf('\n', i);
      const value = s.substring(i, j);
      skills.push(+value);
      // console.log(level, value, i, end);
    }
    item.skills[attr] = skills;
    // console.log(i, end);
  }
  return item;
}

(async () => {
  // const url = 'https://tennis-clash.fandom.com/wiki/Starter_Band';
  // return console.log(JSON.stringify(await get_and_parse(url), null, 2));
  const GEARS = {};
  for (const [category, urls] of Object.entries(GEARS_URLS)) {
    const items = GEARS[category] = [];
    for (const url of urls) {
      items.push(await get_and_parse(url));
    }
  }
  console.log('export const GEARS = ' + JSON.stringify(GEARS, null, 2) + ';');
})();
