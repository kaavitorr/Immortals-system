import {npcCultivationRank} from './npc-cultivation.mjs';
import {destinyEssenceAllowed, destinyState} from './cultivation-destiny.mjs';
/** Beast Essence rules. Pure functions never update native documents. */
export const BEAST_ESSENCE_SCOPE = "Immortals-system";
export const ESSENCE_GROWTH = Object.freeze({
  human: Object.freeze({label: "Humano", index: 0, limitRank: 2, rollMin: 1, rollMax: 10}),
  earth: Object.freeze({label: "Terra", index: 1, limitRank: 4, rollMin: 11, rollMax: 20}),
  heaven: Object.freeze({label: "Céu", index: 2, limitRank: 6, rollMin: 21, rollMax: 50}),
  sacred: Object.freeze({label: "Sagrado", index: 3, limitRank: 7, rollMin: 51, rollMax: 80}),
  divine: Object.freeze({label: "Divino", index: 4, limitRank: 9, rollMin: 81, rollMax: 99}),
  supreme: Object.freeze({label: "Supremo", index: 5, limitRank: 10, rollMin: 100, rollMax: 100})
});
/** Full suspension follows the growth rule; unresolved numeric passages remain unset. */
export const BEAST_ESSENCE_POLICY = Object.freeze({qiByGrowth: null, attackDamageRule: null, stopPermanentBenefits: true, halfCostRounding: null});
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const integer = value => Math.max(0, Math.trunc(number(value)));
const scope=BEAST_ESSENCE_SCOPE;
export const beastEssenceFlags = actor => actor?.flags?.[scope]?.beastEssence ?? {};
export const beastEssenceDefinition = item => item?.flags?.[scope]?.beastEssenceItem?.version===1 ? item.flags[scope].beastEssenceItem.definition : null;
const growthOf = value => {if (!Object.hasOwn(ESSENCE_GROWTH, value)) throw new RangeError("Nível de crescimento de essência inválido."); return ESSENCE_GROWTH[value];};
/**
 *
 * @param actor
 */
export function essenceCultivationRank(actor) {
  const derived=npcCultivationRank(actor);if(derived!==null)return derived;
  const value=actor?.type==="npc"?actor?.flags?.[scope]?.cultivationRank:actor?.system?.cultivation?.rank;
  return value!==null && value!==undefined && value!=="" && Number.isInteger(Number(value)) && Number(value)>=0 && Number(value)<=10 ? Number(value):0;
}
/**
 *
 * @param growth
 * @param rank
 */
export function essenceGrowthState(growth, rank) {
  const {limitRank}=growthOf(growth); rank=integer(rank);
  if (rank<1 || rank>10) return "dormant";
  return rank<=limitRank?"normal":rank===limitRank+1?"weakened":"dormant";
}
/**
 *
 * @param actor
 */
export function essenceState(actor) {
  const flags=beastEssenceFlags(actor); const essence=flags.integrated?.version===1&&Object.hasOwn(ESSENCE_GROWTH, flags.integrated.growth)?flags.integrated:null;
  const rank=essenceCultivationRank(actor); const growth=essence?ESSENCE_GROWTH[essence.growth]:null;
  const destiny=destinyState(actor), permitted=destinyEssenceAllowed(actor, essence)&&(destiny.key!=="divine-lineage"||destiny.unlocked);
  const mode=essence?(permitted?essenceGrowthState(essence.growth, rank):"dormant"):"none";
  const active=!!essence&&flags.transformation?.active===true&&flags.transformation.integrationId===essence.id&&["normal", "weakened"].includes(mode);
  const stage=Math.min(3, Math.max(1, integer(actor?.system?.cultivation?.stage)||1));
  const level=rank?((rank-1)*3+stage):0;
  const passives=!!essence&&mode!=="dormant";
  return {essence, active, mode, rank, affinityPending: passives&&BEAST_ESSENCE_POLICY.halfCostRounding===null, attackCostsPending: BEAST_ESSENCE_POLICY.attackDamageRule===null, limitRank: growth?.limitRank??0, effectiveLevel: growth?Math.min(level, growth.limitRank*3):0,
    qiBonus: essence?(passives?(BEAST_ESSENCE_POLICY.qiByGrowth?.[essence.growth]??null):0):0,
    upkeepQi: mode==="weakened"?3:mode==="normal"?2:0, ability: essence?.ability??null,
    formAbilityBonus: mode==="normal"?2:mode==="weakened"?1:0, abilityBonus: active?(mode==="weakened"?1:2):0, abilityCap: mode==="weakened"?12:15,
    affinityLevelLimit: passives?(["divine", "supreme"].includes(essence.growth)?10:5):0, elements: passives?[...(essence.elements??[])]:[]};
}
/**
 * Preserve base distribution even if this preparation pass already applied the bonus.
 * @param actor
 */
