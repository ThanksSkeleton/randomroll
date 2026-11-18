# Milestone 1: Premade character core

This spec defines the fixed level 1 *Stars Without Number: Revised Edition* premade menu for the P1b player flow in [mega_spec.md](mega_spec.md). The companion [premades](Premades.csv), [stat packages](PremadeStatPackages.csv), and [professions](PremadeProfessions.csv) CSVs are the source of truth for the nine premade assignments, attribute packages, profession skill selections, and equipment package selections. The local rules reference is `temp/StarsWithoutNumberRevised-FreeEdition-122917.pdf`, especially printed pages 17–25, 31–42, and 66–75. Descriptions for classes, foci, psionics, and equipment are intentionally absent from this spec. Producing player-facing text by consulting the manual and editing its descriptions down is part of implementation work.

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

Use exactly these skill sources: the Bonus Skill column, the bonus skill from each assigned focus, the three skills listed for the chosen default profession in the professions CSV, and the two class-granted disciplines on each Psychic row. The profession's *three listed skills* replace any broader background procedure in the book. Do not add other background, hobby, or discretionary skills. A skill selected once is rank 0; a skill selected twice is rank 1. No current premade selects a skill three times. For displayed untrained skills, rank −1 applies only to the reduced allowed skill vocabulary found across the premade and profession selections, not to every skill in the SWN book. The CSVs use the spellings `Survive` and `Telekinesis`.

The intended duplicate selections are Connect-1 for Thief, Shoot-1 for Scientist, Sneak-1 for Shooter, and Stab-1 for Stabber. All other selected conventional skills are rank 0. Each Psychic's two disciplines are rank 0 and grant only their respective level 0 core techniques; the premades have no higher-level psychic techniques.

Use a rounded-up average for the 1d6 hit die: **4**. Maximum HP is `max(1, 4 + Constitution modifier + (Warrior ? 2 : 0) + (Die Hard ? 2 : 0))`. Thus the starting totals are Thief 4, Scientist 4, Technician 4, Captain 4, Shooter 6, Stabber 8, Rose 4, Seer 4, and Magician 5. Die Hard's bonus is separate from the Warrior class bonus. These values are fixed, with no HP roll in the premade selection flow.

## Player-facing rules text to produce during implementation

The implementation must consult the cited manual and create concise, useful player-facing descriptions for the three classes, all five assigned focus types, each of the six rank 0 psychic disciplines and its level 0 core technique, Psychic Effort, and equipment items that need explanation. This transcription and editing work is a deliverable of P1b, not text supplied by this spec. Preserve the level 1 mechanical effects, action types, ranges, costs, durations, limits, and exceptions that matter during play. Do not include class advancement or level 2 focus benefits in the premade view. Where a rule has an edge case too long for the compact view, provide a book page reference.

The class descriptions should explain what an Expert, Warrior, and Psychic does and include their level 1 class abilities. The two Expert foci and two Warrior foci shown above already account for their extra starting focus; do not offer another focus choice. The Psychic's two listed rank 0 disciplines are its class-granted psychic skills and give only the rank 0 core techniques. Do not invent higher-level techniques or extra selections.

For each focus, describe its benefit as assigned to these premades: Specialist for the named skill, Close Combatant and Assassin for Shooter, and Shocking Assault and Die Hard for Stabber. For psychic rules, describe how to calculate, commit, recover, and track Effort; describe all six level 0 core techniques at sufficient detail for a new player to use them. Maximum Effort is `max(1, 1 + highest psychic skill rank + max(Wisdom modifier, Constitution modifier))`; Rose, Seer, and Magician each start with **2 Effort**. Include the meaning of the commitment durations used by those techniques. Each listed discipline needs its rank 0 core technique described from the manual.

## Equipment packages

Each premade receives the equipment package named in its CSV row. During implementation, transcribe each selected package's complete item list, quantities, starting credits, and relevant statistics from the manual. Produce concise player-facing explanations for items whose use is not obvious, including any rules needed to use them in a level 1 one-shot. This spec intentionally does not contain the package lists or item descriptions; deriving and editing them from the manual is part of the P1b work. Do not substitute another package or use the manual's starting-credit shopping procedure.

## Presentation and scope

The player should be able to read the premade's title, profession, class, attributes and modifiers, HP, attack bonus, skill ranks, focus rules, equipment with quantities and useful mechanics, and (for Psychics) Effort and both level 0 techniques before choosing. Show focus and class benefits as already assigned, with no character-building decisions or level-up prompts. The CSV is a deliberately reduced, curated menu: do not fill gaps from the book's wider skill, focus, background, or equipment selection procedures. Rules descriptions should remain short enough to use at the table, with the book reference available for edge cases.
