import {prepareElementalOrbs,prepareElementalOrbUse} from './elemental-orbs.mjs';
import {elementalMovementBudget,prepareElementalChase} from './elemental-movement.mjs';
import {controlledFlameInvestment} from './elemental-flames.mjs';
import {prepareRegionalVortex} from './elemental-regional-vortex.mjs';
import {elementalConstitutionView,previewElementalSacrifice,commitElementalSacrifice} from './elemental-long-term.mjs';
import {elementalDilationCost,prepareElementalCalendarEffect} from './elemental-calendar-effects.mjs';
import {npcCultivationRank} from './npc-cultivation.mjs';
/** Awaited elemental activations. This module prepares native bulk updates; it never spends Qi itself. */
const SCOPE='Immortals-system';
const PREFIX='flags.'+SCOPE+'.elementalState.';
const queues=new Map();
const activeLockTokens=new WeakMap();
export function elementalActorLockHeld(actor,token){return !!token&&activeLockTokens.get(token)===(actor?.uuid??actor?.id??actor); }
const actionPayments=new WeakSet();
export function markElementalActionsPaid(config){actionPayments.add(config);}
export function elementalActionsWerePaid(config){return !!config&&config.elementalActionsPaid===true&&actionPayments.has(config);}
export function elementalReserveActionValue(actor){return Math.max(0,integer(actor?.system?.legacy2?.actions?.value)-integer(stateOf(actor).haste?.remaining));}
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const integer=value=>Math.max(0,Math.trunc(number(value)));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object??{},key);
const stateOf=actor=>actor?.flags?.[SCOPE]?.elementalState??{};
const sourceOf=activity=>({elementId:metadata(activity).elementId,abilityId:metadata(activity).abilityId,tier:metadata(activity).tier,itemId:activity.item.id??activity.item._id,activityId:activity.id??activity._id});
const metadata=activity=>activity?.flags?.[SCOPE]?.elementalActivity;
export const isElementalActivity=activity=>!!metadata(activity);
const copy=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));

/** Combatant IDs survive initiative reorder; this key denotes a specific actor turn. */
export function elementalRuntimeContext(combat=globalThis.game?.combat,worldTime=globalThis.game?.time?.worldTime??0) {
 const combatant=combat?.combatant??combat?.combatants?.get?.(combat?.current?.combatantId);
 const combatId=combat?.uuid??combat?.id;
 return {combatId:combat?.started?combatId:null,round:integer(combat?.round),worldTime:number(worldTime),
  turn:combat?.started&&combatant?.id?combatId+':'+integer(combat.round)+':'+combatant.id:null};
}

/** Refresh only persistent counters on the scaled working clone after entering its actor lock. */
export function refreshElementalConsumption(activity){
 if(!isElementalActivity(activity))return;
 const actor=activity.actor??activity.item?.actor,item=activity.item;
 const live=actor?.items?.get?.(item?.id??item?._id);
 if(!live||live===item)return;
 if(live.system?.uses&&item.updateSource)item.updateSource({'system.uses.spent':integer(live.system.uses.spent)});
 const uses=live.system?.activities?.get?.(activity.id??activity._id)?.uses;
 if(uses&&activity.updateSource)activity.updateSource({'uses.spent':integer(uses.spent)});
}

/** Share the actor transaction queue with own-turn upkeep, not only other activation buttons. */
export async function withElementalActorLock(actor,id,callback){
 const key=actor?.uuid??actor?.id??actor;
 let queue=queues.get(key);if(!queue){queue={tail:Promise.resolve(),pending:new Set()};queues.set(key,queue);}
 if(queue.pending.has(id))return false;
 queue.pending.add(id);
 const previous=queue.tail;
 let release;queue.tail=new Promise(resolve=>{release=resolve;});
 await previous.catch(()=>{});
 const token={};activeLockTokens.set(token,key);
 try{return await callback(token);}
 finally{activeLockTokens.delete(token);queue.pending.delete(id);release();if(!queue.pending.size)queues.delete(key);}
}

/** Identical in-flight uses are ignored; distinct elemental actor transactions are serialized. */
export async function withElementalActivationLock(activity,callback){
 if(!isElementalActivity(activity))return callback();
 const actor=activity.actor??activity.item?.actor;
 const id='activation:'+(activity.item?.id??activity.item?._id??'')+':'+(activity.id??activity._id);
 return withElementalActorLock(actor,id,callback);
}

/** Spend temporary Haste first, without modifying the actor's normal action maximum. */
export function elementalActionSpendUpdates(actor,cost,{actionsValue}={}) {
 cost=integer(cost);const current=actionsValue===undefined?integer(actor?.system?.legacy2?.actions?.value):integer(actionsValue);
 if(current<cost)throw new Error('Pontos de Ação insuficientes para esta habilidade.');
 const updates={};if(cost)updates['system.legacy2.actions.value']=current-cost;
 const haste=stateOf(actor).haste;
 if(cost&&integer(haste?.remaining))updates[PREFIX+'haste.remaining']=Math.max(0,integer(haste.remaining)-cost);
 return updates;
}

