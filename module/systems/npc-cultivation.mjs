import {CULTIVATION_RANKS, STAGES_POR_RANK} from './cultivation-realms.mjs';
export const MAX_NPC_CULTIVATION_LEVEL = CULTIVATION_RANKS.length * STAGES_POR_RANK;
const present = value => typeof value === 'number' || typeof value === 'string' && value.trim() !== '';

/** Keep historical ND storage as the single calculation level, bounded by the cultivation ladder. */
export function npcCultivationLevel(value) {
  const number = present(value) ? Number(value) : NaN;
  return Number.isFinite(number) ? Math.min(MAX_NPC_CULTIVATION_LEVEL, Math.max(1, Math.trunc(number))) : 1;
}
export function npcCultivationState(actor) {
  const level = npcCultivationLevel(actor?.system?.legacy2?.nd);
  const rank = Math.ceil(level / STAGES_POR_RANK), stage = 1 + (level - 1) % STAGES_POR_RANK;
  return {level, rank, stage, name: CULTIVATION_RANKS[rank - 1].name, maximum: MAX_NPC_CULTIVATION_LEVEL};
}
/** Pre-2.0 documents without an ND field may still carry the old optional realm flag. */
export function npcCultivationRank(actor) {
  if (actor?.type !== 'npc' || !Object.hasOwn(actor.system?.legacy2 ?? {}, 'nd')) return null;
  return npcCultivationState(actor).rank;
}
/** One atomic numeric level update; changing realm preserves stage, and changing stage preserves realm. */
export function npcCultivationUpdate(actor, change) {
  if (actor?.type !== 'npc') throw Error('Cultivo de PdN requer uma ficha de PdN.');
  const keys = Object.keys(change ?? {}), key = keys[0];
  if (keys.length !== 1 || !['level', 'rank', 'stage'].includes(key)) throw Error('Informe um nível, reino ou estágio de cultivo.');
  const value = present(change[key]) ? Number(change[key]) : NaN;
  const maximum = {level: MAX_NPC_CULTIVATION_LEVEL, rank: CULTIVATION_RANKS.length, stage: STAGES_POR_RANK}[key];
  if (!Number.isInteger(value) || value < 1 || value > maximum) throw Error('Informe um valor inteiro entre 1 e ' + maximum + '.');
  const current = npcCultivationState(actor);
  const level = key === 'level' ? value : ((key === 'rank' ? value : current.rank) - 1) * STAGES_POR_RANK
    + (key === 'stage' ? value : current.stage);
  return {'system.legacy2.nd': String(level)};
}
