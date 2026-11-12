import {elementalConstructLifecycleUpdates} from './elemental-constructs.mjs';
import {elementalVortexWorldUpdates} from './elemental-regional-vortex.mjs';
import {elementalPrisonUpkeepPlan} from './elemental-prison-maintenance.mjs';
import {processElementalFreezingTurn} from './elemental-freezing.mjs';
import {advanceElementalEffects} from './elemental-calendar-effects.mjs';
import {processElementalBleedingTurn} from './elemental-bleeding.mjs';
import {elementalTurnUpdates,withElementalActorLock} from './elemental-runtime.mjs';

const scope='Immortals-system',prefix='flags.'+scope+'.elementalState.';
const pending=new WeakMap();
const integer=value=>Number.isFinite(Number(value))?Math.max(0,Math.trunc(Number(value))):0;
const flags=actor=>actor?.flags?.[scope]??{};
function mayProcess(actor,combat,userId){
 const game=globalThis.game,user=game?.user;
 if(!actor||!user||game.settings?.get?.(scope,'rulesetVersion')!=='2.0')return false;
 const users=Array.from(game.users?.contents??(game.users?.values?game.users.values():[]));
 const authorId=userId??combat?._stats?.lastModifiedBy;
 const author=game.users?.get?.(authorId)??users.find(u=>u.id===authorId)??(user.id===authorId?user:null);
 if(author?.active!==false&&author?.isGM)return author.id===user.id;
 const gm=game.users?.activeGM;
 if(gm)return gm.id===user.id;
 const activeGM=users.filter(u=>u.active&&u.isGM).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0];
 if(activeGM)return activeGM.id===user.id;
 if(user.isGM)return true;
 if(!actor.isOwner)return false;
 const owners=users.filter(u=>u.active&&!u.isGM&&(actor.testUserPermission?.(u,'OWNER')??Number(actor.ownership?.[u.id])>=3)).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return !owners.length||owners[0].id===user.id;
}
function turnContext(combat,phase,combatant){
 combatant??=phase==='end'?combat.combatants?.get?.(combat.previous?.combatantId)??combat.combatant:combat.combatant??combat.combatants?.get?.(combat.current?.combatantId);
 if(!combatant?.id)return null;
 const round=phase==='end'&&combat.previous?.combatantId===combatant.id?combat.previous.round??combat.round:combat.round;
 return {turn:(combat.uuid??combat.id)+':'+integer(round)+':'+combatant.id,phase,worldTime:Number(globalThis.game?.time?.worldTime)||0,combatant};
}
const maintainedKeys=['bodyFluid','illusionDouble','eternalPrison','mindBreak'];
function relevantState(state){return Object.entries(state).some(([key,value])=>value&&(maintainedKeys.includes(key)||typeof value==='object'&&(value.expires||value.expiresAt!==undefined)));}
function stop(updates,state,key,effect,worldTime){
 updates[prefix+'-='+key]=null;
 if(key==='illusionDouble'){
  const source=effect?.source??{},cooldownKey=(source.elementId??'ilusao')+':'+(source.abilityId??'illusionDouble')+':double';
  updates[prefix+'cooldowns']={...(state.cooldowns??{}),[cooldownKey]:{availableAt:worldTime+30*86400,source}};
 }
}

/** Pure timestamp cleanup only. Advancing world time never fabricates rounds or drains Qi. */
export function elementalWorldTimeUpdates(actor,worldTime){
 const records=Object.values(flags(actor).elementalCalendarEffects??{}),from=Math.min(worldTime,...records.map(r=>Number(r.lastAdvancedAt??r.createdAt)));
 const jobs=advanceElementalEffects(actor,{from,to:worldTime,eventId:'world:'+worldTime});
 return{...elementalTurnUpdates(actor,{worldTime}),...jobs.updates,...elementalVortexWorldUpdates(actor,worldTime),...elementalConstructLifecycleUpdates(actor,worldTime)};
}

/**
 * Await once at each own-turn boundary before reserve/refinement/reset paths. Both the native
 * Combat callbacks and the tracker fallback share this lock and the persisted phase receipt.
 */