function requirePermission(actor,user) {
 if(!actor||!['character','npc'].includes(actor.type)||actor.isOwner===false&&!user?.isGM)throw new Error('Você não tem permissão para controlar esta criatura.');
 if(actor.canUserModify&&user&&!actor.canUserModify(user,'update'))throw new Error('Você não tem permissão para atualizar esta criatura.');
}
function scaling(activity,config) {
 const increase=config.scaling===false?0:config.scaling??0;
 if(!Number.isInteger(increase)||increase<0)throw new Error('Escala elemental inválida.');
 const scale=activity.consumption?.scaling??{};
 if(increase&&(!scale.allowed||!Number.isFinite(Number(scale.max))||increase>=Number(scale.max)))throw new Error('A escala excede o limite desta habilidade.');
 return increase;
}
function validate(activity,config,options) {
 const meta=metadata(activity);if(!meta)return null;
 const actor=options.actor??activity.actor??activity.item?.actor,user=options.user??globalThis.game?.user;
 requirePermission(actor,user);
 if(actor.flags?.[SCOPE]?.elementalProjection&&(['overlappingSpace','illusionDouble'].includes(meta.rule)||meta.rule==='mindBreak'&&meta.tier===3))throw Error('Use a criatura original para criar uma projeção.');
 if(activity.item?.isOwner===false||activity.item?.isEmbedded===false)throw new Error('A habilidade precisa pertencer à criatura sob seu controle.');
 const learned=integer(actor.system?.elementAbilities?.[meta.elementId]?.[meta.abilityId]);
 if(!learned)throw new Error('Esta habilidade elemental ainda não foi aprendida.');
 if(learned!==meta.tier)throw new Error('A forma desta atividade não corresponde ao grau elemental atual.');
 if(meta.rule==='lightBlast'){
  const formulas=Array.from(activity.damage?.parts??[],part=>{
   if(typeof part.formula==='string')return part.formula.trim();
   if(part.custom?.enabled)return String(part.custom.formula??'').trim();
   return [(number(part.number)>0&&number(part.denomination)>0)?String(part.number)+'d'+String(part.denomination):'',String(part.bonus??'').trim()].filter(Boolean).join(' + ');
  });
  const cultivation=formulas.some(formula=>/@danoCultivo\b/.test(formula));
  const rollData=cultivation?(activity.getRollData?.()??actor.getRollData?.()??{}):{};
  if(!formulas.some(formula=>formula&&formula!=='0')||cultivation&&!/^1d(?:4|6|8|10|12)$/i.test(String(rollData.danoCultivo??'').trim()))
   throw new Error('Light Blast precisa de dano padrão de cultivo conhecido. Para PdN, peça ao narrador para configurar uma fórmula de dano explícita nesta atividade antes de gastar o orbe.');
 }

 if(meta.rule==='lightGrid'&&(config.elementalUseContext?.targetUuids??Array.from(options.targets??[])).length!==1)throw Error('Light Grid exige exatamente uma criatura como alvo do ataque.');
 if(meta.rule==='protectiveBubble'){
  const selected=config.elementalUseContext?.targetUuids?.map(uuid=>globalThis.fromUuidSync?.(uuid,{strict:false})).filter(Boolean)??Array.from(options.targets??globalThis.game?.user?.targets??[]);
  const target=selected[0]?.actor??selected[0];
  if(selected.length!==1||!['character','npc'].includes(target?.type))throw Error('Selecione exatamente uma criatura para receber a bolha.');
  if(target.flags?.[SCOPE]?.elementalBubbleUsed)throw Error('Esta criatura já recebeu uma bolha desde seu último descanso longo.');
 }
 if(meta.requiresLivingTarget){
  const selected=Array.from(options.targets??globalThis.game?.user?.targets??[]);
  if(selected.length!==1)throw new Error('Selecione exatamente uma criatura como alvo da cura.');
  const target=selected[0].actor??selected[0],hp=target.system?.attributes?.hp;
  if(!hp||number(hp.value)<=0)throw new Error('Qi Vibrante só cura uma criatura com mais de 0 Pontos de Vida.');
 }
 if(meta.rule==='mysticalRealm'&&meta.minimumCultivation){
  const rank=npcCultivationRank(actor)??(actor.type==='npc'?actor.flags?.[SCOPE]?.cultivationRank:actor.system?.cultivation?.rank);
  if(integer(rank)<8)throw new Error('Criar um Reino Místico requer Imperador Sagrado ou superior.');
 }
 const increase=scaling(activity,config),targets=Array.from(activity.consumption?.targets??[]);
 const enabled=config.consume;
 if(enabled===false||targets.some((target,index)=>enabled!==true&&enabled?.resources!==true&&!(Array.isArray(enabled?.resources)&&enabled.resources.includes(index))))throw new Error('O consumo dos recursos desta habilidade deve permanecer ativado.');
 if(config.elementalUseContext&&(!/^[a-zA-Z0-9_-]+$/.test(config.elementalUseContext.requestId)||config.elementalUseContext.sourceActorUuid&&config.elementalUseContext.sourceActorUuid!==actor.uuid))throw Error('Contexto de uso elemental inválido.');
 if(config.elementalUseContext&&actor.flags?.[SCOPE]?.elementalUseReceipts?.[config.elementalUseContext.requestId])throw Error('Esta ativação elemental já foi aplicada. Conclua o efeito pelo cartão pago, sem ativar novamente.');
 const context={...elementalRuntimeContext(),...(options.context??{}),...(config.elementalUseContext?{requestId:config.elementalUseContext.requestId}: {})},state=stateOf(actor);
 if(meta.rule==='selfHaste'&&context.turn&&state.haste?.turn===context.turn)throw Error('Self Haste só pode ser usado uma vez por turno.');
 if((['overlappingSpace','illusionDouble'].includes(meta.rule)||meta.rule==='mindBreak'&&meta.tier===3)&&state[meta.rule]?.active)throw Error('Encerre a projeção atual antes de criar outra.');
 if(meta.rule==='iceStructure'&&meta.tier===3&&(config.elementalIceShape??config.elementalUseContext?.choices?.iceShape)==='dome'&&Object.values(actor.flags?.[SCOPE]?.elementalConstructs??{}).some(r=>r.kind==='icePillar'&&r.shape==='dome'&&Number.isFinite(r.destroyedAt)&&r.destroyedAt+60>context.worldTime))throw Error('Aguarde 1 minuto após a destruição do último domo de gelo.');
 if(meta.incompatible==='overlappingSpace'&&state.overlappingSpace?.active&&state.overlappingSpace.turn===context.turn)throw new Error('Self Haste é incompatível com Overlapping Space neste turno.');
 if(meta.incompatible==='selfHaste'&&integer(state.haste?.remaining)&&state.haste.turn===context.turn)throw new Error('Overlapping Space é incompatível com Self Haste neste turno.');
 const source=sourceOf(activity),receipt=state.receipts?.[source.activityId];
 if(meta.rule==='spaceStep'&&context.turn&&receipt?.turn===context.turn)throw new Error('Space Step só pode ser usado uma vez por turno.');
 if(meta.oncePerRound&&context.combatId&&receipt?.combatId===context.combatId&&receipt?.round===context.round)throw new Error('Esta habilidade só pode ser usada uma vez por rodada.');
 if(meta.encounterLimit&&context.combatId&&receipt?.combatId===context.combatId&&integer(receipt?.encounterUses)>=meta.encounterLimit)throw new Error('O limite de usos neste encontro foi alcançado.');
 const cooldownKey=source.elementId+':'+source.abilityId+':'+meta.key,cooldown=state.cooldowns?.[cooldownKey];
 if(number(cooldown?.availableAt)>context.worldTime)throw new Error('Aguarde o intervalo de '+meta.cooldownDays+' dias antes de ativar novamente.');
 return {meta,actor,user,increase,context,state,source,receipt,cooldownKey};
}
function durationSeconds(activity) {
 const factor={second:1,minute:60,hour:3600,day:86400}[activity.duration?.units];
 return factor?number(activity.duration?.value)*factor:0;
}
function externalUpdate(actor,updates) {
 return actor.parent?.delta?{action:'update',documentName:'ActorDelta',parent:actor.parent,updates:[{...updates,_id:actor.parent.delta.id}]}:
  {action:'update',documentName:'Actor',updates:[{...updates,_id:actor.id}]};
}

