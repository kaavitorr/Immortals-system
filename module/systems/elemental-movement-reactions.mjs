import {elementalTier} from './elemental-rules.mjs';
import {elementalStableId} from './elemental-activity-data.mjs';
import {elementalMovementRetaliationSnapshot} from './elemental-electric-retaliation.mjs';
const S='Immortals-system',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currentTurn(){const c=globalThis.game?.combat;return c?.started?(c.uuid??c.id)+':'+c.round+':'+c.combatant?.id:null;}
function recent(data){const now=Number(globalThis.game?.time?.worldTime)||0;return data.turn?data.turn===currentTurn():now>=data.worldTime&&now-data.worldTime<=120;}
/** Classify the trigger, not every reaction: defenses against an attack remain eligible. */
export async function elementalMovementReactionEligibility(event,{kind='movement'}={}){
 if(kind==='other')return{allowed:true};const data=event?.flags?.[S]?.elementalMovementEvent;
 const author=event?.author??globalThis.game?.users?.get?.(event?._stats?.createdBy);
 if(!author?.isGM)return{allowed:false,reason:'O movimento precisa do registro do narrador.'};
 if(!data||!recent(data))return{allowed:false,reason:'Escolha um movimento registrado neste turno.'};
 const token=await globalThis.fromUuid?.(data.tokenUuid),actor=token?.actor;
 if(actor?.uuid!==data.actorUuid)return{allowed:false,reason:'O token deste movimento não está disponível.'};
 if(data.noMovementReactions)return{allowed:false,reason:'Este Space Step não provoca reações de movimento.'};
 const tier=data.qiElectricTier??elementalTier(actor,'relampago','qiEletrico');
 if(tier>=2&&kind==='movement')return{allowed:false,reason:'Qi Elétrico impede reações provocadas por este movimento.'};
 return{allowed:true,pendingRetaliation:tier===3&&kind==='exceptionalMovement'&&(data.retaliation?.tier??1)>0};
}
function reactionKind(activity){const explicit=activity.flags?.[S]?.movementReaction;if(explicit)return explicit;const name=String(activity.name??'')+' '+String(activity.item?.name??'');if(/oportunidade|opportunity/i.test(name))return/superior|exceptional/i.test(name)?'exceptionalMovement':'movement';return null;}
/** Native use and reopened attack cards both pass here before paying or rolling. */
export async function beforeElementalMovementReaction(activity,usage={},message={}){
 const origin=message.data?.system?.origin,card=typeof origin==='object'?origin:globalThis.game?.messages?.get?.(String(origin??'').split('.').at(-1)),saved=card?.flags?.[S]?.elementalMovementReaction;
 let kind=reactionKind(activity)??saved?.kind??usage.elementalMovementReactionKind,eventUuid=usage.elementalMovementEventUuid??saved?.eventUuid;
 const targets=message.data?.system?.targets??[];
 if(!kind&&activity.activation?.type!=='reaction')return true;
 const candidates=Array.from(globalThis.game?.messages?.values?.()??[]).filter(m=>{const data=m.flags?.[S]?.elementalMovementEvent;return data&&recent(data)&&(!targets.length||targets.some(t=>t.token===data.tokenUuid||t.actor===data.actorUuid));}).slice(-12).reverse();
 if(!eventUuid){
  if(!candidates.length){if(!kind)return true;globalThis.ui?.notifications?.warn?.('O narrador precisa selecionar um movimento registrado antes desta reação.');return false;}
  const choice=await globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Gatilho da reação'},content:'<label>Gatilho<select name="kind">'+(!kind?'<option value="other">Outro gatilho</option>':'')+'<option value="'+(kind??'movement')+'">'+(kind==='exceptionalMovement'?'Movimento · reação superior':'Movimento')+'</option></select></label><label>Movimento<select name="event">'+candidates.map(m=>'<option value="'+esc(m.uuid)+'">'+esc(m.flags[S].elementalMovementEvent.name??'Criatura')+'</option>').join('')+'</select></label>',buttons:[{action:'choose',label:'Conferir reação',default:true,callback:(_e,_b,d)=>({kind:d.element.querySelector('[name="kind"]').value,eventUuid:d.element.querySelector('[name="event"]').value})},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
  if(!choice)return false;kind=choice.kind;eventUuid=choice.eventUuid;
 }
 if(kind==='other')return true;
 const event=await globalThis.fromUuid?.(eventUuid),eligibility=await elementalMovementReactionEligibility(event,{kind});
 if(!eligibility.allowed){globalThis.ui?.notifications?.warn?.(eligibility.reason);return false;}
 const data=event.flags[S].elementalMovementEvent,actor=activity.actor??activity.item?.actor;
 usage.elementalMovementEventUuid=eventUuid;usage.elementalMovementReactionKind=kind;message.data??={};message.data.flags??={};message.data.flags[S]??={};
 message.data.flags[S].elementalMovementReaction={eventUuid,kind,targetTokenUuid:data.tokenUuid,sourceActorUuid:actor.uuid,itemUuid:activity.item.uuid,activityId:activity.id,pendingRetaliation:eligibility.pendingRetaliation===true,acceptedAt:Number(globalThis.game?.time?.worldTime)||0,acceptedTurn:currentTurn()};
 if(!saved){const token=await globalThis.fromUuid?.(data.tokenUuid);message.data.system??={};message.data.system.targets=[{token:data.tokenUuid,actor:data.actorUuid,ac:token.actor.system?.attributes?.ac?.value??null}];}
 return true;
}
export function registerElementalMovementReactionHooks(){
 if(registerElementalMovementReactionHooks.installed)return;registerElementalMovementReactionHooks.installed=true;
 globalThis.Hooks?.on?.('moveToken',async(token,move,options={})=>{
  const game=globalThis.game;if(!game?.user?.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id||!token.actor||!move.id)return;
  const id=elementalStableId('movement-reaction:'+token.uuid+':'+move.id+':'+move.subpathId);if(game.messages?.get?.(id))return;
  const event={version:1,id:move.id+':'+move.subpathId,tokenUuid:token.uuid,actorUuid:token.actor.uuid,name:token.name??token.actor.name,worldTime:Number(game.time?.worldTime)||0,turn:currentTurn(),method:move.method,origin:move.origin,destination:move.destination,qiElectricTier:elementalTier(token.actor,'relampago','qiEletrico'),noMovementReactions:options.elementalNoMovementReactions===true,retaliation:await elementalMovementRetaliationSnapshot(token.actor)};
  const whisper=Array.from(game.users??[]).filter(u=>u.isGM||Number(token.actor.ownership?.[u.id])>=3).map(u=>u.id);
  try{await globalThis.ChatMessage.create({_id:id,type:'generic',speaker:globalThis.ChatMessage.getSpeaker({actor:token.actor}),whisper,content:'<p><strong>Movimento registrado</strong> · '+esc(event.name)+'</p><p>Reações de movimento conferem este token e suas proteções antes de gastar recursos.</p>',flags:{[S]:{elementalMovementEvent:event}}},{keepId:true});}catch(error){globalThis.ui?.notifications?.warn?.('Reação de movimento aguardando registro: '+error.message);}
 });
}
