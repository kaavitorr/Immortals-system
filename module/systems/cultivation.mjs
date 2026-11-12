import {constitutionModifiers} from './constitution-rules.mjs';
import {destinyModifiers} from './cultivation-destiny.mjs';
import {toxinState, toxicityPenalties} from "./profession-crafting-rules.mjs";
import {soulBenefits} from "./soul-path.mjs";
import { CULTIVATION_RANKS, STAGES_POR_RANK, PT_POR_ESTAGIO, RUPTURA_CD, essenciaMax, custoRuptura, noTopo } from "./cultivation-data.mjs";
import { pathRequirement } from "./caminhos-data.mjs";
import { getZoneLimit } from "../applications/actor/jj/qi-zone.mjs";
const nonnegative = n => Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : 0;
export function essenceGoal(c = {}, actor = null) {
  const rank = Math.min(10, Math.max(1, nonnegative(c.rank) || 1));
  const rankAdvance=c.stage>=3&&rank<10,mod=constitutionModifiers(actor);
  return Math.floor(essenciaMax(rankAdvance?rank+1:rank)*(rankAdvance?mod.rankEssenceMultiplier:mod.stageEssenceMultiplier));
}
export function dailyEssenceGain(zone, manual = null, cultivation = {}, actor = null) {
  if (cultivationBlocked(actor)) return 0;
  const limit = getZoneLimit(zone);
  return Math.floor(Math.min(limit, manual == null ? Infinity : nonnegative(manual)) * soulBenefits({system:{cultivation}}).absorptionMultiplier * constitutionModifiers(actor).absorptionMultiplier * destinyModifiers(actor).absorptionMultiplier);
}
export function projectEssence(c = {}, days, perDay, actor = null) {
  const current = nonnegative(c.essence), goal = essenceGoal(c, actor);
  const count = nonnegative(days);
  const rate = perDay === Infinity ? Infinity : nonnegative(perDay);
  const gain = !count || cultivationBlocked(actor) || noTopo(c.rank, c.stage) ? 0 : Math.min(Math.max(0, goal - current), rate * count);
  return { current, goal, gain, value: current + gain };
}
/** The toxin ledger blocks normal Qi cultivation only; it never processes or removes toxins. */
export function cultivationBlocked(actor) {
  return !constitutionModifiers(actor).toxinImmune && toxinState(actor).blockedUntilClear;
}

/** Shared read-only quote for normal stage/rank advances, including combat and illumination. */
export function cultivationAdvanceState(actor, kind, {piSpent = 0} = {}) {
  if (!["stage", "combat", "breakthrough", "illumination"].includes(kind)) {
    throw new Error("Avanço de cultivo normal inválido.");
  }
  const c = actor?.system?.cultivation ?? {};
  const rankAdvance = kind === "breakthrough" || kind === "illumination";
  const mod=constitutionModifiers(actor),state = toxinState(actor), toxicity = toxicityPenalties(mod.toxinImmune?0:state.value, mod.toxinImmune?{}:state);
  const baseCost = rankAdvance ? custoRuptura(c.rank ?? 1) : kind === "combat" ? 0 : PT_POR_ESTAGIO;
  const baseCD = cultivationDifficulty(c);
  const spent = rankAdvance ? kind === "illumination" ? 3 : Math.min(nonnegative(c.illumination), nonnegative(piSpent)) : 0;
  const free=mod.freeCultivationThroughRank>0&&(nonnegative(c.rank)+(rankAdvance?1:0))<=mod.freeCultivationThroughRank;
  const cost = (free?0:Math.floor(baseCost*mod.normalPCFactor)) + (rankAdvance ? toxicity.rankPC : toxicity.stagePC);
  const cd = rankAdvance ? Math.max(1, baseCD + toxicity.rankDC - mod.breakthroughCDReduction - destinyModifiers(actor).breakthroughCDReduction - spent * 3) : baseCD;
  return {kind, baseCost, cost, baseCD, cd, piSpent: spent, toxicity,
    blocked: toxicity.blockedUntilClear,
    reason: toxicity.blockedUntilClear ? "Cultivo de Qi bloqueado por toxinas de pílula até que todas sejam removidas." : ""};
}

