import skillModifiers from '../../../swn_sector/CURRENT_DOCS/swn_edited_down/skill_modifiers.json';
import cleanedUp from '../../../swn_sector/CURRENT_DOCS/swn_edited_down/cleanedup.txt?raw';
import './swn.css';

type ClassName = 'Expert' | 'Warrior' | 'Psychic';
type PackageName = 'Thief' | 'Medic' | 'Technician' | 'Soldier' | 'Blade' | 'Hacker';
type Premade = {
  title: string;
  role: ClassName;
  profession: string;
  package: PackageName;
  stats: number[];
  skills: string[];
  foci: string[];
  disciplines?: string[];
};
const premades: Premade[] = [
  { title: 'Thief', role: 'Expert', profession: 'Official', package: 'Thief', stats: [10, 14, 12, 11, 9, 7], skills: ['Shoot', 'Sneak', 'Connect', 'Administer', 'Talk', 'Connect'], foci: ['Specialist: Sneak', 'Specialist: Connect'] },
  { title: 'Scientist', role: 'Expert', profession: 'Soldier', package: 'Medic', stats: [10, 12, 11, 14, 7, 9], skills: ['Shoot', 'Heal', 'Know', 'Shoot', 'Exert', 'Survive'], foci: ['Specialist: Heal', 'Specialist: Know'] },
  { title: 'Hacker', role: 'Expert', profession: 'Criminal', package: 'Technician', stats: [10, 12, 11, 14, 7, 9], skills: ['Shoot', 'Fix', 'Program', 'Connect', 'Sneak', 'Talk'], foci: ['Specialist: Fix', 'Specialist: Program'] },
  { title: 'Captain', role: 'Expert', profession: 'Noble', package: 'Blade', stats: [10, 14, 12, 11, 9, 7], skills: ['Shoot', 'Pilot', 'Talk', 'Stab', 'Connect', 'Administer'], foci: ['Specialist: Pilot', 'Specialist: Talk'] },
  { title: 'Gunman', role: 'Warrior', profession: 'Vagabond', package: 'Soldier', stats: [9, 14, 12, 10, 10, 11], skills: ['Stab', 'Shoot', 'Sneak', 'Know', 'Sneak', 'Survive'], foci: ['Close Combatant', 'Assassin'] },
  { title: 'Swordsman', role: 'Warrior', profession: 'Barbarian', package: 'Blade', stats: [14, 9, 12, 7, 10, 11], skills: ['Shoot', 'Stab', 'Survive', 'Sneak', 'Stab'], foci: ['Shocking Assault', 'Die Hard'] },
  { title: 'Psychic: Nightingale', role: 'Psychic', profession: 'Physician', package: 'Medic', stats: [9, 11, 12, 10, 14, 7], skills: ['Shoot', 'Exert', 'Heal', 'Know', 'Administer'], foci: ['Specialist: Exert'], disciplines: ['Biopsionics', 'Telepathy'] },
  { title: 'Psychic: Seer', role: 'Psychic', profession: 'Scholar', package: 'Hacker', stats: [12, 10, 14, 9, 11, 7], skills: ['Shoot', 'Trade', 'Know', 'Administer', 'Program'], foci: ['Specialist: Trade'], disciplines: ['Precognition', 'Telekinesis'] },
  { title: 'Psychic: Magician', role: 'Psychic', profession: 'Technician', package: 'Technician', stats: [12, 10, 14, 9, 11, 7], skills: ['Shoot', 'Perform', 'Fix', 'Trade', 'Exert'], foci: ['Specialist: Perform'], disciplines: ['Metapsionics', 'Teleportation'] },
];
const sourceLines = cleanedUp.split(/\r?\n/).map(line => line.trim());
const sourceLine = (prefix: string) => {
  const line = sourceLines.find(line => line.startsWith(prefix));
  if (!line) throw new Error(`Missing cleanedup.txt line: ${prefix}`);
  return line;
};
const afterLine = (prefix: string) => {
  const index = sourceLines.findIndex(line => line.startsWith(prefix));
  if (index < 0 || !sourceLines[index + 1]) throw new Error(`Missing cleanedup.txt description: ${prefix}`);
  return sourceLines[index + 1];
};
const classRules: Record<ClassName, string> = {
  Expert: sourceLine('Expert: ').slice('Expert: '.length),
  Warrior: sourceLine('Warrior: ').slice('Warrior: '.length),
  Psychic: sourceLine('Psychic: ').slice('Psychic: '.length),
};
const focusRules: Record<string, string> = Object.fromEntries(
  ['Specialist', 'Close Combatant', 'Assassin', 'Die Hard', 'Shocking Assault'].map(name => [name, sourceLine(`${name}: `).slice(name.length + 2)]),
);
const psychicRules: Record<string, { technique: string; description: string }> = Object.fromEntries(
  ['Biopsionics', 'Metapsionics', 'Precognition', 'Telekinesis', 'Telepathy', 'Teleportation'].map(name => [name, {
    technique: sourceLine(`${name}: `).slice(name.length + 2),
    description: afterLine(`${name}: `),
  }]),
);
const streetIllegal = sourceLine('Street Illegal: ').slice('Street Illegal: '.length);
const hiddenArmor = sourceLine('Hidden Armor: ').slice('Hidden Armor: '.length);
const shockExplanation = sourceLine('Shock: ').slice('Shock: '.length);
const effortExplanation = sourceLine('Effort: ').slice('Effort: '.length);
type Armor = { name: string; ac: number; hidden?: boolean; illegal?: boolean };
type Weapon = { name: string; die: string; shock?: string; range?: string; magazine?: string; energy?: boolean; illegal?: boolean };
const armors: Record<string, Armor> = {
  undersuit: { name: 'Armored undersuit', ac: 13, hidden: true },
  clothing: { name: 'Secure clothing', ac: 13, hidden: true },
  woven: { name: 'Woven body armor', ac: 15, illegal: true },
};
const weapons: Record<string, Weapon> = {
  laser: { name: 'Laser pistol', die: '1d6', range: '100 / 300 m', magazine: '10', energy: true },
  rifle: { name: 'Combat rifle', die: '1d12', range: '100 / 300 m', magazine: '30', illegal: true },
  knife: { name: 'Knife', die: '1d4', shock: '1/AC 15', range: '10 m thrown' },
  monoKnife: { name: 'Monoblade knife', die: '1d6', shock: '1/AC 15', range: '10 m thrown' },
  thermal: { name: 'Thermal knife', die: '1d6', shock: '1/AC 15', range: '10 m thrown' },
  sword: { name: 'Monoblade sword', die: '1d8+1', shock: '2/AC 13', illegal: true },
};
const gear: Record<PackageName, { armor: Armor[]; weapons: Weapon[]; items: string[] }> = {
  Thief: { armor: [armors.undersuit], weapons: [weapons.laser, weapons.monoKnife], items: ['Climbing harness', 'Low-light goggles', '2 type A cells', 'Backpack', 'Compad', 'Metatool', '25 credits'] },
  Medic: { armor: [armors.clothing], weapons: [weapons.laser], items: ['4 Lazarus patches', '2 doses of Lift', 'Backpack', 'Medkit', 'Compad', 'Bioscanner', '25 credits'] },
  Technician: { armor: [armors.undersuit], weapons: [weapons.laser, weapons.monoKnife], items: ['Postech toolkit', '6 units of spare parts', '4 type A cells', 'Backpack', 'Dataslab', 'Metatool', '50 credits'] },
  Soldier: { armor: [armors.woven, armors.undersuit], weapons: [weapons.rifle, weapons.laser, weapons.knife], items: ['80 rifle rounds', '2 type A cells', 'Backpack', 'Compad', '5 credits'] },
  Blade: { armor: [armors.woven, armors.clothing], weapons: [weapons.sword, weapons.thermal], items: ['Backpack', 'Compad', 'Lazarus patch', '50 credits'] },
  Hacker: { armor: [armors.clothing], weapons: [weapons.laser], items: ['Postech toolkit', '3 units of spare parts', '2 type A cells', 'Dataslab', 'Metatool', '2 line shunts', '100 credits'] },
};
const itemDescriptions: Record<string, string> = {
  'Combat rifle': '1d12 damage; range 100–300 m; magazine 30; Burst Mode: spend 3 rounds for +2 to hit and damage.',
  'Laser pistol': '+1 Attack; 1d6 damage; range 100–300 m; magazine 10.',
  Knife: '1d4 damage; Shock 1/AC 15; 10 m thrown.',
  'Monoblade knife': '1d6 damage; Shock 1/AC 15; 10 m thrown.',
  'Thermal knife': '1d6 damage; Shock 1/AC 15; 10 m thrown.',
  'Monoblade sword': '1d8+1 damage; Shock 2/AC 13.',
  'Armored undersuit': 'AC 13. Hidden: indistinguishable from ordinary clothing.',
  'Secure clothing': 'AC 13. Hidden: indistinguishable from ordinary clothing.',
  'Woven body armor': 'AC 15.',
  'Type A cell': 'Powers laser pistols and other devices. Rechargeable.',
  Bioscanner: 'Medical tricorder.',
  'Lazarus patch': 'Stabilize a dying person with a DC 6 Heal check; −1 penalty per round dying.',
  Lift: 'Heal 1d8 over five minutes if trained in Heal. No more than once per day.',
  'Climbing harness': '+1 to Exert checks for climbing, but noisy: −2 to Sneak while climbing.',
  Compad: 'Cell phone, not a smartphone.',
  Dataslab: 'Laptop.',
  'Line shunt': 'Connects to remote data lines for sophisticated hacking attempts.',
  'Low-light goggles': 'Night vision goggles.',
  Metatool: 'Multitool for small repairs and lockpicking.',
  'Postech toolkit': 'Toolbox for larger repairs and crafting.',
  'Spare parts': 'Raw material for repairing items or making temporary tools with Fix.',
};
const statNames = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const statIndex: Record<string, number> = Object.fromEntries(statNames.map((name, i) => [name, i]));
const skillNames = Object.keys(skillModifiers) as (keyof typeof skillModifiers)[];
const mod = (n: number) => n === 3 ? -2 : n <= 7 ? -1 : n <= 13 ? 0 : n <= 17 ? 1 : 2;
const signed = (n: number) => n >= 0 ? `+${n}` : `${n}`;
const el = (tag: string, className: string, content?: string) => { const node = document.createElement(tag); node.className = className; if (content !== undefined) node.textContent = content; return node; };
const tag = (label: string, tooltip?: string) => { const node = el('span', `tag tag-${label.toLowerCase().replace(/\s+/g, '-')}`, `[${label}]`); if (tooltip) node.title = tooltip; return node; };
const baseAttack = (p: Premade) => p.role === 'Warrior' ? 1 : 0;
function appendShockText(parent: HTMLElement, value: string) {
  const parts = value.split(/shock/i);
  parts.forEach((part, i) => {
    if (i) {
      const term = el('span', 'shock-tooltip', 'Shock');
      term.title = shockExplanation;
      term.tabIndex = 0;
      term.setAttribute('aria-label', `Shock. ${shockExplanation}`);
      parent.append(term);
    }
    if (part) parent.append(document.createTextNode(part));
  });
}
function appendEffortText(parent: HTMLElement, value: string, phrase: string) {
  const parts = value.split(phrase);
  parts.forEach((part, i) => {
    if (i) {
      const term = el('span', 'effort-tooltip', phrase);
      term.title = effortExplanation;
      term.tabIndex = 0;
      term.setAttribute('aria-label', `${phrase}. ${effortExplanation}`);
      parent.append(term);
    }
    if (part) parent.append(document.createTextNode(part));
  });
}

