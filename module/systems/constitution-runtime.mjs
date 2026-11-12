import {constitutionSelectionUpdates} from './constitution-rules.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
const SCOPE='Immortals-system';
function requireOwner(actor,user){
 if(!actor||!['character','npc'].includes(actor.type)||actor.isOwner!==true||actor.limited||actor.canUserModify&&user&&!actor.canUserModify(user,'update'))throw Error('Você não tem permissão para alterar esta constituição.');
}
/** Selection never grants items or overwrites source statistics. Only effects owned by this feature are removed. */
export async function selectConstitution(actor,value,options={}){
 const user=options.user??globalThis.game?.user;requireOwner(actor,user);
 return withElementalActorLock(actor,'constitution-selection',async()=>{
  requireOwner(actor,user);
  const updates=constitutionSelectionUpdates(actor,value,options);
  const ids=Array.from(actor.effects??[]).filter(effect=>effect.flags?.[SCOPE]?.constitutionEffect===true).map(effect=>effect.id??effect._id).filter(Boolean);
  if(ids.length){if(typeof actor.performBulkUpdate!=='function')throw Error('A troca precisa encerrar os efeitos anteriores em uma operação segura.');await actor.performBulkUpdate({actor:updates,operations:[{action:'delete',documentName:'ActiveEffect',parent:actor,ids}]},{constitutionUpdate:true});}
  else await actor.update(updates,{constitutionUpdate:true});
  return updates;
 });
}