/** Produce one atomic actor update; callers add spending to the active point pool. */
export function cultivationUpdate(actor, kind, { points = 0, rollTotal, piSpent = 0 } = {}) {
  const c = actor.system.cultivation ?? {}, rank = c.rank ?? 1, stage = c.stage ?? 1;
  const essence = nonnegative(c.essence), pi = nonnegative(c.illumination);
  let cost, success = true, cd = cultivationDifficulty(c);
  const updates = {};
  const advance = ["stage", "combat", "breakthrough", "illumination"].includes(kind)
    ? cultivationAdvanceState(actor, kind, {piSpent}) : null;
  if (advance?.blocked) throw new Error(advance.reason);
  if ( kind === "body" || kind === "soul" ) {
    const key = kind + "Cultivation", level = nonnegative(c[key]);
    if ( level >= 10 ) throw new Error("Caminho no nível máximo.");
    const req = pathRequirement(kind, level, actor), pillsKey = kind + "Pills";
    if ( nonnegative(c[pillsKey]?.[req.pillLevel]) < req.pills ) throw new Error("Pílulas insuficientes para este nível.");
    cost = req.pt;
    if ( kind === "soul" && level >= 2 ) {
      if ( !Number.isFinite(rollTotal) ) throw new Error("É necessário rolar o teste de Alma.");
      success = rollTotal >= cd;
    }
    updates["system.cultivation." + pillsKey + "." + req.pillLevel] = nonnegative(c[pillsKey]?.[req.pillLevel]) - req.pills;
    if ( success ) updates["system.cultivation." + key] = level + 1;
    else {
      updates["system.cultivation.rank"] = stage > 1 ? rank : Math.max(1, rank - 1);
      updates["system.cultivation.stage"] = stage > 1 ? stage - 1 : (rank > 1 ? 3 : 1);
    }
  } else if ( kind === "stage" || kind === "combat" ) {
    if ( stage >= STAGES_POR_RANK ) throw new Error("É preciso romper para o próximo reino.");
    if ( essence < essenceGoal(c,actor) ) throw new Error("Essência de Qi insuficiente.");
    cost = advance.cost;
    updates["system.cultivation.stage"] = stage + 1;
    updates["system.cultivation.essence"] = essence - essenceGoal(c,actor);
  } else if ( kind === "breakthrough" || kind === "illumination" ) {
    if ( rank >= CULTIVATION_RANKS.length ) throw new Error("Rank máximo atingido.");
    if ( stage < 3 || essence < essenceGoal(c,actor) ) throw new Error("Requer terceiro estágio e Essência de Qi cheia.");
    cost = advance.cost;
    const spent = advance.piSpent;
    if ( spent > pi ) throw new Error("Pontos de Iluminação insuficientes.");
    cd = advance.cd;
    if ( kind === "breakthrough" && !Number.isFinite(rollTotal) ) throw new Error("É necessário rolar o rompimento.");
    success = kind === "illumination" || rollTotal >= cd;
    updates["system.cultivation.illumination"] = pi - spent;
    if ( success ) {
      updates["system.cultivation.rank"] = rank + 1;
      updates["system.cultivation.foundation"] = {rank:rank+1,encounters:0,years:0};
      updates["system.cultivation.stage"] = constitutionModifiers(actor).breakthroughStage;
      updates["system.cultivation.essence"] = essence - essenceGoal(c,actor);
    }
  } else throw new Error("Avanço de cultivo inválido.");
  if ( nonnegative(points) < cost ) throw new Error("Pontos de treino insuficientes: requer " + cost + ".");
  const failedRupture = kind === "breakthrough" && !success;
  const failedSoul = kind === "soul" && !success;
  if(failedRupture)updates["system.cultivation.persistentInjuries"]=nonnegative(c.persistentInjuries)+1;
  return { updates, cost, success, cd, tribulationDice:(failedRupture||failedSoul)?cultivationTribulationDice(actor):0 };
}

/** Existing tribulation realms and constitution immunity take precedence over destiny dice. */
export function cultivationTribulationDice(actor) {
  const rank = nonnegative(actor?.system?.cultivation?.rank);
  if (rank < 4 || constitutionModifiers(actor).noTribulation) return 0;
  const perRank = destinyModifiers(actor).tribulationDicePerRank;
  return perRank === null ? 20 + 6 * (rank - 4) : perRank * rank;
}

/** Foundation belongs to one realm; manually changing realm cannot carry its discount. */
export function cultivationDifficulty(c={}, actor=null) {
  const rank=Math.max(1,nonnegative(c.rank)||1),foundation=c.foundation??{};
  const base=Number(foundation.rank)!==rank ? RUPTURA_CD
    : Math.max(1,RUPTURA_CD-Math.max(0,nonnegative(foundation.encounters)-3)-Math.floor(nonnegative(foundation.years)/rank));
  return base + toxicityPenalties(constitutionModifiers(actor).toxinImmune?0:toxinState(actor).value).rankDC;
}
export function cultivationPointUpdates(actor,cost) {
  const points=nonnegative(actor.system?.cultivation?.points);
  if(!Number.isInteger(cost)||cost<0||cost>points)throw Error("Pontos de Cultivo insuficientes.");
  return cost?{"system.cultivation.points":points-cost,"system.cultivation.spentTrainingPoints":nonnegative(actor.system.cultivation.spentTrainingPoints)+cost}:{};
}
/** Tribulation bypasses the damage pipeline by writing only its direct wounds. */
export function tribulationWoundsUpdate(actor,damage) {
  if(!Number.isFinite(damage)||damage<0)throw Error("Dano de tribulação inválido.");
  return {"system.legacy2.wounds.value":nonnegative(actor.system?.legacy2?.wounds?.value)+Math.floor(damage)};
}
