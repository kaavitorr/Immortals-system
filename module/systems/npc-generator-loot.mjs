/** Explicit generator loot applies only to configured creatures; older NPCs keep their discovery flow. */
export function npcDeathLoot(actor){
 const loot=actor?.flags?.['Immortals-system']?.beastLoot;
 if(loot?.configured!==true)return {configured:false,essence:true,core:true,guaranteed:false,elementId:null};
 return {configured:true,essence:loot.essence===true,core:loot.core===true,guaranteed:loot.guaranteed===true,elementId:loot.elementId??'neutro'};
}
