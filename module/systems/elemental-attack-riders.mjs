import {elementalDamageCommitted} from './elemental-transactions.mjs';
import {withElementalActorLock} from "./elemental-runtime.mjs";
import Ruleset from './ruleset.mjs';
import {elementalTier} from './elemental-rules.mjs';
import {conditionSaveAbility} from './activity-conditions.mjs';
import {techniqueDifficulty} from './legacy2-technique-dc.mjs';

const scope='Immortals-system', receiptsPath='flags.'+scope+'.elementalAttackReceipts';
const integer=(value,max=Infinity)=>Number.isFinite(Number(value))?Math.min(max,Math.max(0,Math.trunc(Number(value)))):0;
const state=actor=>actor?.flags?.[scope]?.elementalState??{};
const permitted=actor=>!!(actor&&(globalThis.game?.user?.isGM||actor.isOwner===true));
let riderSequence=0;
async function locked(actor,task){return withElementalActorLock(actor,'riders:'+ ++riderSequence,task);}
const receipts=actor=>Array.from(actor.flags?.[scope]?.elementalAttackReceipts??[]);
const updatedReceipts=(actor,entry)=>[...receipts(actor).filter(row=>row.key!==entry.key).slice(-199),entry];
const resolveUuid=value=>{try{return typeof value==='string'?globalThis.fromUuidSync?.(value,{strict:false}):value;}catch{return null;}};

/** Values accepted with the attack, shared by initial resolution and GM retries. */
export function elementalRiderSnapshot(activity,{criticalMargin=10}={}){
 const source=activity?.item?.actor??activity?.actor,principal=source?.type==='npc'?Ruleset.npcPrincipal(source):Ruleset.atributoPrincipal(source);
 return Object.freeze({version:1,frostTier:elementalTier(source,'gelo','geada'),bleedTier:elementalTier(source,'metal','qiAfiado'),coldTier:elementalTier(source,'gelo','frioCongelante'),punishmentTier:elementalTier(source,'relampago','punicaoTrovao'),primary:Number(source?.system?.abilities?.[principal]?.value??0),dc:difficulty(activity,source),criticalMargin,isTechnique:activity.item?.type==='spell'||activity.attack?.type?.classification==='spell'});
}
export function elementalFrostStacks(actor){return integer(state(actor).geada?.stacks,5);}

/** Removing several stacks is a single transaction against the recipient's own refined Qi. */
export async function removeElementalFrost(actor,count=1){
 if(!permitted(actor))throw Error('Sem permissão para remover Geada.');
 if(!Number.isInteger(count)||count<1)throw Error('Informe uma quantidade inteira de acúmulos.');
 return withElementalActorLock(actor,'remove-frost',async()=>{
  const current=elementalFrostStacks(actor),removed=Math.min(current,count),qi=integer(actor.system?.energy?.generated);
  if(removed>qi)throw Error('Qi Refinado insuficiente para remover Geada.');
  const updates=removed?{'system.energy.generated':qi-removed,['flags.'+scope+'.elementalState.geada.stacks']:current-removed}:{};
  if(removed)await actor.update(updates);
  return{removed,qiCost:removed,updates};
 });
}

