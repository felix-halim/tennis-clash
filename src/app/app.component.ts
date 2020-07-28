import { Component, OnDestroy } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';

import { GEARS } from './gears';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription, BehaviorSubject } from 'rxjs';
import { debounceTime, map, shareReplay, tap } from 'rxjs/operators';

const CATEGORIES = Object.keys(GEARS);
const ATTRIBUTES = ['Agility', 'Stamina', 'Serve', 'Volley', 'Forehand', 'Backhand'];
const STARTERS = [
  ['Character', 'Jonah'],
  ['Racket', 'Starter Racket'],
  ['Grip', 'Starter Grip'],
  ['Shoe', 'Starter Shoes'],
  ['Wristband', 'Starter Band'],
  ['Nutrition', 'Starter Protein'],
  ['Workout', 'Starter Training'],
];
const MASK = 255;
const EXPONENTS = [1];
for (let i = 1; i < 6; i++) {
  EXPONENTS[i] = EXPONENTS[i - 1] * 256;
}

function getPower(value: number, attrIndex: number) {
  return (value / EXPONENTS[attrIndex]) & MASK;
}

interface LevelByItem {
  /** The current level of each item. */
  [itemName: string]: number;
}

interface ItemsByCategory {
  /** The available items for each category. */
  [category: string]: LevelByItem;
}

interface PowerConfig {
  /** Minimum power requirement. */
  minimum: number;

  /** Maximum power requirement. */
  maximum: number;
}

interface Config {
  /** The equipped item names of each category. */
  itemNames: string[];

  /** The power of each available item in a category. */
  itemPowers: { [itemName: string]: number }[];

  /** The level of each available item in a category. */
  itemLevel: { [itemName: string]: number }[];

  /** The maximum power for the rest of the categories on the right. */
  maxRemainingPowers: number[][];

  /** The maximum total power for the rest of the categories on the right. */
  maxRemainingTotalPower: number[];

  /** The power value at each attribute index. */
  powerConfig: PowerConfig[];

  /** Current total powers for each attribute. */
  currentPowers: number;

  /** Total power of all preferred only powers. */
  totalPower: number;

  /** The top N configs based on total powers. */
  topConfigs: Config[];

  /** For debugging number of configs found. */
  numConfig: number

  /** The start time of the trigger. */
  startTime: number;
}

function initialConfig(inventories: ItemsByCategory, configs: any) {
  localStorage.inventories = JSON.stringify(inventories);
  localStorage.configs = JSON.stringify(configs);
  localStorage[`configs${configs.levelCap}`] = JSON.stringify(configs);
  const config: Config = {
    itemNames: [],
    itemPowers: [],
    itemLevel: [],
    maxRemainingPowers: [],
    maxRemainingTotalPower: [],
    powerConfig: [],
    currentPowers: 0,
    totalPower: 0,
    topConfigs: [],
    numConfig: 0,
    startTime: Date.now()
  };
  for (const [i, attr] of ATTRIBUTES.entries()) {
    let minimum = +configs[attr];
    let maximum = 999;
    const v = configs[attr] + '';
    if (v.indexOf('-') !== -1) {
      const range = v.split('-');
      minimum = +range[0];
      maximum = +range[1];
    }
    config.powerConfig[i] = { minimum, maximum };
  }
  for (let c = CATEGORIES.length - 1; c >= 0; c--) {
    const cat = CATEGORIES[c];
    const maxAttr = [];
    const itemPowers = config.itemPowers[c] = {};
    const itemLevel = config.itemLevel[c] = {};
    for (const [name, inventoryLevel] of Object.entries<number>(inventories[cat] ?? {})) {
      const level = Math.min(inventoryLevel, configs.levelCap);
      const item = GEARS[cat].find(item => item.name === name);
      itemLevel[name] = level + 1;
      if (!item?.skills) {
        alert('Item not found: ' + name);
        continue;
      }
      let attrPowers = 0;
      for (const [attr, values] of Object.entries<number[]>(item.skills)) {
        const i = ATTRIBUTES.indexOf(attr);
        if (i === -1) {
          alert(`Attribute ${attr} not found for item ${name}`);
          continue;
        }
        attrPowers += values[level] * EXPONENTS[i];
        maxAttr[i] = Math.max(maxAttr[i] ?? 0, values[level]);
      }
      itemPowers[name] = attrPowers;
    }
    const rem = config.maxRemainingPowers[c] = [];
    for (const [i] of ATTRIBUTES.entries()) {
      const nextRem = config.maxRemainingPowers[c + 1]?.[i] ?? 0;
      rem[i] = nextRem + maxAttr[i];
    }
    config.maxRemainingTotalPower[c] =
      maxAttr.reduce((prev, cur) => prev + (cur ?? 0), 0) +
      (config.maxRemainingTotalPower[c + 1] ?? 0);
  }
  return config;
}

