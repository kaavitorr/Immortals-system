import {elementalTokenAreaState} from './elemental-areas.mjs';
import {effectiveElementalPrison} from './elemental-prison-maintenance.mjs';
import {npcCultivationState} from './npc-cultivation.mjs';
const S='Immortals-system';
export const ELEMENTAL_CONSTRUCT_RULES=new Set(['protectiveBubble','earthStructure','earthPrisonSave','eternalIcePrison','iceStructure','windDome','lightGrid']);
function recordId(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return 'ec'+(h>>>0).toString(16);}
const integer=value=>Math.max(0,Math.trunc(Number(value)||0));
export function prepareElementalConstruct(activity,choices={},context={}){
 const meta=activity.flags?.[S]?.elementalActivity,actor=activity.actor??activity.item?.actor;
 if(!meta||!ELEMENTAL_CONSTRUCT_RULES.has(meta.rule))return [];
 if(!context.requestId||!context.sourceActorUuid)throw Error('A estrutura precisa de uma origem registrada.');
 const kind={protectiveBubble:'bubble',earthStructure:'earthSection',earthPrisonSave:'earthPrison',eternalIcePrison:'icePrison',iceStructure:'icePillar',windDome:'windDome',lightGrid:'lightGrid'}[meta.rule];
 const tier=Math.min(3,Math.max(1,integer(meta.tier))),level=actor?.type==='npc'?npcCultivationState(actor).level:(integer(actor?.system?.cultivation?.rank)-1)*3+integer(actor?.system?.cultivation?.stage);
 const count=integer(choices.count??1),max=kind==='icePillar'?[0,10,20,1][tier]:kind==='earthSection'?Math.max(1,Math.floor(Number(meta.volumeM3)||1)):1;
 if(!count||count>max)throw Error('Quantidade de estruturas fora do limite.');
 const hp=Number(meta.hitPoints)||null,duration=kind==='bubble'?(tier===1?3600:28800):kind==='windDome'?600:null;
 return Array.from({length:count},(_,index)=>({version:1,id:recordId(context.requestId)+':'+index,kind,sourceActorUuid:context.sourceActorUuid,sourceUseId:context.requestId,
  sourceAbility:{elementId:meta.elementId,abilityId:meta.abilityId,tier},targetUuids:[...context.targetUuids??[]],createdAt:Number(context.worldTime)||0,
  active:true,shape:kind==='icePillar'&&tier===3?(choices.shape??context.choices?.iceShape??'structure'):null,hp:hp?{value:hp,max:hp}:null,armorClass:Number(meta.armorClass)||null,expiresAt:duration?(Number(context.worldTime)||0)+duration:null,
  limit:kind==='bubble'?'recipientLongRest':null,conditionsImmune:kind==='bubble'&&tier>1?['jj-queimado','jj-sangramento','jj-envenenado']:[],
  indestructibleBelowLevel:kind==='icePrison'?level:null,blocksExternalAttacks:['earthPrison','icePrison'].includes(kind),blocksOutgoing:kind==='icePrison',
  spaceConceptExit:['earthPrison','windDome'].includes(kind)?10:null,contactDamage:kind==='lightGrid'?10*Math.min(tier,integer(choices.orbs??1)):0,
  soulPolicy:'blocks',sceneRefs:[],receipts:[]
 }));
}
/** Integrity belongs to this instance, never to the creature inside. No document writes during previews. */
export function planElementalConstructDamage(record,typedParts,{worldTime=0,receipt,attackConstruct=false,sourceInside=false,targetInside=true,sourceLevel,soulPolicy=record.soulPolicy??'blocks'}={}){
 const copy=structuredClone(record),remainingParts=structuredClone(typedParts),result={record:copy,remainingParts,absorbed:0,events:[],alreadyApplied:false,pending:false};
 if(receipt&&record.receipts?.includes(receipt)){result.alreadyApplied=true;return result;}
 if(!record.active||record.expiresAt!==null&&Number(record.expiresAt)<=worldTime)return result;
 const eligible=remainingParts.filter(p=>Number(p.value)>0&&!['healing','temphp','maximum'].includes(p.type));
 if(eligible.some(p=>p.type==='soul')&&!soulPolicy){result.pending=true;result.reason='Dano de Alma: a regra de isolamento ainda precisa de confirmação.';return result;}
 const parts=eligible.filter(p=>p.type!=='soul'||soulPolicy==='blocks'),total=parts.reduce((sum,p)=>sum+p.value,0);
 const bubble=record.kind==='bubble',prison=record.blocksExternalAttacks;
 if(attackConstruct){
  if(!copy.hp)return result;
  if(copy.indestructibleBelowLevel&&(!Number.isInteger(sourceLevel)||sourceLevel<1||sourceLevel>30)){result.pending=true;result.reason='Confirme o nível de cultivo do atacante.';return result;}
  const invulnerable=copy.eternal||copy.indestructibleBelowLevel&&sourceLevel<copy.indestructibleBelowLevel;
  const damage=invulnerable?0:Math.min(copy.hp.value,total);copy.hp.value-=damage;result.absorbed=total;parts.forEach(p=>p.value=0);
 }else if(bubble&&copy.hp){
  let capacity=Math.min(copy.hp.value,total);result.absorbed=capacity;copy.hp.value-=capacity;
  for(const part of parts){const amount=Math.min(capacity,part.value);part.value-=amount;capacity-=amount;}
 }else if(prison&&(targetInside&&!sourceInside||record.blocksOutgoing&&sourceInside&&!targetInside)){
  result.absorbed=total;parts.forEach(p=>p.value=0);
 }
 if(copy.hp?.value===0){copy.active=false;copy.destroyedAt=worldTime;result.events.push({kind:'destroyed',id:record.id});if(record.kind==='icePillar'&&record.sourceAbility?.tier===3&&record.shape==='dome')result.events.push({kind:'iceDomeCooldown',sourceActorUuid:record.sourceActorUuid,availableAt:worldTime+60,id:record.id});}
 if(receipt)copy.receipts=[...record.receipts??[],receipt];return result;
}
function actorTokens(actor,uuid){if(uuid){let token;try{token=globalThis.fromUuidSync?.(uuid,{strict:false});}catch{}return token&&actor?.uuid&&token.actor?.uuid===actor.uuid?[token]:[];}if(actor?.token)return[actor.token];return Array.from(actor?.getActiveTokens?.(true,true)??[],t=>t.document??t);}
export function elementalRecipientConstructs(actor,{worldTime=globalThis.game?.time?.worldTime??0,tokenUuid}={}){
 const geometric=new Map();
 for(const token of actorTokens(actor,tokenUuid))for(const area of elementalTokenAreaState(token,{worldTime}).areas){
  if(area.kind!=='icePrison')continue;let document;try{document=globalThis.fromUuidSync?.(area.ownerActorUuid,{strict:false});}catch{}
  const owner=document?.actor??document,record=owner?.flags?.[S]?.elementalConstructs?.[area.recordId];
  if(record)geometric.set(record.id,{...record,shared:true,geometryOnly:false,areaMembership:{ownerActorUuid:owner.uuid,recordId:area.recordId,sceneUuid:token.parent.uuid},storageActorUuid:owner.uuid,recipientActorUuid:actor.uuid});
 }
 const shared=Object.values(actor.flags?.[S]?.elementalConstructRefs??{}).map(ref=>{let document;try{document=ref.ownerActorUuid===actor.uuid?actor:globalThis.fromUuidSync?.(ref.ownerActorUuid,{strict:false});}catch{}const owner=document?.actor??document,record=owner?.flags?.[S]?.elementalConstructs?.[ref.recordId];return record?{...record,shared:true,geometryOnly:false,...(record.kind==='icePrison'&&record.areaRef?{areaMembership:{ownerActorUuid:owner.uuid,recordId:ref.recordId,sceneUuid:record.areaRef.sceneUuid}}:{}),storageActorUuid:owner.uuid,recipientActorUuid:actor.uuid}:{...ref,shared:true,unresolved:true,active:true,expiresAt:null};});
 for(const record of shared)if(!geometric.has(record.id))geometric.set(record.id,record);
 return[...Object.values(actor.flags?.[S]?.elementalConstructs??{}).filter(r=>!geometric.has(r.id)).map(r=>({...r,storageActorUuid:actor.uuid})),...geometric.values()].map(r=>effectiveElementalPrison(r)).filter(r=>r.active&&(r.expiresAt==null||r.expiresAt>worldTime));
}
function constructMembership(record,actor,tokenUuid,worldTime){
 if(record.areaMembership){const tokens=actorTokens(actor,tokenUuid);if(tokens.length!==1)return null;const token=tokens[0],ref=record.areaMembership;return token.parent?.uuid===ref.sceneUuid&&elementalTokenAreaState(token,{worldTime}).areas.some(a=>a.ownerActorUuid===ref.ownerActorUuid&&a.recordId===ref.recordId);}
 const tokens=(record.targetUuids??[]).filter(id=>/^Scene[.][^.]+[.]Token[.][^.]+$/.test(id));if(tokens.length)return tokenUuid?tokens.includes(tokenUuid):null;return(record.targetUuids??[]).includes(actor?.uuid);
}
export function elementalConstructProtection(actor,parts,context={}){
 let remainingParts=structuredClone(parts);const updates={},events=[];
 if(!context.internalDamage&&parts.some(p=>p.value>0&&!['healing','temphp','maximum'].includes(p.type))&&context.sourceActor){for(const record of elementalRecipientConstructs(context.sourceActor,{...context,tokenUuid:context.sourceTokenUuid??context.sourceActor.token?.uuid})){if(record.unresolved)return{pending:true,reason:'O vínculo da prisão precisa ser conferido pelo narrador.',remainingParts:parts,updates:{},events:[]};if(record.geometryOnly||!record.blocksOutgoing)continue;const sourceInside=constructMembership(record,context.sourceActor,context.sourceTokenUuid??context.sourceActor.token?.uuid,context.worldTime);if(sourceInside===null)return{pending:true,reason:'Informe o token de origem deste dano para conferir o isolamento da prisão.',remainingParts:parts,updates:{},events:[]};if(!sourceInside)continue;const targetInside=constructMembership(record,actor,context.targetTokenUuid??actor.token?.uuid,context.worldTime);if(targetInside===null)return{pending:true,reason:'Informe o token atingido para conferir o isolamento da prisão.',remainingParts:parts,updates:{},events:[]};if(!targetInside)for(const part of remainingParts)if(part.value>0&&!['healing','temphp','maximum'].includes(part.type))part.value=0;}}

 for(const record of elementalRecipientConstructs(actor,{...context,tokenUuid:context.targetTokenUuid??actor.token?.uuid})){
  if(record.unresolved)return{pending:true,reason:'O vínculo da prisão precisa ser conferido pelo narrador.',remainingParts:parts,updates:{},events:[]};
  if(record.geometryOnly||!['bubble','earthPrison','icePrison'].includes(record.kind))continue;
  if(record.areaMembership){const inside=constructMembership(record,actor,context.targetTokenUuid??actor.token?.uuid,context.worldTime);if(inside===null)return{pending:true,reason:'Escolha o token atingido para conferir a área da prisão.',remainingParts:parts,updates:{},events:[]};if(!inside)continue;}
  const tokenTargets=(record.targetUuids??[]).filter(uuid=>/^Scene\.[^.]+\.Token\.[^.]+$/.test(uuid)),targetToken=context.targetTokenUuid??actor.token?.uuid;
  if(tokenTargets.length&&!targetToken)return{pending:true,reason:'Esta proteção pertence a um token específico. Selecione o token que recebeu o dano.',remainingParts:parts,updates:{},events:[]};
  if(tokenTargets.length&&!tokenTargets.includes(targetToken))continue;
  const plan=planElementalConstructDamage(record,remainingParts,{...context,sourceInside:context.internalDamage===true||constructMembership(record,context.sourceActor,context.sourceTokenUuid??context.sourceActor?.token?.uuid,context.worldTime)===true});
  if(plan.pending)return{pending:true,reason:plan.reason,remainingParts:parts,updates:{},events:[]};
  if(plan.alreadyApplied)return{alreadyApplied:true,remainingParts:parts,updates:{},events:[]};
  remainingParts=plan.remainingParts;if(!record.shared)updates['flags.'+S+'.elementalConstructs.'+record.id]=plan.record;events.push(...plan.events);
 }
 return{remainingParts,updates,events,pending:false};
}

