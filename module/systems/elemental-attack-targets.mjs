/** Reopened paid attacks use their recorded targets, never the current user's selection. */
export async function elementalAttackTargets(activity,message={}, {getDescriptors,resolveUuid=globalThis.fromUuid}={}){
 const origin=message.data?.system?.origin??activity._jj2OriginMessage;
 const card=typeof origin==='object'?origin:globalThis.game?.messages?.get?.(String(origin??'').split('.').at(-1));
 const reaction=card?.flags?.['Immortals-system']?.elementalMovementReaction??message.data?.flags?.['Immortals-system']?.elementalMovementReaction;
 const context=card?.flags?.['Immortals-system']?.elementalUseContext??(reaction?{...reaction,targetUuids:[reaction.targetTokenUuid]}:null);
 if(!context)return getDescriptors();
 if(context.sourceActorUuid!==(activity.actor??activity.item?.actor)?.uuid||context.itemUuid!==activity.item?.uuid||context.activityId!==activity.id)throw Error('A ativação paga não pertence a este ataque.');
 const descriptors=[];
 for(const uuid of context.targetUuids??[]){
  const document=await resolveUuid?.(uuid);
  if(!document)throw Error('O alvo da ativação paga não está mais disponível.');
  if(document.actor)descriptors.push(...getDescriptors([document]));
  else if(document.system){const ac=document.statuses?.has?.('coverTotal')?null:document.system.attributes?.ac?.value;descriptors.push({actor:document.uuid,ac:ac??null,img:document.img,name:document.name});}
  else throw Error('O alvo registrado não é uma criatura.');
 }
 return descriptors;
}
