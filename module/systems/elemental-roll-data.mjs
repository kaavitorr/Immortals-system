/** Stable numeric formula references for native elemental activity rolls. */
export function elementalRollData(actor,ruleset){
 const key=actor?.type==="npc"?ruleset.npcPrincipal(actor):ruleset.atributoPrincipal(actor),ability=actor?.system?.abilities?.[key];
 const value=Number(ability?.value),primary=Number.isFinite(value)?value:0,mod=Number(ability?.mod);
 return {primary,modifier:ruleset.isV2()?primary:Number.isFinite(mod)?mod:0,dc:10+primary};
}
