/** Event identity, eligibility and effect scope for elemental reactions. */
const S='Immortals-system',escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function elementalReactionEventId(message){return message?.flags?.[S]?.elementalIncomingEventUuid??(message?.type==='attack'?message.uuid:null)??message?.getOriginatingMessage?.()?.uuid??message?.system?.origin?.uuid??message?.uuid??null;}
export function elementalReactionEventEligible(message,actor,tokenUuid){
 if(!message?.uuid||message.visible===false||message.flags?.[S]?.conditionResistance)return false;
 const origin=message.getOriginatingMessage?.()??message,activity=origin.getAssociatedActivity?.()??message.getAssociatedActivity?.();
 if(!['attack','save','damage'].includes(message.type)&&!['attack','save','damage'].includes(activity?.type))return false;
 const targets=Array.from(message.system?.targets??origin.system?.targets??[]);
 const selected=targets.some(row=>row.token?row.token===tokenUuid:(typeof row.actor==='object'?row.actor.uuid:row.actor)===actor?.uuid);
 const damage=Array.from(origin.getAssociatedRolls?.('damage')??message.getAssociatedRolls?.('damage')??[]).filter(d=>!d.flags?.[S]?.elementalIncomingEventUuid||d.flags[S].elementalIncomingEventUuid===elementalReactionEventId(message));
 const standalone=Array.from(globalThis.game?.messages?.contents??[]).some(d=>d.type==='damage'&&d.flags?.[S]?.elementalIncomingEventUuid===elementalReactionEventId(message));
 return selected&&!damage.length&&!standalone;
}
export function elementalAvoidsDamage(actor,message,{targetTokenUuid,sourceEventUuid}={}){
 const id=sourceEventUuid??elementalReactionEventId(message);if(!id)return false;
 const token=targetTokenUuid??actor.token?.uuid;
 return Object.values(actor.flags?.[S]?.elementalAvoidedEvents??{}).some(record=>record.teleported===true&&record.originEventId===id&&(!record.targetTokenUuid||record.targetTokenUuid===token));
}
export async function selectElementalReactionEvent(actor,tokenUuid,eventUuid){
 if(eventUuid){const event=await globalThis.fromUuid?.(eventUuid);if(!elementalReactionEventEligible(event,actor,tokenUuid))throw Error('Escolha um ataque ou técnica registrado contra este token, antes da rolagem de dano.');return elementalReactionEventId(event);}
 const events=new Map();for(const event of Array.from(globalThis.game?.messages?.contents??globalThis.game?.messages??[])){if(elementalReactionEventEligible(event,actor,tokenUuid))events.set(elementalReactionEventId(event),event);}
 if(!events.size)throw Error('Não há ataque ou técnica elegível registrado contra este token antes do dano.');
 return globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Avatar das Chamas · ataque evitado'},content:'<p>Escolha o ataque ou técnica cujo dano será cancelado após o teleporte.</p><label>Evento<select name="event">'+Array.from(events).reverse().map(([id,event])=>'<option value="'+escape(id)+'">'+escape(event.flavor??event.speaker?.alias??'Ataque ou técnica')+'</option>').join('')+'</select></label>',buttons:[{action:'choose',label:'Vincular reação',default:true,callback:(_e,_b,d)=>d.element.querySelector('[name="event"]').value},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
}
