import type { StudentCharacter } from './dcc_students_impl';

export function build_grid(characters: StudentCharacter[]): HTMLElement {
  const template = document.querySelector<HTMLTemplateElement>('#dcc-student-sheet-template');

  if (!template) {
    throw new Error('Missing template: "#dcc-student-sheet-template"');
  }

  const grid = document.createElement('section');
  grid.className = 'dcc-sheet-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(2, max-content)';
  grid.style.columnGap = '0.25in';
  grid.style.rowGap = '0.45in';

  for (const character of characters) {
    const sheet = populate_student_template(template, character);
    grid.appendChild(sheet);
  }

  return grid;
}

export function populate_student_template(
  template: HTMLTemplateElement,
  character: StudentCharacter,
): HTMLElement {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const root = fragment.querySelector<HTMLElement>('.dcc-sheet');

  if (!root) {
    throw new Error('Template must contain an element with class ".dcc-sheet".');
  }

  setPortrait(root, character);

  // Identity
  setText(root, 'firstName', character.firstName);
  setText(root, 'lastName', character.lastName);
  setText(root, 'professionTitle', character.professionTitle);

  // The current visual design treats schoolLogo as an image slot.
  // If student_object.school is an image path/URL, it is used as a background image.
  // Otherwise the school value is kept as metadata on the element.
  setImageOrMetadata(root, 'schoolLogo', character.schoolLogoImagePath, 'school');
  setImageOrMetadata(root, 'portrait', character.portraitImagePath, 'portrait');

  // Core stats
  setText(root, 'strengthScore', character.strengthScore);
  setStatMod(root, 'strengthMod', character.strengthMod);

  setText(root, 'agilityScore', character.agilityScore);
  setStatMod(root, 'agilityMod', character.agilityMod);

  setText(root, 'staminaScore', character.staminaScore);
  setStatMod(root, 'staminaMod', character.staminaMod);

  setText(root, 'personalityScore', character.personalityScore);
  setStatMod(root, 'personalityMod', character.personalityMod);

  setText(root, 'intelligenceScore', character.intelligenceScore);
  setStatMod(root, 'intelligenceMod', character.intelligenceMod);

  setText(root, 'luckScore', character.luckScore);
  setStatMod(root, 'luckMod', character.luckMod);

  // Attacks and defenses
  setText(root, 'armorClass', character.AC);
  setText(root, 'hitPoints', character.hitPoints);
  setText(root, 'speed', character.speed);
  setText(root, 'initiative', formatMod(character.initiative));
  setText(root, 'fortitudeSave', formatMod(character.saveFort));
  setText(root, 'reflexSave', formatMod(character.saveReflex));
  setText(root, 'willSave', formatMod(character.saveWill));

  // Weapon
  setText(root, 'trueWeaponName', character.weaponDisplay);
  setText(root, 'attackBonus', formatMod(character.attackMod));
  setText(root, 'damage', formatDamage(character.weaponDamageBase, character.attackDamageMod));

  setText(root, 'studentId', character.studentId);
  setText(root, 'dob', character.dob_string);
  setText(root, 'expiresOn', character.expiry_string);

  // Lucky Sign
  setText(root, 'luckySignName', character.luckySignName);
  setText(root, 'luckySignBonus', formatMod(character.luckMod));
  setText(root, 'luckySignEffect', character.luckySignDescription);

  // Lucky sign mark is present in the template, but not represented in StudentCharacter.
  // Keep it as a blank decorative slot for now.
  setImageOrMetadata(root, 'luckySignMark', character.luckysignImagePath, 'luckySign');

  // Inventory
  setText(root, 'inventoryItem1', character.bag);
  setText(root, 'inventoryItem2', character.equipment);
  setText(root, 'inventoryItem3', character.equipment2);
  setText(root, 'inventoryItem4', character.equipment3);

  // Lunch fields are present in the current template, but not in StudentCharacter.
  // Clear them so prototype values are not retained.
  setText(root, 'lunchContainer', character.lunchContainer);
  setText(root, 'lunchMain', character.lunchMain);
  setText(root, 'lunchSide1', character.lunchSide1);
  setText(root, 'lunchSide2', character.lunchSide2);
  setText(root, 'lunchDrink', character.lunchDrink);

  return root;
}

function setText(root: ParentNode, field: string, value: string | number): void {
  const element = getField(root, field);
  element.textContent = String(value);
}

function setStatMod(root: ParentNode, field: string, value: number): void {
  const element = getField(root, field);

  element.textContent = formatMod(value);
  element.classList.toggle('mod-low', value <= -2);
  element.classList.toggle('mod-high', value >= 2);
}

function setImageOrMetadata(
  root: ParentNode,
  field: string,
  value: string,
  metadataName: string,
): void {
  const element = getField(root, field) as HTMLElement;

  element.textContent = '';
  element.dataset[metadataName] = value;

  if (looksLikeImageReference(value)) {
    element.style.backgroundImage = `url("${cssUrlEscape(value)}")`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.style.backgroundRepeat = 'no-repeat';
  }
}

function getField(root: ParentNode, field: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-field="${field}"]`);

  if (!element) {
    throw new Error(`Template is missing data-field="${field}".`);
  }

  return element;
}

function formatMod(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function formatDamage(baseDamage: string, damageMod: number): string {
  if (damageMod === 0) {
    return baseDamage;
  }

  return `${baseDamage}${formatMod(damageMod)}`;
}

function looksLikeImageReference(value: string): boolean {
  return (
    /\.(png|jpe?g|gif|webp|svg)$/i.test(value) ||
    value.startsWith('/') ||
    value.startsWith('./') ||
    value.startsWith('../') ||
    value.startsWith('data:image/') ||
    /^https?:\/\//i.test(value)
  );
}

function cssUrlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

import malePortraitUrl from '../../assets/male_final.png';
import femalePortraitUrl from '../../assets/female_final.png';

function setPortrait(root: ParentNode, student: StudentCharacter): void {
  const portrait = root.querySelector<HTMLElement>('[data-field="portrait"]');
  if (!portrait) return;

  const portraitUrl = student.gender === 'Female' ? femalePortraitUrl : malePortraitUrl;

  portrait.style.backgroundImage = `url("${portraitUrl}")`;
}