function isSubset(a: number, b: number) {
  while (a) {
    const x = a & MASK;
    const y = b & MASK;
    if (x > y) return false;
    a /= EXPONENTS[1];
    b /= EXPONENTS[1];
  }
  return true;
}

function saveTopConfig(config: Config) {
  if (!config.currentPowers) return config;
  config.numConfig++;

  const configs = config.topConfigs;
  configs.push({
    itemNames: [...config.itemNames],
    itemPowers: config.itemPowers,
    itemLevel: config.itemLevel,
    maxRemainingPowers: [],
    maxRemainingTotalPower: [],
    powerConfig: config.powerConfig,
    currentPowers: config.currentPowers,
    totalPower: config.totalPower,
    topConfigs: [],
    numConfig: 0,
    startTime: 0,
  });
  for (let i = configs.length - 2; i >= 0; i--) {
    if (configs[i].totalPower >= configs[i + 1].totalPower) break;
    const t = configs[i];
    configs[i] = configs[i + 1];
    configs[i + 1] = t;
  }
  if (configs.length > 50) {
    configs.pop();
  }
  return config;
}

function computeBestConfigs(config: Config) {
  const catIdx = config.itemNames.length;

  config.totalPower = 0;
  for (const [i] of ATTRIBUTES.entries()) {
    const { minimum, maximum } = config.powerConfig[i];
    const maxRemainer = (catIdx >= CATEGORIES.length) ? 0 : (config.maxRemainingPowers[catIdx][i] ?? 0);
    const current = getPower(config.currentPowers, i);
    if (current + maxRemainer < minimum) return config;
    if (current > maximum) return config;
    if (config.powerConfig[i].minimum == 0) continue;
    config.totalPower += getPower(config.currentPowers, i);
  }

  if (config.totalPower + config.maxRemainingTotalPower[catIdx] <
    config.topConfigs[config.topConfigs.length - 1]?.totalPower) return config;

  if (catIdx >= CATEGORIES.length) return saveTopConfig(config);

  config.itemNames.push('');
  for (const [itemName, attrPowers] of Object.entries<number>(config.itemPowers[catIdx])) {
    config.itemNames[catIdx] = itemName;
    config.currentPowers += attrPowers;
    computeBestConfigs(config);
    config.currentPowers -= attrPowers;
  }
  config.itemNames.pop();
  return config;
}

