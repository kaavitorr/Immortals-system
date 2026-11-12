import {withElementalActorLock} from './elemental-runtime.mjs';
const S='Immortals-system';
/** No free target patches: completion derives the single effect from a paid owned activity. */
export async function executeElementalStabilization({actor,activity,context,user}){
 const pending=reason=>({applied:[],pending:[{reason}]});
 if(!user?.isGM)return pending('Aguardando o narrador.');
 const receipt=actor.flags?.[S]?.elementalUseReceipts?.[context.requestId]??actor.flags?.[S]?.elementalState?.receipts?.[activity.id];
 if(!receipt||receipt.requestId!==context.requestId||receipt.ruleData?.rule!=='stabilize'||receipt.targets?.length!==1)return pending('Pagamento ou alvo da estabilização não confirmado.');
 const document=await globalThis.fromUuid?.(receipt.targets[0]),target=document?.actor??document;
 if(!target?.system?.attributes?.hp)return pending('Alvo registrado não encontrado.');
 return withElementalActorLock(target,'stabilize:'+context.requestId,async()=>{
  const previous=target.flags?.[S]?.elementalStabilizations??[];
  if(previous.includes(context.requestId))return{applied:[],pending:[],skipped:[{target:target.uuid,reason:'alreadyResolved'}]};
  const {hp,death}=target.system.attributes;
  if(Number(hp.value)!==0||!death||Number(death.failure)>=3||Number(death.success)>=3)return{applied:[],pending:[],skipped:[{target:target.uuid,reason:'noLongerEligible'}]};
  await target.update({'system.attributes.death.success':3,'system.attributes.death.failure':0,['flags.'+S+'.elementalStabilizations']:[...previous,context.requestId]});
  return{applied:[{target:target.uuid,effect:'stabilized'}],pending:[]};
 });
}

/** The free save step cannot create a prison without its paid hit and actual failed save. */
export async function executeElementalEarthPrison({actor,activity,context,message,user}){
 const pending=reason=>({applied:[],pending:[{reason}]});if(!user?.isGM)return pending('Aguardando o narrador.');
 const receipt=actor.flags?.[S]?.elementalUseReceipts?.[context.requestId]??actor.flags?.[S]?.elementalState?.receipts?.[activity.id];
 if(!receipt||receipt.requestId!==context.requestId||receipt.ruleData?.rule!=='earthPrisonSave'||receipt.targets?.length!==1)return pending('Uso e alvo da salvaguarda não confirmados.');
 const parentId=receipt.parentUseId??context.choices?.parentUseId;
 const parent=parentId?actor.flags?.[S]?.elementalUseReceipts?.[parentId]:actor.flags?.[S]?.elementalState?.receipts?.[receipt.ruleData.paidBy],uuid=receipt.targets[0];
 if(parentId&&(parent?.requestId!==parentId||parent.source?.itemId!==receipt.source?.itemId||parent.source?.activityId!==receipt.ruleData.paidBy||!parent.followUps?.includes(activity.id)))return pending('A etapa paga selecionada não confirma esta prisão.');
 if(!parent?.attackMessageUuid||!parent.attackTargets?.some(t=>t.hit&&(t.actor===uuid||t.token===uuid)))return pending('O ataque pago não confirmou acerto neste alvo.');
 const document=await globalThis.fromUuid?.(uuid),target=document?.actor??document;
 if(!target?.uuid)return pending('Alvo registrado não encontrado.');
 const saves=Array.from(message.getAssociatedRolls?.('save')??[]).filter(save=>!save.flags?.[S]?.conditionResistance&&save.getAssociatedActor?.()?.uuid===target.uuid&&(uuid===target.uuid||save.getAssociatedToken?.()?.uuid===uuid));
 const save=saves.at(-1),roll=save?.rolls?.[0];if(!roll)return pending('Role a salvaguarda registrada de Agilidade deste alvo.');
 const authorId=save._stats?.createdBy??save.author?.id,author=globalThis.game?.users?.get?.(authorId)??(authorId===user.id?user:null);
 if(!author||!(author.isGM||target.testUserPermission?.(author,'OWNER')===true||Number(target.ownership?.[authorId])>=3))return pending('A salvaguarda deve ser rolada pelo dono do alvo ou pelo narrador.');
 let failure=roll.isFailure===true,known=typeof roll.isFailure==='boolean'||typeof roll.isSuccess==='boolean';
 const rawDC=roll.options?.target??receipt.saveDC,dc=rawDC!==null&&rawDC!==undefined&&rawDC!==''?Number(rawDC):NaN;if(!known&&Number.isFinite(dc)&&Number.isFinite(roll.total)){known=true;failure=roll.total<dc;}
 if(!known)return pending('Não foi possível confirmar o resultado da salvaguarda.');
 if(!failure||save.system?.forceSuccess)return{applied:[],pending:[],skipped:[{target:target.uuid,reason:'resisted'}]};
 return withElementalActorLock(target,'earth-prison:'+context.requestId,async()=>{
  const existing=Object.values(target.flags?.[S]?.elementalConstructs??{}).find(record=>record.sourceUseId===context.requestId);if(existing)return{applied:[],pending:[],skipped:[{target:target.uuid,reason:'alreadyResolved'}]};
  const {prepareElementalConstruct}=await import('./elemental-constructs.mjs');
  const record=prepareElementalConstruct({...activity,actor,item:activity.item,flags:{[S]:{elementalActivity:receipt.ruleData}}},{},{...context,targetUuids:[uuid]})[0];
  await target.update({['flags.'+S+'.elementalConstructs.'+record.id]:record});return{applied:[{target:target.uuid,id:record.id,effect:'earthPrison'}],pending:[]};
 });
}
