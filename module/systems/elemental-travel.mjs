import {validateElementalAreaMovement} from './elemental-areas.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
import {elementalTransitActorOperation,elementalTransitDestinationLevel,prepareElementalSceneTransfer} from './elemental-travel-transfer.mjs';
const S='Immortals-system',P='flags.'+S+'.elementalCalendarEffects.';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function activeGM(){const game=globalThis.game;return !!game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);}
function clock(){const c=globalThis.game?.combat;return{worldTime:globalThis.game?.time?.worldTime??0,combatId:c?.started?(c.uuid??c.id):null,round:c?.round??0};}
function batch(operations){if(!globalThis.foundry?.documents?.modifyBatch)throw Error('A transferência nativa não está disponível.');return globalThis.foundry.documents.modifyBatch(operations);}
export function planElementalTransit(record,choice,context){
 const tier=Number(record?.tier),ready=Number.isFinite(record?.readyAt)&&context.worldTime>=record.readyAt||Number.isFinite(record?.readyCombatRound)&&record.combatId===context.combatId&&context.round>=record.readyCombatRound;
 if(record?.kind!=='spaceRip'||!Number.isInteger(tier)||tier<1||tier>3||!ready||record.status==='ended'||record.transit)throw Error('A preparação do Space Rip ainda não permite iniciar esta travessia.');
 if(typeof choice.sceneUuid!=='string'||!Number.isFinite(choice.x)||!Number.isFinite(choice.y)||!Number.isFinite(choice.distanceMeters)||choice.distanceMeters<0||choice.distanceMeters>[0,1000,50000,500000][tier])throw Error('Destino fora do alcance pago.');
 return{version:1,id:record.id,status:'traveling',sourceTokenUuid:record.sourceTokenUuid,startedAt:context.worldTime,arriveAt:context.worldTime+18,...(context.combatId?{combatId:context.combatId,arriveRound:context.round+3}:{}),destination:{sceneUuid:choice.sceneUuid,x:choice.x,y:choice.y,elevation:choice.elevation??0,level:choice.level??null,distanceMeters:choice.distanceMeters}};
}
export function elementalTransitReady(transit,context=clock()){
 return ['traveling','moving'].includes(transit?.status)&&(Number.isFinite(transit.arriveAt)&&context.worldTime>=transit.arriveAt||!!transit.combatId&&transit.combatId===context.combatId&&Number.isFinite(transit.arriveRound)&&context.round>=transit.arriveRound);
}
export async function beginElementalTransit(actor,id){
 if(!activeGM())throw Error('O narrador ativo precisa confirmar o destino da travessia.');
 const record=actor.flags?.[S]?.elementalCalendarEffects?.[id];if(!record||record.transit)throw Error('Esta travessia já começou ou terminou.');
 const token=await globalThis.fromUuid?.(record.sourceTokenUuid);if(token?.actor?.uuid!==actor.uuid)throw Error('O token original desta preparação não está disponível.');
 const scenes=Array.from(globalThis.game.scenes??[]),markers=scenes.flatMap(scene=>Array.from(scene.tokens??[]).map(t=>({scene,token:t})));
 if(!markers.length)throw Error('Coloque um marcador para representar o ponto de chegada.');
 const selection=await globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Space Rip · destino'},content:'<p>Escolha um marcador de chegada. O trânsito dura três rodadas e não gasta Qi novamente.</p><label>Destino<select name="marker">'+markers.map((m,i)=>'<option value="'+i+'">'+esc(m.scene.name)+' · '+esc(m.token.name)+'</option>').join('')+'</select></label><label>Distância entre cenas confirmada pelo narrador (m)<input type="number" name="distance" min="0" step="1"></label><p>Na mesma cena, a distância é calculada automaticamente.</p>',buttons:[{action:'start',label:'Iniciar travessia',default:true,callback:(_e,_b,d)=>({index:Number(d.element.querySelector('[name="marker"]').value),distance:Number(d.element.querySelector('[name="distance"]').value),distanceText:d.element.querySelector('[name="distance"]').value})},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
 if(!selection)return;const marker=markers[selection.index];if(!marker)throw Error('Destino inválido.');
 return withElementalActorLock(actor,'begin-transit:'+id,async()=>{
  if(!activeGM())throw Error('O narrador ativo precisa confirmar o destino da travessia.');
  const current=actor.flags?.[S]?.elementalCalendarEffects?.[id],liveToken=await globalThis.fromUuid?.(current?.sourceTokenUuid);
  if(liveToken!==token||token.actor?.uuid!==actor.uuid)throw Error('O token original desta preparação não está disponível.');
  let distance=selection.distance;
  if(marker.scene.uuid===token.parent.uuid){const grid=marker.scene.grid,meters={m:1,metro:1,metros:1,ft:0.3048,feet:0.3048,km:1000}[String(grid.units).toLowerCase()];if(!meters||!(grid.size>0)||!(grid.distance>0))throw Error('Unidade da cena desconhecida.');distance=Math.hypot(marker.token.x-token.x,marker.token.y-token.y)/grid.size*grid.distance*meters;}
  else if(!String(selection.distanceText??'').trim())throw Error('Confirme a distância entre as cenas antes de iniciar.');
  const destination={sceneUuid:marker.scene.uuid,x:marker.token.x,y:marker.token.y,elevation:marker.token.elevation,level:elementalTransitDestinationLevel(marker.scene,marker.token.level),distanceMeters:distance},allowed=validateElementalAreaMovement(token,destination,{teleport:true});
  if(!allowed.allowed)throw Error(allowed.reason);
  const transit=planElementalTransit(current,destination,clock());transit.previousHidden=token.hidden;
  await batch([elementalTransitActorOperation(actor,{[P+id+'.transit']:transit}),{action:'update',documentName:'Token',parent:token.parent,updates:[{_id:token.id,hidden:true}]}]);
  if(actor.flags?.[S]?.elementalCalendarEffects?.[id]?.transit?.status!=='traveling'||!token.hidden)throw Error('O início da travessia foi impedido; tente novamente após conferir a origem.');
  return transit;
 });
}
function previousArrival(scene,actor,id,transit){
 return Array.from(scene?.tokens??[]).find(token=>{const receipt=token.flags?.[S]?.elementalArrival,arrival=token.actor?.flags?.[S]?.elementalCalendarEffects?.[id]?.transit;return receipt?.id===id&&receipt.sourceActorUuid===actor.uuid&&receipt.sourceTokenUuid===transit.sourceTokenUuid&&arrival?.status==='complete'&&arrival.arrivalTokenUuid===token.uuid;});
}
async function finishSameScene(actor,token,id,transit){
 const level=elementalTransitDestinationLevel(token.parent,transit.destination.level??token.level);
 try{
  await batch([elementalTransitActorOperation(actor,{[P+id+'.transit.status']:'moving'})]);
  if(actor.flags?.[S]?.elementalCalendarEffects?.[id]?.transit?.status!=='moving')throw Error('A chegada foi impedida; a travessia aguarda nova conferência.');
  const atDestination=token.x===transit.destination.x&&token.y===transit.destination.y&&token.elevation===transit.destination.elevation&&token.level===level;
  const moved=atDestination||await token.move({x:transit.destination.x,y:transit.destination.y,elevation:transit.destination.elevation,level,action:'blink'},{animate:false,elementalTransitArrival:id,constrainOptions:{ignoreWalls:true,ignoreCost:true}});
  if(moved!==true)throw Error('A chegada foi impedida; a travessia aguarda nova conferência.');
  await batch([elementalTransitActorOperation(actor,{[P+id+'.transit']:{...transit,status:'complete',completedAt:clock().worldTime,arrivalTokenUuid:token.uuid},[P+id+'.status']:'ended'}),{action:'update',documentName:'Token',parent:token.parent,updates:[{_id:token.id,hidden:transit.previousHidden??false}]}]);
  if(actor.flags?.[S]?.elementalCalendarEffects?.[id]?.transit?.status!=='complete')throw Error('A chegada foi impedida; a travessia aguarda nova conferência.');
 }catch(error){
  if(actor.flags?.[S]?.elementalCalendarEffects?.[id]?.transit?.status==='moving')try{await batch([elementalTransitActorOperation(actor,{[P+id+'.transit.status']:'traveling'})]);}catch{/* Legacy moving entries remain eligible for retry if the connection is unavailable. */}
  throw error;
 }
}
export async function finishElementalTransits(actor){
 if(!activeGM())return;
 for(const [id,job]of Object.entries(actor.flags?.[S]?.elementalCalendarEffects??{})){
  if(!elementalTransitReady(job.transit))continue;
  await withElementalActorLock(actor,'arrive-transit:'+id,async()=>{
   if(!activeGM())return;
   const record=actor.flags?.[S]?.elementalCalendarEffects?.[id],transit=record?.transit;if(!elementalTransitReady(transit))return;
   const token=await globalThis.fromUuid?.(transit.sourceTokenUuid),scene=await globalThis.fromUuid?.(transit.destination.sceneUuid);
   if(!token&&previousArrival(scene,actor,id,transit))return;
   if(token?.actor?.uuid!==actor.uuid||!scene)throw Error('Origem ou destino da travessia indisponível.');
   const movement=validateElementalAreaMovement(token,transit.destination,{teleport:true});if(!movement.allowed)throw Error(movement.reason);
   if(scene.uuid===token.parent.uuid)return finishSameScene(actor,token,id,transit);
   const transfer=prepareElementalSceneTransfer(actor,token,scene,id,transit,clock().worldTime);
   await batch(transfer.operations);
   const arrival=scene.tokens.get(transfer.tokenId);
   if(token.parent.tokens.has(token.id)||arrival?.flags?.[S]?.elementalArrival?.sourceTokenUuid!==token.uuid)throw Error('A chegada foi impedida; a origem permanece disponível para nova tentativa.');
  });
 }
}
export function registerElementalTransitHooks(){
 if(registerElementalTransitHooks.installed)return;registerElementalTransitHooks.installed=true;
 const tick=async()=>{const{elementalCalendarSubjects}=await import('./elemental-local-time.mjs');for(const actor of elementalCalendarSubjects())await finishElementalTransits(actor);};
 for(const event of ['updateWorldTime','updateCombat'])globalThis.Hooks?.on?.(event,()=>{void tick().catch(e=>globalThis.ui?.notifications?.warn?.('Travessia aguardando revisão: '+e.message));});
}
