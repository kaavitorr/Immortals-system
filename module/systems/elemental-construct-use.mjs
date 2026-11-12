import {ELEMENTAL_CONSTRUCT_RULES,prepareElementalConstruct} from './elemental-constructs.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
const S='Immortals-system';
/** GM completion uses the paid snapshot; a partial target write never counts as fully registered upkeep. */
export async function executeElementalConstructRequest({actor,activity,context,user}){
 const pending=reason=>({applied:[],pending:[{reason}]});
 if(!user?.isGM)return pending('Aguardando o narrador.');
 const meta=activity.flags?.[S]?.elementalActivity,receipt=actor.flags?.[S]?.elementalUseReceipts?.[context.requestId]??actor.flags?.[S]?.elementalState?.receipts?.[activity.id];
 if(!ELEMENTAL_CONSTRUCT_RULES.has(meta?.rule)||!receipt||receipt.requestId!==context.requestId)return pending('Não foi possível confirmar o pagamento desta estrutura.');
 const targets=receipt.targets??[],paidMeta=receipt.ruleData;
 if(!paidMeta||paidMeta.rule!==meta.rule||actor.uuid!==context.sourceActorUuid)return pending('O registro da configuração paga precisa ser conferido.');
 const recipients=[];for(const uuid of targets){const document=await globalThis.fromUuid?.(uuid),target=document?.actor??document;if(target?.documentName==='Actor'||['character','npc'].includes(target?.type))recipients.push(target);}
 const eternal=meta.rule==='eternalIcePrison';
 if(meta.rule==='protectiveBubble'&&recipients.length!==1)return pending('A bolha exige exatamente uma criatura registrada como alvo.');
 const shared=eternal&&recipients.length>1;
 const recipient=meta.rule==='protectiveBubble'||eternal&&recipients.length===1?recipients[0]:actor;
 const already=Object.values(recipient.flags?.[S]?.elementalConstructs??{}).filter(record=>record.sourceUseId===context.requestId);
 if(already.length&&!eternal)return{applied:already.map(r=>({id:r.id,target:recipient.uuid})),pending:[]};
 if(already.length&&eternal&&actor.flags?.[S]?.elementalPrisonUpkeep?.[context.requestId]?.recordId&&(!shared||recipients.every(target=>target.flags?.[S]?.elementalConstructRefs?.[already[0].id]?.ownerActorUuid===recipient.uuid)))return{applied:already.map(r=>({id:r.id,target:recipient.uuid})),pending:[]};
 const maximum=meta.rule==='iceStructure'?(paidMeta.tier===3?1:paidMeta.tier===2?20:10):meta.rule==='earthStructure'?Math.max(1,Math.floor(Number(paidMeta.volumeM3)||1)):1;
 let selection=already.length?{count:1,description:already[0].description,eligibility:already[0].eligibilityConfirmed}:null;
 if(!selection?.eligibility&&eternal||!selection){selection=await globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Estrutura elemental · '+activity.name},content:'<p>Confirme a estrutura paga. Posição e representação no mapa serão escolhidas pelo narrador.</p>'+(maximum>1?'<label>Quantidade<input name="count" type="number" value="1" min="1" max="'+maximum+'" step="1"></label>':'')+(eternal?'<label><input name="eligibility" type="checkbox"> O alvo é um objeto, uma criatura voluntária ou incapaz de lutar.</label>':'')+'<label>Descrição e posição<textarea name="description" rows="3"></textarea></label>',buttons:[{action:'confirm',label:'Registrar estrutura',default:true,callback:(_e,_b,d)=>({count:Number(d.element.querySelector('[name="count"]')?.value??1),description:d.element.querySelector('[name="description"]').value,eligibility:d.element.querySelector('[name="eligibility"]')?.checked})},{action:'later',label:'Resolver depois',callback:()=>null}],rejectClose:false});}
 if(!selection||eternal&&!selection.eligibility)return pending('A posição e os requisitos da estrutura aguardam confirmação do narrador.');
 const participants=Array.from(new Map([[actor.uuid,actor],[recipient.uuid,recipient],...recipients.map(target=>[target.uuid,target])]).values()).sort((a,b)=>a.uuid.localeCompare(b.uuid));
 const commit=async()=>{
  const existing=Object.values(recipient.flags?.[S]?.elementalConstructs??{}).filter(r=>r.sourceUseId===context.requestId);
  if(!existing.length&&meta.rule==='protectiveBubble'&&recipient.flags?.[S]?.elementalBubbleUsed)return pending('Esta criatura já recebeu uma bolha desde seu último descanso longo.');
  const records=existing.length?existing:prepareElementalConstruct({...activity,actor,item:activity.item,flags:{[S]:{elementalActivity:paidMeta}}},selection,{...context,targetUuids:targets,worldTime:receipt.worldTime}).map(record=>({...record,description:String(selection.description??'').slice(0,2000),recipientActorUuid:meta.rule==='protectiveBubble'||eternal&&recipients.length===1?recipient.uuid:null,geometryOnly:eternal&&(shared||!recipients.length),eligibilityConfirmed:eternal?true:undefined,...(eternal?{upkeepId:context.requestId,upkeepSourceActorUuid:actor.uuid}:{})}));
  if(!existing.length){const updates={};for(const record of records)updates['flags.'+S+'.elementalConstructs.'+record.id]=record;if(meta.rule==='protectiveBubble')updates['flags.'+S+'.elementalBubbleUsed']=true;await recipient.update(updates);}
  if(shared){const record=records[0];for(const target of recipients){const ref=target.flags?.[S]?.elementalConstructRefs?.[record.id];if(ref?.ownerActorUuid===recipient.uuid&&ref.recordId===record.id)continue;await target.update({['flags.'+S+'.elementalConstructRefs.'+record.id]:{id:record.id,kind:record.kind,ownerActorUuid:recipient.uuid,recordId:record.id,sourceUseId:context.requestId}});}}
  if(eternal){
   const previous=actor.flags?.[S]?.elementalPrisonUpkeep?.[context.requestId]??{},record=records[0];
   const entry={...previous,id:context.requestId,sourceUseId:context.requestId,source:receipt.source,active:record.active,pending:false,ownerActorUuid:recipient.uuid,targetName:shared?recipients.map(target=>target.name??target.uuid).join(', '):(recipient.name??recipient.uuid),recordId:record.id,investedQi:previous.investedQi??20,eternal:previous.eternal??false,upkeepTurn:previous.upkeepTurn??receipt.turn};
   const updates={['flags.'+S+'.elementalPrisonUpkeep.'+context.requestId]:entry};
   if(actor.flags?.[S]?.elementalState?.receipts?.[activity.id]?.requestId===context.requestId)updates['flags.'+S+'.elementalState.eternalPrison']={...entry,instanceId:context.requestId,upkeepQi:20,pool:'generated'};
   await actor.update(updates);
  }
  return{applied:records.map(r=>({id:r.id,target:recipient.uuid})),pending:[]};
 };
 const locked=index=>index===participants.length?commit():withElementalActorLock(participants[index],'construct:'+context.requestId,()=>locked(index+1));
 return locked(0);
}
