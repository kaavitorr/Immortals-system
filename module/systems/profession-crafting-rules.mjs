import {MATERIAL_MARKETS} from './material-economy.mjs';
import {constitutionModifiers} from './constitution-rules.mjs';
import {destinyModifiers} from './cultivation-destiny.mjs';
import {refinedEquipmentProfile} from './refined-equipment.mjs';
import {PROFESSION_AUTHOR_RULES} from "./profession-products-data.mjs";
import {PROFESSION_SCOPE, getProfessionDefinition} from "./wuxia-professions.mjs";
import {professionDifficultyReduction} from "./cultivation-rank-benefits.mjs";

/** Authoritative native checks. Controle de Qi uses Constitution; the retired Espírito attribute is Intelecto. */
export const PROFESSION_CHECKS = Object.freeze({
  prestidigitation: Object.freeze({skill: "slt", ability: "dex", label: "Prestidigitação"}),
  creation: Object.freeze({skill: "ani", ability: "wis", label: "Criação"}),
  qiControl: Object.freeze({skill: "arc", ability: "con", label: "Controle de Qi"})
});
export const PILL_QUALITIES = Object.freeze([
  Object.freeze({key: "inferior", label: "Inferior", margin: 0, baseToxins: 20}),
  Object.freeze({key: "common", label: "Comum", margin: 3, baseToxins: 8}),
  Object.freeze({key: "superior", label: "Superior", margin: 8, baseToxins: 4}),
  Object.freeze({key: "perfect", label: "Perfeita", margin: 12, baseToxins: 2})
]);
export const PROFESSION_PRICE_CATALOG = MATERIAL_MARKETS;
export const BEAST_MAX_RANK_DIFFICULTIES = Object.freeze([12, 13, 15, 17, 20, 23, 25, 28, 32, 35]);

function number(value, label, {min = 0, integer = false} = {}) {
  if (typeof value === "boolean" || value === null || value === "" || !Number.isFinite(Number(value))) {
    throw Error(label + " inválido.");
  }
  const result = Number(value);
  if (result < min || integer && !Number.isInteger(result)) throw Error(label + " inválido.");
  return result;
}
function levelValue(value, {zero = false} = {}) {
  const level = number(value, "Nível", {min: zero ? 0 : 1, integer: true});
  if (level > 10) throw Error("O nível deve ser de " + (zero ? "0" : "1") + " a 10.");
  return level;
}
function savedFlag(actor, key) {
  return actor?.flags?.[PROFESSION_SCOPE]?.[key] ?? actor?.getFlag?.(PROFESSION_SCOPE, key);
}

/** Read a known profession level; malformed or absent saved levels remain uninitiated. */
export function professionLevel(actor, key) {
  getProfessionDefinition(key);
  const raw = savedFlag(actor, "professions")?.[key]?.level;
  try { return levelValue(raw, {zero: true}); }
  catch { return 0; }
}

/**
 * Build a read-only attempt plan. advancement=true is required for entry or the next level.
 * Product is catalog metadata, never a document to mutate. Variable/unknown DCs remain pending
 * until the caller supplies baseDC. Costs are quoted per attempt; this function never spends PC.
 */
