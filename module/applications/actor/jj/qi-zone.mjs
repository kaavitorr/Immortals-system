/**
 * jj/qi-zone.mjs
 * Wuxia Legacy — Fonte única da Zona de Qi da Região.
 *
 * Bases por nível, modificadores (Seita ×2, Veia Espiritual ×10 na base) e
 * o cálculo do limite diário de PEQ. Importado pelo calendar-hud (interface),
 * pelo character-sheet (cap da ficha) e pelo peq-acumulo (acúmulo automático).
 */

export const QI_ZONES = [
  { id: "quaseInexistente", label: "Qi Quase Inexistente", base: 1 },
  { id: "escasso",          label: "Qi Escasso",           base: 5 },
  { id: "inferior",         label: "Qi Inferior",          base: 10 },
  { id: "mediano",          label: "Qi Mediano",           base: 15 },
  { id: "altaQualidade",    label: "Qi de Alta Qualidade", base: 25 },
  { id: "denso",            label: "Qi Denso",             base: 40 },
  { id: "superior",         label: "Qi Superior",          base: 80 },
  { id: "perfeito",         label: "Qi Perfeito",          base: 120 },
  { id: "supremo",          label: "Qi Supremo",           base: Infinity }
];

export const QI_ZONE_BASES = Object.fromEntries(QI_ZONES.map(z => [z.id, z.base]));

/**
 * Limite diário de PEQ da zona atual (com Seita e Veia aplicados).
 * @param {object} [zoneOverride]  Se passado, usa este objeto ({level, seita,
 *   veiaEspiritual}) em vez do setting mundial (útil no dialog de preview).
 * @returns {number} Limite em PEQ/dia (Infinity = sem limite).
 */
export function getZoneLimit(zoneOverride) {
  const zone = zoneOverride ?? game.settings.get("Immortals-system", "qiZone") ?? {};
  let limit = QI_ZONE_BASES[zone.level ?? "mediano"] ?? 15;
  if ( limit === Infinity ) return Infinity;
  if ( zone.veiaEspiritual ) limit *= 10;
  if ( zone.seita ) limit *= 2;
  return limit;
}