function targetData(entry,source,message){
 const token=resolveUuid(entry.document??entry.token);
 const actor=(typeof entry.actor==='object'?entry.actor:null)??token?.actor??resolveUuid(entry.actor);
 const key=typeof entry.token==='string'?entry.token:token?.uuid??actor?.uuid;
 let outcome=entry.outcome==='hit'||entry.outcome==='miss'?entry.outcome:null;
 if(!outcome&&entry.ac!==null){if(typeof entry.isMiss==='boolean')outcome=entry.isMiss?'miss':'hit';else if(typeof entry.hit==='boolean')outcome=entry.hit?'hit':'miss';}
 let enemy=typeof entry.isEnemy==='boolean'?entry.isEnemy:null;
 if(actor===source||actor?.uuid&&actor.uuid===source?.uuid)enemy=false;
 if(enemy===null){const origin=message?.getAssociatedToken?.()??source?.token;const left=Number(origin?.disposition??origin?.document?.disposition),right=Number(token?.disposition??token?.document?.disposition);if(Number.isFinite(left)&&Number.isFinite(right)&&left*right<0)enemy=true;}
 return{actor,key,outcome,enemy};
}
function naturalDie(roll,explicit){
 if(Number.isInteger(explicit)&&explicit>=1&&explicit<=20)return explicit;
 const die=roll?.dice?.find(entry=>entry.faces===20),result=die?.results?.find(entry=>!entry.discarded&&!entry.rerolled&&entry.active!==false)?.result;
 return Number.isInteger(result)&&result>=1&&result<=20?result:null;
}
function difficulty(activity,source,explicit){
 if(Number.isFinite(explicit))return explicit;
 const configured=Number(activity.save?.dc?.value);if(activity.save?.dc?.value!=null&&Number.isFinite(configured))return configured;
 const data=techniqueDifficulty(source,Ruleset);return Number.isFinite(Number(source.system?.abilities?.[data.ability]?.value))?data.value:null;
}
const saveRoll=result=>Array.isArray(result)?result[0]:result?.rolls?.[0]??result;
const failed=(roll,dc)=>roll?.isFailure===true||roll?.isSuccess!==true&&Number.isFinite(roll?.total)&&roll.total<dc;
const hasCondition=(actor,id)=>actor.statuses?.has?.(id)||actor.effects?.some(effect=>!effect.disabled&&!effect.isSuppressed&&effect.statuses?.has?.(id));

/**
 * Resolve only recorded targets/outcomes. Callers can supply a recorded attackKey/targets for manual completion.
 * Side effects are awaited, actor writes are serialized, and uncertain external operations keep a pending receipt.
 * No live target-selection fallback, guessed hit, guessed enemy, or guessed cultivation rank is used.
 */
