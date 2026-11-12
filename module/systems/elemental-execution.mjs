/** Recorded, permission-checked completion of elemental effects. Costs remain in native activity consumption. */
const SCOPE='Immortals-system',queues=new Map(),executors=new Map();
const clone=value=>structuredClone(value);const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const identity=document=>document?.uuid??null;const id=()=>globalThis.foundry?.utils?.randomID?.()??globalThis.crypto?.randomUUID?.()??String(Date.now())+Math.random().toString(16).slice(2);
export function createElementalUseContext(activity,choices={},environment={}){
 const actor=activity.actor??activity.item?.actor,meta=activity.flags?.[SCOPE]?.elementalActivity;
 const sourceItem=actor?.items?.get?.(activity.item?.id??activity.item?._id)??activity.item;
 if(!actor?.uuid||!sourceItem?.uuid||!activity.id)throw Error('A atividade precisa pertencer a uma ficha.');
 const combat=environment.combat??globalThis.game?.combat,combatant=combat?.combatant;
 const targetUuids=Array.from(environment.targets??globalThis.game?.user?.targets??[],target=>typeof target==='string'?target:identity(target.document??target)??identity(target.actor)).filter(Boolean);
 return freeze({version:1,requestId:environment.requestId??id(),sourceActorUuid:actor.uuid,sourceTokenUuid:environment.sourceTokenUuid??actor.token?.uuid??null,itemUuid:sourceItem.uuid,activityId:activity.id,ability:meta?{elementId:meta.elementId,abilityId:meta.abilityId,tier:meta.tier}:null,worldTime:Number(environment.worldTime??globalThis.game?.time?.worldTime)||0,combat:combat?.started?{id:combat.uuid??combat.id,round:combat.round,turn:combatant?.id??null}:null,targetUuids:[...new Set(targetUuids)],originEventId:environment.originEventId??null,choices:clone(choices)});
}
export function registerElementalExecutor(kind,handler){if(typeof kind!=='string'||typeof handler!=='function')throw Error('Executor elemental inválido.');executors.set(kind,handler);}
const outcome=(requestId,status,reason)=>({requestId,status,applied:[],pending:reason?[{reason}]:[],skipped:[]});
/** Only a server-recorded message identifies the requester. Socket payloads cannot supply patches or author identity. */
export async function executeElementalRequest(request,options={}){
 const user=options.user??globalThis.game?.user,users=options.users??globalThis.game?.users;
 const gm=users?.activeGM??Array.from(users?.contents??users?.values?.()??[]).filter(u=>u.active&&u.isGM).sort((a,b)=>String(a.id).localeCompare(String(b.id)))[0];
 if(!user?.isGM||gm&&gm.id!==user.id)return outcome(null,'pending','awaitingGM');
 if(typeof request?.messageUuid!=='string'||!request.messageUuid.startsWith('ChatMessage.'))return outcome(null,'rejected','missingRecordedRequest');
 const resolve=options.resolveUuid??globalThis.fromUuid,message=await resolve?.(request.messageUuid);const data=message?.flags?.[SCOPE]?.elementalRequest,context=data?.context;
 if(!data||data.version!==1||!context?.requestId)return outcome(null,'rejected','invalidRecordedRequest');
 const handler=options.handlers?.[data.kind]??executors.get(data.kind);if(!handler)return outcome(context.requestId,'rejected','unsupportedRequest');
 const prior=queues.get(message.uuid)??Promise.resolve();const work=prior.catch(()=>{}).then(async()=>{
  const saved=message.flags?.[SCOPE]?.elementalExecution;if(saved?.status==='complete')return clone(saved);
  if(saved?.uncertain&&!options.confirmUncertain)return clone(saved);
  const requesterId=message._stats?.createdBy??message.author?.id,requester=users?.get?.(requesterId);
  const actor=await resolve?.(context.sourceActorUuid),item=await resolve?.(context.itemUuid),activity=item?.system?.activities?.get?.(context.activityId);
  const owns=actor&&(requester?.isGM||actor.testUserPermission?.(requester,'OWNER')===true||Number(actor.ownership?.[requesterId])>=3);
  if(!requester||!owns||!['character','npc'].includes(actor.type)||item?.actor?.uuid!==actor.uuid||!activity)return outcome(context.requestId,'rejected','sourcePermission');
  const originMessage=context.originEventId?await resolve?.(context.originEventId):null;
  if(['attackRiders','reactionWindow','lightGrid','movementRetaliation'].includes(data.kind)&&(!originMessage||originMessage.getAssociatedActor?.()?.uuid!==actor.uuid||originMessage.getAssociatedActivity?.()?.uuid!==activity.uuid))return outcome(context.requestId,'rejected','invalidOrigin');
  let result;try{const answer=await handler({actor,item,activity,originMessage,message,context:freeze(clone(context)),requester,user});result={requestId:context.requestId,status:answer?.pending?.length?'pending':'complete',applied:answer?.applied??[],pending:answer?.pending??[],skipped:answer?.skipped??[]};}catch(error){result={...outcome(context.requestId,'pending','operationFailed'),uncertain:true,detail:String(error.message??error)};}
  await message.update({['flags.'+SCOPE+'.elementalExecution']:result});return result;
 });queues.set(message.uuid,work);try{return await work;}finally{if(queues.get(message.uuid)===work)queues.delete(message.uuid);}
}