@Component({
  selector: 'app-root',
  animations: [
    trigger('toggleClick', [
      state('true', style({})),
      state('false', style({
        opacity: 1,
        backgroundColor: 'yellow'
      })),
      transition('true => false', animate('0.1s')),
      transition('false => true', animate('1.5s'))
    ])
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  CATEGORIES = CATEGORIES;
  ATTRIBUTES = ATTRIBUTES;
  getPower = getPower;
  gears = [];
  inventories: ItemsByCategory;
  formGroup: FormGroup;

  subscription: Subscription;

  computeTrigger$ = new BehaviorSubject<string>('');
  isOpen = true;

  bestConfigs$ = this.computeTrigger$.pipe(
    tap(() => { this.isOpen = false; }),
    debounceTime(125),
    map(() => initialConfig(this.inventories, this.formGroup.value)),
    map(config => {
      let top = computeBestConfigs(config).topConfigs;
      for (let i = 0; i < top.length; i++) {
        for (let j = 0; j < top.length; j++) {
          if (i != j && isSubset(top[i].currentPowers, top[j].currentPowers)) {
            top.splice(i--, 1);
            break;
          }
        }
      }
      top = top.slice(0, Math.min(25, top.length));
      this.selectedConfig = top[0];
      this.isOpen = true;
      const configToSave = {
        "inventories": JSON.parse(localStorage.inventories),
        "configs": JSON.parse(localStorage.configs),
      };
      for (let i = 0; i < 15; i++) {
        const key = `configs${i}`;
        const c = localStorage[key];
        if (c) configToSave[key] = JSON.parse(c);
      }
      this.configJson = JSON.stringify(configToSave, null, 2);
      console.log('Configs', config.numConfig, 'Runtime', Date.now() - config.startTime);
      return top;
    }),
    shareReplay(1));

  selectedConfig: Config | null = null;

  mode = 'graph';
  configJson = '';

  constructor() {
    this.inventories = JSON.parse(localStorage.inventories ?? '{}');
    for (const [category, itemName] of STARTERS) {
      if (this.inventories[category]?.[itemName] === undefined) {
        this.setInventory(category, itemName, 0);
      }
    }

    const configs = JSON.parse(localStorage.configs ?? '{}');
    const formConfigs = {};
    for (const attr of ATTRIBUTES)
      formConfigs[attr] = new FormControl(configs[attr] ?? 1);
    formConfigs['levelCap'] = new FormControl(configs['levelCap'] ?? 12);
    this.formGroup = new FormGroup(formConfigs);

    for (const category of CATEGORIES) {
      const items = [];
      const value = GEARS[category];
      if (category !== 'Character') {
        value.sort((a, b) => a.foundIn < b.foundIn ? -1 : 1);
      }
      for (const item of value) {
        const attrs = [];
        const total = [];
        for (const [attr, skills] of Object.entries<any>(item.skills)) {
          const i = ATTRIBUTES.indexOf(attr);
          if (i === -1) {
            alert('Unknown attribute: ' + attr);
            continue;
          }
          attrs.push({ attr, skills });
          for (let i = 0; i < skills.length; i++) {
            total[i] = (total[i] ?? 0) + skills[i];
          }
        }
        items.push({ ...item, attrs, total });
      }
      this.gears.push({ category, items });
    }

    this.subscription = this.formGroup.valueChanges
      .subscribe(() => this.computeTrigger$.next(''));
    this.computeTrigger$.next('');
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  get levelCap(): any {
    return this.formGroup.get('levelCap').value;
  }

  toggleMode() {
    this.mode = this.mode === 'JSON' ? 'graph' : 'JSON';
  }

  updateJson(val) {
    try {
      const json = JSON.parse(val);
      this.inventories = json.inventories;
      this.formGroup.setValue(json.configs);
      for (let i = 0; i < 15; i++) {
        const key = `configs${i}`;
        const c = json[key];
        if (c) localStorage[key] = JSON.stringify(c);
      }
      this.computeTrigger$.next('');
      console.log('Changed configs', json);
    } catch (e) {
      alert(e);
      console.error(e);
    }
  }

  setInventory(category: string, name: string, level: number) {
    let cat = this.inventories[category];
    if (!cat) cat = this.inventories[category] = {};
    if (cat[name] === level) {
      delete cat[name];
    } else {
      cat[name] = level;
    }
    this.computeTrigger$.next('');
  }

  hasAtLeastOneInventory() {
    for (const cat of Object.values(this.inventories))
      if (Object.keys(cat).length > 0) return true;
    return false;
  }

  hasInventory(category: string, name: string, level: number) {
    return this.inventories?.[category]?.[name] === level;
  }

  stats(powers: any) {
    const arr = [];
    for (const [i, attr] of ATTRIBUTES.entries()) {
      const power = getPower(powers, i);
      if (power) {
        arr.push(`${attr.substr(0, 2)}:${power}`);
      }
    }
    return arr;
  }

  isRangeValue(attr: string) {
    const strValue = this.formGroup.get(attr).value + '';
    return strValue.indexOf('-') !== -1;
  }

  isInvalidValue(attr: string) {
    const re = /^\d{1,3}(-\d{0,3})?$/;
    return !re.exec(this.formGroup.get(attr).value);
  }

  toggleFormat(attr: string) {
    const strValue = this.formGroup.get(attr).value + '';
    const newValue = this.isRangeValue(attr) ? +strValue.split('-')[0] : (strValue + '-999');
    this.formGroup.get(attr).setValue(newValue);
  }

  changeLevelCap(levelCap) {
    const configsJson = localStorage[`configs${levelCap}`];
    if (configsJson) {
      this.formGroup.setValue(JSON.parse(configsJson));
    }
    this.formGroup.get('levelCap').setValue(levelCap);
  }

  isIgnored(attr: string) {
    const value = '' + this.formGroup.get(attr).value;
    return value.startsWith('0');
  }

  formatUpgrade(s: string, removeK = false) {
    s = s.toLowerCase();
    if (!s) return '?';
    if (s === '/' || s === 'starter') return '/';
    if (removeK && s[s.length - 1] === 'k') s = s.substring(0, s.length - 1);
    else if (s.length > 3) s = s.substring(0, s.length - 3);
    if (s.length > 3) {
      const i = s.indexOf('.');
      s = i === -1 ? s : s.substring(0, i);
    }
    return s;
  }

  sumPowers(a: number) {
    let sum = 0;
    while (a) {
      sum += a & MASK;
      a /= EXPONENTS[1];
    }
    return sum;
  }
}