const ranksFor = (p: Premade) => { const ranks = new Map<string, number>(); p.skills.forEach(s => ranks.set(s, (ranks.get(s) ?? -1) + 1)); return ranks; };
function itemTooltip(name: string) {
  const key = name.replace(/^\d+ (?:units of |doses of )?/, '').replace(/^(?:type A cells|rifle rounds|line shunts|spare parts|Lazarus patches|credits)$/, s => ({ 'type A cells': 'Type A cell', 'rifle rounds': 'Rifle Ammo', 'line shunts': 'Line shunt', 'spare parts': 'Spare parts', 'Lazarus patches': 'Lazarus patch', credits: 'Credits' })[s] ?? s).replace(/^Lift$/, 'Lift');
  return itemDescriptions[key] ?? '';
}
function render(p: Premade, index: number) {
  const ranks = ranksFor(p);
  const card = el('article', 'sheet'); card.id = `premade-${index + 1}`;
  const head = el('header', `sheet-head sheet-head-${p.role.toLowerCase()}`); head.append(el('h2', 'title', `${p.role}: ${p.title.replace(/^Psychic: /, '')}`), el('div', 'subtitle', `Profession: ${p.profession}`)); card.append(head);
  const body = el('div', 'sheet-body'); const stats = el('section', 'stats'); stats.append(el('h3', 'section-title', 'Stats'));
  const scoreGrid = el('div', 'score-grid'); p.stats.forEach((score, i) => { const row = el('div', 'score-row'); row.append(el('span', 'score-name', statNames[i]), el('strong', 'score-value', String(score)), el('span', `score-mod ${mod(score) < 0 ? 'low' : mod(score) > 0 ? 'high' : ''}`, signed(mod(score)))); scoreGrid.append(row); }); stats.append(scoreGrid);
  const hp = Math.max(1, 4 + mod(p.stats[2]) + (p.role === 'Warrior' ? 2 : 0) + (p.foci.includes('Die Hard') ? 2 : 0));
  const ac = Math.max(...gear[p.package].armor.filter(a => !a.illegal).map(a => a.ac)) + mod(p.stats[1]);
  const vitals = el('div', 'vitals');
  const values = [['HP', String(hp)], ['AC', String(ac)], ...(p.role === 'Psychic' ? [['EFFORT', '2']] : [])];
  values.forEach(([a, b]) => { const v = el('div', `vital ${a === 'EFFORT' ? 'vital-effort' : ''}`); v.append(el('span', 'vital-label', a), el('strong', 'vital-value', b)); vitals.append(v); });
  if (p.role !== 'Psychic') { const spacer = el('div', 'vital-spacer'); spacer.setAttribute('aria-hidden', 'true'); vitals.append(spacer); }
  const saves = [
    ['FORT', 15 - Math.max(mod(p.stats[0]), mod(p.stats[2])), 'fort'],
    ['REF', 15 - Math.max(mod(p.stats[1]), mod(p.stats[3])), 'ref'],
    ['WILL', 15 - Math.max(mod(p.stats[4]), mod(p.stats[5])), 'will'],
  ] as const;
  saves.forEach(([name, value, style]) => { const v = el('div', `vital vital-save vital-${style}`); v.append(el('span', 'vital-label', name), el('strong', 'vital-value', String(value))); vitals.append(v); });
  stats.append(vitals, el('p', 'small-note save-note', 'Saves are 1d20 roll-over.')); body.append(stats);
  const details = el('div', 'details'); const classSection = el('section', 'rule-section'); classSection.append(el('h3', `section-title class-ability-${p.role.toLowerCase()}`, `${p.role} Ability`)); const classCopy = el('p', 'rule-copy'); if (p.role === 'Psychic') {
    appendEffortText(classCopy, classRules[p.role], 'Effort');
    classSection.append(classCopy);
    classSection.append(el('p', 'rule-copy', sourceLine('Psychic Powers: ').slice('Psychic Powers: '.length)));
    classSection.append(el('p', 'rule-copy', sourceLine('Psychic Powers are undetectable')));
    const trainingLine = sourceLine('<i>As a Psychic,');
    classSection.append(el('p', 'rule-copy psychic-training', trainingLine.slice(3, -4)));
  } else { classCopy.textContent = classRules[p.role]; classSection.append(classCopy); }
  details.append(classSection);
  const skillSection = el('section', 'rule-section skill-section'); skillSection.append(el('h3', 'section-title', 'Skills'), el('p', 'small-note', sourceLine('Skills: ').slice('Skills: '.length))); const skills = el('div', 'skill-grid');
  skillNames.forEach(name => {
    const rank = ranks.get(name) ?? -1; const attr = skillModifiers[name]; const bonus = mod(p.stats[statIndex[attr]]); const total = rank + bonus;
    const isSpecialist = p.foci.some(f => f === `Specialist: ${name}`); const style = rank < 0 ? 'untrained' : isSpecialist ? 'specialist' : 'trained';
    const row = el('div', `skill-cell skill-${style}`); if (isSpecialist) row.title = focusRules.Specialist.slice(focusRules.Specialist.indexOf('For this skill')); row.setAttribute('aria-label', `${name} rank ${rank}, ${attr} modifier ${signed(bonus)}, total ${signed(total)}`);
    row.append(el('span', 'skill-name', name)); const points = el('span', 'skill-points'); if (!isSpecialist) points.title = `Skill rank ${rank}`;
    [0, 1].forEach(i => { const circle = el('span', `skill-point ${rank >= i ? 'filled' : ''}`); circle.setAttribute('aria-hidden', 'true'); points.append(circle); }); row.append(points);
    const math = el('span', 'skill-math'); math.append(el('span', 'skill-bonus', `${attr} ${signed(bonus)}`), el('span', 'skill-equals', '='), el('strong', 'skill-total', signed(total))); row.append(math); skills.append(row);
  }); skillSection.append(skills); details.append(skillSection);
  const foci = el('section', 'rule-section'); foci.append(el('h3', 'section-title', 'Foci')); p.foci.forEach(f => { const text = f.startsWith('Specialist:') ? focusRules.Specialist.replace('$X', f.split(': ')[1]) : focusRules[f]; const row = el('p', 'rule-copy'); row.append(el('strong', 'rule-name', f), document.createTextNode(' — ')); appendShockText(row, text); foci.append(row); }); details.append(foci);
  body.append(details); card.append(body);
  if (p.disciplines) {
    const psy = el('section', 'psychic-panel');
    psy.append(el('h3', 'section-title', 'Psychic powers'));
    p.disciplines.forEach(d => {
      const row = el('p', 'rule-copy');
      row.append(el('strong', 'rule-name', `${d}: ${psychicRules[d].technique}`), document.createTextNode(' — '));
      appendEffortText(row, psychicRules[d].description, 'Commit Effort');
      psy.append(row);
    });
    card.append(psy);
  }
  const inventory = gear[p.package];
  const armorSection = el('section', 'equipment-section'); armorSection.append(el('h3', 'section-title', 'Armor'));
  [...inventory.armor].sort((a, b) => Number(!!a.illegal) - Number(!!b.illegal)).forEach(armor => { const row = el('div', 'equipment-row'); const name = el('strong', 'equipment-name', armor.name); row.append(name, el('span', 'equipment-stat', `AC Bonus: ${armor.ac}`)); if (!armor.illegal) row.append(tag('Equipped')); if (armor.hidden) row.append(tag('Hidden', hiddenArmor)); if (armor.illegal) row.append(tag('StreetIllegal', streetIllegal)); armorSection.append(row); }); card.append(armorSection);
  const attacksSection = el('section', 'equipment-section'); attacksSection.append(el('h3', 'section-title', 'Attacks'), el('p', 'small-note', sourceLine('Attacks: ').slice('Attacks: '.length)));
  [...inventory.weapons].sort((a, b) => Number(!!a.illegal) - Number(!!b.illegal)).forEach(weapon => { const ranged = !!weapon.range && !weapon.name.toLowerCase().includes('knife'); const attrMod = mod(p.stats[ranged ? 1 : 0]); const rank = ranks.get(ranged ? 'Shoot' : 'Stab') ?? -1; const attackRank = !ranged && rank < 0 ? -2 : rank; const attack = baseAttack(p) + attackRank + attrMod + (weapon.energy ? 1 : 0); const row = el('div', 'equipment-row'); const name = el('strong', 'equipment-name', weapon.name); row.append(name, el('span', 'equipment-stat', `Attack: ${signed(attack)}`), el('span', 'equipment-stat', `Damage: ${weapon.die}${attrMod === 0 ? '' : signed(attrMod)}`)); if (weapon.shock) { const shockStat = el('span', 'equipment-stat'); appendShockText(shockStat, `Shock: ${weapon.shock}`); row.append(shockStat); } if (weapon.range) row.append(el('span', 'equipment-stat', `Range: ${weapon.range}`)); if (weapon.magazine) row.append(el('span', 'equipment-stat', `Magazine: ${weapon.magazine}`)); if (!weapon.illegal) row.append(tag('Equipped')); if (weapon.name === 'Combat rifle') row.append(tag('Burst Mode', sourceLine('Burst Mode: ').slice('Burst Mode: '.length))); if (weapon.illegal) row.append(tag('StreetIllegal', streetIllegal)); attacksSection.append(row); }); card.append(attacksSection);
  const gearSection = el('section', 'equipment-section gear-section'); gearSection.append(el('h3', 'section-title', 'Gear')); const list = el('ul', 'gear-list'); inventory.items.forEach(item => { const li = el('li', 'gear-item', item); const tooltip = itemTooltip(item); if (tooltip) li.title = tooltip; if (item.includes('line shunts')) li.append(tag('StreetIllegal', streetIllegal)); list.append(li); }); gearSection.append(list); card.append(gearSection);
  return card;
}
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app');
const main = el('main', 'page');
const pageHeader = el('header', 'page-header');
pageHeader.append(el('h1', 'page-title', 'SWN Premade Characters'));
const controls = el('div', 'page-controls');
const randomButton = el('button', 'control-button', 'Randomly Select') as HTMLButtonElement;
const showAllButton = el('button', 'control-button', 'Show All') as HTMLButtonElement;
randomButton.type = 'button';
showAllButton.type = 'button';
randomButton.setAttribute('aria-pressed', 'false');
showAllButton.setAttribute('aria-pressed', 'false');
controls.append(randomButton, showAllButton);
pageHeader.append(controls);
main.append(pageHeader);
const sheets = el('div', 'sheets');
const cards = premades.map((premade, i) => render(premade, i));
cards.forEach(card => { card.hidden = true; sheets.append(card); });
main.append(sheets);
app.append(main);
randomButton.addEventListener('click', () => {
  const selected = Math.floor(Math.random() * cards.length);
  cards.forEach((card, i) => { card.hidden = i !== selected; });
  randomButton.setAttribute('aria-pressed', 'true');
  showAllButton.setAttribute('aria-pressed', 'false');
});
showAllButton.addEventListener('click', () => {
  cards.forEach(card => { card.hidden = false; });
  randomButton.setAttribute('aria-pressed', 'false');
  showAllButton.setAttribute('aria-pressed', 'true');
});