export function essenceAttributeAdjustment(actor) {
  const state=essenceState(actor); const key=state.ability; const field=actor?.system?.abilities?.[key]; const prepared=actor?.system?._beastEssenceAttribute;
  const before=number(field?.value)-(prepared?.key===key?number(prepared.delta):0);
  const after=state.active?Math.max(before, Math.min(state.abilityCap, before+state.abilityBonus)):before;
  return {key, before, after, delta: after-before, cap: state.abilityCap};
}
/**
 *
 * @param actor
 */
export function prepareBeastEssenceAttribute(actor) {
  const value=essenceAttributeAdjustment(actor); actor.system._beastEssenceAttribute=value;
  if (value.key&&actor.system.abilities?.[value.key])actor.system.abilities[value.key].value=value.after;
  return value;
}
/**
 *
 * @param actor
 * @param key
 */
export function essenceAbilityDelta(actor, key) {const value=actor?.system?._beastEssenceAttribute; return value?.key===key?number(value.delta):0;}
/**
 *
 * @param actor
 * @param element
 * @param targetLevel
 */
export function essenceAffinity(actor, element, targetLevel) {
  const state=essenceState(actor); const level=Number(targetLevel);
  return {eligible: state.elements.includes(element)&&Number.isInteger(level)&&level>=1&&level<=state.affinityLevelLimit, limit: state.affinityLevelLimit, growth: state.essence?.growth??null};
}
/**
 *
 * @param actor
 * @param element
 * @param targetLevel
 * @param cost
 */
export function essenceAffinityCost(actor, element, targetLevel, cost) {
  const affinity=essenceAffinity(actor, element, targetLevel); if (!affinity.eligible) return cost;
  const rounding=BEAST_ESSENCE_POLICY.halfCostRounding; if (rounding===null||essenceState(actor).mode==="dormant"&&BEAST_ESSENCE_POLICY.stopPermanentBenefits===null) return {...cost, essenceAffinityPending: true};
  const half=value => rounding==="up"?Math.ceil(number(value)/2):rounding==="down"?Math.floor(number(value)/2):number(value)/2;
  return {...cost, qi: half(cost.qi), pt: half(cost.pt)};
}
/**
 *
 * @param essence
 */
export function essenceIntegrationDC(essence) {return 10+2*growthOf(essence?.growth).index;}
/**
 *
 * @param actor
 * @param item
 * @param root0
 * @param root0.rollTotal
 */
export function essenceIntegrationAttempt(actor, item, {rollTotal}={}) {
  const definition=beastEssenceDefinition(item); if (!definition||definition.version!==1||!definition.id) throw Error("Esta essência não pode ser integrada.");
  if (!destinyEssenceAllowed(actor, definition)) throw Error("Esta essência é incompatível com sua Linhagem Divina.");
  const destiny=destinyState(actor);
  if (destiny.key==="divine-lineage"&&!destiny.unlocked) throw Error("Os poderes da Linhagem Divina requerem o Reino do Núcleo Rotativo.");
  if (integer(item?.system?.quantity)<1) throw Error("A quantidade desta essência está esgotada.");
  const points=integer(actor?.system?.cultivation?.points); if (points<5) throw Error("São necessários 5 Pontos de Cultivo (PC) para integrar uma essência.");
  const dc=essenceIntegrationDC(definition);
  if (!Number.isFinite(Number(rollTotal))||rollTotal===null||rollTotal==="") throw Error("O teste de Controle de Qi não foi concluído.");
  return {success: Number(rollTotal)>=dc, dc, pointsRemaining: points-5, definition};
}
/**
 *
 * @param roll
 */
export function essenceGrowthFromRoll(roll) {
  if (!Number.isInteger(roll)||roll<1||roll>100) throw new RangeError("O crescimento exige uma rolagem de 1 a 100.");
  return Object.entries(ESSENCE_GROWTH).find(([,growth])=>roll>=growth.rollMin&&roll<=growth.rollMax)[0];
}
/**
 *
 * @param creatureRank
 * @param referenceRank
 * @param root0
 * @param root0.lowerKills
 * @param root0.divineBeast
 */
export function essenceDiscoveryState(creatureRank, referenceRank, {lowerKills=0, divineBeast=false}={}) {
  const count=integer(lowerKills)%10;
  if (divineBeast) return {eligible: true, threshold: 51, nextLowerKills: count, kind: "divine"};
  if (creatureRank===null||creatureRank===undefined||referenceRank===null||referenceRank===undefined||!Number.isInteger(Number(creatureRank))||!Number.isInteger(Number(referenceRank))||Number(creatureRank)<1||Number(creatureRank)>10||Number(referenceRank)<1||Number(referenceRank)>10) return {eligible: false, threshold: 100, nextLowerKills: count, kind: "unknown"};
  const difference=Number(creatureRank)-Number(referenceRank);
  if (difference===-1) return {eligible: count===9, threshold: 100, nextLowerKills: (count+1)%10, kind: "lower"};
  return {eligible: difference>=0, threshold: difference>0?95:100, nextLowerKills: count, kind: difference>0?"higher":difference===0?"equal":"tooLow"};
}
