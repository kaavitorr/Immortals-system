import {npcCultivationLevel} from './npc-cultivation.mjs';
/** Shared weapon groups for both 2.0 presentation and roll calculations. */
export const WEAPON_GROUPS = [
  { key: "martialM", icon: "systems/Immortals-system/assets/wuxia/proficiencies/heavy.webp", label: "Pesada", aliases: ["siege"] },
  { key: "simpleM", icon: "systems/Immortals-system/assets/wuxia/proficiencies/light.webp", label: "Leve", aliases: [] },
  { key: "simpleR", icon: "systems/Immortals-system/assets/wuxia/proficiencies/projectile.webp", label: "Projétil", aliases: ["martialR"] },
  { key: "improv", icon: "systems/Immortals-system/assets/wuxia/proficiencies/unarmed.webp", label: "Desarmado", aliases: [] },
  { key: "natural", icon: "systems/Immortals-system/assets/wuxia/proficiencies/natural.webp", label: "Natural", aliases: [] }
];

const rankOf = value => Math.floor(Math.min(4, Math.max(0, Number(value) || 0)));

/** A saved canonical rank wins; otherwise preserve the old category's proficiency. */
export function weaponGroupRank(ranks, category) {
  const group = WEAPON_GROUPS.find(g => g.key === category || g.aliases.includes(category));
  if ( !group ) return rankOf(ranks?.[category]);
  if ( ranks?.[group.key] !== undefined && ranks?.[group.key] !== null ) return rankOf(ranks[group.key]);
  return Math.max(0, ...group.aliases.map(key => rankOf(ranks?.[key])));
}

/** NPC weapon training: levels 0–5 Trained, 6–10 Proficient, 11–15 Expert, 16+ Master. */
export function npcAttackProficiencyRank(actor) {
  return actor?.type === 'npc' ? Math.min(4, 1 + Math.floor((npcCultivationLevel(actor.system?.legacy2?.nd) - 1) / 5)) : 0;
}

/** Automatic NPC training is a minimum, never added to a manually configured rank. */
export function actorWeaponGroupRank(actor, category) {
  return Math.max(weaponGroupRank(actor?.system?.legacy2?.armas, category), npcAttackProficiencyRank(actor));
}

/* ── Proficiência por Defeitos (regra 2.0) ────────────────────────────── */

/** Cada 2 Pontos de Defeito convertem em 1 Ponto de Proficiência. */
export const CONVERSAO_DEFEITO = 2;

/** Pontos de um feat de Defeito: flag `defeitoPontos` (gravada pelo
 * importador da personalização) ou, na falta dela, o sufixo "(N pontos)" no
 * nome; feats sem nenhum dos dois não pontuam. */
export function pontosDoItem(item) {
  const flag = Math.trunc(Number(item?.getFlag?.("Immortals-system", "defeitoPontos")
    ?? item?.flags?.["Immortals-system"]?.defeitoPontos));
  if ( Number.isFinite(flag) && flag > 0 ) return flag;
  return Number(/\((\d+)\s*pontos?\)/i.exec(item?.name ?? "")?.[1]) || 0;
}

/** Pontos totais dos Defeitos da ficha (soma de pontosDoItem dos feats da
 * seção jj-flaws). */
export function pontosDefeitos(actor) {
  return Array.from(actor?.items ?? [])
    .filter(item => (item.type === "feat")
      && (item.getFlag?.("Immortals-system", "featureSection") ?? item.flags?.["Immortals-system"]?.featureSection) === "jj-flaws")
    .reduce((total, item) => total + pontosDoItem(item), 0);
}

/** Proficiência concedida pelos Defeitos da ficha (pontos ÷ 2, piso inteiro). */
export function proficienciaPorDefeitos(actor) {
  return Math.floor(pontosDefeitos(actor) / CONVERSAO_DEFEITO);
}
