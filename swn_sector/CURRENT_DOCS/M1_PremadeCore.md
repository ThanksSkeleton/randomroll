# Milestone 1: Premade character core

This spec defines the fixed level 1 *Stars Without Number: Revised Edition* premade menu for the P1b player flow in [mega_spec.md](mega_spec.md). The companion [premade CSV](SWN%20PREMADE%20SPREADSHEET%20-%20Sheet2.csv) is the source of truth for the nine premade assignments, attribute packages, profession skill selections, and equipment package selections. The local rules reference is `temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf`, especially printed pages 17–25, 31–42, and 66–75. The rules summaries below are paraphrased for use at the table.

## Menu and fixed assignments

Display the nine premade titles and their class, profession, attribute package, foci, psionic disciplines where present, and equipment package. These are fixed templates. A player chooses a premade and an eligible character homeworld as defined by P1; choosing a homeworld does not change the template's mechanics.

| Title | Class / attributes | Profession | Bonus skill | Foci at level 1 | Psionic skills | Equipment |
| --- | --- | --- | --- | --- | --- | --- |
| Thief | Expert / Nimble | Official | Shoot | Specialist (Sneak), Specialist (Connect) | — | Thief |
| Scientist | Expert / Smart | Soldier | Shoot | Specialist (Heal), Specialist (Know) | — | Medic |
| Technician | Expert / Smart | Criminal | Shoot | Specialist (Fix), Specialist (Program) | — | Technician |
| Captain | Expert / Nimble | Noble | Shoot | Specialist (Pilot), Specialist (Talk) | — | Blade |
| Shooter | Warrior / Ranged | Vagabond | Stab | Close Combatant (Shoot), Assassin (Sneak) | — | Soldier |
| Stabber | Warrior / Melee | Barbarian | Shoot | Shocking Assault (Stab), Die Hard | — | Blade |
| Psychic: The Rose | Psychic / Seer | Physician | Shoot | Specialist (Exert) | Biopsionics, Telepathy | Medic |
| Psychic: The Seer | Psychic / Adept | Scholar | Shoot | Specialist (Trade) | Precognition, Telekinesis | Hacker |
| Psychic: Magician | Psychic / Adept | Technician | Shoot | Specialist (Perform) | Metapsionics, Teleportation | Technician |

The Scientist's Soldier profession is intentional. The CSV uses `BioPsion` for Biopsionics and `Precog` for Precognition; normalize those display labels without changing their assignments. The asterisk in the Warrior CSV cells distinguishes a named combat focus from a Specialist skill. In particular, the Shooter gets Shoot from Close Combatant and Sneak from Assassin, while the Stabber gets Stab from Shocking Assault and no skill from Die Hard. Their separate Bonus Skill column gives each the other weapon skill.

## Attributes, skills, and level 1 numbers

| Attribute package | Str | Dex | Con | Int | Wis | Cha |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Expert / Smart | 10 | 12 | 11 | 14 | 7 | 9 |
| Expert / Nimble | 10 | 14 | 12 | 11 | 9 | 7 |
| Warrior / Melee | 14 | 9 | 12 | 7 | 10 | 11 |
| Warrior / Ranged | 9 | 14 | 12 | 10 | 10 | 11 |
| Psychic / Seer | 9 | 11 | 12 | 10 | 14 | 7 |
| Psychic / Adept | 12 | 10 | 14 | 9 | 11 | 7 |

Attribute modifiers follow the book: 3 = −2; 4–7 = −1; 8–13 = 0; 14–17 = +1; 18 = +2. All nine premades have Constitution modifier 0 or +1. At level 1, Experts and Psychics have base attack bonus +0; Warriors have +1.

