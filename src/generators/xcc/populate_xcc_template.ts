import type { XccCharacter } from './xcc_impl';
import { createXccSheetElement } from './xcc_sheet_template';

export function buildXccSheet(characters: XccCharacter[]): HTMLElement {
  if (characters.length !== 1) {
    throw new Error(`XCC sheet renderer requires one character; received ${characters.length}.`);
  }

  return populateXccTemplate(createXccSheetElement(), characters[0]);
}

export function populateXccTemplate(root: HTMLElement, character: XccCharacter): HTMLElement {
  setText(root, 'firstName', character.firstName);
  setText(root, 'lastName', character.lastName);
  setText(root, 'professionTitle', character.professionPresentation);
  setPortrait(root, character);
  setDidYouKnow(root, character);

  setText(root, 'strengthScore', character.strengthScore);
  setText(root, 'strengthMod', formatModifier(character.strengthMod));
  setText(root, 'agilityScore', character.agilityScore);
  setText(root, 'agilityMod', formatModifier(character.agilityMod));
  setText(root, 'staminaScore', character.staminaScore);
  setText(root, 'staminaMod', formatModifier(character.staminaMod));
  setText(root, 'personalityScore', character.personalityScore);
  setText(root, 'personalityMod', formatModifier(character.personalityMod));
  setText(root, 'intelligenceScore', character.intelligenceScore);
  setText(root, 'intelligenceMod', formatModifier(character.intelligenceMod));
  setText(root, 'luckScore', character.luckScore);
  setText(root, 'luckMod', formatModifier(character.luckMod));

  setText(root, 'fortitudeSave', formatModifier(character.saveFort));
  setText(root, 'reflexSave', formatModifier(character.saveReflex));
  setText(root, 'willSave', formatModifier(character.saveWill));
  setIdentityStripe(root, character);

  setText(root, 'hitPoints', character.hitPoints);
  setText(root, 'armorClass', character.AC);
  setText(root, 'initiative', formatModifier(character.initiative));
  setText(root, 'speed', character.speed);
  setText(root, 'armorName', character.armorName);

  setText(root, 'weaponDisplay', character.weaponDisplay);
  setText(root, 'attackBonus', formatModifier(character.attackMod));
  setText(
    root,
    'weaponDamage',
    formatDamage(character.weaponDamageBase, character.attackDamageMod),
  );
  setText(root, 'pack', character.equipment || '—');
  setWeaponRange(root, character.weaponRange);

  return root;
}

function setDidYouKnow(root: ParentNode, character: XccCharacter): void {
  setText(root, 'didYouKnowActor', character.portraitActorName);
  setText(root, 'didYouKnowCharacter', `${character.firstName} ${character.lastName}`);
  setText(root, 'didYouKnowMovie', character.movieTitle);
}

function setText(root: ParentNode, field: string, value: string | number): void {
  getField(root, field).textContent = String(value);
}

function setIdentityStripe(root: ParentNode, character: XccCharacter): void {
  const stripe = getField(root, 'identityStripe');
  const isNoble = character.professionTitle === 'Nobility';

  if (character.race === 'Human' && !isNoble) {
    return;
  }

  const stripeKind = character.race === 'Human' ? 'Noble' : character.race;
  stripe.hidden = false;
  stripe.dataset.stripeKind = stripeKind;
  setText(root, 'identityStripeLabel', stripeKind);
}

function setPortrait(root: ParentNode, character: XccCharacter): void {
  const portrait = getField(root, 'portrait');

  portrait.dataset.portrait = character.portraitImagePath;
  portrait.dataset.actor = character.portraitActorName;
  portrait.setAttribute(
    'aria-label',
    `Crawler portrait represented by ${character.portraitActorName}`,
  );
  portrait.style.backgroundImage = `url("${cssUrlEscape(character.portraitImagePath)}")`;
  portrait.style.backgroundSize = 'cover';
  portrait.style.backgroundPosition = 'center';
  portrait.style.backgroundRepeat = 'no-repeat';
}

function setWeaponRange(root: ParentNode, range: string): void {
  const label = getField(root, 'weaponRangeLabel');
  const value = getField(root, 'weaponRange');
  const hasRange = range.trim() !== '0';

  value.textContent = hasRange ? range || '—' : '';
  label.style.visibility = hasRange ? '' : 'hidden';
  value.style.visibility = hasRange ? '' : 'hidden';
  label.setAttribute('aria-hidden', String(!hasRange));
  value.setAttribute('aria-hidden', String(!hasRange));
}

function getField(root: ParentNode, field: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-field="${field}"]`);

  if (!element) {
    throw new Error(`Template is missing data-field="${field}".`);
  }

  return element;
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function formatDamage(baseDamage: string, damageMod: number): string {
  if (damageMod === 0) {
    return baseDamage;
  }

  return `${baseDamage}${formatModifier(damageMod)}`;
}

function cssUrlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