export function professionCraftingPlan(actor, {
  profession, product, level, firstRecipe = false, advancement = false, baseDC
} = {}) {
  getProfessionDefinition(profession);
  level = levelValue(level);
  const currentLevel = professionLevel(actor, profession);
  if (product?.profession && product.profession !== profession) throw Error("O produto pertence a outra profissão.");
  const minimum = levelValue(product?.levels?.min ?? 1), maximum = levelValue(product?.levels?.max ?? 10);
  if (maximum < minimum || level < minimum || level > maximum) throw Error("Nível inválido para este produto.");
  if (advancement && (currentLevel >= 10 || level !== currentLevel + 1)) {
    throw Error("O avanço deve alcançar apenas o próximo nível profissional.");
  }
  if (!advancement && level > currentLevel) throw Error("O produto excede seu nível profissional; escolha um avanço.");
  const entry = advancement && currentLevel === 0;
  const pcCost = advancement ? 5 * level : 0;
  const rawPC = actor?.system?.cultivation?.points;
  const pcAvailable = typeof rawPC !== "boolean" && Number.isFinite(Number(rawPC)) ? Math.max(0, Number(rawPC)) : 0;
  const checks = entry ? [PROFESSION_CHECKS.qiControl]
    : profession === "beasts" ? [PROFESSION_CHECKS.creation]
      : profession === "matrices" ? [PROFESSION_CHECKS.creation, PROFESSION_CHECKS.qiControl]
        : [PROFESSION_CHECKS.prestidigitation, PROFESSION_CHECKS.creation, PROFESSION_CHECKS.qiControl];
  const pending = [];
  let resolvedDC = null;
  if (entry) resolvedDC = 20;
  else if (baseDC !== undefined) {
    resolvedDC = number(baseDC, "CD");
    if (product?.dc && (resolvedDC < product.dc.min || resolvedDC > product.dc.max)) {
      throw Error("A CD deve respeitar o intervalo do produto.");
    }
  } else if (typeof product?.dc === "number") resolvedDC = number(product.dc, "CD");
  else if (product?.dc?.min !== undefined && product.dc.min === product.dc.max) {
    resolvedDC = number(product.dc.min, "CD");
  } else pending.push("baseDC");
  const levelReduction = 2 * Math.max(0, currentLevel - level);
  const cultivationReduction = professionDifficultyReduction(actor, level);
  const constitution=constitutionModifiers(actor);
  const constitutionReduction=profession==='alchemy'&&product?.kind==='pill'?(firstRecipe?constitution.newPillDCReduction:constitution.knownPillDCReduction):0;
  const advancementIncrease = advancement && !entry ? 5 : 0;
  const destinyReduction = advancement ? destinyModifiers(actor).professionCDReduction : 0;
  const dc = resolvedDC === null ? null : resolvedDC + advancementIncrease - levelReduction - cultivationReduction - (entry?0:constitutionReduction) - destinyReduction;
  const manualPrerequisites = entry ? ["mentor", "studentTalent", "materials", "tools"] : ["materials", "tools"];
  if (entry && profession === "alchemy") manualPrerequisites.push("fireConceptLevel1");
  let qualityCheck = null;
  if (entry && product?.kind === "pill") {
    const recipeDC = baseDC === undefined ? product.dc?.min === product.dc?.max ? product.dc?.min : null : number(baseDC, "CD");
    if (recipeDC === null || recipeDC === undefined) pending.push("qualityDC");
    else {
      if (product.dc && (recipeDC < product.dc.min || recipeDC > product.dc.max)) throw Error("A CD deve respeitar o intervalo do produto.");
      qualityCheck = {...PROFESSION_CHECKS.creation, dc: recipeDC - cultivationReduction - constitutionReduction};
    }
  }
  return {
    qualityCheck, profession, productId: product?.id ?? null, currentLevel, targetLevel: level,
    entry, advancement: Boolean(advancement), firstRecipe: Boolean(firstRecipe),
    pcCost, pcAvailable, pcAffordable: pcAvailable >= pcCost, pcPath: "system.cultivation.points",
    baseDC: resolvedDC, dc, advancementIncrease, levelReduction, cultivationReduction, constitutionReduction, destinyReduction,
    checks: checks.map(check => ({...check})),
    durationHours: ["alchemy", "matrices"].includes(profession) ? level * (firstRecipe ? 10 : 1) : null,
    manualPrerequisites, requiresPrerequisiteConfirmation: true, pending
  };
}

/**
 * All native checks must pass. method='minimum' uses the smallest margin; method='creation'
 * uses ani/creation, or the second check in a three-check sequence (first in a two-check one).
 * Creation is the author-confirmed default; the other checks remain mandatory.
 */
