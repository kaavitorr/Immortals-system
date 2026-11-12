/** Shared skill identifiers and labels for character sheets and NPC profile authoring. */
export const WUXIA_SKILLS = Object.freeze({
  prc: { label: "Percepção", ability: "wis",
    description: "Usada para perceber criaturas, objetos e mudanças ao redor. Usa Sabedoria." },
  arc: { label: "Controle de Qi", ability: "con",
    description: "Abrange o estudo do Qi e o controle dessa energia, independentemente de suas habilidades. Usa Constituição." },
  ani: { label: "Criação", ability: "wis",
    description: "Testa seus conhecimentos de criação relacionados à sua profissão. Usa Sabedoria." }
});

/** The renamed skills use their own hover text instead of legacy journal pages. */
export function wuxiaSkillTooltip(key) {
  const skill = WUXIA_SKILLS[key];
  return skill ? `<strong>${skill.label}</strong><p>${skill.description}</p>` : null;
}

export const SKILL_GROUPS = [
  { label: "Exploração", icon: "movement", skills: [
    ["ath", "Atletismo", "str"], ["acr", "Coordenação", "dex"], ["prc", WUXIA_SKILLS.prc.label, WUXIA_SKILLS.prc.ability],
    ["ste", "Furtividade", "dex"], ["sur", "Sobrevivência", "wis"]
  ] },
  { label: "Conhecimento", icon: "int", skills: [
    ["arc", WUXIA_SKILLS.arc.label, WUXIA_SKILLS.arc.ability], ["rel", "Medicina", "wis"], ["inv", "Investigação", "int"],
    ["his", "História", "int"], ["ani", WUXIA_SKILLS.ani.label, WUXIA_SKILLS.ani.ability]
  ] },
  { label: "Influência", icon: "cha", skills: [
    ["dec", "Enganação", "cha"], ["per", "Persuasão", "cha"], ["itm", "Intimidação", "cha"],
    ["prf", "Atuação", "cha"], ["luc", "Sorte", "cha"]
  ] }
];

/** Dedicated artwork for each skill; stored locally so Crucible is not a runtime dependency. */
export const WUXIA_SKILL_ICONS = Object.freeze({
  "ath": "systems/Immortals-system/assets/wuxia/skills/ath.jpg",
  "acr": "systems/Immortals-system/assets/wuxia/skills/acr.jpg",
  "prc": "systems/Immortals-system/assets/wuxia/skills/prc.jpg",
  "ste": "systems/Immortals-system/assets/wuxia/skills/ste.jpg",
  "sur": "systems/Immortals-system/assets/wuxia/skills/sur.jpg",
  "arc": "systems/Immortals-system/assets/wuxia/skills/arc.jpg",
  "rel": "systems/Immortals-system/assets/wuxia/skills/rel.jpg",
  "inv": "systems/Immortals-system/assets/wuxia/skills/inv.jpg",
  "his": "systems/Immortals-system/assets/wuxia/skills/his.jpg",
  "ani": "systems/Immortals-system/assets/wuxia/skills/ani.jpg",
  "dec": "systems/Immortals-system/assets/wuxia/skills/dec.jpg",
  "per": "systems/Immortals-system/assets/wuxia/skills/per.jpg",
  "itm": "systems/Immortals-system/assets/wuxia/skills/itm.jpg",
  "prf": "systems/Immortals-system/assets/wuxia/skills/prf.jpg",
  "luc": "systems/Immortals-system/assets/wuxia/skills/luc.webp"
});
