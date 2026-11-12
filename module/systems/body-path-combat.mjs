import {soulRegenerationUpdate,soulLevel} from "./soul-path.mjs";
import Ruleset from './ruleset.mjs';
import {bodyLevel,bodyRegenerationUpdate,bodyTurnKey} from './body-path.mjs';
const scope='Immortals-system';
const turnWrites=new WeakMap();
const authority=()=>Ruleset.isV2()&&game.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
export async function beginBodyEncounter(combat){
 if(!authority())return;
 const actors=[...new Set(Array.from(combat.combatants??[],entry=>entry.actor).filter(actor=>actor&&(bodyLevel(actor)>0||(soulLevel(actor)??0)>0)))];
 for(const actor of actors)await actor.update({['flags.'+scope+'.-=bodyMaravilhas']:null,['flags.'+scope+'.-=bodyRegenerationTurn']:null,['flags.'+scope+'.-=bodyCureTurn']:null,['flags.'+scope+'.-=soulRegenerationTurn']:null});
}
export async function processBodyTurnStart(actor,combat){
 if(!authority()||!actor)return;
 if(turnWrites.has(actor))return turnWrites.get(actor);
 const operation=(async()=>{const soul=soulRegenerationUpdate(actor,combat);if(soul)await actor.update(soul.updates);const result=bodyRegenerationUpdate(actor,combat);if(result)await actor.update(result.updates);})();
 turnWrites.set(actor,operation);try{return await operation;}finally{turnWrites.delete(actor);}
}
export async function endBodyTurn(actor,combat,{onlyExpired=false}={}){
 if(!authority()||!actor)return;
 const burst=actor.flags?.[scope]?.bodyMaravilhas;
 if(onlyExpired&&burst?.turn===bodyTurnKey(actor,combat))return;
 if(burst?.turn)await actor.update({['flags.'+scope+'.bodyMaravilhas']:{...burst,turn:null,pending:false}});
}
export async function consumeBodyAttackBonus(actor,expectedTurn){
 if(!expectedTurn||!Ruleset.isV2()||!actor?.isOwner)return;
 const burst=actor.flags?.[scope]?.bodyMaravilhas;
 if(!burst?.pending||burst.turn!==expectedTurn)return;
 await actor.update({['flags.'+scope+'.bodyMaravilhas']:{...burst,pending:false}});
}

/** Tracker updates also cover transitions where the core skips native turn callbacks. */
export function registerBodyCombatHooks(hooks){
 hooks.on('updateCombat',async(combat,changed,options={})=>{
  if(!authority()||options.turnEvents===false||!['round','turn'].some(key=>Object.hasOwn(changed,key)))return;
  const previous=combat.combatants?.get?.(combat.previous?.combatantId)?.actor;
  if(previous)await endBodyTurn(previous,combat,{onlyExpired:true});
  if(combat.started)await processBodyTurnStart(combat.combatant?.actor,combat);
  else for(const entry of combat.combatants??[])await endBodyTurn(entry.actor,combat);
 });
 hooks.on('deleteCombat',async combat=>{if(authority())for(const entry of combat.combatants??[])await endBodyTurn(entry.actor,combat);});
}
