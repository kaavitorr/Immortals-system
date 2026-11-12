import {CULTIVATION_RANKS, STAGES_POR_RANK} from './cultivation-realms.mjs';
export {CULTIVATION_RANKS, STAGES_POR_RANK} from './cultivation-realms.mjs';
import {cultivatorProgression} from "./cultivator-rules.mjs";
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
/**
 * ─── Sistema de Cultivo (Wuxia) ──────────────────────────────────────────────
 * Ranks de cultivo (Condensação de Qi → Divindade), cada um com um custo de
 * Essência de Qi por estágio. O personagem tem um Rank (1–10) e um Estágio (1–3)
 * dentro dele. Acumula Essência de Qi (setável); ao encher, gasta 5 PT pra subir
 * um estágio; no 3º estágio, entra em reclusão pra romper pro próximo Rank
 * (custo em PT + rolagem 1d20 CD 11).
 *
 * Fonte única dos números do cultivo — nada mágico espalhado pelo código.
 */

export const PT_POR_ESTAGIO   = 5;      // custo em PT pra subir um estágio
export const RUPTURA_CD       = 11;     // CD do 1d20 pra romper de rank
export const RUPTURA_PT_MAX   = 30;     // teto do custo de ruptura em PT

/** Info do rank (com clamp seguro 1–10). */
export function rankInfo(rank) {
  const r = clamp(Math.round(rank || 1), 1, CULTIVATION_RANKS.length);
  return CULTIVATION_RANKS[r - 1];
}

/** Essência de Qi por estágio no rank dado. */
export function essenciaMax(rank) {
  return rankInfo(rank).essence;
}

/**
 * Custo em PT pra romper do rank dado pro próximo. Romper é GRÁTIS ao sair da
 * Condensação de Qi (entrar em Formação de Núcleo) e a partir daí 5 × (rank−1),
 * com teto de 30 PT.
 *   rank 1 (Condensação)    → 0 PT  (grátis)
 *   rank 2 (Formação)       → 5 PT
 *   rank 3 (Núcleo Rotativo)→ 10 PT
 *   rank 4 (Mar Divino)     → 15 PT ... até 30.
 */
export function custoRuptura(rank) {
  const base = PT_POR_ESTAGIO * Math.max(0, (Math.round(rank || 1) - 1));
  return Math.min(RUPTURA_PT_MAX, Math.max(0, base));
}

/** Já está no topo (Divindade, estágio 3)? */
export function noTopo(rank, stage) {
  return rank >= CULTIVATION_RANKS.length && stage >= STAGES_POR_RANK;
}

/**
 * Nível de Cultivo "geral" (1–30): (rank−1)×3 + estágio. Os estágios contam como
 * níveis de verdade. Usado na GERAÇÃO de Qi por rodada (nível × multiplicador).
 * Ex.: Condensação nv3 = 3; Formação nv2 = 5.
 */
export function nivelCultivo(rank, stage) {
  const r = clamp(Math.round(rank || 1), 1, CULTIVATION_RANKS.length);
  const s = clamp(Math.round(stage || 1), 1, STAGES_POR_RANK);
  return ((r - 1) * STAGES_POR_RANK) + s;
}

/** Nível de Cultivo a partir do ator. */
export function nivelCultivoDoAtor(actor) {
  const c = actor?.system?.cultivation ?? {};
  return nivelCultivo(c.rank ?? 1, c.stage ?? 1);
}

/** 40 initial Qi; +10 inside a realm, +20 when crossing to the next realm. */
export function qiMaxCultivo(rank,stage) {
  return cultivatorProgression({system:{cultivation:{rank,stage}}}).qi;
}
