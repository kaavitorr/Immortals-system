import Ruleset from "./ruleset.mjs";

/** Explicit marker for the book's restricted Controle de Qi training check. */
export function isElementalTrainingCheck(process) {
  return process?.legacy2?.elementalTraining === true && process.skill === "arc"
    && !!process.subject?.system?.abilities && !process.subject.item;
}

/** Rebuild, rather than filter, the check so inherited formulas cannot add bonuses or rerolls. */
export function elementalTrainingRollConfig(roll, process) {
  if (!isElementalTrainingCheck(process)) return roll;
  const actor = process.subject, rank = Ruleset.skillRank(actor, "arc"), rankPart = Ruleset.rankPart(rank);
  const value = Number(actor.system.abilities.con?.value);
  const parts = ["@mod", ...(rankPart == null ? [] : ["@legacyRank"])];
  const options = {...roll.options};
  for (const key of ["minimum", "maximum", "fixed", "reroll", "rerolls", "rerollOnce", "rerollAll",
    "maximize", "minimize", "autoSuccess", "forceSuccess", "bonus", "extraBonus", "ruleBonus", "situational"]) delete options[key];
  Object.assign(options, {advantageMode: 0, advantage: false, disadvantage: false,
    halflingLucky: false, reliableTalent: false, elvenAccuracy: false, configured: false,
    elementalTraining: true, jj2TestParts: [...parts]});
  return {...roll, parts, situational: false, options, data: {
    abilityId: "con", mod: Number.isFinite(value) ? value : 0, legacyRank: rankPart ?? 0,
    roll: {ability: "con", skill: "arc", type: "skill", proficient: rank >= 1}
  }};
}