export async function processElementalTurn(actor,combat,{phase='start',combatant,userId}={}){
 if(!combat?.started||!mayProcess(actor,combat,userId)||!['start','end'].includes(phase))return;
 const context=turnContext(combat,phase,combatant);if(!context||context.combatant.actor&&context.combatant.actor!==actor)return;
 let queue=pending.get(actor);if(!queue){queue={tail:Promise.resolve(),tasks:new Map()};pending.set(actor,queue);}
 const taskKey=phase+':'+context.turn;if(queue.tasks.has(taskKey))return queue.tasks.get(taskKey);
 const prior=queue.tail;
 const operation=(async()=>{
  await prior.catch(()=>{});
  return withElementalActorLock(actor,'turn:'+taskKey,async lockToken=>{
  if(flags(actor).elementalTurns?.[phase]===context.turn)return;
  if(phase==='start'){await processElementalBleedingTurn(actor,{...context,lockToken});await processElementalFreezingTurn(actor,{...context,lockToken});}
  const state=flags(actor).elementalState??{};
  if(!relevantState(state)&&!Object.values(flags(actor).elementalPrisonUpkeep??{}).some(entry=>entry.active))return;
  const updates=elementalTurnUpdates(actor,context);
  if(phase==='start'){
   let qi=integer(actor.system?.energy?.generated),changedQi=false;
   for(const [key,cost]of [['bodyFluid',15],['illusionDouble',30],['eternalPrison',20],['mindBreak',2]]){
    const effect=state[key];if(!effect||effect.active===false||updates[prefix+'-='+key]===null||key==='eternalPrison'&&effect.instanceId)continue;
    const source=effect.source;
    if(source?.elementId&&source.abilityId&&actor.system?.elementAbilities&&!integer(actor.system.elementAbilities[source.elementId]?.[source.abilityId])){stop(updates,state,key,effect,context.worldTime);continue;}
    if(effect.eternal||effect.upkeepTurn===context.turn)continue;
    if(qi<cost){stop(updates,state,key,effect,context.worldTime);continue;}
    qi-=cost;changedQi=true;
    const value={...effect,active:true,upkeepTurn:context.turn,pool:'generated',upkeepQi:cost};
    if(key==='eternalPrison'){
     value.permanentAtQi=500;value.investedQi=Math.min(500,integer(effect.investedQi)+20);value.eternal=value.investedQi>=500;
    }
    updates[prefix+key]=value;
   }
   let prisons=elementalPrisonUpkeepPlan(actor,{turn:context.turn,availableQi:qi});
   if(prisons.needsChoice){
    let chosen=null;
    while(chosen===null){
     const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
     const selection=await globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Manter prisões de gelo'},content:'<p>Disponível: '+qi+' PQ de Qi Refinado. Cada prisão custa 20 PQ neste turno. Escolha quais manter.</p>'+prisons.candidates.map((id,index)=>'<label><input type="checkbox" name="prison" value="'+esc(id)+'"> Prisão '+(index+1)+' · '+prisons.entries[id].investedQi+'/500 Qi</label>').join(''),buttons:[{action:'choose',label:'Confirmar manutenção',default:true,callback:(_e,_b,d)=>Array.from(d.element.querySelectorAll('[name="prison"]:checked'),input=>input.value)},{action:'end',label:'Encerrar todas',callback:()=>[]}],rejectClose:false});
     if(selection===null)throw Error('A manutenção das prisões aguarda sua escolha.');
     if(selection.length*20>qi){globalThis.ui?.notifications?.warn?.('Escolha somente as prisões que seu Qi pode manter.');continue;}
     chosen=selection;
    }
    prisons=elementalPrisonUpkeepPlan(actor,{turn:context.turn,availableQi:qi,selectedIds:chosen});
   }
   Object.assign(updates,prisons.updates);qi-=prisons.qiSpent;if(prisons.qiSpent)changedQi=true;
   if(state.eternalPrison?.instanceId&&prisons.entries[state.eternalPrison.instanceId])updates[prefix+'eternalPrison']={...state.eternalPrison,...prisons.entries[state.eternalPrison.instanceId]};
   context.prisonOperations=prisons.operations;
   if(changedQi)updates['system.energy.generated']=qi;
  }
  updates['flags.'+scope+'.elementalTurns.'+phase]=context.turn;
  await actor.update(updates,{isEnergySystem:true});
  for(const operation of context.prisonOperations??[]){try{const document=globalThis.fromUuidSync?.(operation.ownerActorUuid,{strict:false}),owner=document?.actor??document;if(owner)await owner.update(operation.updates);}catch(error){globalThis.ui?.notifications?.warn?.('A permanência da prisão precisa ser sincronizada pelo narrador: '+error.message);}}
  return updates;
  });
 })();
 queue.tasks.set(taskKey,operation);queue.tail=operation;
 try{return await operation;}finally{queue.tasks.delete(taskKey);if(!queue.tasks.size)pending.delete(actor);}
}

/** Ending/deleting one combat must not end an hour-long effect or another encounter's state. */
export function elementalCombatEndUpdates(actor,combat){
 const updates={},id=(combat.uuid??combat.id)+':';
 for(const[key,effect]of Object.entries(flags(actor).elementalState??{})){
  if(!effect?.expires||!String(effect.turn??'').startsWith(id))continue;
  updates[prefix+'-='+key]=null;
  if(key==='haste')updates['system.legacy2.actions.value']=Math.max(0,integer(actor.system?.legacy2?.actions?.value)-integer(effect.remaining));
 }
 for(const[key,credit]of Object.entries(flags(actor).elementalSpatialCredits??{}))if(credit.status==='ready'&&String(credit.turn??'').startsWith(id))updates['flags.'+scope+'.elementalSpatialCredits.'+key+'.status']='expired';
 return updates;
}
export function registerElementalCombatCleanup(){
 if(registerElementalCombatCleanup.installed)return;registerElementalCombatCleanup.installed=true;
 const clean=async(combat,_changes,_options,userId)=>{
  for(const actor of new Set(Array.from(combat.combatants?.values?.()??combat.combatants??[],c=>c.actor).filter(Boolean))){
   if(!mayProcess(actor,combat,userId))continue;
   await withElementalActorLock(actor,'end-combat:'+(combat.uuid??combat.id),async()=>{const updates=elementalCombatEndUpdates(actor,combat);if(Object.keys(updates).length)await actor.update(updates);});
  }
 };
 globalThis.Hooks?.on?.('deleteCombat',(combat,options,userId)=>{void clean(combat,null,options,userId);});
 globalThis.Hooks?.on?.('updateCombat',(combat,changes,options,userId)=>{if(!combat.started&&(changes.round!==undefined||changes.started===false))void clean(combat,changes,options,userId);});
}