export function qualityResult(totals, dc, {method = PROFESSION_AUTHOR_RULES.pillQuality} = {}) {
  dc = number(dc, "CD", {min: -Infinity});
  const entries = Array.isArray(totals) ? totals : Object.entries(totals ?? {}).map(([skill, total]) => ({skill, total}));
  if (!entries.length) throw Error("Informe os resultados dos testes.");
  const values = entries.map(entry => number(typeof entry === "object" && entry !== null ? entry.total : entry, "Resultado", {min: -Infinity}));
  const success = values.every(total => total >= dc);
  const empty = {success, pending: false, method: method ?? null, key: null, label: null, quality: null, qualityIndex: null, margin: null, baseToxins: null};
  if (!success) return empty;
  if (!["minimum", "creation"].includes(method)) return {...empty, pending: true};
  let criterion;
  if (method === "minimum") criterion = Math.min(...values);
  else {
    const marked = entries.findIndex(entry => entry && typeof entry === "object" && ["ani", "creation"].includes(entry.skill));
    criterion = values[marked >= 0 ? marked : values.length === 3 ? 1 : 0];
  }
  const margin = criterion - dc;
  const qualityIndex = PILL_QUALITIES.findLastIndex(quality => margin >= quality.margin);
  const quality = PILL_QUALITIES[qualityIndex];
  return {...empty, key: quality.key, label: quality.label, quality: quality.key, qualityIndex, margin, baseToxins: quality.baseToxins};
}

/** Only Sangue Divino/Nutrição da Alma request floor=true; other pills retain fractions. */
export function pillToxinAmount(baseQuality, multiplier, {floor = false} = {}) {
  let base;
  if (typeof baseQuality === "number") base = number(baseQuality, "Toxina base");
  else if (baseQuality && typeof baseQuality === "object") base = number(baseQuality.baseToxins, "Toxina base");
  else {
    const quality = PILL_QUALITIES.find(entry => entry.key === baseQuality);
    if (!quality) throw Error("Qualidade da pílula inválida.");
    base = quality.baseToxins;
  }
  const amount = base * number(multiplier, "Multiplicador de toxina");
  return floor ? Math.floor(amount) : amount;
}

/** Toxicity is never capped at 100. Once exceeded, the cultivation block lasts until zero. */
export function toxicityPenalties(toxins, {blockedUntilClear = false} = {}) {
  const value = number(toxins, "Toxinas");
  return {value, rankDC: Math.floor(value / 10), rankPC: Math.floor(value / 10), stagePC: Math.floor(value / 5),
    blockedUntilClear: value > 0 && (value > 100 || blockedUntilClear === true)};
}

/** The peak is persisted because detox rates do not drop when current toxicity drops. */
export function toxinState(actor) {
  const saved = savedFlag(actor, "pillToxins") ?? {};
  const value = typeof saved.value === "number" && Number.isFinite(saved.value) && saved.value >= 0 ? saved.value : 0;
  const peak = typeof saved.highestValue === "number" && Number.isFinite(saved.highestValue) ? saved.highestValue : value;
  return {value, highestValue: value ? Math.max(value, peak) : 0,
    blockedUntilClear: toxicityPenalties(value, {blockedUntilClear: saved.blockedUntilClear}).blockedUntilClear};
}

/** Return an actor update payload; calling it never mutates the actor or consumes a pill. */
export function toxinStateUpdate(actor, toxins) {
  const value = number(toxins, "Toxinas"), previous = toxinState(actor);
  const state = {value, highestValue: value ? Math.max(value, previous.highestValue) : 0,
    blockedUntilClear: toxicityPenalties(value, previous).blockedUntilClear};
  return {state, updates: {["flags." + PROFESSION_SCOPE + ".pillToxins"]: {...state}}};
}

/** One calendar month is not silently treated as 30 days. Above 90 has no authored rate. */
export function detoxPeriod(toxins, {highestValue = toxins, monthDays} = {}) {
  const value = number(toxins, "Toxinas"), peak = Math.max(value, number(highestValue, "Pico de toxinas"));
  const result = {value, highestValue: value ? peak : 0, daysPerPoint: 0, calendarMonthsPerPoint: 0, requiresCalendar: false, pending: false};
  if (!value) return result;
  if (peak <= 20) return {...result, daysPerPoint: 5};
  if (peak <= 50) return {...result, daysPerPoint: 10};
  if (peak <= 90) return {...result, daysPerPoint: monthDays === undefined ? null : number(monthDays, "Dias do mês", {min: 1, integer: true}),
    calendarMonthsPerPoint: 1, requiresCalendar: monthDays === undefined};
  return {...result, daysPerPoint: null, pending: true, reason: "detoxAbove90"};
}