Use exactly these skill sources: the Bonus Skill column, the bonus skill from each assigned focus, the three skills listed for the chosen default profession in the CSV's profession table, and the two class-granted disciplines on each Psychic row. The profession's *three CSV skills* replace any broader background procedure in the book. Do not add other background, hobby, or discretionary skills. A skill selected once is rank 0; a skill selected twice is rank 1. No current premade selects a skill three times. For displayed untrained skills, rank −1 applies only to the reduced allowed skill vocabulary found across the premade and profession selections, not to every skill in the SWN book. Normalize CSV spelling to `Survive` and `Telekinesis`.

The intended duplicate selections are Connect-1 for Thief, Shoot-1 for Scientist, Sneak-1 for Shooter, and Stab-1 for Stabber. All other selected conventional skills are rank 0. Each Psychic's two disciplines are rank 0 and grant only their respective level 0 core techniques; the premades have no higher-level psychic techniques.

Use a rounded-up average for the 1d6 hit die: **4**. Maximum HP is `max(1, 4 + Constitution modifier + (Warrior ? 2 : 0) + (Die Hard ? 2 : 0))`. Thus the starting totals are Thief 4, Scientist 4, Technician 4, Captain 4, Shooter 6, Stabber 8, Rose 4, Seer 4, and Magician 5. Die Hard's bonus is separate from the Warrior class bonus. These values are fixed, with no HP roll in the premade selection flow.

## Class descriptions and abilities

- **Expert:** A specialist in useful noncombat work such as medicine, stealth, piloting, technical work, or social interaction. Once per scene, reroll a failed skill check and keep the better result. The two assigned noncombat foci already include the Expert's extra starting focus; do not offer another choice.
- **Warrior:** A combat specialist who survives and lands hits under pressure. Once per scene, as an Instant ability after a roll, either negate a successful attack roll against the Warrior or turn one of the Warrior's missed attacks into a hit. This does not negate environmental damage, effects without attack rolls, or attacks on an occupied vehicle. The class grants +2 maximum HP at level 1, already included above. The two assigned combat foci already include the Warrior's extra starting focus.
- **Psychic:** A trained user of psionic disciplines. The two listed disciplines are the class's two starting psychic skills; each starts at rank 0 and grants its level 0 core technique. Psychic powers use Effort as described below. Each Psychic has one assigned focus.

These descriptions are for level 1 play. Do not show level-up benefits or focus level 2 benefits in the premade core.

## Focus descriptions: level 1 only

- **Specialist (named skill):** The named noncombat, nonpsychic skill is its focus bonus skill. On checks using that skill, roll 3d6 and discard the lowest die, then apply the normal attribute and skill modifiers. Each separate Specialist entry applies only to its named skill.
- **Close Combatant (Shooter):** Grants Shoot. The Shooter can use pistol-sized ranged weapons in melee without the usual proximity penalty and ignores melee Shock damage, even without armor. This does not remove other penalties or grant immunity to a successful melee hit.
- **Assassin (Shooter):** Grants Sneak. The Shooter may conceal an item no larger than a pistol or knife against anything short of a strip search, including standard TL4 weapon detectors; producing it is an On Turn action. A point-blank ranged attack with that object from surprise cannot miss. Execution Attacks still follow the normal rules where relevant.
- **Shocking Assault (Stabber):** Grants Stab. The Shock damage of a qualifying weapon treats every target as AC 10, provided the weapon can harm that target at all. This affects Shock; it does not make the attack roll automatically hit.
- **Die Hard (Stabber):** Adds 2 maximum HP at level 1 and automatically stabilizes the character when mortally wounded by something less than a Heavy weapon. The HP is included in the starting total above.

## Psychic Effort and level 0 techniques

**Effort.** Maximum Effort is `max(1, 1 + highest psychic skill rank + max(Wisdom modifier, Constitution modifier))`. Every Psychic here has two rank 0 disciplines and a +1 modifier from either Wisdom or Constitution, so **Rose, Seer, and Magician each have maximum Effort 2**. Show available and committed Effort on the sheet. A power that says “Commit Effort” commits one point, unless it explicitly says otherwise. The commitment may last while the power is maintained, for the scene, or for the day, according to that power. Committed Effort is unavailable for other powers until the stated duration ends; a good night's rest restores all Effort. A scene commitment returns when that scene ends, while an all-day commitment remains unavailable until rest. The power descriptions below state their specific duration and action. Torching exists in the core rules but is outside the premade quick reference; refer to printed page 31 if the GM allows it.