export function elementalConstructLifecycleUpdates(actor,worldTime=globalThis.game?.time?.worldTime??0){const updates={},unconscious=Number(actor.system?.attributes?.hp?.value)<=0||['unconscious','jj-inconsciente','dead'].some(id=>actor.statuses?.has?.(id));for(const [id,record]of Object.entries(actor.flags?.[S]?.elementalConstructs??{})){if(!record.active)continue;const reason=record.expiresAt!=null&&record.expiresAt<=worldTime?'expired':record.kind==='windDome'&&record.sourceActorUuid===actor.uuid&&unconscious?'unconscious':null;if(reason)updates['flags.'+S+'.elementalConstructs.'+id]={...record,active:false,endedAt:worldTime,endReason:reason};}return updates;}
export function registerElementalConstructLifecycleHooks(){if(registerElementalConstructLifecycleHooks.installed)return;registerElementalConstructLifecycleHooks.installed=true;const process=async actor=>{const game=globalThis.game;if(!actor||game?.settings?.get?.(S,'rulesetVersion')!=='2.0'||!game.user?.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return;const {withElementalActorLock}=await import('./elemental-runtime.mjs');await withElementalActorLock(actor,'construct-lifecycle',async()=>{const updates=elementalConstructLifecycleUpdates(actor);if(Object.keys(updates).length)await actor.update(updates);});};const tick=actor=>{void process(actor).catch(error=>globalThis.ui?.notifications?.warn?.('Encerramento de estrutura pendente: '+error.message));};globalThis.Hooks?.on?.('updateActor',tick);for(const event of ['createActiveEffect','updateActiveEffect','deleteActiveEffect'])globalThis.Hooks?.on?.(event,effect=>tick(effect.parent));globalThis.Hooks?.once?.('ready',()=>{for(const actor of globalThis.game?.actors??[])tick(actor);});}
