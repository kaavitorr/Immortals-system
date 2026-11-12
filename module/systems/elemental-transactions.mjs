import {withElementalActorLock,elementalActorLockHeld} from './elemental-runtime.mjs';
const S='Immortals-system';let sequence=0;
export function elementalDamageCommitted(actor,receipt){return !!receipt&&(actor.flags?.[S]?.elementalDamageReceipts??[]).some(r=>r.id===receipt&&r.status==='complete');}
export function elementalDamageReceiptUpdates(actor,options,result={}){
 if(!options.receipt)return{};
 const receipts=actor.flags?.[S]?.elementalDamageReceipts??[];
 return{['flags.'+S+'.elementalDamageReceipts']:[...receipts.filter(r=>r.id!==options.receipt),{id:options.receipt,status:'complete',result:structuredClone(result)}]};
}
export async function withElementalDamageTransaction(actor,options,apply,onDuplicate=()=>({alreadyApplied:true})){
 const receipt=options.receipt??options.originatingMessage?.uuid??options.origin?.uuid??null;
 const run=async token=>{const normalized={...options,receipt,elementalLockToken:token};if(receipt&&(actor.flags?.[S]?.elementalDamageReceipts??[]).some(r=>r.id===receipt&&r.status==='complete'))return onDuplicate();return apply(normalized);};
 if(elementalActorLockHeld(actor,options.elementalLockToken))return run(options.elementalLockToken);
 return withElementalActorLock(actor,'damage:'+(receipt??++sequence),run);
}
