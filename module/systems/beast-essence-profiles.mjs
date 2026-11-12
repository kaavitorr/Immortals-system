import {essenceState} from "./beast-essence-rules.mjs";
import {NPC_MOVEMENT_TYPES, npcMovementGrowth} from "./legacy2-npc-movement.mjs";
const number=value => Number.isFinite(Number(value))?Number(value):0;
/**
 * Run during embedded-data preparation, before native conditions/Active Effects constrain movement.
 * @param actor
 * @param convertLength
 */
export function prepareBeastEssenceProfiles(actor, convertLength=value => value) {
  const state=essenceState(actor); if (!state.active) return;
  const profiles=[[state.essence.taxonomy, false], ...(state.mode==="normal"?[[state.essence.archetype, true]]:[])];
  const resistances=actor.system.legacy2?.resistances??{};
  for (const [key, definition] of Object.entries(resistances)) for (const [profile, scaled] of profiles) {const source=profile?.resistances?.[key]; if (!source) continue;
    const value=number(source.value); definition.value=number(definition.value)+(scaled&&value>0?value*state.effectiveLevel:value); definition.immune=!!definition.immune||source.immune===true;
  }
  const taxonomy=state.essence.taxonomy; const movement=actor.system.attributes?.movement; const archetype=state.mode==="normal"?state.essence.archetype:null;
  if (movement?.speeds) {const growth=npcMovementGrowth(archetype?.movement, state.effectiveLevel); const limit=archetype?.movement?.maximo==null?Infinity:number(archetype.movement.maximo);
    for (const [type] of NPC_MOVEMENT_TYPES) {const current=number(movement.speeds[type]); const configured=taxonomy?.movement?.[type];
      if (configured==null&&!growth) continue;
      const base=configured==null?number(convertLength(current, movement.units??"m", "m")):number(configured);
      const inherited=base>0?Math.min(base+growth, limit):0; movement.speeds[type]=Math.max(current, convertLength(inherited, "m", movement.units??"m"));
    }
  }
  const senses=actor.system.attributes?.senses;
  if (senses?.ranges) for (const [profile] of profiles) for (const [key, value] of Object.entries(profile?.senses?.ranges??{})) {
    if (!(key in senses.ranges)) continue; senses.ranges[key]=Math.max(number(senses.ranges[key]), convertLength(number(value), profile.senses.units??"m", senses.units??"m"));
  }
}