- **Biopsionics-0 — Psychic Succor (Rose):** As a Main Action, touch a mortally wounded creature to stabilize it within six rounds of collapse. The target must be sufficiently intact; decapitation and Heavy weapon deaths are beyond this level 0 power. Commit Effort for the day to activate Succor, then it can be used again during the same scene without another commitment. Each use adds 1 System Strain to the target, or 2 if the target was mortally wounded. The level 0 technique stabilizes but does not restore HP. Biopsionic touch works through clothing and armor. A resisting target requires a Punch hit roll, with a bonus equal to the Biopsionics rank, and the touch itself does no Punch damage. A target cannot accept an effect that would raise System Strain above its Constitution score; System Strain normally falls by 1 after a well-fed night's rest.
- **Telepathy-0 — Telepathic Contact (Rose):** As a Main Action, commit Effort for the day to contact a sentient target perceptible to the psychic's unaided senses. The contact lasts at most one scene. At rank 0, the psychic perceives the target's emotional state; an intense emotion may yield a single related word or image. This is not thought reading, language translation, or two-way communication. Basic contact does not give the target a saving throw. It usually does not alert an ordinary target, though a target with relevant psionic sensitivity may detect it.
- **Precognition-0 — Oracle (Seer):** As a Main Action, commit Effort for the day to receive one brief vision about a question concerning the psychic's own future, viewed from their own vantage point. At rank 0 the horizon is one minute. The vision conveys at most about a minute of significant experience and reflects the most likely future, which can change. It concerns prospective actions and events, not arbitrary facts or the distant past. The same question or topic cannot be asked again until circumstances change substantially or a week passes.
- **Telekinesis-0 — Telekinetic Manipulation (Seer):** As a Main Action, commit Effort for the scene to manipulate one object or point within unaided sight or touch. At rank 0 this produces the force and dexterity of one hand using the psychic's own Strength. A moved object travels up to 20 meters per round. The effect can be maintained across rounds without another action or commitment, but the psychic must release it before using this technique on a second target. It cannot directly move an unwilling intelligent creature, lift the psychic, or serve as an effective attack on living or mobile targets at this rank.
- **Metapsionics-0 — Psychic Refinement (Magician):** The psychic can perceive the sight and sound of nearby psionic power use. When both source and target are visible, the psychic can identify the user even if the power itself is subtle. The psychic gains +2 on saving throws against psionic powers. This level 0 benefit does not require an Effort commitment.
- **Teleportation-0 — Personal Apportation (Magician):** As a Main Action, commit Effort for the scene to teleport up to 10 meters to a location the psychic can see unaided or has previously occupied. The psychic can bring only mass they could naturally carry; unwilling targets cannot be carried, and willing passengers must be touched. The psychic may leave worn or attached external matter behind, but cannot separate out matter inserted into the body. A jump that would embed the psychic in solid matter or immediately harmful surroundings aborts, wasting the action and committed Effort. Previously occupied destinations are anchored to the nearest major gravity well rather than to a moving vehicle.

## Equipment packages

Give the exact selected package from the book; packages replace starting credits, so their listed cash is the character's starting cash. Preserve item counts, ammunition, cell counts, weapon damage, and armor base AC. The same item can appear in more than one package. Armor does not stack: use the best worn armor's base AC plus Dexterity modifier. A weapon's hit bonus includes base attack bonus, applicable skill, and applicable attribute modifier; ranged energy weapons also get +1 to hit. Damage adds the relevant attribute modifier to the listed damage die. The package's printed damage numbers are before that modifier. Do not silently grant an extra battery or ammunition where the package does not list one.