function installTooltips(root: HTMLElement) {
  const tooltip = el('div', 'swn-tooltip');
  tooltip.id = 'swn-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.append(tooltip);
  root.querySelectorAll<HTMLElement>('[title]').forEach(target => {
    const description = target.getAttribute('title');
    if (!description) return;
    target.dataset.tooltip = description;
    target.removeAttribute('title');
    if (target.tabIndex < 0) target.tabIndex = 0;
  });
  let active: HTMLElement | null = null;
  const show = (target: HTMLElement) => {
    if (!target.dataset.tooltip) return;
    if (active && active !== target) active.removeAttribute('aria-describedby');
    active = target;
    tooltip.textContent = target.dataset.tooltip;
    tooltip.style.setProperty('--tooltip-accent', getComputedStyle(target).color);
    tooltip.hidden = false;
    target.setAttribute('aria-describedby', tooltip.id);
    const rect = target.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - width - 10));
    const top = rect.top - height - 9 >= 10 ? rect.top - height - 9 : Math.min(rect.bottom + 9, window.innerHeight - height - 10);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  };
  const hide = () => {
    active?.removeAttribute('aria-describedby');
    active = null;
    tooltip.hidden = true;
  };
  root.addEventListener('pointerover', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-tooltip]');
    if (target && root.contains(target)) show(target);
  });
  root.addEventListener('pointerout', event => {
    if (active && !active.contains(event.relatedTarget as Node | null)) hide();
  });
  root.addEventListener('focusin', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-tooltip]');
    if (target && root.contains(target)) show(target);
  });
  root.addEventListener('focusout', event => {
    if (active && !active.contains(event.relatedTarget as Node | null)) hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
}
installTooltips(app);