/** Pure preparation. Returned actor/operations merge with native usage costs in one performBulkUpdate. */
export function prepareElementalRuntimeUpdates(activity,usageConfig={},options={}) {
 const validated=validate(activity,usageConfig,options);if(!validated)return null;
 const {meta,actor,user,increase,context,state,source,receipt,cooldownKey}=validated;
 const actions=integer(options.actionCost??activity.activation?.value),actorUpdates=elementalActionSpendUpdates(actor,actions);
 const operations=[],result={actor:actorUpdates,operations,actionCost:actions,source};
 const orbUse=prepareElementalOrbUse(activity,usageConfig,Array.from(options.targets??[]));if(orbUse)actorUpdates['flags.'+SCOPE+'.elementalOrbs']=orbUse.bank;
 const entry=details=>({turn:context.turn,source,...details});
 const set=(key,value)=>{actorUpdates[PREFIX+key]=value;};
 const qiTarget=Array.from(activity.consumption?.targets??[]).find(t=>t.type==='attribute'&&/^energy\.(total|generated)$/.test(t.target));
 const qiSpent=controlledFlameInvestment(activity,usageConfig)??(qiTarget?number(qiTarget.value)+increase*number(qiTarget.scaling?.formula||1):0);
 const pool=qiTarget?.target?.split('.').at(-1)??'generated';
 const receipts=copy(state.receipts??{});
 if(meta.paidBy){const selectedParent=usageConfig.elementalParentUseId;const original=selectedParent?copy(actor.flags?.[SCOPE]?.elementalUseReceipts?.[selectedParent]):receipts[meta.paidBy];if(selectedParent&&(!original||original.source?.itemId!==source.itemId||original.source?.activityId!==meta.paidBy))throw Error('O ataque pago não pertence a esta habilidade.');if(!original||original.turn!==context.turn||!context.turn&&Number.isFinite(original.worldTime)&&original.worldTime!==context.worldTime)throw new Error('Ative primeiro a etapa paga desta habilidade.');
  if(meta.rule==='earthPrisonSave'){
   if(!original.attackMessageUuid||!original.attackTargets?.some(t=>t.hit))throw Error('Confirme o acerto da Prisão de Terra antes da salvaguarda.');
   const selected=usageConfig.elementalUseContext?.targetUuids??Array.from(options.targets??[],t=>t.document?.uuid??t.uuid??t.actor?.uuid).filter(Boolean);
   if(selected.length!==1||!original.attackTargets.some(t=>t.hit&&(selected[0]===t.token||selected[0]===t.actor)))throw Error('A salvaguarda deve usar o mesmo alvo atingido pelo ataque pago.');
  }
  if(original.followUps?.includes(source.activityId))throw new Error('Esta etapa do mesmo uso já foi aplicada.');
  if(meta.rule==='voidAbsorptionHealing'&&(!original.attackMessageUuid||original.attackHit!==true))throw new Error('A cura exige o acerto confirmado do ataque de Absorção.');
  if(meta.rule==='voidAbsorptionHealing'&&increase+1!==original.qiSpent)throw new Error('A cura deve usar exatamente o mesmo Qi gasto no ataque.');
  original.followUps=[...(original.followUps??[]),source.activityId];
  if(original.requestId)actorUpdates['flags.'+SCOPE+'.elementalUseReceipts.'+original.requestId]=copy(original);
  if(!selectedParent||receipts[meta.paidBy]?.requestId===selectedParent)receipts[meta.paidBy]=original;
 }
 if(meta.linked){const linked=Object.values(receipts).find(r=>r.source?.abilityId===meta.abilityId&&r.key===meta.linked&&r.turn===context.turn);
  if(!linked)throw new Error('Ative primeiro a etapa principal desta habilidade.');
  if(linked.followUps?.includes(source.activityId))throw new Error('Esta opção do mesmo uso já foi aplicada.');linked.followUps=[...(linked.followUps??[]),source.activityId];
 }
 switch(meta.rule) {
  case 'lightOrbCreation':{const token=options.sourceToken??globalThis.fromUuidSync?.(usageConfig.elementalUseContext?.sourceTokenUuid,{strict:false});const bank=prepareElementalOrbs(meta,{requestId:context.requestId,sourceActorUuid:actor.uuid,worldTime:context.worldTime},token);bank.itemId=source.itemId;actorUpdates['flags.'+SCOPE+'.elementalOrbs']=bank;break;}
  case 'lightGridContact':{const grid=actor.flags?.[SCOPE]?.elementalConstructs?.[usageConfig.elementalGridId];if(grid?.kind!=='lightGrid'||!grid.active)throw Error('Escolha uma grade criada por um acerto confirmado.');if(usageConfig.elementalGridMovementId){if(actor.flags?.[SCOPE]?.elementalGridMovementUses?.[usageConfig.elementalGridMovementId])throw Error('Este movimento já registrou o contato com a grade.');actorUpdates['flags.'+SCOPE+'.elementalGridMovementUses.'+usageConfig.elementalGridMovementId]={requestId:context.requestId,gridId:grid.id};}result.completion='gridContact';break;}
  case 'realisticIllusion':case 'illusoryScenery':result.completion='illusion';break;
  case 'slashingRetaliation':{const id=usageConfig.elementalUseContext?.originEventId;if(!id)throw Error('Vincule o ataque inimigo antes de usar Defesa Cortante.');result.completion='slashingRetaliation';break;}
  case 'flameManipulation':case 'fireDamageReduction':case 'flameAttack':{
   if(!usageConfig.elementalControlledFlamesId)set('controlledFlames',entry({id:context.requestId,active:true,qiSpent,volumeM3:meta.volumeM3??1}));
   if(meta.rule==='fireDamageReduction'){const eventId=usageConfig.elementalUseContext?.originEventId;if(!eventId||!usageConfig.elementalUseContext.sourceTokenUuid)throw Error('Vincule o ataque de chamas e o token antes de controlar o dano.');if(Object.values(actor.flags?.[SCOPE]?.elementalFireReductions??{}).some(r=>r.eventId===eventId&&r.tokenUuid===usageConfig.elementalUseContext.sourceTokenUuid))throw Error('Estas chamas já foram controladas neste ataque.');actorUpdates['flags.'+SCOPE+'.elementalFireReductions.'+context.requestId]={eventId,tokenUuid:usageConfig.elementalUseContext.sourceTokenUuid,value:5,consumed:false};}break;
  }
  case 'regionalQiAbsorption':Object.assign(actorUpdates,prepareRegionalVortex(actor,{requestId:context.requestId,worldTime:context.worldTime}));result.completion='regionalVortex';break;
  case 'rewind':{if(!options.rewindPreview||options.rewindPreview.pending?.length)throw Error('Rewind exige histórico completo confirmado.');if(!context.requestId)throw Error('Rewind exige uma ativação registrada.');actorUpdates['flags.'+SCOPE+'.elementalRewindRequests.'+context.requestId]={preview:copy(options.rewindPreview),worldTime:context.worldTime,status:'paid'};result.completion='rewind';break;}
  case 'massRecovery':{if(!options.sacrificePreview)throw Error('Confirme o custo de Constituição antes de usar Recuperação em Massa.');const change=commitElementalSacrifice(options.sacrificePreview,{sourceActorUuid:actor.uuid,requestId:context.requestId,worldTime:context.worldTime},{actor,hpDelta:options.massHPDelta??0});Object.assign(actorUpdates,change.updates);break;}
  case 'earthPrisonSave':result.completion='earthPrison';break;
  case 'mysticalRealm':{
   if(!options.sacrificePreview)throw Error('Confirme a prévia do sacrifício antes de criar o reino.');
   const change=commitElementalSacrifice(options.sacrificePreview,{sourceActorUuid:actor.uuid,requestId:context.requestId,worldTime:context.worldTime},{actor});Object.assign(actorUpdates,change.updates);break;
  }
  case 'timeDilation':{
   const choice=usageConfig.elementalDilation;if(!choice||elementalDilationCost(meta.tier,choice.multiplier)!==qiSpent)throw Error('O fator escolhido não corresponde ao custo pago da zona.');
   const jobId=source.activityId+'-'+String(context.requestId??context.worldTime).replace(/[^a-zA-Z0-9_-]/g,'');
   const job=prepareElementalCalendarEffect('timeDilation',meta.tier,choice,{requestId:jobId,sourceActorUuid:actor.uuid,worldTime:context.worldTime});actorUpdates['flags.'+SCOPE+'.elementalCalendarEffects.'+jobId]={...job,source,radius:meta.radius??activity.target?.template?.size,targets:usageConfig.elementalUseContext?.targetUuids??[]};result.completion='timeZone';break;
  }
  case 'plantGrowth':case 'timeFreeze':case 'spaceRip':case 'miniaturizeRealm':{
   if(meta.rule==='miniaturizeRealm'&&!actor.flags?.[SCOPE]?.elementalLongTerm?.realms?.[usageConfig.elementalRealmId])throw Error('Escolha um Reino Místico próprio antes da preparação.');
   const jobId=source.activityId+'-'+String(context.requestId??context.worldTime).replace(/[^a-zA-Z0-9_-]/g,'');
   const job=prepareElementalCalendarEffect(meta.rule,meta.tier,{preparationRoll:options.preparationRoll},{requestId:jobId,sourceActorUuid:actor.uuid,worldTime:context.worldTime,combat:context.combatId?{id:context.combatId,round:context.round}:null});
   actorUpdates['flags.'+SCOPE+'.elementalCalendarEffects.'+jobId]={...job,source,sourceTokenUuid:usageConfig.elementalUseContext?.sourceTokenUuid??null,realmId:usageConfig.elementalRealmId??null,targets:usageConfig.elementalUseContext?.targetUuids??[]};break;
  }
  case 'finiteBarrier': {
   const value=meta.tier===1?number(options.rollTotal):8*(increase+1);
   if(value<=0)throw new Error('A barreira precisa de uma rolagem válida e positiva.');
   set('barrier',entry({value:integer(value),expires:'turnStart'}));break;
  }
  case 'armorPoints':actorUpdates['system.armorPoints.value']=integer(actor.system?.armorPoints?.value)+(meta.tier===1?20:4*(increase+1));break;
  case 'selfHaste': {
   const previous=state.haste?.turn===context.turn?integer(state.haste?.remaining):0;
   actorUpdates['system.legacy2.actions.value']=integer(actorUpdates['system.legacy2.actions.value']??actor.system.legacy2.actions.value)+integer(meta.actionsGranted);
   set('haste',entry({remaining:previous+integer(meta.actionsGranted),expires:'turnStart'}));break;
  }
  case 'overlappingSpace':set('overlappingSpace',entry({active:true,useId:context.requestId,copies:meta.copies,expires:'turnEnd'}));result.completion='projections';break;
  case 'temporaryResistance':set('windBarrier',entry({value:integer(meta.value),damageTypes:meta.damageTypes,expires:'turnStart'}));break;
  case 'unignorableResistance':set('bodyFluid',entry({value:integer(meta.value),active:true,upkeepQi:15,pool,upkeepTurn:context.turn}));break;
  case 'spaceStep':case 'flameEscape':{
   const use=usageConfig.elementalUseContext;
   if(!use?.sourceTokenUuid||!/^[a-zA-Z0-9_-]+$/.test(use.requestId))throw Error('Escolha o token de origem antes de pagar o teleporte.');
   actorUpdates['flags.'+SCOPE+'.elementalSpatialCredits.'+use.requestId]={version:1,requestId:use.requestId,sourceTokenUuid:use.sourceTokenUuid,range:meta.rule==='flameEscape'?30:meta.tier===1?15:40,originEventId:use.originEventId??null,status:'ready',source,turn:context.turn};break;
  }
  case 'waterWhip':set('waterWhip',entry({active:true,tier:meta.tier,reachFormula:meta.reachFormula,advantages:meta.advantages,expiresAt:context.worldTime+60}));break;
  case 'laceratingQi':set('laceratingQi',entry({pending:true,value:increase+1}));break;
  case 'spaceStepAdvantages':set('spaceAdvantages',entry({remaining:4}));break;
  case 'chasingLightning':{const token=options.sourceToken??globalThis.fromUuidSync?.(usageConfig.elementalUseContext?.sourceTokenUuid,{strict:false}),selected=usageConfig.elementalUseContext?.targetUuids??[];if(!token||token.actor?.uuid!==actor.uuid||selected.length!==1)throw Error('Escolha um token de origem e exatamente uma criatura no mapa para Chasing Lightning.');if(state.chasingLightning?.pending||state.chasingLightning?.placementPending)throw Error('Conclua a perseguição já paga antes de ativar outra.');const chase=prepareElementalChase(actor,token,{requestId:context.requestId,turn:context.turn,targetUuid:selected[0],sceneUnits:token.parent?.grid?.units??'m'});set('chasingLightning',entry(chase.state));actorUpdates['flags.'+SCOPE+'.elementalChasingCredits.'+context.requestId]=chase.credit;result.completion='chasingMovement';break;}
  case 'dash':{const token=options.sourceToken??globalThis.fromUuidSync?.(usageConfig.elementalUseContext?.sourceTokenUuid,{strict:false});if(!token||token.actor?.uuid!==actor.uuid)throw Error('Escolha o token que usará a Disparada.');const budget=elementalMovementBudget(actor,token,{turn:context.turn});actorUpdates['flags.'+SCOPE+'.elementalMovement.'+budget.key]={...budget.ledger,turn:context.turn,dashMeters:(Number(budget.ledger.dashMeters)||0)+budget.base};set('dash',entry({expires:'turnEnd',meters:budget.base,tokenUuid:token.uuid}));break;}
  case 'chasingLightningCritical':if(!state.chasingLightning?.pending)throw Error('Ative primeiro Chasing Lightning.');set('chasingLightning',{...state.chasingLightning,criticalRoll:true});break;
  case 'mindBreak':set('mindBreak',entry({active:true,useId:context.requestId,sourceTokenUuid:usageConfig.elementalUseContext?.sourceTokenUuid,recognition:copy(usageConfig.elementalIllusionRecognition??{}),tier:meta.tier,damageType:meta.damageType,fraction:meta.fraction,bonus:meta.bonus,redirectReactions:meta.redirectReactions,upkeepQi:2,pool:'generated',upkeepTurn:context.turn}));if(meta.tier===3)result.completion='projections';break;
  case 'darknessCloak':set('darknessCloak',entry({active:true,ranksAbove:meta.ranksAbove,stealthBonus:meta.stealthBonus,expiresAt:context.worldTime+600}));break;
  case 'divineSenseMultiplier':set('divineSense',entry({multiplier:meta.multiplier,expiresAt:context.worldTime+durationSeconds(activity)}));break;
  case 'windClones':set('windClones',entry({remaining:meta.tier===3?integer(actor.system?.conceitos?.vento?.level):integer(meta.count),maximumArmorClass:integer(meta.armorClassMaximum)||30}));break;
  case 'environmentalBreathing':set('environmentalBreathing',entry({active:true,expiresAt:context.worldTime+durationSeconds(activity)}));break;
  case 'darknessVortex':set('darknessVortex',entry({active:true,expires:'nextTurnEnd',oncePerAttackerLongRest:true}));break;
  case 'illusionDouble':set('illusionDouble',entry({active:true,useId:context.requestId,sourceTokenUuid:usageConfig.elementalUseContext?.sourceTokenUuid,recognition:copy(usageConfig.elementalIllusionRecognition??{}),upkeepQi:30,pool,upkeepTurn:context.turn,cooldownDays:30}));result.completion='projections';break;
  case 'woodHeart':{
   if(!options.woodHeartPreview||!options.commitWoodHeart)throw Error('Confirme a prévia do Coração de Madeira antes de consumir recursos.');
   const heart=options.commitWoodHeart(options.woodHeartPreview,{sourceActorUuid:actor.uuid,requestId:context.requestId,worldTime:context.worldTime},{actor,user});
   Object.assign(actorUpdates,heart.updates);break;
  }
  case 'eternalIcePrison':{
   const id=usageConfig.elementalUseContext?.requestId;
   const prison=entry({active:!id,pending:!!id,...(id?{instanceId:id}:{}),investedQi:20,permanentAtQi:500,eternal:false,upkeepQi:20,pool,upkeepTurn:context.turn,manualPrison:true});
   set('eternalPrison',prison);
   if(id)actorUpdates['flags.'+SCOPE+'.elementalPrisonUpkeep.'+id]={...prison,id,sourceUseId:id};
   break;
  }
  case 'eternalIcePrisonUpkeep': {
   const prison=state.eternalPrison;
   if(prison?.instanceId)throw Error('A manutenção destas prisões é automática por instância no início do turno.');
   if(!prison||prison.active===false)throw new Error('Ative primeiro uma prisão de gelo para mantê-la.');
   if(prison.eternal||integer(prison.investedQi)>=500)throw new Error('A prisão já é eterna e não exige mais Qi.');
   if(context.turn&&prison.upkeepTurn===context.turn)throw new Error('A manutenção desta prisão já foi paga neste turno.');
   const investedQi=Math.min(500,integer(prison.investedQi)+20);
   set('eternalPrison',{...prison,investedQi,eternal:investedQi>=500,upkeepTurn:context.turn,pool});break;
  }
  case 'lethargy':set('lethargy',entry({pending:true,damageType:'void',dcBonus:meta.dcBonus,targets:Array.from(options.targets??[],target=>target.actor?.uuid??target.uuid).filter(Boolean)}));break;
  case 'stabilize': {
   const selected=Array.from(options.targets??[]);if(selected.length!==1)throw new Error('Selecione exatamente uma criatura como alvo para estabilizar.');
   const target=selected[0].actor??selected[0];
   const hp=target.system?.attributes?.hp,death=target.system?.attributes?.death;
   if(!hp||number(hp.value)!==0)throw new Error('A criatura precisa estar a 0 Pontos de Vida.');
   if(!death||integer(death.failure)>=3)throw new Error('Esta criatura não pode ser estabilizada desta forma.');
   const changes={'system.attributes.death.success':3,'system.attributes.death.failure':0};
   if(target===actor)Object.assign(actorUpdates,changes);else if(target.isOwner===false&&!user?.isGM)result.completion='stabilize';else operations.push(externalUpdate(target,changes));break;
  }
 }
 receipts[source.activityId]=entry({key:meta.key,ruleData:copy(meta),saveDC:Number.isFinite(Number(activity.save?.dc?.value))?Number(activity.save.dc.value):null,requestId:context.requestId??null,parentUseId:usageConfig.elementalParentUseId??null,originEventId:usageConfig.elementalUseContext?.originEventId??null,gridId:usageConfig.elementalGridId??null,orbIds:orbUse?.ids??[],orbOrigins:orbUse?.origins??[],scaling:increase,targets:usageConfig.elementalUseContext?.targetUuids??[],worldTime:context.worldTime,round:context.round,combatId:context.combatId,qiSpent,
  encounterUses:context.combatId&&receipt?.combatId===context.combatId?integer(receipt?.encounterUses)+1:1});
 set('receipts',receipts);
 if(context.requestId)actorUpdates['flags.'+SCOPE+'.elementalUseReceipts.'+context.requestId]=copy(receipts[source.activityId]);
 if(meta.cooldownDays&&meta.cooldownStarts!=='end')set('cooldowns',{...(state.cooldowns??{}),[cooldownKey]:{availableAt:context.worldTime+meta.cooldownDays*86400,source}});
 return result;
}