export async function applyElementalAttackRiders(activity,rolls,context={}){
 const result={applied:[],pending:[],skipped:[]};if(!Ruleset.isV2())return result;
 const source=activity?.item?.actor??activity?.actor,roll=rolls?.[0];
 const pending=(rider,target,reason,extra={})=>result.pending.push({rider,target,reason,...extra});
 if(!source||!roll){pending('attackRiders',null,'unknownSource');return result;}
 const message=context.message??roll.parent;
 const attackKey=context.attackKey??message?.uuid??message?.id;
 if(typeof attackKey!=='string'||!attackKey){pending('attackRiders',null,'missingAttackIdentity');return result;}
 if(!permitted(source)){pending('attackRiders',null,'permission');return result;}
 const descriptors=Array.from(context.targets??message?.system?.evaluatedTargets??message?.system?.targets??[]);
 if(!descriptors.length){pending('attackRiders',null,'unknownTargets');return result;}
 const {margemExcedente}=await import('./peculiaridades-automacao.mjs');
 const natural=naturalDie(roll,context.natural),modifiers=message?.flags?.[scope]?.elementalAttack??message?.flags?.[scope]?.elementalSnapshot?.attackModifiers??{};
 const snapshot=message?.flags?.[scope]?.elementalSnapshot?.riders;
 if(message?.type==='attack'&&!snapshot){pending('attackRiders',null,'missingAttackSnapshot');return result;}
 const accepted=snapshot??elementalRiderSnapshot(activity,{criticalMargin:margemExcedente(source)});
 const technique=context.isTechnique??accepted.isTechnique;
 const {frostTier,bleedTier,coldTier,punishmentTier,primary}=accepted;
 const dc=context.dc??accepted.dc,seen=new Set();
 for(const descriptor of descriptors){
  const row=targetData(descriptor,source,message),target=row.actor;
  if(!target||typeof row.key!=='string'){pending('attackRiders',row.key??null,'unknownTarget');continue;}
  if(seen.has(row.key))continue;seen.add(row.key);
  if(!permitted(target)){pending('attackRiders',row.key,'permission');continue;}
  const knownAc=descriptor.ac!==null&&descriptor.ac!==undefined&&Number.isFinite(Number(descriptor.ac));
  const critical=modifiers.automaticHit&&!modifiers.criticalOnly?false:descriptor.isCritical===true||roll.isCritical===true||(knownAc?Number(roll.total)>=Number(descriptor.ac)+accepted.criticalMargin:context.isCritical===true);
  const projection=Ruleset.elementalProjectionDamageState(target,{targetTokenUuid:row.key,event:message});
  if(projection.pending){pending('attackRiders',row.key,'projectionNeedsReview');continue;}
  if(projection.redirected){result.skipped.push({rider:'attackRiders',target:row.key,reason:'projection'});continue;}
  await locked(target,async lockToken=>{
   const execute=async(rider,operation,{reserve=false}={})=>{
    const key=[attackKey,row.key,rider].join('|'),prior=receipts(target).find(entry=>entry.key===key);
    if(prior){if(prior.status==='pending')pending(rider,row.key,'previousAttemptUncertain');else result.skipped.push({rider,target:row.key,reason:'alreadyResolved'});return;}
    if(reserve)await target.update({[receiptsPath]:updatedReceipts(target,{key,status:'pending'})});
    try{
     const answer=await operation();
     if(answer.pending){if(reserve)await target.update({[receiptsPath]:receipts(target).filter(entry=>entry.key!==key)});pending(rider,row.key,answer.pending);return;}
     await target.update({...answer.updates,[receiptsPath]:updatedReceipts(target,{key,status:'complete',outcome:answer.outcome??'applied'})});
     const entry={rider,target:row.key,...answer.data};
     if(answer.outcome&&answer.outcome!=='applied')result.skipped.push({...entry,reason:answer.outcome});else result.applied.push(entry);
    }catch(error){pending(rider,row.key,'operationFailed',{detail:String(error?.message??error)});}
   };
   if(frostTier&&!context.onlyLethargy){
    if(natural===null)pending('geada',row.key,'unknownNaturalDie');
    else if(natural>=[0,18,16,12][frostTier]){
     if(row.enemy===null)pending('geada',row.key,'unknownEnemy');
     else if(row.enemy)await execute('geada',async()=>{
      const current=elementalFrostStacks(target),maximum=[0,3,4,5][frostTier],stacks=current>=maximum?current:Math.min(maximum,current+1);
      return{updates:{['flags.'+scope+'.elementalState.geada']:{...state(target).geada,stacks,maximum:Math.max(maximum,integer(state(target).geada?.maximum,5)),source:source.uuid}},data:{stacks},outcome:stacks===current?'capped':'applied'};
     });
    }
   }
   const conditionRider=async(rider,condition,save,bonus=0,maximum=0)=>{
    if(row.outcome===null){pending(rider,row.key,'unknownOutcome');return;}
    if(row.outcome!=='hit')return;
    if(dc===null){pending(rider,row.key,'missingDifficulty');return;}
    if(!globalThis.CONFIG?.statusEffects?.[condition]){pending(rider,row.key,'missingCondition',{condition});return;}
    if(typeof target.rollSavingThrow!=='function'){pending(rider,row.key,'missingSavingThrow');return;}
    await execute(rider,async()=>{
     const current=maximum&&hasCondition(target,'jj-sangramento')?integer(state(target).bleeding?.stacks,8):0;
     if(maximum&&current>=maximum)return{outcome:'capped'};
     const check=saveRoll(await target.rollSavingThrow({ability:conditionSaveAbility(save),target:dc+bonus},{},{data:{flags:{[scope]:{elementalRiderSave:{attack:attackKey,rider,target:row.key}}}}}));
     if(!check||!Number.isFinite(check.total))return{pending:'saveCancelled'};
     if(!failed(check,dc+bonus))return{outcome:'resisted'};
     const {applyGameCondition}=await import('../applications/actor/jj/conditions.mjs');
     const previousEffects=new Set(Array.from(target.effects??[]));
     const applied=await applyGameCondition(target,condition,{origin:message?.uuid??source.uuid,...(maximum?{elementalBleeding:true,conditionDC:dc+bonus,conditionSave:conditionSaveAbility(save)}:{}),...(condition==='jj-congelando'?{elementalFreezing:true,conditionDC:dc+bonus}:{})});
     if(!applied)return{outcome:'unaffected'};
     const stacks=maximum?Math.min(maximum,current+1):0;
     if(maximum){
      const own=Array.from(target.effects??[]).find(e=>e.statuses?.has?.('jj-sangramento')&&e.flags?.[scope]?.elementalBleeding);
      const created=Array.from(target.effects??[]).find(e=>e.statuses?.has?.('jj-sangramento')&&!previousEffects.has(e));
      if(!own&&created?.update)await created.update({'flags.Immortals-system.elementalBleeding':true});
      else if(!own&&!created)await target.createEmbeddedDocuments('ActiveEffect',[{name:'Sangramento · Qi Afiado',origin:message?.uuid??source.uuid,statuses:['jj-sangramento'],changes:[],flags:{[scope]:{elementalBleeding:true}}}]);
     }
     const savedBleed=state(target).bleeding??{};
     const instances=Array.isArray(savedBleed.instances)?savedBleed.instances.filter(s=>s.remainingTurns>0):Array.from({length:current},()=>({source:savedBleed.source,primary:savedBleed.primary,remainingTurns:savedBleed.remainingTurns??3}));
     if(maximum)instances.push({id:attackKey+'|'+row.key,source:source.uuid,primary,remainingTurns:3});
     return{updates:maximum?{['flags.'+scope+'.elementalState.bleeding']:{...savedBleed,stacks,maximum,source:source.uuid,primary,instances,remainingTurns:3,damageType:'slashing'}}:condition==='jj-congelando'?{['flags.'+scope+'.elementalState.freezing']:{...state(target).freezing,source:source.uuid,primary,remainingTurns:1}}:{},data:{condition,...(maximum?{stacks}:{})}};
    },{reserve:true});
   };
   const lethargy=message?.flags?.[scope]?.elementalSnapshot?.attackModifiers?.lethargy;
   if(lethargy)await conditionRider('letargia','jj-letargico','con',integer(lethargy.dcBonus));
   if(!context.onlyLethargy&&critical&&bleedTier)await conditionRider('qiAfiado','jj-sangramento','fortitude',0,[0,1,5,8][bleedTier]);
   if(!context.onlyLethargy&&critical&&coldTier&&technique)await conditionRider('frioCongelante',coldTier===3?'jj-congelando':'jj-hipotermico','con',coldTier===3?3:0);
   if(punishmentTier&&!context.onlyLethargy){
    if(row.outcome===null)pending('punicaoTrovao',row.key,'unknownOutcome');
    else if(row.outcome==='miss'){
     if(row.enemy===null)pending('punicaoTrovao',row.key,'unknownEnemy');
     else if(row.enemy){
      if(!Number.isFinite(primary))pending('punicaoTrovao',row.key,'unknownPrimary');
      else await execute('punicaoTrovao',async()=>{
       const value=punishmentTier===1?Math.floor(primary/2):primary;
       const parts=[{type:'lightning',value:Math.max(0,value),active:{elemental:{processed:true,bonusSource:'relampago.punicaoTrovao.miss'}}}];
       if(value>0){if(typeof target.applyDamage==='function')await target.applyDamage(parts,{sourceActor:source,isAttack:false,elementalLockToken:lockToken,receipt:attackKey+'|'+row.key+'|punicaoTrovao'});else{const {applyDamageToActor}=await import('../applications/actor/jj/damage-application.mjs');await applyDamageToActor(target,value,{damages:parts,sourceActor:source,isAttack:false,elementalLockToken:lockToken,receipt:attackKey+'|'+row.key+'|punicaoTrovao'});}}
       if(value>0&&!elementalDamageCommitted(target,attackKey+'|'+row.key+'|punicaoTrovao'))return{pending:'damageNotCommitted'};
       return{data:{damage:Math.max(0,value),type:'lightning'}};
      },{reserve:true});
     }
    }
   }
   const clones=Ruleset.elementalArmorClassBonus(target);
   if(clones){if(row.outcome===null)pending('windClones',row.key,'unknownOutcome');else if(row.outcome==='hit')await execute('windClones',async()=>({updates:{['flags.'+scope+'.elementalState.windClones.remaining']:Math.max(0,clones-1)},data:{remaining:Math.max(0,clones-1)}}));}
  });
 }
 return result;
}
