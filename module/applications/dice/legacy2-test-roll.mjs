import Ruleset, { MAX_VANTAGENS } from "../../systems/ruleset.mjs";
import { conditionRollAdvantages } from "../../systems/legacy2-condition-rolls.mjs";
import { isElementalTrainingCheck, elementalTrainingRollConfig } from "../../systems/elemental-training-roll.mjs";

const count = value => Number.isFinite(Number(value)) ? Math.min(MAX_VANTAGENS, Math.max(0, Math.floor(Number(value)))) : 0;
const valueAt = (data, key) => key.split(".").reduce((v, part) => v?.[part], data);
const signed = value => Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? "+" : ""}${Number(value)}` : String(value);
const isInitiativeTest = process => !!process?.hookNames?.includes("initiativeDialog");
const conditionHistory = new WeakMap();

export function hasLegacy2Test(process) {
  return Ruleset.isV2() && !!process?.subject?.system?.abilities && !process.subject.item
    && !!(process.ability || process.skill || process.tool || isInitiativeTest(process));
}

function automaticConditions(process, formData, roll) {
  const save = process.hookNames?.some(name => /saving|save/i.test(name));
  const ability = formData?.get("ability") ?? roll?.data?.abilityId ?? roll?.data?.roll?.ability
    ?? conditionHistory.get(process)?.ability ?? process.ability;
  const alternative = save ? Ruleset.alternativeSave(process.subject, ability) : null;
  const conditions = Ruleset.isV2() ? conditionRollAdvantages(process.subject, {
    kind: isInitiativeTest(process) ? "initiative" : save ? "save" : "check", ability: alternative?.key ?? ability,
    skill: process.skill, target: Array.from(globalThis.game?.user?.targets ?? [])[0]?.actor
  }) : { vantagens: 0, desvantagens: 0 };
  return { ...conditions, ability };
}

export function testRollChoices(process, formData, roll) {
  if (isElementalTrainingCheck(process)) return { vantagens: 0, desvantagens: 0 };
  const options = roll?.options ?? process.rolls?.[0]?.options ?? {};
  const advMode = globalThis.CONFIG?.Dice?.D20Roll?.ADV_MODE ?? { ADVANTAGE: 1, DISADVANTAGE: -1 };
  const conditions = automaticConditions(process, formData, roll), previous = conditionHistory.get(process);
  const choose = (key, native) => {
    const explicit = formData?.get(`jj2Test.${key}`) ?? process.legacy2?.[key];
    if (explicit == null) return count(conditions[key] + Number(native));
    // Only replace the automatic component when the attribute/conditions change; retain manual adjustments.
    return count(Number(explicit) + (previous ? conditions[key] - previous[key] : 0));
  };
  return {
    vantagens: choose("vantagens", !!(process.advantage || options.advantage || options.advantageMode === advMode.ADVANTAGE)),
    desvantagens: choose("desvantagens", !!(process.disadvantage || options.disadvantage || options.advantageMode === advMode.DISADVANTAGE))
  };
}

/** Called after actor builders: replace their old advantage term instead of adding it twice. */
export function applyLegacy2TestRoll(roll, process, formData) {
  if (isElementalTrainingCheck(process)) return elementalTrainingRollConfig(roll, process);
  if (!hasLegacy2Test(process)) return roll;
  const choices = testRollChoices(process, formData, roll);
  process.legacy2 = { ...process.legacy2, ...choices };
  conditionHistory.set(process, automaticConditions(process, formData, roll));
  const bonus = Ruleset.netAdvantageBonus(choices.vantagens, choices.desvantagens);
  roll.parts = (roll.parts ?? []).filter(part => part !== "@legacyAdv");
  if (bonus) roll.parts.push("@legacyAdv");
  roll.data ??= {};
  roll.data.legacyAdv = bonus;
  const soulContext=automaticConditions(process,formData,roll);
  const isSave=process.hookNames?.some(name=>/saving|save/i.test(name));
  const saveKey=Ruleset.alternativeSave(process.subject,soulContext.ability)?.key??soulContext.ability;
  const soulDefense=isSave?Ruleset.soulSaveBonus(process.subject,saveKey,{mindSoul:process.legacy2?.mindSoul===true}):0;
  roll.parts=roll.parts.filter(part=>part!=="@soulDefense");
  if(soulDefense)roll.parts.push("@soulDefense");roll.data.soulDefense=soulDefense;
  roll.options ??= {};
  roll.options.advantageMode = globalThis.CONFIG?.Dice?.D20Roll?.ADV_MODE?.NORMAL ?? 0;
  roll.options.advantage = false;
  roll.options.disadvantage = false;
  roll.options.jj2TestParts = [...roll.parts];
  return roll;
}

/** Display the actual prepared formula components, including changed ability and active conditions. */
export function testRollBreakdown(process, roll, index = 0) {
  const initiative = isInitiativeTest(process);
  const ability = roll.data?.abilityId ?? process.ability;
  const parts = roll.parts ?? roll.options?.jj2TestParts ?? [];
  const save = process.hookNames?.some(name => /saving|save/i.test(name));
  const alternative = save ? Ruleset.alternativeSave(process.subject, ability) : null;
  const hasRank = !!(parts.includes("@legacyRank") || process.skill || save);
  const names = { soulDefense:"Defesa da Alma", ruleBonus: "Efeitos", extraBonus: "Bônus adicional", cover: "Cobertura", exhaustion: "Exaustão" };
  const extras = parts.filter(part => !["@mod", "@legacyRank", "@legacyAdv", "@situational"].includes(part))
    .map(part => {
      const key = /^@([\w.]+)$/.exec(String(part))?.[1];
      const value = String(part).replace(/@([\w.]+)/g, (match, path) => valueAt(roll.data, path) ?? match);
      return { label: names[key] ?? "Bônus adicional", value: signed(value) };
    });
  return { index, ability, attributeLabel: initiative ? "Iniciativa" : alternative ? "Média dos atributos" : "Atributo",
    abilityLabel: initiative ? "Base" : alternative?.label ?? globalThis.CONFIG?.DND5E?.abilities?.[ability]?.label ?? ability,
    abilityValue: roll.data?.mod ?? (initiative ? process.subject.system.attributes?.init?.mod : process.subject.system.abilities?.[ability]?.value) ?? 0,
    hasRank, rankValue: roll.data?.legacyRank ?? 0, rankValueLabel: signed(roll.data?.legacyRank ?? 0), rankLabel: save ? "Salvaguarda" : process.skill ? "Perícia" : "Treinamento",
    rankDetail: process.skill ? globalThis.CONFIG?.DND5E?.skills?.[process.skill]?.label : "",
    situational: roll.data?.situational ?? "0", extras };
}
