import {withElementalActorLock} from './elemental-runtime.mjs';
/** Instance-specific maintenance; integrity stays on the protected actor or structural owner. */
const S='Immortals-system';
const number=value=>Math.max(0,Math.trunc(Number(value)||0));
function resolveActor(uuid,resolve){try{const document=resolve?.(uuid,{strict:false});return document?.actor??document;}catch{return null;}}
export function effectiveElementalPrison(record,{resolveUuid=globalThis.fromUuidSync}={}){
 if(record.kind!=='icePrison'||!record.upkeepId||!record.upkeepSourceActorUuid)return record;
 if(record.eternal)return record;
 const source=resolveActor(record.upkeepSourceActorUuid,resolveUuid),entry=source?.flags?.[S]?.elementalPrisonUpkeep?.[record.upkeepId];
 if(entry?.eternal)return{...record,eternal:true};
 const learned=source?.system?.elementAbilities?.gelo?.eternalPrison;
 return{...record,active:record.active&&entry?.active===true&&!entry.pending&&learned!==0};
}
export function elementalPrisonUpkeepPlan(actor,{turn,availableQi=actor.system?.energy?.generated,resolveUuid=globalThis.fromUuidSync,selectedIds}={}){
 const saved=actor.flags?.[S]?.elementalPrisonUpkeep??{},entries=structuredClone(saved),operations=[],candidates=[];let qiSpent=0;
 if(!turn)return{entries,updates:{},operations,qiSpent,needsChoice:false,candidates:[]};
 const known=actor.system?.elementAbilities?.gelo?.eternalPrison;
 for(const[id,entry]of Object.entries(entries)){
  if(!entry.active||entry.pending)continue;
  const owner=entry.ownerActorUuid===actor.uuid?actor:resolveActor(entry.ownerActorUuid,resolveUuid),record=owner?.flags?.[S]?.elementalConstructs?.[entry.recordId];
  if(!record||!record.active||record.hp?.value===0||known===0&&!entry.eternal){entry.active=false;continue;}
  if(entry.eternal||number(entry.investedQi)>=500){entry.eternal=true;entry.investedQi=500;if(!record.eternal)operations.push({ownerActorUuid:entry.ownerActorUuid,updates:{['flags.'+S+'.elementalConstructs.'+entry.recordId+'.eternal']:true}});continue;}
  if(entry.upkeepTurn!==turn)candidates.push(id);
 }
 const required=20*candidates.length;
 if(required>number(availableQi)&&selectedIds===undefined)return{entries,updates:{},operations:[],qiSpent:0,needsChoice:true,candidates,required};
 const chosen=selectedIds===undefined?candidates:selectedIds;
 if(!Array.isArray(chosen)||new Set(chosen).size!==chosen.length||chosen.some(id=>!candidates.includes(id)))throw Error('Seleção de prisões inválida.');
 if(chosen.length*20>number(availableQi))throw Error('Qi Refinado insuficiente para as prisões escolhidas.');
 for(const id of candidates){const entry=entries[id];if(!chosen.includes(id)){entry.active=false;continue;}qiSpent+=20;entry.investedQi=Math.min(500,number(entry.investedQi)+20);entry.upkeepTurn=turn;entry.eternal=entry.investedQi>=500;if(entry.eternal)operations.push({ownerActorUuid:entry.ownerActorUuid,updates:{['flags.'+S+'.elementalConstructs.'+entry.recordId+'.eternal']:true}});}
 const updates=JSON.stringify(saved)===JSON.stringify(entries)?{}:{['flags.'+S+'.elementalPrisonUpkeep']:entries};
 return{entries,updates,operations,qiSpent,needsChoice:false,candidates,required};
}

/** Creator-owned upkeep can end without requiring write access to its captive. Eternal is irreversible here. */
export async function endElementalPrisonUpkeep(actor,id,{user=globalThis.game?.user}={}){if(!actor?.isOwner&&!user?.isGM)throw Error('Sem permissão para encerrar esta manutenção.');return withElementalActorLock(actor,'end-prison:'+id,async()=>{const entry=actor.flags?.[S]?.elementalPrisonUpkeep?.[id];if(!entry)return false;if(entry.eternal||number(entry.investedQi)>=500)throw Error('Esta prisão se tornou eterna e não pode ser removida.');const updates={['flags.'+S+'.elementalPrisonUpkeep.'+id+'.active']:false};if(actor.flags?.[S]?.elementalState?.eternalPrison?.instanceId===id)updates['flags.'+S+'.elementalState.eternalPrison.active']=false;await actor.update(updates);return true;});}
