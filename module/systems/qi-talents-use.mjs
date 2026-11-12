import {prepareQiTalentUse} from './qi-talents-activities.mjs';
import {elementalActionSpendUpdates,elementalRuntimeContext,withElementalActorLock} from './elemental-runtime.mjs';
const scope='Immortals-system';
export function prepareQiTalentActivation(activity,usageConfig={},options={}){
 const actor=activity.actor??activity.item?.actor;if(actor?.isOwner===false)throw Error('Você não tem permissão para controlar esta criatura.');
 const check=prepareQiTalentUse(activity,{actor,usageConfig,level:options.level});if(!check.ok)throw Error(check.reason);
 const targets=Array.from(activity.consumption?.targets??[]),enabled=usageConfig.consume;
 if(targets.length&&(enabled===false||targets.some((_t,index)=>enabled!==true&&enabled?.resources!==true&&!(Array.isArray(enabled?.resources)&&enabled.resources.includes(index)))))throw Error('Mantenha o consumo dos recursos deste talento ativado.');
 const actorUpdates=elementalActionSpendUpdates(actor,options.actionCost??(Number(activity.activation?.value)||0));
 if(check.meta?.rule==='divineSense')actorUpdates['flags.'+scope+'.elementalState.divineSenseActive']={active:true};
 const upkeep=activity.getConstantUpkeep?.();
 if(upkeep?.active){const turn=options.turn??elementalRuntimeContext().turn;actorUpdates['flags.'+scope+'.upkeep.'+(activity.id??activity._id)]={itemId:activity.item.id??activity.item._id,label:activity.item.name+' — '+activity.name,qiTalent:true,lastPaidTurn:turn??null};}
 return {actor:actorUpdates,meta:check.meta};
}
export function refreshQiTalentConsumption(activity){
 if(!activity?.flags?.[scope]?.qiTalentActivity)return;const actor=activity.actor??activity.item?.actor,item=activity.item,live=actor?.items?.get?.(item?.id??item?._id);if(!live||live===item)return;
 const spent=live.system?.activities?.get?.(activity.id??activity._id)?.uses?.spent;if(spent!==undefined&&activity.updateSource)activity.updateSource({'uses.spent':Math.max(0,Math.trunc(Number(spent)||0))});
}
export function withQiTalentActivationLock(activity,callback){return withElementalActorLock(activity.actor??activity.item?.actor,'qi-use:'+(activity.item?.id??activity.item?._id)+':'+(activity.id??activity._id),callback);}
