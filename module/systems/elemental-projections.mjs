import {elementalIllusionRecognition,elementalIllusionObserverKey} from './elemental-perception.mjs';
const S='Immortals-system',safe=id=>String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
function turn(){const c=globalThis.game?.combat;return c?.started&&c.combatant?.id?(c.uuid??c.id)+':'+c.round+':'+c.combatant.id:null;}
function projection(actor,usage={},context={turn:turn()}){const uuid=usage.elementalSourceTokenUuid;let token;try{token=uuid?globalThis.fromUuidSync?.(uuid,{strict:false}):null;}catch{}const ref=token?.flags?.[S]?.elementalProjection,record=actor.flags?.[S]?.elementalProjections?.[ref?.id];if(!record?.active||ref.sourceActorUuid!==actor.uuid||!record.tokenUuids?.includes(uuid)||record.turn&&record.turn!==context.turn)return null;return{token,ref,record};}
export function elementalProjectionAttackAvailable(actor,activity,usage={},context={turn:turn()}){const p=projection(actor,usage,context);return !!(p?.record.kind==='overlappingSpace'&&p.record.tier>1&&activity.type==='attack'&&activity.item?.type!=='spell'&&activity.attack?.type?.classification!=='spell'&&!p.record.freeAttacks?.[safe(p.token.uuid)]);}
export function prepareElementalProjectionAction(actor,activity,usage={},context={turn:turn()}){const p=projection(actor,usage,context),freeAttack=elementalProjectionAttackAvailable(actor,activity,usage,context);if(usage.elementalProjectionFreeAttack&&!freeAttack)throw Error('O ataque gratuito desta cópia já foi utilizado ou expirou.');return{freeAttack,sharedAction:!!p||Object.values(actor.flags?.[S]?.elementalProjections??{}).some(r=>r.active&&r.kind==='overlappingSpace'&&(!r.turn||r.turn===context.turn)),updates:freeAttack?{['flags.'+S+'.elementalProjections.'+p.record.id+'.freeAttacks.'+safe(p.token.uuid)]:true}:{}};}
export function prepareIllusionDoubleSource(actor,{id,worldTime=0}){if(actor.flags?.[S]?.elementalProjection)throw Error('Uma projeção não pode gerar outra projeção.');const data=structuredClone(actor.toObject());delete data._id;delete data._stats;delete data.folder;data.name+=' · Illusion Double';const saved=data.flags?.[S]??{},bodyState=structuredClone(saved.elementalState??{});for(const key of ['receipts','illusionDouble','overlappingSpace'])delete bodyState[key];if(bodyState.mindBreak){bodyState.mindBreak={...bodyState.mindBreak,redirectReactions:false};delete bodyState.mindBreak.useId;delete bodyState.mindBreak.recognition;delete bodyState.mindBreak.sourceTokenUuid;}data.effects=(data.effects??[]).filter(effect=>!effect.flags?.[S]?.elementalIllusionBody);for(const key of Object.keys(saved))if(/^(elemental|beastEssenceDeath|npcGenerator)/.test(key))delete saved[key];data.flags??={};data.flags[S]={...saved,elementalState:bodyState,elementalProjection:{version:1,id,kind:'illusionDouble',sourceActorUuid:actor.uuid,createdAt:worldTime,active:true}};data.items=(data.items??[]).filter(i=>i.type!=='consumable'&&i.type!=='loot').map(i=>({...i,system:{...i.system,...(Object.hasOwn(i.system??{},'quantity')?{quantity:1}:{})},flags:{...i.flags,[S]:{...i.flags?.[S],elementalProjectionEquipment:{id,sourceActorUuid:actor.uuid}}}}));data.prototypeToken={...data.prototypeToken,actorLink:true};return data;}
const projectionQueues=new Map();
async function queuedProjection(actor,callback){
 const key=actor.uuid,prior=projectionQueues.get(key)??Promise.resolve(),work=prior.catch(()=>{}).then(async()=>{const {withElementalActorLock}=await import('./elemental-runtime.mjs');return withElementalActorLock(actor,'projection-lifecycle',callback);});projectionQueues.set(key,work);
 try{return await work;}finally{if(projectionQueues.get(key)===work)projectionQueues.delete(key);}
}
const ownBodyEffect=(effect,actor,id)=>effect.flags?.[S]?.elementalIllusionBody?.sourceActorUuid===actor.uuid&&effect.flags[S].elementalIllusionBody.id===id;
async function ensureIllusionBodyInvisible(actor,record){
 const existing=Array.from(actor.effects??[]).find(effect=>ownBodyEffect(effect,actor,record.id));
 if(existing){if(existing.disabled)await existing.update({disabled:false});return;}
 const {elementalStableId}=await import('./elemental-activity-data.mjs');
 await actor.createEmbeddedDocuments('ActiveEffect',[{_id:elementalStableId('illusion-body:'+actor.uuid+':'+record.id),name:'Illusion Double · corpo invisível',img:'icons/svg/invisible.svg',origin:actor.uuid,statuses:[globalThis.CONFIG?.specialStatusEffects?.INVISIBLE??'invisible'],changes:[],flags:{[S]:{elementalIllusionBody:{version:1,id:record.id,sourceActorUuid:actor.uuid,sourceTokenUuid:record.sourceTokenUuid}}}}],{keepId:true});
}
/** Materialization is serialized per source actor and retries reuse the exact paid activation. */
export async function executeElementalProjections(request){return queuedProjection(request.actor,()=>executeProjections(request));}
async function executeProjections({actor,activity,context,user}){
 const pending=reason=>({applied:[],pending:[{reason}]});if(!user?.isGM)return pending('Aguardando o narrador.');
 if(actor.flags?.[S]?.elementalProjection)return pending('Projeções recursivas são proibidas.');
 const receipt=actor.flags?.[S]?.elementalUseReceipts?.[context.requestId],meta=receipt?.ruleData;
 if(!['overlappingSpace','illusionDouble','mindBreak'].includes(meta?.rule)||meta.rule==='mindBreak'&&Number(meta.tier)!==3||receipt.requestId!==context.requestId)return pending('O pagamento desta projeção não foi confirmado.');
 if(activity&&receipt.source&&(receipt.source.activityId!==activity.id||receipt.source.itemId!==activity.item?.id))return pending('A atividade paga desta projeção precisa ser conferida.');
 const state=actor.flags?.[S]?.elementalState?.[meta.rule];if(!state?.active||state.useId!==context.requestId)return pending('Esta ativação da projeção já terminou.');
 const token=await globalThis.fromUuid?.(context.sourceTokenUuid);if(token?.actor?.uuid!==actor.uuid||!token.parent||state.sourceTokenUuid&&state.sourceTokenUuid!==token.uuid)return pending('Token de origem da projeção indisponível.');
 let record=actor.flags?.[S]?.elementalProjections?.[context.requestId];
 if(record?.registered){if(!record.active)return pending('Esta ativação da projeção já terminou.');if(record.kind==='illusionDouble')await ensureIllusionBodyInvisible(actor,record);return{applied:[{id:record.id}],pending:[]};}
 if(meta.rule==='overlappingSpace'&&receipt.turn!==turn())return pending('O turno pago das cópias já terminou.');
 const scene=token.parent,{elementalStableId}=await import('./elemental-activity-data.mjs');let copyActor=actor;
 if(meta.rule==='illusionDouble'){
  copyActor=Array.from(globalThis.game?.actors??[]).find(a=>a.flags?.[S]?.elementalProjection?.id===context.requestId&&a.flags[S].elementalProjection.sourceActorUuid===actor.uuid);
  if(!copyActor)copyActor=await globalThis.Actor.create(prepareIllusionDoubleSource(actor,{id:context.requestId,worldTime:receipt.worldTime}));
 }
 const count=meta.rule==='overlappingSpace'?Number(meta.copies):1,uuids=[];
 for(let i=0;i<count;i++){
  const id=elementalStableId(actor.uuid+':'+context.requestId+':'+i),existing=scene.tokens.get(id);
  if(existing){const ref=existing.flags?.[S]?.elementalProjection;if(ref?.id!==context.requestId||ref.sourceActorUuid!==actor.uuid||ref.kind!==meta.rule||existing.actor?.uuid!==copyActor.uuid)return pending('O token desta projeção precisa de conferência.');uuids.push(existing.uuid);continue;}
  const source=token.toObject();delete source._stats;delete source.delta;
  const flag={version:1,id:context.requestId,kind:meta.rule,sourceActorUuid:actor.uuid,index:i};
  const created=await scene.createEmbeddedDocuments('Token',[{...source,_id:id,name:actor.name+' · '+(meta.rule==='illusionDouble'?'Duplo':meta.rule==='mindBreak'?'Mind Break':'Projeção '+(i+1)),actorId:copyActor.id,actorLink:true,flags:{...source.flags,[S]:{...source.flags?.[S],elementalProjection:flag}}}],{keepId:true});
  if(!created?.[0])return pending('A colocação da projeção precisa ser concluída.');uuids.push(created[0].uuid);
 }
 record={...record,version:1,id:context.requestId,kind:meta.rule,active:true,registered:true,tier:meta.tier,sourceActorUuid:actor.uuid,sourceTokenUuid:token.uuid,actorUuid:copyActor.uuid,tokenUuids:uuids,freeAttacks:record?.freeAttacks??{},turn:meta.rule==='overlappingSpace'?receipt.turn:null,createdAt:receipt.worldTime};
 await actor.update({['flags.'+S+'.elementalProjections.'+context.requestId]:record});
 if(meta.rule==='illusionDouble')await ensureIllusionBodyInvisible(actor,record);
 return{applied:[{id:record.id,tokens:uuids}],pending:[]};
}
async function cleanupProjection(actor,record){
 for(const uuid of record.tokenUuids??[]){const token=await globalThis.fromUuid?.(uuid),ref=token?.flags?.[S]?.elementalProjection;if(ref?.id===record.id&&ref.sourceActorUuid===actor.uuid)await token.delete();}
 if(record.kind==='illusionDouble'){
  for(const effect of Array.from(actor.effects??[]))if(ownBodyEffect(effect,actor,record.id))await effect.delete();
  const copy=await globalThis.fromUuid?.(record.actorUuid),ref=copy?.flags?.[S]?.elementalProjection;
  if(ref?.id===record.id&&ref.sourceActorUuid===actor.uuid&&ref.active!==false)await copy.update({['flags.'+S+'.elementalProjection.active']:false});
 }
}
export async function synchronizeElementalProjections(actor){
 const game=globalThis.game;if(!game?.user?.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return;
 return queuedProjection(actor,async()=>{
  for(const record of Object.values(actor.flags?.[S]?.elementalProjections??{})){
   if(!record.active){await cleanupProjection(actor,record);continue;}
   const state=actor.flags?.[S]?.elementalState??{},effect=state[record.kind],copy=record.kind==='illusionDouble'?await globalThis.fromUuid?.(record.actorUuid):null;
   const tokens=(await Promise.all((record.tokenUuids??[]).map(uuid=>globalThis.fromUuid?.(uuid)))).filter(token=>token?.flags?.[S]?.elementalProjection?.id===record.id&&token.flags[S].elementalProjection.sourceActorUuid===actor.uuid);
   const ended=!effect?.active||effect.useId!==record.id||record.kind==='overlappingSpace'&&record.turn!==turn()||record.kind==='mindBreak'&&Number(effect.tier)!==3||!tokens.length||record.kind==='illusionDouble'&&(!copy||Number(copy.system?.attributes?.hp?.value)<=0);
   if(!ended){if(record.kind==='illusionDouble')await ensureIllusionBodyInvisible(actor,record);continue;}
   const endedAt=record.endedAt??game.time?.worldTime??0,changes={['flags.'+S+'.elementalProjections.'+record.id+'.active']:false,['flags.'+S+'.elementalProjections.'+record.id+'.endedAt']:endedAt};
   if(record.kind==='illusionDouble'){
    if(effect?.useId===record.id)changes['flags.'+S+'.elementalState.-=illusionDouble']=null;
    const source=effect?.source??{},cooldownKey=(source.elementId??'ilusao')+':'+(source.abilityId??'illusionDouble')+':double';
    // The cooldown starts at termination and is never extended by a cleanup retry.
    if(!state.cooldowns?.[cooldownKey]||effect?.useId===record.id)changes['flags.'+S+'.elementalState.cooldowns.'+cooldownKey]={availableAt:endedAt+30*86400,source};
   }
   await actor.update(changes);await cleanupProjection(actor,record);
  }
  // Recovery after a termination/update that was interrupted before effect cleanup.
  for(const effect of Array.from(actor.effects??[])){const ref=effect.flags?.[S]?.elementalIllusionBody;if(ref?.sourceActorUuid!==actor.uuid)continue;const record=actor.flags?.[S]?.elementalProjections?.[ref.id];if(!record?.active)await effect.delete();}
 });
}
export function registerElementalProjectionHooks(){
 if(registerElementalProjectionHooks.installed)return;registerElementalProjectionHooks.installed=true;
 const ticks=new Map(),tick=actor=>{if(!actor)return;let running=ticks.get(actor.uuid);if(running){running.dirty=true;return;}running={dirty:true};ticks.set(actor.uuid,running);void(async()=>{while(running.dirty){running.dirty=false;await synchronizeElementalProjections(actor);}})().catch(e=>globalThis.ui?.notifications?.warn?.('Projeção aguardando revisão: '+e.message)).finally(()=>ticks.delete(actor.uuid));};
 globalThis.Hooks?.on?.('updateActor',actor=>{tick(actor);const source=actor.flags?.[S]?.elementalProjection?.sourceActorUuid;if(source)tick(resolveSync(source));});
 globalThis.Hooks?.on?.('deleteToken',token=>{const source=token.flags?.[S]?.elementalProjection?.sourceActorUuid;if(source)tick(resolveSync(source));});
 globalThis.Hooks?.on?.('deleteActiveEffect',effect=>{if(effect.flags?.[S]?.elementalIllusionBody)tick(effect.parent);});
 const all=()=>{for(const actor of globalThis.game?.actors??[])tick(actor);for(const token of globalThis.canvas?.scene?.tokens??[])if(token.actor)tick(token.actor);};
 globalThis.Hooks?.on?.('updateCombat',all);globalThis.Hooks?.on?.('canvasReady',all);all();
}

const noProjection=()=>({redirected:false,pending:false});
const pendingProjection=reason=>({redirected:false,pending:true,reason});
const resolveSync=uuid=>{try{return uuid?globalThis.fromUuidSync?.(uuid,{strict:false}):null;}catch{return null;}};
function protectedIllusion(actor,targetTokenUuid){
 const saved=actor?.flags?.[S]??{},token=resolveSync(targetTokenUuid),ref=token?.flags?.[S]?.elementalProjection;
 for(const kind of ['mindBreak','illusionDouble']){
  const state=saved.elementalState?.[kind];if(!state?.active||kind==='mindBreak'&&(Number(state.tier)!==3||!state.redirectReactions))continue;
  const id=state.useId,record=saved.elementalProjections?.[id];
  // A different actor/token cannot borrow protection from this activation.
  if(targetTokenUuid&&targetTokenUuid!==actor.uuid&&token?.actor?.uuid!==actor.uuid)continue;
  if(ref&&!(ref.sourceActorUuid===actor.uuid&&ref.id===id&&ref.kind===kind))continue;
  return{kind,id,state,record,token,copyTarget:!!ref,ready:!!(id&&record?.active&&record.registered&&record.kind===kind&&record.sourceActorUuid===actor.uuid&&record.tokenUuids?.length)};
 }
 return null;
}
const activityArea=activity=>typeof activity?.target?.template?.type==='string'&&activity.target.template.type.trim().length>0;
function associatedActivity(event){return event?.getAssociatedActivity?.()??event?.getOriginatingMessage?.()?.getAssociatedActivity?.();}
function eventSource(event,sourceActor){const origin=event?.getOriginatingMessage?.();return sourceActor??event?.getAssociatedActor?.()??origin?.getAssociatedActor?.();}
function sourceArea(event,sourceActor){
 // A retaliation can retain the original incoming attack as its receipt. Its template belongs to that attack, not the retaliation.
 const recordedSource=eventSource(event);
 return (!sourceActor||recordedSource?.uuid===sourceActor.uuid)&&activityArea(associatedActivity(event));
}
/** Shared gate for damage and every condition/rider. Psychic conversion is separate from this body protection. */
export function elementalProjectionDamageState(actor,{targetTokenUuid,event,sourceEventUuid,sourceActor,isReaction=false,areaEffect=false,targeted=true,turn:currentTurn=turn()}={}){
 event??=resolveSync(sourceEventUuid);
 const illusion=protectedIllusion(actor,targetTokenUuid);
 if(illusion){
  if(illusion.kind==='illusionDouble'&&(areaEffect===true||targeted===false||sourceArea(event,sourceActor)))return noProjection();
  if(!illusion.ready)return pendingProjection('A cópia desta ativação precisa ser concluída pelo narrador antes de afetar o corpo.');
  if(illusion.kind==='mindBreak'&&illusion.copyTarget)return{redirected:true,pending:false,projectionId:illusion.id};
  const observer=eventSource(event,sourceActor),recognition=elementalIllusionRecognition(actor,observer,{useId:illusion.id,recognition:illusion.state.recognition});
  if(recognition.outcome==='unknown')return pendingProjection('O narrador precisa conferir o reconhecimento desta ilusão antes de afetar o corpo.');
  if(illusion.kind==='mindBreak')return recognition.outcome==='recognizes'?noProjection():{redirected:true,pending:false,projectionId:illusion.id};
  if(recognition.outcome==='recognizes')return noProjection();
  return{...pendingProjection('Esta tentativa deve atingir o duplo. Selecione a cópia no mapa antes de usar a habilidade.'),projectionId:illusion.id,redirectTargetTokenUuid:illusion.record.tokenUuids[0]};
 }
 if(!targetTokenUuid)return noProjection();
 const token=resolveSync(targetTokenUuid),ref=token?.flags?.[S]?.elementalProjection;
 if(ref?.kind==='mindBreak'&&ref.sourceActorUuid===actor.uuid)return pendingProjection('Esta cópia ilusória já terminou; selecione novamente o alvo antes de aplicar o efeito.');
 if(ref?.kind!=='overlappingSpace'||ref.sourceActorUuid!==actor.uuid)return noProjection();
 const p=projection(actor,{elementalSourceTokenUuid:targetTokenUuid},{turn:currentTurn});
 if(!p)return pendingProjection('Esta projeção já terminou; confira o alvo deste efeito.');
 const activity=event?.getAssociatedActivity?.()??event?.getOriginatingMessage?.()?.getAssociatedActivity?.(),reaction=isReaction||activity?.activation?.type==='reaction'||activity?.flags?.[S]?.elementalActivity?.rule==='slashingRetaliation';
 return reaction?{redirected:true,pending:false,projectionId:p.record.id}:pendingProjection('O efeito atingiu uma projeção de Espaço. Confirme se é uma reação antes de afetar o corpo original.');
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const freshRecognition=(actor,id)=>({version:1,id,sourceActorUuid:actor.uuid,decisions:{}});
/** Call after creating the use context and before consumption; observers are resolved only when relevant. */
export async function prepareElementalIllusionRecognition(actor,activity,usage){
 const meta=activity?.flags?.[S]?.elementalActivity;if(meta?.rule!=='illusionDouble'&&!(meta?.rule==='mindBreak'&&Number(meta.tier)===3))return true;
 const context=usage.elementalUseContext,token=resolveSync(context?.sourceTokenUuid);
 if(!context?.requestId||context.sourceActorUuid&&context.sourceActorUuid!==actor.uuid||token?.actor?.uuid!==actor.uuid)throw Error('Escolha o token de origem desta ilusão antes de consumir recursos.');
 usage.elementalIllusionRecognition=freshRecognition(actor,context.requestId);return true;
}
async function chooseRecognition(actor,id,observers,recognition){
 if(!globalThis.game?.user?.isGM)throw Error('O narrador precisa conferir o reconhecimento desta ilusão antes de consumir recursos.');
 const rows=observers.map(observer=>({observer,key:elementalIllusionObserverKey(actor.uuid,id,observer.uuid),profile:elementalIllusionRecognition(actor,observer,{useId:id,recognition})}));
 const editable=rows.filter(row=>row.profile.outcome==='unknown'||row.profile.adjudicated);
  const chosen=await globalThis.foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Reconhecimento da ilusão · Narrador'},content:'<p>Conferência privada desta ativação. Escolha explicitamente o resultado dos observadores sem dados suficientes.</p>'+rows.map(row=>'<p><strong>'+esc(row.observer.name??'Criatura')+'</strong> · '+(editable.includes(row)?'<select name="'+row.key+'"><option value="">Escolher resultado</option><option value="recognizes"'+(row.profile.outcome==='recognizes'?' selected':'')+'>Reconhece e pode atingir o corpo</option><option value="affected"'+(row.profile.outcome==='affected'?' selected':'')+'>Afetado pela ilusão</option></select>':row.profile.outcome==='recognizes'?'Reconhece a ilusão':'Afetado pela ilusão')+'</p>').join(''),buttons:[{action:'save',label:'Salvar conferência',default:true,callback:(_e,_b,dialog)=>Object.fromEntries(editable.map(row=>[row.key,dialog.element.querySelector('[name="'+row.key+'"]').value]))},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
 if(!chosen)return null;
 if(editable.some(row=>!['recognizes','affected'].includes(chosen[row.key])))throw Error('Escolha explicitamente o reconhecimento de cada observador sem dados suficientes.');
 return{...recognition,decisions:{...recognition.decisions,...Object.fromEntries(editable.map(row=>[row.key,chosen[row.key]]))}};
}
const recognitionQueues=new Map();
async function saveRecognition(actor,id,observers){
 const key=actor.uuid,prior=recognitionQueues.get(key)??Promise.resolve();
 const work=prior.catch(()=>{}).then(async()=>{
  const entry=Object.entries(actor.flags?.[S]?.elementalState??{}).find(([kind,state])=>['mindBreak','illusionDouble'].includes(kind)&&state?.active&&state.useId===id);
  if(!entry)throw Error('Esta ativação da ilusão já terminou.');
  const [kind,state]=entry,recognition=await chooseRecognition(actor,id,observers,state.recognition??freshRecognition(actor,id));if(!recognition)return false;
  const {withElementalActorLock}=await import('./elemental-runtime.mjs');
  return withElementalActorLock(actor,'illusion-recognition:'+id,async()=>{
   const current=actor.flags?.[S]?.elementalState?.[kind];if(!current?.active||current.useId!==id)throw Error('Esta ativação da ilusão já terminou.');
   await actor.update({['flags.'+S+'.elementalState.'+kind+'.recognition']:{...recognition,decisions:{...current.recognition?.decisions,...recognition.decisions}}});return true;
  });
 });recognitionQueues.set(key,work);try{return await work;}finally{if(recognitionQueues.get(key)===work)recognitionQueues.delete(key);}
}
/** Private GM editor, also usable before retrying a blocked application. */
export async function reviewElementalIllusionRecognition(actor,{useId,observers}={}){
 if(!globalThis.game?.user?.isGM)throw Error('Somente o narrador pode conferir observadores da ilusão.');
 const states=Object.entries(actor.flags?.[S]?.elementalState??{}).filter(([kind,state])=>['mindBreak','illusionDouble'].includes(kind)&&state?.active&&state.useId&&(!useId||state.useId===useId));
 const all=observers??Array.from(globalThis.game?.actors??[]).filter(a=>['character','npc'].includes(a.type));
 const unique=Array.from(new Map([...all,...Array.from(globalThis.canvas?.scene?.tokens??[],token=>token.actor)].filter(a=>a?.uuid&&a.uuid!==actor.uuid).map(a=>[a.uuid,a])).values());
 if(!states.length)throw Error('Não há ativação ilusória ativa para conferir.');
 for(const [,state]of states)if(!await saveRecognition(actor,state.useId,unique))return false;return true;
}
/** Call for all activities before costs. An unknown observer cannot silently bypass or become immune. */
export async function prepareElementalIllusionTargets(activity,usage,{targets,areaEffect=false,targeted=true}={}){
 const observer=activity.actor??activity.item?.actor;if(!observer?.uuid)return true;
 const selected=targets??usage.elementalUseContext?.targetUuids?.map(resolveSync)??globalThis.game?.user?.targets??[];
 for(const selectedTarget of selected){
  const token=selectedTarget?.document??selectedTarget,target=token?.actor??token;if(!target?.uuid)continue;
  const illusion=protectedIllusion(target,token?.actor?token.uuid:target.uuid);if(!illusion){const ref=token?.flags?.[S]?.elementalProjection;if(ref?.kind==='mindBreak'&&ref.sourceActorUuid===target.uuid)throw Error('Esta cópia ilusória já terminou; selecione novamente o alvo antes de consumir recursos.');continue;}
  if(illusion.kind==='illusionDouble'&&(areaEffect===true||targeted===false||activityArea(activity)))continue;
  let result=elementalProjectionDamageState(target,{targetTokenUuid:token?.actor?token.uuid:target.uuid,sourceActor:observer});
  if(result.pending&&illusion.ready&&elementalIllusionRecognition(target,observer,{useId:illusion.id,recognition:illusion.state.recognition}).outcome==='unknown'){
   if(!await saveRecognition(target,illusion.id,[observer]))return false;
   result=elementalProjectionDamageState(target,{targetTokenUuid:token?.actor?token.uuid:target.uuid,sourceActor:observer});
  }
  if(result.pending)throw Error(result.reason);
 }
 return true;
}
