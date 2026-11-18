import './swn.css';

type ClassName = 'Expert' | 'Warrior' | 'Psychic';
type Premade = { title: string; role: ClassName; profession: string; package: string; stats: number[]; skills: string[]; foci: string[]; disciplines?: string[] };
const premades: Premade[] = [
  { title:'Thief', role:'Expert', profession:'Official', package:'Thief', stats:[10,14,12,11,9,7], skills:['Shoot','Sneak','Connect','Administer','Talk','Connect'], foci:['Specialist: Sneak','Specialist: Connect'] },
  { title:'Scientist', role:'Expert', profession:'Soldier', package:'Medic', stats:[10,12,11,14,7,9], skills:['Shoot','Heal','Know','Shoot','Exert','Survive'], foci:['Specialist: Heal','Specialist: Know'] },
  { title:'Technician', role:'Expert', profession:'Criminal', package:'Technician', stats:[10,12,11,14,7,9], skills:['Shoot','Fix','Program','Connect','Sneak','Talk'], foci:['Specialist: Fix','Specialist: Program'] },
  { title:'Captain', role:'Expert', profession:'Noble', package:'Blade', stats:[10,14,12,11,9,7], skills:['Shoot','Pilot','Talk','Stab','Connect','Administer'], foci:['Specialist: Pilot','Specialist: Talk'] },
  { title:'Shooter', role:'Warrior', profession:'Vagabond', package:'Soldier', stats:[9,14,12,10,10,11], skills:['Stab','Shoot','Sneak','Know','Sneak','Survive'], foci:['Close Combatant','Assassin'] },
  { title:'Stabber', role:'Warrior', profession:'Barbarian', package:'Blade', stats:[14,9,12,7,10,11], skills:['Shoot','Stab','Survive','Sneak','Stab'], foci:['Shocking Assault','Die Hard'] },
  { title:'Psychic: The Rose', role:'Psychic', profession:'Physician', package:'Medic', stats:[9,11,12,10,14,7], skills:['Shoot','Exert','Heal','Know','Administer'], foci:['Specialist: Exert'], disciplines:['Biopsionics','Telepathy'] },
  { title:'Psychic: The Seer', role:'Psychic', profession:'Scholar', package:'Hacker', stats:[12,10,14,9,11,7], skills:['Shoot','Trade','Know','Administer','Program'], foci:['Specialist: Trade'], disciplines:['Precognition','Telekinesis'] },
  { title:'Psychic: Magician', role:'Psychic', profession:'Technician', package:'Technician', stats:[12,10,14,9,11,7], skills:['Shoot','Perform','Fix','Trade','Exert'], foci:['Specialist: Perform'], disciplines:['Metapsionics','Teleportation'] },
];
const classRules: Record<ClassName,string> = {
  Expert:'Once per scene, reroll a failed skill check and keep the better result. Your two starting foci are already included.',
  Warrior:'Once per scene, as an Instant action after a roll, turn your missed attack into a hit or negate a successful attack against you. This does not stop environmental harm, attacks without hit rolls, or hits on your vehicle. Your extra combat focus and +2 HP are included.',
  Psychic:'Your two listed disciplines are class granted at rank 0. They give only their level 0 core techniques. Spend Effort to use them.',
};
const focusRules: Record<string,string> = {
  'Close Combatant':'Shoot-0. Use pistol sized ranged weapons in melee without proximity penalties; ignore melee Shock even while unarmored.',
  'Assassin':'Sneak-0. Conceal a knife or pistol from anything short of a strip search, including ordinary TL4 detectors. Draw it On Turn; a point blank surprise shot with it cannot miss. See execution attacks, p. 52.',
  'Shocking Assault':'Stab-0. Your weapon’s Shock treats targets as AC 10 if the weapon can harm them.',
  'Die Hard':'+2 maximum HP, already included. Automatically stabilize from a mortal wound caused by less than a Heavy weapon.',
};
const psychicRules: Record<string,string> = {
  Biopsionics:'Psychic Succor: Main Action, touch a mortally wounded target within six rounds of collapse to stabilize them. Commit 1 Effort for the day; reuse during that scene. Target gains 2 System Strain (1 if not mortally wounded). Cannot restore victims of Heavy weapons, decapitation, or catastrophic dismemberment. No HP healing at rank 0. p. 32.',
  Telepathy:'Telepathic Contact: Main Action, commit 1 Effort for the day to sense a target perceivable without aids for up to a scene. Read emotions; intense emotions yield one associated word or image. p. 36.',
  Precognition:'Oracle: Main Action, commit 1 Effort for the day to see one brief vision from your own viewpoint, up to one minute into the likely future. Ask about actions or events, not abstract facts. Retry the same question only after a major change or a week. p. 34.',
  Telekinesis:'Telekinetic Manipulation: Main Action, commit 1 Effort for the scene. Move one object in unaided sight or touch at 20 m/round with force like one hand and your own Strength. Maintain without more actions, but release it before moving another. Cannot harm living or mobile targets. p. 35.',
  Metapsionics:'Psychic Refinement: See and hear psychic powers being used. If source and target are visible, identify both. Gain +2 on saves versus psychic powers. p. 33.',
  Teleportation:'Personal Apportation: Main Action, commit 1 Effort for the scene to teleport up to 10 m to a place you see unaided or have occupied. Carry what your natural Strength permits; touching, willing companions can come. Unsafe arrivals abort and still spend the action and Effort. p. 37.',
};
const packages: Record<string,string[]> = {
  Thief:['Laser pistol · 1d6','Armored undersuit · AC 13','Monoblade knife · 1d6','Climbing harness','Low light goggles','2 type A cells','Backpack (TL0)','Compad','Metatool','25 credits'],
  Medic:['Laser pistol · 1d6','Secure clothing · AC 13','4 Lazarus patches','2 doses of Lift','Backpack (TL0)','Medkit','Compad','Bioscanner','25 credits'],
  Technician:['Laser pistol · 1d6','Armored undersuit · AC 13','Monoblade knife · 1d6','Postech toolkit','6 units spare parts','4 type A cells','Backpack (TL0)','Dataslab','Metatool','200 credits'],
  Soldier:['Combat rifle · 1d12','Woven body armor · AC 15','Knife · 1d4','80 rounds ammunition','Backpack (TL0)','Compad','100 credits'],
  Blade:['Monoblade sword · 1d8+1','Woven body armor · AC 15','Secure clothing · AC 13','Thermal knife · 1d6','Backpack (TL0)','Compad','Lazarus patch','50 credits'],
  Hacker:['Laser pistol · 1d6','Secure clothing · AC 13','Postech toolkit','3 units spare parts','2 type A cells','Dataslab','Metatool','2 line shunts','100 credits'],
};
const statNames=['STR','DEX','CON','INT','WIS','CHA'];
const vocabulary=['Administer','Connect','Exert','Fix','Heal','Know','Perform','Pilot','Program','Shoot','Sneak','Stab','Survive','Talk','Trade'];
const mod=(n:number)=>n===3?-2:n<=7?-1:n<=13?0:n<=17?1:2;
const signed=(n:number)=>n>=0?`+${n}`:`${n}`;
const el=(tag:string, className:string, content?:string)=>{const node=document.createElement(tag);node.className=className;if(content!==undefined)node.textContent=content;return node};
function render(p:Premade,index:number){
  const card=el('article','sheet'); card.id=`premade-${index+1}`;
  const head=el('header','sheet-head'); head.append(el('div','eyebrow',`SWN / LEVEL 01 / PREMADE ${String(index+1).padStart(2,'0')}`),el('h2','title',p.title),el('div','subtitle',`${p.profession} · ${p.role}`)); card.append(head);
  const body=el('div','sheet-body'); const stats=el('section','stats'); stats.append(el('h3','section-title','Identity card'));
  const scoreGrid=el('div','score-grid'); p.stats.forEach((score,i)=>{const row=el('div','score-row');row.append(el('span','score-name',statNames[i]),el('strong','score-value',String(score)),el('span',`score-mod ${mod(score)<0?'low':mod(score)>0?'high':''}`,signed(mod(score))));scoreGrid.append(row)});stats.append(scoreGrid);
  const hp=Math.max(1,4+mod(p.stats[2])+(p.role==='Warrior'?2:0)+(p.foci.includes('Die Hard')?2:0)); const vitals=el('div','vitals');[['HP',String(hp)],['BASE ATTACK',signed(p.role==='Warrior'?1:0)],...(p.role==='Psychic'?[['EFFORT','2']]:[])].forEach(([a,b])=>{const v=el('div','vital');v.append(el('span','vital-label',a),el('strong','vital-value',b));vitals.append(v)});stats.append(vitals);
  stats.append(el('div','stamp',p.package.toUpperCase()+' KIT'));body.append(stats);
  const details=el('div','details');const classSection=el('section','rule-section');classSection.append(el('h3','section-title',`${p.role} / class ability`),el('p','rule-copy',classRules[p.role]));details.append(classSection);
  const skillSection=el('section','rule-section');skillSection.append(el('h3','section-title','Skills'));const ranks=new Map<string,number>();p.skills.forEach(s=>ranks.set(s,(ranks.get(s)??-1)+1));p.disciplines?.forEach(s=>ranks.set(s,0));const skills=el('div','skill-list');[...ranks].sort(([a],[b])=>a.localeCompare(b)).forEach(([s,n])=>skills.append(el('span','skill-chip',`${s} ${n}`)));skillSection.append(skills,el('p','small-note',`Other listed skills: −1 untrained · ${vocabulary.filter(s=>!ranks.has(s)).join(', ')}`));details.append(skillSection);
  const foci=el('section','rule-section');foci.append(el('h3','section-title','Assigned foci'));p.foci.forEach(f=>{const name=el('strong','rule-name',f);const text=f.startsWith('Specialist:')?`Gain ${f.split(': ')[1]} as a skill pick (already counted). Roll 3d6, keep the best two on its skill checks.`:focusRules[f];const row=el('p','rule-copy');row.append(name,document.createTextNode(' — '+text));foci.append(row)});details.append(foci);
  if(p.disciplines){const psy=el('section','rule-section psychic');psy.append(el('h3','section-title','Psychic disciplines / rank 0'),el('p','small-note','Effort 2. Commit one point per activation. “For the scene” returns after the scene; “for the day” returns after a good night’s rest. Track committed points against the maximum.'));p.disciplines.forEach(d=>{const row=el('p','rule-copy');row.append(el('strong','rule-name',d),document.createTextNode(' — '+psychicRules[d]));psy.append(row)});details.append(psy)}
  body.append(details);card.append(body);
  const gear=el('section','gear-note');gear.append(el('h3','section-title',`My stuff / ${p.package} package`));const list=el('ul','gear-list');packages[p.package].forEach(item=>list.append(el('li','',item)));gear.append(list);card.append(gear);return card;
}
const app=document.querySelector<HTMLDivElement>('#app');if(!app)throw new Error('Missing app');const main=el('main','page');const intro=el('div','page-intro');intro.append(el('div','eyebrow','STARS WITHOUT NUMBER · REVISED'),el('h1','','Nine lives in the void'),el('p','','Level 1 premades · fixed abilities and gear · choose a homeworld separately'));main.append(intro);premades.forEach((p,i)=>main.append(render(p,i)));const note=el('p','page-note','Rules summary: Stars Without Number: Revised Edition, Free Edition, pp. 17–25, 31–37, 52, 66–75. Weapon attack totals, armor, and item details can be added in the next pass.');main.append(note);app.append(main);
