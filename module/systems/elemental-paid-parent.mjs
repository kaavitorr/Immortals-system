/** Bind free follow-ups to one paid native attack, never the latest unrelated use. */
const S='Immortals-system';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currentContext(){const combat=globalThis.game?.combat,combatant=combat?.combatant??combat?.combatants?.get?.(combat?.current?.combatantId);return{turn:combat?.started&&combatant?.id?(combat.uuid??combat.id)+':'+Math.max(0,Math.trunc(Number(combat.round)||0))+':'+combatant.id:null,worldTime:globalThis.game?.time?.worldTime};}
export function elementalPaidParents(actor,activity,context=currentContext()){
 const meta=activity?.flags?.[S]?.elementalActivity;if(!meta?.paidBy)return[];
 const latest=actor.flags?.[S]?.elementalState?.receipts?.[meta.paidBy],all=new Map(Object.entries(actor.flags?.[S]?.elementalUseReceipts??{}).map(([id,r])=>[r.requestId??id,{...r,requestId:r.requestId??id}]));
 if(latest&&!all.has(latest.requestId))all.set(latest.requestId??'legacy',latest);
 return Array.from(all.values()).filter(r=>{
  if(r.source?.itemId!==activity.item.id||r.source?.activityId!==meta.paidBy||r.followUps?.includes(activity.id))return false;
  if(Object.hasOwn(context,'turn')&&r.turn!==context.turn)return false;
  if(!context.turn&&Number.isFinite(context.worldTime)&&Number.isFinite(r.worldTime)&&r.worldTime!==context.worldTime)return false;
  if(!r.attackMessageUuid)return false;
  return meta.rule==='earthPrisonSave'?r.attackTargets?.some(t=>t.hit):r.attackHit===true;
 });
}
export async function selectElementalPaidParent(activity,usage={}){
 const meta=activity.flags?.[S]?.elementalActivity;if(!meta?.paidBy)return null;
 let records=elementalPaidParents(activity.actor??activity.item.actor,activity);
 if(meta.rule==='voidAbsorptionHealing')records=records.filter(r=>r.qiSpent===Number(usage.scaling??0)+1);
 if(!records.length)throw Error('Não há acerto pago disponível neste turno e nesta escala. Conclua o ataque correspondente antes desta etapa.');
 let record;
 if(usage.elementalParentUseId)record=records.find(r=>r.requestId===usage.elementalParentUseId);
 else if(records.length===1)record=records[0];
 else{const id=await globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Vincular ao ataque pago'},content:'<p>Escolha o acerto que será concluído. Cada etapa só pode ser aplicada uma vez.</p><select name="parent">'+records.map((r,i)=>'<option value="'+escape(r.requestId??'legacy')+'">Acerto '+(i+1)+' · '+r.qiSpent+' PQ · '+escape(r.attackTargets?.filter(t=>t.hit).map(t=>globalThis.fromUuidSync?.(t.actor,{strict:false})?.name??t.actor).join(', ')??r.attackMessageUuid)+'</option>').join('')+'</select>',buttons:[{action:'choose',label:'Vincular',default:true,callback:(_e,_b,d)=>d.element.querySelector('[name="parent"]').value},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});if(!id)return null;record=records.find(r=>(r.requestId??'legacy')===id);}
 if(!record)throw Error('O ataque escolhido não está mais disponível.');
 return{requestId:record.requestId??null,targets:meta.rule==='earthPrisonSave'?record.attackTargets.filter(t=>t.hit):[]};
}
