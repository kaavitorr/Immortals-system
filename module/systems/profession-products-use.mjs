import {prepareProfessionProductUse} from './profession-products-activities.mjs';
import {toxinState,toxinStateUpdate} from './profession-crafting-rules.mjs';
import {elementalActionSpendUpdates,withElementalActorLock} from './elemental-runtime.mjs';
const SCOPE='Immortals-system',bindings=new WeakMap();
const activityFrom=(item,id)=>item?.system?.activities?.get?.(id)??item?.system?.activities?.[id];
const configuration=item=>JSON.stringify(item?.flags?.[SCOPE]?.professionProduct??null);
function liveProduct(activity){
 const actor=activity.actor??activity.item?.actor,item=activity.item,itemId=item?.id??item?._id,id=activity.id??activity._id;
 if(!actor||actor.isOwner===false||actor.limited||item?.isOwner===false||item?.isEmbedded===false||actor.canUserModify&&!actor.canUserModify(globalThis.game?.user,'update'))throw Error('Você não tem permissão para usar este produto.');
 const liveItem=actor.items?.get?.(itemId),liveActivity=activityFrom(liveItem,id);
 if(!liveItem||!liveActivity)throw Error('O produto não existe mais no inventário desta criatura.');
 if(liveItem.isOwner===false||liveItem.isEmbedded===false)throw Error('Você não tem permissão para usar este produto.');
 if(configuration(item)!==configuration(liveItem))throw Error('A configuração do produto mudou durante o uso. Tente novamente.');
 const binding=bindings.get(item);if(binding&&(binding.item!==liveItem||binding.activity!==liveActivity))throw Error('O produto ou sua atividade foram alterados durante o uso. Tente novamente.');
 bindings.set(item,{item:liveItem,activity:liveActivity});
 return{actor,item:liveItem,activity:liveActivity,quantity:liveItem.system?.quantity,itemSpent:liveItem.system?.uses?.spent,activitySpent:liveActivity.uses?.spent,configuration:configuration(liveItem)};
}
/** Refresh only an isolated working copy. Never recreate a deleted final unit or change its recipe configuration. */
export function refreshProfessionProductConsumption(activity){
 if(!activity?.flags?.[SCOPE]?.professionProductActivity)return;
 const live=liveProduct(activity),item=activity.item;
 if(live.item!==item){
  if(typeof item.updateSource!=='function')throw Error('A cópia de trabalho do produto não pode ser atualizada com segurança.');
  const update={'system.quantity':live.quantity};
  if(live.item.system?.uses){for(const key of ['spent','autoDestroy'])if(live.item.system.uses[key]!==undefined)update['system.uses.'+key]=live.item.system.uses[key];update['system.uses.max']=String(live.item._source?.system?.uses?.max??live.item.system.uses.max??'');update['system.uses.recovery']=Array.from(live.item.system.uses.recovery??[],entry=>({period:entry.period,type:entry.type,...(entry.formula?{formula:entry.formula}:{})}));}
  item.updateSource(update);
  if(live.item.system?.uses){item.system.uses.max=live.item.system.uses.max;item.system.uses.value=live.item.system.uses.value;}
 }
 if(live.activity!==activity&&live.activity.uses?.spent!==undefined){if(typeof activity.updateSource!=='function')throw Error('A cópia da atividade não pode ser atualizada com segurança.');activity.updateSource({'uses.spent':live.activity.uses.spent});activity.uses.max=live.activity.uses.max;activity.uses.value=live.activity.uses.value;}
 return live;
}
/** Plan one native commit. Quantity and Qi are left exclusively to their existing native planners. */
export function prepareProfessionProductActivation(activity,usageConfig={},options={}){
 if(!activity?.flags?.[SCOPE]?.professionProductActivity)return{actor:{}};
 const live=liveProduct(activity),actor=live.actor,check=prepareProfessionProductUse(activity,{actor,usageConfig}),current=prepareProfessionProductUse(live.activity,{actor,usageConfig});
 if(!check.ok)throw Error(check.reason);if(!current.ok)throw Error(current.reason);
 if(options.snapshot){const previous=options.snapshot;if(previous.item!==live.item||previous.activity!==live.activity||previous.quantity!==live.quantity||previous.itemSpent!==live.itemSpent||previous.activitySpent!==live.activitySpent||previous.configuration!==live.configuration)throw Error('O estoque ou a configuração do produto mudou durante o uso. Tente novamente.');}
 const targets=Array.from(activity.consumption?.targets??[]),enabled=usageConfig.consume;
 if(targets.length&&(enabled===false||targets.some((_target,index)=>enabled!==true&&enabled?.resources!==true&&!(Array.isArray(enabled?.resources)&&enabled.resources.includes(index)))))throw Error('Mantenha o consumo dos recursos deste produto ativado.');
 if(check.meta.consumeItem){for(const item of [activity.item,live.item])if(item.type!=='consumable'||Number(item.system?.uses?.max)!==1||item.system?.uses?.autoDestroy!==true)throw Error('O consumo de uma unidade deste produto precisa estar configurado no item.');}
 const updates=elementalActionSpendUpdates(actor,options.actionCost??(Number(activity.activation?.value)||0));
 if(check.product.kind==='pill'&&check.meta.consumeItem){const poison=Number(check.poison);if(!Number.isFinite(poison)||poison<0)throw Error('A dosagem de toxinas deste produto é inválida.');Object.assign(updates,toxinStateUpdate(actor,toxinState(actor).value+poison).updates);}
 return{actor:updates,meta:check.meta,product:check.product,poison:check.poison,snapshot:live};
}
/** All profession, elemental and Qi talent payments share the same actor queue. */
export function withProfessionProductActivationLock(activity,callback){return withElementalActorLock(activity.actor??activity.item?.actor,'profession-use:'+(activity.item?.id??activity.item?._id)+':'+(activity.id??activity._id),callback);}
