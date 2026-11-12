import {elementalStableId} from './elemental-activity-data.mjs';
import {elementalReactionEventEligible} from './elemental-reactions.mjs';
import {elementalRuntimeContext,withElementalActorLock} from './elemental-runtime.mjs';
import {elementalRecipientConstructs} from './elemental-constructs.mjs';
const S='Immortals-system';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function selectElementalSourceToken(actor){
 if(actor?.token?.uuid&&!Array.from(globalThis.canvas?.tokens?.placeables??[]).some(t=>t.actor?.uuid===actor.uuid&&t.document?.uuid!==actor.token.uuid))return actor.token.uuid;
 const tokens=Array.from(globalThis.canvas?.tokens?.placeables??[]).filter(token=>token.actor?.uuid===actor?.uuid&&token.document?.isOwner!==false);
 if(!tokens.length)throw Error('Coloque um token desta criatura na cena antes de ativar o teleporte.');
 if(tokens.length===1)return tokens[0].document.uuid;
 return globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog'],window:{title:'Origem do teleporte'},content:'<label>Token<select name="token">'+tokens.map(token=>'<option value="'+escape(token.document.uuid)+'">'+escape(token.name)+'</option>').join('')+'</select></label>',buttons:[{action:'choose',label:'Escolher token',default:true,callback:(_e,_b,d)=>d.element.querySelector('[name="token"]').value},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
}
/** Native destination planning; source is a paid identity, never the later controlled-token list. */
export async function commitElementalTeleport(activity,message,{resolveUuid=globalThis.fromUuid,sceneDistance=value=>value}={}){
 const actor=activity.actor??activity.item?.actor,context=message?.flags?.[S]?.elementalUseContext;
 if(actor?.isOwner===false||!context||context.sourceActorUuid!==actor?.uuid)throw Error('Este teleporte exige sua ativação paga registrada.');
 return withElementalActorLock(actor,'teleport:'+context.requestId,async()=>{
  const credit=actor.flags?.[S]?.elementalSpatialCredits?.[context.requestId];
  if(!credit||credit.sourceTokenUuid!==context.sourceTokenUuid)throw Error('O token não corresponde à origem paga do teleporte.');
  if(credit.status==='complete')throw Error('Este teleporte já foi utilizado.');
  if(credit.status!=='ready')throw Error('O movimento anterior precisa ser conferido pelo narrador.');
  const valid=async()=>{if(credit.turn&&credit.turn!==elementalRuntimeContext().turn)throw Error('O turno deste teleporte já terminou.');if(credit.source?.abilityId==='avatarChamas'){const incoming=await resolveUuid?.(credit.originEventId);if(!elementalReactionEventEligible(incoming,actor,credit.sourceTokenUuid))throw Error('O evento não permite mais reagir antes do dano.');}};await valid();
  const token=await resolveUuid?.(credit.sourceTokenUuid);
  if(!token||token.isOwner===false||token.actor?.uuid!==actor.uuid||!token.object?.planMovement)throw Error('Abra a cena que contém o token original para concluir o teleporte.');
  const prison=elementalRecipientConstructs(actor).find(record=>record.kind==='earthPrison'&&(!record.targetUuids?.some(id=>id.startsWith('Scene.'))||record.targetUuids.includes(credit.sourceTokenUuid))&&record.spaceConceptExit&&Number(actor.system?.conceitos?.espaco?.level??0)<record.spaceConceptExit);
  if(prison)throw Error('Sair desta prisão por teleporte exige Conceito do Espaço 10.');
  const maxDistance=sceneDistance(credit.range);if(!Number.isFinite(maxDistance)||maxDistance<=0)throw Error('Alcance ou unidade da cena inválidos.');
  const plan=await token.object.planMovement({allowedActions:['blink'],direct:true,maxDistance,preventDrop:true,moveOptions:{elementalNoMovementReactions:credit.source?.abilityId==='spaceStep'}});
  if(!plan)return null;
  await valid();
  const path='flags.'+S+'.elementalSpatialCredits.'+context.requestId;
  await actor.update({[path]:{...credit,status:'pending',planId:plan.id}});
  const moved=await token.startMovement(plan.id);
  if(moved===false){await actor.update({[path]:{...credit,status:'ready'}});throw Error('O movimento do teleporte não foi realizado. Escolha novamente o destino.');}
  if(moved!==true)throw Error('O movimento não foi confirmado; confira o teleporte antes de continuar.');
  await actor.update({[path]:{...credit,status:'complete',planId:plan.id},...(credit.source?.abilityId==='avatarChamas'&&credit.originEventId?{['flags.'+S+'.elementalAvoidedEvents.'+elementalStableId(credit.originEventId+':'+credit.sourceTokenUuid)]:{originEventId:credit.originEventId,targetTokenUuid:credit.sourceTokenUuid,teleported:true,sourceUseId:context.requestId}}:{})});
  return[{token:token.object,plan,moved}];
 });
}