const TREASURE_LEVELS = Object.freeze([
  ["human", "Humano", "inferior", "Inferior", 0, 0],
  ["human", "Humano", "common", "Comum", 0, 1],
  ["human", "Humano", "superior", "Superior", 0, 2],
  ["earth", "Terra", "common", "Comum", 1, 4],
  ["heaven", "Céu", "inferior", "Inferior", 2, 6],
  ["heaven", "Céu", "superior", "Superior", 2, 8],
  ["sacred", "Sagrado", "inferior", "Inferior", 3, 9],
  ["sacred", "Sagrado", "superior", "Superior", 3, 11],
  ["divine", "Divino", "unique", "Única", 4, 12],
  ["supreme", "Supremo", "unique", "Única", 5, 13]
]);

/**
 * Cumulative classSteps include the intermediate inferior/common/superior classes even where
 * the crafting equivalence table shows '-'. This reproduces the source's Supreme 27 PQ cap.
 * CR is the native resistance class; movement is in meters. No creation DC is guessed here.
 */
export function treasureProfile(level) {
  level = levelValue(level);
  const [rank, rankLabel, quality, qualityLabel, rankIndex, classSteps] = TREASURE_LEVELS[level - 1];
  return {level, rank, rankLabel, quality, qualityLabel, rankIndex, classSteps,
    armor: {...refinedEquipmentProfile(level).armor},
    weapon: {...refinedEquipmentProfile(level).weapon},
    accessory: {qiLimit: Math.min(27, 4 + classSteps + 2 * rankIndex)},
    flying: {cr: 18 + 2 * rankIndex, movement: 21 + 3 * classSteps}};
}

/** The caller must supply the material/equivalent level; the source does not select it. */
export function treasureCraftingDC({equipmentLevel, equivalentLevel} = {}) {
  return 10 + 2 * Math.max(0, levelValue(equipmentLevel) - levelValue(equivalentLevel));
}

/** Eligibility/duration use current rank; difficulty uses maximum adult rank. No beast is created. */
export function beastDomesticationPlan({professionLevel: professional, currentRank, maxRank, adult = false, failures = 0} = {}) {
  professional = levelValue(professional, {zero: true});
  currentRank = levelValue(currentRank); maxRank = levelValue(maxRank);
  failures = number(failures, "Falhas", {integer: true});
  if (maxRank < currentRank) throw Error("O Rank máximo não pode ser inferior ao Rank atual.");
  const permanentFailure = failures >= 3, baseDC = BEAST_MAX_RANK_DIFFICULTIES[maxRank - 1];
  const levelReduction = 2 * Math.max(0, professional - currentRank);
  return {professionLevel: professional, currentRank, maxRank, adult: Boolean(adult), failures,
    eligible: !adult && currentRank <= professional && !permanentFailure, permanentFailure,
    durationDays: 2 * currentRank, baseDC, levelReduction, dc: baseDC - levelReduction,
    check: {...PROFESSION_CHECKS.creation}, maximumFailures: 3};
}

export function beastGrowthMultiplier(professional, currentRank) {
  return 5 ** Math.max(0, levelValue(professional, {zero: true}) - levelValue(currentRank));
}

/**
 * Percentages use materials by default. Gold and each crystal rank remain separate.
 * Upper catalogue levels use their own crystal markets, without rank or gold conversion.
 */
export function professionPrice(level, {basis = PROFESSION_AUTHOR_RULES.priceBasis, creationPercent, salePercent} = {}) {
  level = levelValue(level);
  if (basis !== undefined && !["materials", "recipeAndMaterials"].includes(basis)) throw Error("Base percentual inválida.");
  const creationRate = number(creationPercent, "Percentual de criação");
  const saleRate = salePercent === undefined || salePercent === null ? null : number(salePercent, "Percentual de venda");
  const catalog = PROFESSION_PRICE_CATALOG[level] ?? null;
  const result = {level, basis: basis ?? null, catalog: catalog ? {...catalog} : null,
    creationPercent: creationRate, salePercent: saleRate, pending: !basis || !catalog,
    reason: !catalog ? "marketQuote" : !basis ? "percentageBasis" : null,
    marketManual: !catalog, creation: null, sale: null};
  if (!basis || !catalog) return result;
  const base = catalog.materials + (basis === "recipeAndMaterials" ? catalog.recipe : 0);
  const denomination = {currency: catalog.currency, rank: catalog.rank};
  const creation = {amount: base * creationRate / 100, ...denomination};
  return {...result, creation, sale: saleRate === null ? null : {amount: creation.amount * saleRate / 100, ...denomination}};
}