/** Resolve required dice and targeting before any native update is committed. */
export async function prepareElementalActivation(activity,usageConfig={},options={}) {
 const recordedTargets=usageConfig.elementalUseContext?.targetUuids;
 const resolved={...options,targets:options.targets??(recordedTargets?recordedTargets.map(uuid=>globalThis.fromUuidSync?.(uuid,{strict:false})).filter(Boolean):Array.from(globalThis.game?.user?.targets??[]))};
 const v=validate(activity,usageConfig,resolved);if(!v)return null;
 if(v.meta.rule==='woodHeart'){
  const heart=await import('./elemental-wood-heart.mjs');
  const preview=options.confirmWoodHeart?heart.previewElementalWoodHeart(v.actor,{user:v.user,worldTime:v.context.worldTime}):await heart.confirmElementalWoodHeart(v.actor,{user:v.user,worldTime:v.context.worldTime});
  if(!preview||options.confirmWoodHeart&&!await options.confirmWoodHeart(preview))throw Error('Criação do Coração de Madeira cancelada; nenhum recurso foi gasto.');
  resolved.woodHeartPreview=preview;resolved.commitWoodHeart=heart.commitElementalWoodHeart;
 }
 if(v.meta.rule==='finiteBarrier'&&v.meta.tier===1&&resolved.rollTotal===undefined){
  const rollFormula=options.rollFormula??(async(formula,data)=>new globalThis.Roll(formula,data).evaluate());
  const roll=await rollFormula('5d8',activity.getRollData?.()??v.actor.getRollData?.()??{});
  resolved.rollTotal=roll?.total??roll;
  resolved.roll=roll;
 }
 if(v.meta.rule==='spaceRip'&&v.meta.tier===3&&resolved.preparationRoll===undefined){
  const roll=await(options.rollFormula??(async(formula,data)=>new globalThis.Roll(formula,data).evaluate()))('1d4',{});
  resolved.preparationRoll=roll?.total??roll;resolved.roll=roll;
 }
 if(v.meta.rule==='rewind'){
  const {previewElementalRewind}=await import('./elemental-history.mjs'),{planElementalRewind,elementalRewindWorldItems}=await import('./elemental-rewind.mjs'),preview=previewElementalRewind(v.actor,v.context.worldTime);if(!preview.available||preview.pending.length)throw Error('Rewind exige uma hora de histórico completo real; não é possível inventar um estado anterior.');const check=planElementalRewind(v.actor,preview,{requestId:usageConfig.elementalUseContext?.requestId??'preview',sourceActorUuid:v.actor.uuid,worldTime:v.context.worldTime},{externalItems:elementalRewindWorldItems(v.actor)});if(check.pending.length)throw Error('O histórico de Rewind precisa de conferência antes de gastar recursos: '+check.pending.map(p=>p.name??p.condition??p.reason).join(', '));const r=preview.state.resources,confirmed=options.confirmRewind?await options.confirmRewind(preview):await globalThis.foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Rewind · estado de uma hora atrás'},content:'<p>Restaurar o estado registrado de uma hora atrás, incluindo atributos físicos, usos, condições e consumos.</p><p><strong>Vida: '+r.hpValue+' · Qi total após o custo: '+(r.qiTotal-50)+' · Feridas: '+(r.wounds??0)+'</strong></p><p>Os 3 Pontos de Ação e a espera de 30 dias permanecem pagos. Itens que estão com outras criaturas exigem conferência do narrador.</p>',rejectClose:false});if(!confirmed)throw Error('Rewind cancelado; nenhum recurso foi gasto.');resolved.rewindPreview=preview;
 }
 if(v.meta.rule==='massRecovery'){
  const preview=previewElementalSacrifice(v.actor,'massRecovery'),confirmed=options.confirmSacrifice?await options.confirmSacrifice(preview):await globalThis.foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Recuperação em Massa'},content:'<p>Custo adicional: <strong>1 Constituição</strong> ('+preview.before.constitution+' → '+preview.after.constitution+'). Mínimo de 1.</p><p>Recupere apenas 1 ponto por dia ao concluir um descanso longo. Seus pontos distribuíveis permanecem reservados.</p>',rejectClose:false});if(!confirmed)throw Error('Recuperação em Massa cancelada; nenhum custo foi aplicado.');resolved.sacrificePreview=preview;if(Number.isFinite(v.actor.system?.attributes?.hp?.max)){const {default:Ruleset}=await import('./ruleset.mjs');resolved.massHPDelta=Ruleset.maxHitPoints(elementalConstitutionView(v.actor,preview.after.constitution))-Ruleset.maxHitPoints(v.actor);}
 }
 if(v.meta.rule==='mysticalRealm'){
  const preview=previewElementalSacrifice(v.actor,'mysticalRealm');
  const confirmed=options.confirmSacrifice?await options.confirmSacrifice(preview):await globalThis.foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Criar Reino Místico'},content:'<p>A criação sacrifica <strong>dois níveis de cultivo normal</strong>: nível '+preview.before.level+' → '+preview.after.level+'.</p><p>O reino registra o cultivo original e seu teto de Qi. Corpo e Alma permanecem nos seus caminhos.</p>',rejectClose:false});
  if(!confirmed)throw Error('Criação do reino cancelada; o sacrifício não foi aplicado.');resolved.sacrificePreview=preview;
 }
 const result=prepareElementalRuntimeUpdates(activity,usageConfig,resolved);
 if(resolved.roll&&typeof resolved.roll==='object')result.rolls=[resolved.roll];
 return result;
}

/** Call only for the owning actor's turn transition, before converting actions into reserves. */
export function elementalTurnUpdates(actor,{turn,phase='start',worldTime=0}={}) {
 const updates={},state=stateOf(actor);
 for(const [key,value] of Object.entries(state)){
  if(!value||typeof value!=='object')continue;
  const expireTime=own(value,'expiresAt')&&number(value.expiresAt)<=number(worldTime);
  const expireStart=turn&&phase==='start'&&value.expires==='turnStart'&&value.turn!==turn;
  const expireEnd=turn&&phase==='end'&&value.expires==='turnEnd'&&value.turn===turn;
  const expireNextEnd=turn&&phase==='end'&&value.expires==='nextTurnEnd'&&value.turn!==turn;
  if(!expireTime&&!expireStart&&!expireEnd&&!expireNextEnd)continue;
  updates[PREFIX+'-='+key]=null;
  if(key==='haste')updates['system.legacy2.actions.value']=Math.max(0,integer(actor.system?.legacy2?.actions?.value)-integer(value.remaining));
 }
 return updates;
}
