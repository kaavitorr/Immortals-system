import {bodyAttributeLimit} from './body-path.mjs';
import {soulAttributeLimit} from './soul-path.mjs';
import {cultivationRank} from './cultivation-rank-benefits.mjs';

/** Shared by prepared values, automatic allocation and sheet input bounds. */
export function actorAttributeLimit(actor, key) {
  const baseline = Math.max(bodyAttributeLimit(actor, key), soulAttributeLimit(actor, key));
  if (actor?.type !== 'npc' || actor.flags?.['Immortals-system']?.npcNature !== 'beast') return baseline;
  // Lorde Divino is rank six; each subsequent realm adds another point.
  return baseline + 2 + Math.max(0, (cultivationRank(actor) ?? 0) - 5);
}
