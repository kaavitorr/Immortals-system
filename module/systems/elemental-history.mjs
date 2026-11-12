import {practiceEvolutionCultivationAwarded} from './practice-evolution-state.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
const S='Immortals-system',clone=value=>structuredClone(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sections=['resources','uses','body','inventory','effects','effectTiming','meta'];
const internalFlags=new Set(['practiceEvolution','elementalHistory','elementalUseReceipts','elementalRewindRequests','elementalRewindReceipts','elementalDamageReceipts','elementalAttackReceipts','elementalTurns','elementalCalendarEffects','elementalTimeZones','elementalCultivationClock','elementalConceptClock','elementalPrisonUpkeep','elementalSpatialCredits','elementalAvoidedEvents','elementalConstructs','elementalConstructRefs','elementalProjections','elementalOrbs','elementalIllusions','elementalMovement','elementalChasingCredits','elementalAreaUses','elementalFireReductions','elementalGridMovementUses']);
const externalStates=new Set(['haste','illusionDouble','overlappingSpace','chasingLightning','dash','controlledFlames']);
export function elementalBodyPathAllowed(path){const prefix='flags.'+S+'.';if(!path.startsWith(prefix))return true;const [key,child]=path.slice(prefix.length).split('.');if(internalFlags.has(key))return false;if(key==='elementalState'&&(externalStates.has(child)||child==='receipts'))return false;if(key==='elementalLongTerm'&&child==='realms')return false;if(key==='elementalRegionalVortex'&&child!=='debt')return false;return true;}
function flatten(source,prefix='',out={}){for(const[key,value]of Object.entries(source??{})){const path=prefix?prefix+'.'+key:key;if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length)flatten(value,path,out);else out[path]={value:clone(value)};}return out;}
function patch(before,after){const result={};for(const section of sections){const changed={};for(const key of new Set([...Object.keys(before?.[section]??{}),...Object.keys(after?.[section]??{})]))if(!equal(before?.[section]?.[key],after?.[section]?.[key]))changed[key]=after?.[section]?.[key]??null;if(Object.keys(changed).length)result[section]=changed;}return result;}
function apply(state,change){const copy=clone(state);for(const section of sections)for(const[key,value]of Object.entries(change?.[section]??{})){copy[section]??={};if(value===null)delete copy[section][key];else copy[section][key]=clone(value);}return copy;}
function current(history){return history.events.reduce((state,event)=>apply(state,event.patch),clone(history.baseline.state));}
export function captureElementalBodyState(actor,{combat}={}){
 const hp=actor.system?.attributes?.hp??{},energy=actor.system?.energy??{},wounds=actor.system?.legacy2?.wounds??{};
 const resources={hpValue:hp.value,hpTemp:hp.temp,hpMax:hp.max,hpTempMax:hp.tempmax,qiTotal:energy.total,qiRefined:energy.generated,wounds:wounds.value,soulWounds:wounds.soul,shieldValue:actor.system?.armorPoints?.value};
 for(const key of Object.keys(resources))if(!Number.isFinite(resources[key]))delete resources[key];
 const uses={};for(const item of Array.from(actor.items?.values?.()??actor.items??[])){
  const activities={};for(const activity of Array.from(item.system?.activities?.values?.()??Object.values(item.system?.activities??{})))if(Number.isFinite(activity.uses?.spent))activities[activity.id??activity._id]={spent:activity.uses.spent};
  const entry={activities};if(Number.isFinite(item.system?.uses?.spent))entry.spent=item.system.uses.spent;if(Number.isFinite(item.system?.quantity))entry.quantity=item.system.quantity;
  if(Object.keys(activities).length||entry.spent!==undefined||entry.quantity!==undefined)uses[item.id??item._id]=entry;
 }
 const raw=actor._source?.system??actor.system?._source,body={},sourceFlags=actor._source?.flags?.[S]??actor.flags?.[S]??{},inventory={},effects={},effectTiming={};
 for(const key of ['abilities','attributes','cultivation','energy','energyDice','armorPoints','legacy2'])if(raw?.[key])flatten(raw[key],'system.'+key,body);
 delete body['system.legacy2.actions.value'];
 for(const[key,value]of Object.entries(sourceFlags)){if(internalFlags.has(key))continue;if(key==='elementalState'){const copy={...value};delete copy.receipts;for(const key of externalStates)delete copy[key];flatten(copy,'flags.'+S+'.'+key,body);}else if(key==='elementalRegionalVortex'){flatten({debt:Number(value.debt)||0},'flags.'+S+'.'+key,body);}else if(key==='elementalLongTerm'){const copy={...value};delete copy.realms;flatten(copy,'flags.'+S+'.'+key,body);}else if(!['professions','beastEssenceLoot','beastLootReview','customResourcesDialog'].includes(key))flatten({[key]:value},'flags.'+S,body);}
 let tracked=true;for(const item of actor.items?.values?.()??actor.items??[]){const source=item.toObject?.()??item._source;if(!source){tracked=false;continue;}const id=item.id??item._id,origin=source.flags?.[S]?.elementalRewindOrigin;inventory[id]={source:clone(source),origin:origin??item.uuid};if(!origin)tracked=false;}
 for(const effect of actor.effects?.values?.()??actor.effects??[]){effect.updateDuration?.(combat?{combat}:undefined);const source=effect.toObject?.()??effect._source,id=effect.id??effect._id;if(source)effects[id]=clone(source);if(['rounds','turns'].includes(effect.duration?.units)&&Number.isFinite(effect.duration.remaining))effectTiming[id]={units:effect.duration.units,remaining:effect.duration.remaining};}
 return{resources,uses,body,inventory,effects,effectTiming,meta:{schemaVersion:2,complete:!!raw&&tracked,practiceCultivationAwarded:practiceEvolutionCultivationAwarded(actor)}};
}
/** Delta history retains the latest anchor preceding the full hour, with no arbitrary event-count cutoff. */
export function recordElementalBodyChange(saved,before,after,{worldTime,id}={}){
 if(!Number.isFinite(worldTime)||!after)throw Error('O histórico exige estado e horário reais.');
 if(!saved||saved.version!==1)return{version:1,era:1,baseline:{at:worldTime,state:clone(after)},events:[],lastTime:worldTime};
 const history=clone(saved);
 if(worldTime<history.lastTime)return{version:1,era:(history.era??1)+1,baseline:{at:worldTime,state:clone(after)},events:[],lastTime:worldTime,archives:[...history.archives??[],{...history,archives:undefined}]};
 if(history.events.some(event=>event.id===id))return history;
 const change=patch(current(history),after);
 if(Object.keys(change).length)history.events.push({id,at:worldTime,sequence:(history.events.at(-1)?.sequence??0)+1,patch:change});
 history.lastTime=worldTime;
 const cutoff=worldTime-3600;
 while(history.events.length&&history.events[0].at<=cutoff){const event=history.events.shift();history.baseline={at:event.at,state:apply(history.baseline.state,event.patch)};}
 return history;
}
export function previewElementalRewind(actor,now=globalThis.game?.time?.worldTime??0){
 const history=actor.flags?.[S]?.elementalHistory,target=now-3600;
 if(!history||history.version!==1||!Number.isFinite(now)||history.baseline.at>target)return{available:false,reason:'missingHistory',pending:['missingHistory']};
 if(now<history.lastTime)return{available:false,reason:'clockReversed',pending:['clockReversed']};
 let state=clone(history.baseline.state);for(const event of history.events){if(event.at>target)break;state=apply(state,event.patch);}
 return{available:true,at:target,state,pending:state.meta?.schemaVersion===2&&state.meta.complete?[]:['legacySnapshot']};
}
const needs=actor=>['character','npc'].includes(actor?.type)&&Number(actor.system?.elementAbilities?.tempo?.rewind)>0;
function authority(actor){const game=globalThis.game,user=game?.user;if(!actor?.isOwner||!user)return false;const gm=game.users?.activeGM;if(gm)return gm.id===user.id;const users=Array.from(game.users?.contents??game.users?.values?.()??[]);const chosen=users.filter(u=>u.active&&u.isGM).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0];if(chosen)return chosen.id===user.id;if(user.isGM)return true;const owners=users.filter(u=>u.active&&actor.testUserPermission?.(u,'OWNER')).sort((a,b)=>String(a.id).localeCompare(String(b.id)));return !owners.length||owners[0].id===user.id;}
let sequence=0;
export function registerElementalHistoryHooks(){
 if(registerElementalHistoryHooks.installed)return;registerElementalHistoryHooks.installed=true;
 const capture=(actor,options={})=>{if(options.elementalHistoryInternal||!needs(actor)||!authority(actor))return;const eventId='capture:'+Date.now()+':'+ ++sequence;void withElementalActorLock(actor,eventId,async()=>{for(const item of actor.items?.values?.()??actor.items??[])if(!item.flags?.[S]?.elementalRewindOrigin&&item.update)await item.update({['flags.'+S+'.elementalRewindOrigin']:item.uuid},{elementalHistoryInternal:true});const saved=actor.flags?.[S]?.elementalHistory,after=captureElementalBodyState(actor,{combat:options.elementalCombat}),history=recordElementalBodyChange(saved,null,after,{worldTime:Number(game.time?.worldTime)||0,id:eventId});if(!equal(saved,history))await actor.update({['flags.'+S+'.elementalHistory']:history},{elementalHistoryInternal:true});}).catch(error=>console.error('Immortals Legacy | Histórico de Rewind',error));};
 globalThis.Hooks?.on?.('updateCombat',combat=>{for(const combatant of combat.combatants?.values?.()??combat.combatants??[])if(combatant.actor)capture(combatant.actor,{elementalCombat:combat});});
 globalThis.Hooks?.on?.('createActor',actor=>capture(actor));
 globalThis.Hooks?.on?.('updateActor',(actor,_delta,options)=>capture(actor,options));
 for(const type of ['Item','ActiveEffect']){globalThis.Hooks?.on?.('create'+type,(document,options)=>capture(document.actor??document.parent,options));globalThis.Hooks?.on?.('update'+type,(document,_delta,options)=>capture(document.actor??document.parent,options));globalThis.Hooks?.on?.('delete'+type,(document,options)=>capture(document.actor??document.parent,options));}
 const actors=new Map();for(const actor of game.actors??[])actors.set(actor.uuid,actor);for(const scene of game.scenes??[])for(const token of scene.tokens??[])if(token.actor)actors.set(token.actor.uuid,token.actor);for(const actor of actors.values())capture(actor);
}
