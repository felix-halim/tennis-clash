const fs = require('fs');
const https = require('https');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const GEARS_URLS = {
  'Character': [
    'https://tennis-clash.fandom.com/wiki/Jonah',
    'https://tennis-clash.fandom.com/wiki/Hope',
    'https://tennis-clash.fandom.com/wiki/Florence',
    'https://tennis-clash.fandom.com/wiki/Leo',
    'https://tennis-clash.fandom.com/wiki/Hyun-Jun',
    'https://tennis-clash.fandom.com/wiki/Kaito',
    'https://tennis-clash.fandom.com/wiki/Anton',
    'https://tennis-clash.fandom.com/wiki/Viktoria',
    'https://tennis-clash.fandom.com/wiki/Omar',
    'https://tennis-clash.fandom.com/wiki/Diana',
    'https://tennis-clash.fandom.com/wiki/Abeke',
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
  console.log(`Fetching data for ${url}`);
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
  const s = await get(url);
  const document = new JSDOM(s).window.document;
  const item = {
    url,
    name: document.querySelector("#firstHeading").textContent.trim(),
    foundIn: document.querySelector("[data-source='found_in'] .pi-data-value")?.textContent.trim(),
    rarity: document.querySelector("[data-source='rarity'] .pi-data-value")?.textContent.trim(),
    imageUrl: document.querySelector(".image")?.href.replace('static.', 'vignette.'),
    upgrade: {},
    skills: {}
  };

  const tables = [
    {
      tableId: "Upgrade_Table",
      rowSelector: "tr:nth-child(2)",
      itemProperty: "upgrade"
    },
    {
      tableId: "Upgrade_Table",
      rowSelector: "tr:nth-child(3)",
      itemProperty: "upgrade"
    },
    {
      tableId: "Skills_Table",
      rowSelector: "tr:nth-child(n+2)",
      itemProperty: "skills"
    }
  ];

  const read_row = (cells, skills = false) => {
    const rowData = [];
    cells.forEach((cell, i) => {
      cell = cell.textContent.trim();
      if (skills) cell = i ? +cell || 0 : cell;
      rowData.push(cell);
    });
    console.log(`${rowData[0]} data scraped`);
    return rowData;
  };

  tables.forEach((table) => {
    const { tableId, rowSelector, itemProperty } = table;
    const tableData = document.getElementById(tableId)?.parentElement.nextElementSibling;

    if (tableData) {
      const tableRows = tableData.querySelectorAll(rowSelector);
      tableRows.forEach((row) => {
        const rowData = read_row(row.querySelectorAll("td"), ["skills"].includes(itemProperty));
        item[itemProperty][rowData.shift()] = rowData;
      });
    }
  })

  // console.log(item)
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
  // console.log(JSON.stringify(GEARS, null, 2));
  fs.writeFile('./gears.ts', 'export const GEARS = ' + JSON.stringify(GEARS, null, 2) + ';', err => {
    if (err) {
      console.log('Error writing file', err)
    } else {
      console.log('Successfully wrote file')
    }
  })
})();