| Package | Contents |
| --- | --- |
| Thief | Laser pistol (1d6), armored undersuit (AC 13), monoblade knife (1d6), climbing harness, low-light goggles, 2 type A cells, TL0 backpack, compad, metatool, 25 credits |
| Medic | Laser pistol (1d6), secure clothing (AC 13), 4 Lazarus patches, 2 doses of Lift, TL0 backpack, medkit, compad, bioscanner, 25 credits |
| Technician | Laser pistol (1d6), armored undersuit (AC 13), monoblade knife (1d6), postech toolkit, 6 units of spare parts, 4 type A cells, TL0 backpack, dataslab, metatool, 200 credits |
| Blade | Monoblade sword (1d8+1), woven body armor (AC 15), secure clothing (AC 13), thermal knife (1d6), TL0 backpack, compad, Lazarus patch, 50 credits |
| Soldier | Combat rifle (1d12), woven body armor (AC 15), knife (1d4), 80 rounds of ammunition, TL0 backpack, compad, 100 credits |
| Hacker | Laser pistol (1d6), secure clothing (AC 13), postech toolkit, 3 units of spare parts, dataslab, metatool, 2 line shunts, 2 type A cells, 100 credits |

### Equipment notes for play

- **Armor and weapons:** Armor values in the package table are base AC. Secure clothing and an armored undersuit can be worn discreetly; woven body armor is overt protection. Monoblades and the thermal knife are advanced melee weapons. Laser pistols use type A cells; the combat rifle uses conventional rounds. Preserve the weapon's range, magazine, encumbrance, and other detailed stats from the equipment chapter if the full sheet exposes them.
- **Cells and communications:** A type A cell powers personal devices and energy weapons. It is rechargeable, but is not interchangeable with a type B cell. A compad is a portable communications and computing device; useful wide-area communications depend on local infrastructure. A dataslab is a larger portable computing device.
- **Lazarus patch:** Apply to a character at 0 HP and make an Int/Heal or Dex/Heal check at difficulty 6 to stabilize them. Each round after the first adds a cumulative −1 penalty. Further attempts can be made each round, but the patch is useless after six rounds; only one patch can be applied to a victim. It cannot rescue someone killed by disease, poison, or unsurvivable bodily destruction. A stabilized character remains critically wounded until properly treated.
- **Lift:** Requires Heal-0 to administer. After five minutes of rest, restores `1d8 + administrator's Heal rank` HP to a living or stabilized target. It cannot help someone still mortally wounded. Each dose adds 1 System Strain; repeated doses to the same person on the same day require progressively higher Heal skill.
- **Medkit and bioscanner:** A medkit provides the medicines and tools for serious first aid and ongoing care. An untrained bioscanner user can spot broad physical distress; Heal-0 enables detailed diagnosis and DNA analysis. A bioscanner uses a type A cell for up to 24 hours of ordinary operation.
- **Technical gear:** A postech toolkit supports ordinary TL4 electronic and mechanical repair. A metatool is a wrist-sized set of small tools for temporary fixes rather than major jobs. Spare parts are consumed when a repair needs components; a Fix-0 user can also jury-rig a simple item from a unit of parts. A line shunt is a concealed, single-use device placed at a suitable site to access more secure computer systems.
- **Field gear:** A TL0 backpack carries the other gear. A climbing harness supports safe rope work; low-light goggles aid sight in dim conditions. These items do not by themselves grant a skill rank or remove situational checks.

## Presentation and scope

The player should be able to read the premade's title, profession, class, attributes and modifiers, HP, attack bonus, skill ranks, focus rules, equipment with quantities and useful mechanics, and (for Psychics) Effort and both level 0 techniques before choosing. Show focus and class benefits as already assigned, with no character-building decisions or level-up prompts. The CSV is a deliberately reduced, curated menu: do not fill gaps from the book's wider skill, focus, background, or equipment selection procedures. Rules descriptions should remain short enough to use at the table, with the book reference available for edge cases.
