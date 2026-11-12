import Ruleset from "./ruleset.mjs";
import {actorAttributeLimit} from "./attribute-limits.mjs";

/** Keep the original source values intact while applying the actor's current ceiling. */
export const npc2AbilityValue = (value, actor, key) => Number.isFinite(Number(value))
  ? Math.min(actorAttributeLimit(actor, key), Math.max(1, Math.trunc(Number(value)))) : 1;

/** Run before native derived rolls so sheets, attacks and derived defenses agree. */
export function prepareNpc2Abilities(actor) {
  const system = actor.system;
  const derived = Ruleset.npcAbilityValues(actor);
  for (const [key, ability] of Object.entries(system.abilities ?? {})) {
    ability.value = npc2AbilityValue(derived?.[key] ?? ability.value, actor, key);
    ability.max = actorAttributeLimit(actor, key);
  }
}