/** Install after ready; sockets are wake-ups only, never a source of document updates. */
export function registerElementalExecutionHooks(){
 if(registerElementalExecutionHooks.installed)return;registerElementalExecutionHooks.installed=true;
 registerElementalExecutor('lightGrid',async request=>{const {executeElementalLightGrid}=await import('./elemental-light-grid.mjs');return executeElementalLightGrid(request);});
 registerElementalExecutor('gridContact',async request=>{const {executeElementalGridContact}=await import('./elemental-light-grid.mjs');return executeElementalGridContact(request);});
 registerElementalExecutor('chasingMovement',async request=>{const {executeElementalChasingMovement}=await import('./elemental-movement.mjs');return executeElementalChasingMovement(request);});
 registerElementalExecutor('illusion',async request=>{const {executeElementalIllusion}=await import('./elemental-illusions.mjs');return executeElementalIllusion(request);});
 registerElementalExecutor('areaLethargy',async request=>{const {executeElementalAreaLethargy}=await import('./elemental-area-lethargy.mjs');return executeElementalAreaLethargy(request);});
 registerElementalExecutor('projections',async request=>{const {executeElementalProjections}=await import('./elemental-projections.mjs');return executeElementalProjections(request);});
 registerElementalExecutor('freezeInteraction',async request=>{const {executeElementalFreezeInteraction}=await import('./elemental-areas.mjs');return executeElementalFreezeInteraction(request);});
 registerElementalExecutor('slashingRetaliation',async request=>{const {executeElementalRetaliation}=await import('./elemental-retaliation.mjs');return executeElementalRetaliation(request);});
 registerElementalExecutor('movementRetaliation',async request=>{const {executeElementalMovementRetaliation}=await import('./elemental-electric-retaliation.mjs');return executeElementalMovementRetaliation(request);});
 registerElementalExecutor('regionalVortex',async request=>{const {executeRegionalVortex}=await import('./elemental-regional-vortex.mjs');return executeRegionalVortex(request);});
 registerElementalExecutor('rewind',async request=>{const {executeElementalRewind}=await import('./elemental-rewind.mjs');return executeElementalRewind(request);});
 registerElementalExecutor('reactionWindow',async request=>{const {executeElementalReactionWindow}=await import('./elemental-reaction-window.mjs');return executeElementalReactionWindow(request);});
 registerElementalExecutor('timeZone',async request=>{const {executeElementalTimeZone}=await import('./elemental-time-zones.mjs');return executeElementalTimeZone(request);});
 registerElementalExecutor('earthPrison',async request=>{const {executeElementalEarthPrison}=await import('./elemental-target-effects.mjs');return executeElementalEarthPrison(request);});
 registerElementalExecutor('stabilize',async request=>{const {executeElementalStabilization}=await import('./elemental-target-effects.mjs');return executeElementalStabilization(request);});
 registerElementalExecutor('construct',async request=>{const {executeElementalConstructRequest}=await import('./elemental-construct-use.mjs');return executeElementalConstructRequest(request);});
 registerElementalExecutor('attackRiders',async({activity,originMessage})=>{const{applyElementalAttackRiders}=await import('./elemental-attack-riders.mjs');return applyElementalAttackRiders(activity,Array.from(originMessage.rolls??[]),{message:originMessage,attackKey:originMessage.uuid});});
 const run=async message=>{if(!message?.flags?.[SCOPE]?.elementalRequest)return;try{const result=await executeElementalRequest({messageUuid:message.uuid});if(result.status==='complete')globalThis.ui?.notifications?.info?.('Efeitos elementais concluídos.');return result;}catch(error){globalThis.ui?.notifications?.warn?.(error.message);}};
 globalThis.Hooks?.on?.('createChatMessage',message=>{if(!globalThis.game?.user?.isGM)return;void run(message);const origin=message.getOriginatingMessage?.();if(origin&&origin!==message&&origin.flags?.[SCOPE]?.elementalRequest?.kind==='earthPrison')setTimeout(()=>{void run(origin);},0);});
 globalThis.game?.socket?.on?.('system.Immortals-system',data=>{if(data?.action!=='elementalCompletion'||typeof data.messageUuid!=='string')return;if(globalThis.game?.user?.isGM)void Promise.resolve(globalThis.fromUuid?.(data.messageUuid)).then(run);});
 const render=(message,html)=>{const root=html?.querySelectorAll?html:html?.[0];if(!root||!message.flags?.[SCOPE]?.elementalRequest)return;if(globalThis.game?.user?.isGM&&!root.querySelector('[data-action="completeElementalRequest"]')){const button=root.ownerDocument.createElement('button');button.type='button';button.dataset.action='completeElementalRequest';button.textContent='Concluir efeito elemental';(root.querySelector('.message-content')??root).append(button);}for(const button of root.querySelectorAll('[data-action="completeElementalRequest"]')){button.hidden=!globalThis.game?.user?.isGM;button.disabled=message.flags?.[SCOPE]?.elementalExecution?.status==='complete';if(button.disabled)button.textContent='Efeitos concluídos';if(button.dataset.elementalBound)continue;button.dataset.elementalBound='1';button.addEventListener('click',async event=>{event.preventDefault();if(!globalThis.game?.user?.isGM)return;let confirmUncertain=false;if(message.flags?.[SCOPE]?.elementalExecution?.uncertain){confirmUncertain=await globalThis.foundry.applications.api.DialogV2.confirm({classes:['iw-dialog'],window:{title:'Conferir efeito pendente'},content:'<p>A tentativa anterior foi interrompida. Confira a ficha e os registros antes de retomar para evitar uma segunda aplicação.</p>',rejectClose:false});if(!confirmUncertain)return;}button.disabled=true;try{await executeElementalRequest({messageUuid:message.uuid},{confirmUncertain});}finally{button.disabled=message.flags?.[SCOPE]?.elementalExecution?.status==='complete';}});}};
 globalThis.Hooks?.on?.('renderChatMessageHTML',render);globalThis.Hooks?.on?.('renderChatMessage',render);
 // Requests survive reload and a previously absent GM. Rider receipts make completed targets no-ops.
 for(const message of globalThis.game?.messages?.contents??[]){if(!['construct','timeZone','reactionWindow'].includes(message.flags?.[SCOPE]?.elementalRequest?.kind)&&message.flags?.[SCOPE]?.elementalRequest&&message.flags?.[SCOPE]?.elementalExecution?.status!=='complete'&&globalThis.game?.user?.isGM)void run(message);}
}
