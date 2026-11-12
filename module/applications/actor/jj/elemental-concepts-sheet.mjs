import {setElementalTimeZoneOccupants,endElementalTimeZone} from '../../../systems/elemental-time-zones.mjs';
import {elementalTimeZones} from '../../../systems/elemental-local-time.mjs';
import {endElementalPrisonUpkeep,effectiveElementalPrison} from '../../../systems/elemental-prison-maintenance.mjs';
import {previewElementalRewind} from '../../../systems/elemental-history.mjs';
import {elementalPreparationState} from '../../../systems/elemental-calendar-effects.mjs';
import {elementalRecipientConstructs,planElementalConstructDamage} from '../../../systems/elemental-constructs.mjs';
import {elementalGrantSlots,validateElementalGrant,assignElementalGrant} from '../../../systems/elemental-technique-grants.mjs';
import {elementalCapabilityState} from "../../../systems/elemental-capabilities.mjs";
import {elementalFrostStacks,removeElementalFrost} from "../../../systems/elemental-attack-riders.mjs";
import {moveElementalOrbToMarker,positionExistingElementalOrbs} from '../../../systems/elemental-orbs.mjs';
import {elementalWoodHeartState,performElementalWoodHeartAction} from '../../../systems/elemental-wood-heart.mjs';
import {elementalSecondsPerDay} from '../../../systems/elemental-local-time.mjs';
import {reviewElementalIllusionRecognition} from '../../../systems/elemental-projections.mjs';
import {beginElementalTransit} from '../../../systems/elemental-travel.mjs';
import {elementalIllusionRecognition} from '../../../systems/elemental-perception.mjs';
import {configureElementalArea,elementalActorActionState} from '../../../systems/elemental-areas.mjs';
import {withElementalActorLock} from "../../../systems/elemental-runtime.mjs";
import {cultivationPointUpdates} from "../../../systems/cultivation.mjs";
import Ruleset from '../../../systems/ruleset.mjs';
import {cultivationPoints} from './cultivation-sheet.mjs';
import {CONCEITOS_ELEMENTOS,CONCEITO_POR_ID} from '../../../systems/elemental-concepts-data.mjs';
import {ELEMENT_ABILITIES} from '../../../systems/elemental-abilities-data.mjs';
import {conceptTrainingState,conceptTrainingUpdate,elementalAbilityState,elementalAbilityUpdate,elementalSpecialization,ELEMENTAL_ABILITY_LIMIT} from '../../../systems/elemental-concepts.mjs';
import {startGeneralTrainingUpdate,cultivationTalentExchange} from '../../../systems/elemental-training-time.mjs';
import {syncElementalFeatures} from '../../../systems/elemental-feature-sync.mjs';
import {NUMERIC_DAMAGE_TYPES} from '../../../systems/legacy2-resistances.mjs';
const scope='Immortals-system',labels={basico:'Básicos',intermediario:'Intermediários',avancado:'Avançados'};
const tiers=['Não aprendida','Inicial','Dominada','Perfeição'];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inlineAction='<svg class="iw-inline-action" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M7 3h10l5 9-5 9H7l-5-9Z"/></svg>';
const abilityHtml=html=>String(html??'').replaceAll('⬢',inlineAction);
const busy=new Set(),saved=actor=>actor.flags?.[scope]??{};
const effectLabels={dash:'Disparada',controlledFlames:'Chamas controladas',divineSenseActive:'Sentido Divino',barrier:'Barreira de Qi',haste:'Self Haste',windBarrier:'Barreira de Vento',bodyFluid:'Corpo Fluído',mindBreak:'Mind Break',darknessCloak:'Darkness Cloak',divineSense:'Visão Além do Alcance',windClones:'Clones de Vento',overlappingSpace:'Overlapping Space',environmentalBreathing:'Respiração elemental',darknessVortex:'Darkness Vortex',illusionDouble:'Illusion Double',eternalPrison:'Eternal Prison',lethargy:'Letargia — aplicar Vazio ao ataque escolhido'};
const ownedAbility=(actor,element,ability)=>Array.from(actor.items??[]).find(item=>{const f=item.flags?.[scope];return f?.elementalDerived&&f.elementalAbility?.elementId===element&&f.elementalAbility?.abilityId===ability;});

export function prepareElementalConceptsContext(context){
 const actor=this.actor,pt=cultivationPoints(actor),editable=!!this.isEditable&&!!actor.isOwner,flags=saved(actor);
 const groups=Object.entries(labels).map(([id,label])=>({id,label,elements:[]}));
 const selected=CONCEITO_POR_ID[this._elementSelected]?this._elementSelected:CONCEITOS_ELEMENTOS.find(e=>actor.system.conceitos?.[e.id]?.level>0)?.id??'madeira';
 this._elementSelected=selected;
 const elements=[];let count=0,unique=0;
 for(const definition of CONCEITOS_ELEMENTOS){
  const state=conceptTrainingState(actor,definition.id,{points:pt}),illuminated=conceptTrainingState(actor,definition.id,{points:pt,piSpent:Math.max(0,Number(actor.system.cultivation?.illumination)||0)});
  const resistance=Object.entries(definition.resistencia).map(([key,value])=>(NUMERIC_DAMAGE_TYPES.find(t=>t.key===key)?.label??key)+' +'+value+' por nível').join('; ');
  const abilities=ELEMENT_ABILITIES[definition.id].map(ability=>{
   const learned=elementalAbilityState(actor,definition.id,ability.id);if(learned.tier>0){count++;if(ability.level10)unique++;}
   const owned=ownedAbility(actor,definition.id,ability.id),automation=owned?.flags?.[scope]?.elementalAutomation;
   const activities=Array.from(owned?.system?.activities?.values?.()??Object.values(owned?.system?.activities??{})).map(activity=>{
    const costs=Array.from(activity.consumption?.targets??[]).map(t=>t.type==='attribute'&&t.target==='energy.generated'?t.value+' Qi Refinado':t.type==='attribute'&&t.target==='energy.total'?t.value+' Qi total':t.type==='itemUses'?(String(t.value).startsWith('-')?(ability.id==='lightOrbs'?'Repor orbes':'Repor usos'):Number.isFinite(Number(t.value))?t.value+(ability.id==='lightOrbs'?' orbe(s)':' uso(s)'):'Usos da habilidade'):'').filter(Boolean);
    const readiness=elementalCapabilityState(actor,definition.id,ability.id,{activity});
    if(readiness.costRange&&readiness.costRange.max>readiness.costRange.min)costs[0]=readiness.costRange.min+'–'+readiness.costRange.max+' PQ · '+(readiness.costRange.pool==='total'?'Qi total':'Qi Refinado');
    if(readiness.uses)costs.push(readiness.uses.available+'/'+readiness.uses.max+' usos');
    return {...readiness,id:activity.id??activity._id,itemId:owned.id??owned._id,name:activity.name,cost:costs.join(' · '),actions:Number(activity.activation?.value)||0,actionMarks:Array.from({length:Math.min(6,Math.max(0,Math.trunc(Number(activity.activation?.value)||0)))},()=>true)};
   });
   const capability=elementalCapabilityState(actor,definition.id,ability.id);
   return {...ability,...learned,capability,grants:elementalGrantSlots(actor,definition.id,ability.id).map(slot=>({...slot,canEdit:editable&&slot.active})),canAdvance:editable&&learned.canAdvance,canUndo:editable&&learned.canUndo,ownedId:owned?.id??owned?._id,activities,
    notes:[...(automation?.pending??[]),...(automation?.manual??[])],passive:learned.tier>0&&!activities.length&&capability.fullyAutomatic,
    tierLabel:ability.level10&&learned.tier?'Única':tiers[learned.tier],actionLabel:learned.tier===0?'Aprender':learned.tier===1?'Dominar':'Atingir perfeição',
    descriptions:[{label:ability.level10?'Habilidade única':'Inicial',html:abilityHtml(ability.desc),active:learned.tier>=1},...(ability.dominado?[{label:'Dominada',html:abilityHtml(ability.dominado),active:learned.tier>=2}]:[]),...(ability.perfeicao?[{label:'Perfeição',html:abilityHtml(ability.perfeicao),active:learned.tier>=3}]:[])]};
  });
  const element={...state,id:definition.id,label:definition.label,category:labels[definition.raridade],selected:selected===definition.id,resistance,abilities,
   canTrain:editable&&(state.canPrepare||illuminated.canPrepare),segments:Array.from({length:10},(_,i)=>i<state.level),spent:abilities[0].spent,available:abilities[0].available,
   hint:state.atMax?'Conceito completo.':state.reason||'Treinar para o nível '+state.nextLevel};
  elements.push(element);groups.find(g=>g.id===definition.raridade).elements.push(element);
 }
 const entries=Object.values(actor.system.conceitos??{}),focus=elementalSpecialization(actor),mode=flags.elementalState?.damageMode??'';
 const modeElements=[['fogo','qiFlamejante'],['relampago','qiEletrico'],['gelo','frioCongelante']].filter(([id,ability])=>(actor.system.elementAbilities?.[id]?.[ability]??0)>0);
 const prisonUpkeep=Object.values(flags.elementalPrisonUpkeep??{}).filter(entry=>entry.active&&!entry.pending).map(entry=>({...entry,label:entry.eternal?'Prisão eterna':'Prisão de gelo',permanent:entry.eternal||entry.investedQi>=500}));
 const timeZones=Object.values(flags.elementalCalendarEffects??{}).filter(r=>r.kind==='timeDilation'&&r.status!=='ended'&&r.expiresAt>(game.time?.worldTime??0)).map(r=>({...r,flowLabel:r.direction==='quick'?'Aceleração':'Desaceleração',occupantCount:r.memberActorUuids?.length??0,canManage:!!game.user?.isGM}));
 const localTime=elementalTimeZones(actor).filter(r=>(r.enteredAt??r.createdAt)<=(game.time?.worldTime??0)&&Math.min(r.expiresAt,r.leftAt??Infinity)>(game.time?.worldTime??0));
 context.elemental={orbs:flags.elementalOrbs?.orbs.filter(o=>o.active)??[],canPositionOldOrbs:!!game.user?.isGM&&!flags.elementalOrbs&&Number(actor.system?.elementAbilities?.luz?.lightOrbs)>0,illusions:Object.values(flags.elementalIllusions??{}).filter(r=>r.active&&r.expiresAt>(game.time?.worldTime??0)).map(r=>({...r,label:r.kind==='realisticIllusion'?'Ilusão Realista':'Mudança de Cenário'})),projections:Object.values(flags.elementalProjections??{}).filter(r=>r.active).map(r=>({...r,label:r.kind==='illusionDouble'?'Illusion Double':r.kind==='mindBreak'?'Mind Break':'Overlapping Space',tokenCount:r.tokenUuids?.length??0,canReview:!!game.user?.isGM&&['mindBreak','illusionDouble'].includes(r.kind)})),frozenReason:elementalActorActionState(actor).reason,canPlaceAreas:!!game.user?.isGM,vortexDebt:Number(flags.elementalRegionalVortex?.debt)||0,vortexPending:Object.values(flags.elementalRegionalVortex?.uses??{}).filter(r=>!r.applied).map(r=>({at:r.exhaustionAt})),constitutionDebt:Number(flags.elementalLongTerm?.massRecovery?.debt)||0,timeZones,localTimeLabel:localTime.length?'Dentro de uma zona temporal · compreensão de conceitos suspensa':null,prisonUpkeep,realms:Object.values(flags.elementalLongTerm?.realms??{}),history:Number(actor.system?.elementAbilities?.tempo?.rewind)>0?previewElementalRewind(actor):null,preparations:Object.entries(flags.elementalCalendarEffects??{}).filter(([,record])=>record.status!=='ended'&&record.kind!=='timeDilation').map(([key,record])=>({key,...record,...elementalPreparationState(record,game.time?.worldTime??0,{combatId:game.combat?.uuid??game.combat?.id,round:game.combat?.round}),label:({plantGrowth:'Crescimento de plantas',timeFreeze:'Time Freeze',spaceRip:'Space Rip',miniaturizeRealm:'Miniaturizar Reino'})[record.kind]??record.kind})),constructs:elementalRecipientConstructs(actor).map(record=>({...record,canDamage:!record.unresolved&&(game.user?.isGM||record.storageActorUuid===actor.uuid),canEnd:!record.unresolved&&!record.eternal&&(record.sourceActorUuid===actor.uuid||game.user?.isGM||record.kind==='bubble'),label:({bubble:"Bolha Versátil",earthSection:"Estrutura de Terra",earthPrison:"Prisão de Terra",icePrison:"Prisão de Gelo",icePillar:"Estrutura de Gelo",windDome:"Domo de Vento",lightGrid:"Grade de Luz"})[record.kind]??record.kind})),groups,elements,abilityGroups:elements,selected,pt,qi:actor.system.energy?.generated??0,illumination:actor.system.cultivation?.illumination??0,
  isNpc:actor.type==='npc',canGrant:editable&&!!globalThis.game?.user?.isGM,totalAbilities:count,maxAbilities:ELEMENTAL_ABILITY_LIMIT,uniqueAbilities:unique,editable,general:{days:0,...flags.generalTraining},
  focus:focus??'',focusOptions:CONCEITOS_ELEMENTOS.map(e=>({value:e.id,label:e.label,selected:focus===e.id})),
  modeOptions:[{value:'',label:'Dano original',selected:!modeElements.some(([id])=>id===mode)},...modeElements.map(([value])=>({value,label:CONCEITO_POR_ID[value].label,selected:mode===value}))],
  frost:elementalFrostStacks(actor),canRemoveFrost:editable&&elementalFrostStacks(actor)>0&&Number(actor.system.energy?.generated)>=1,
  activeEffects:Object.entries(effectLabels).flatMap(([key,label])=>{const value=flags.elementalState?.[key];if(!value||value.active===false||key==='eternalPrison'&&value.instanceId)return [];return [{key,label,value:key==='eternalPrison'?(value.eternal?'Eterna':(value.investedQi??0)+'/500 Qi'):value.pending?'Aguardando aplicação':value.remaining??value.value??(value.multiplier?'×'+value.multiplier:'Ativo')}];}),
  canExchange:editable&&pt>=10,spent:entries.reduce((s,e)=>s+(e.spentTrainingPoints??0),0),lost:entries.reduce((s,e)=>s+(e.lostTrainingPoints??0),0)};
 const heart=elementalWoodHeartState(actor);context.elemental.woodHeart={...heart,label:({prepared:'Núcleo preparado',regenerating:'Corpo em regeneração',spent:'Aguardando recriação do núcleo'})[heart.status],rebirthDays:Math.ceil((heart.rebirthRemaining??0)/elementalSecondsPerDay()),constitutionDays:Math.ceil(Math.max(0,(heart.constitutionRecoveryAt??0)-(game.time?.worldTime??0))/elementalSecondsPerDay())};
 context.elemental.runtimeCount=['activeEffects','orbs','illusions','projections','realms','preparations','timeZones','prisonUpkeep','constructs'].reduce((sum,key)=>sum+(context.elemental[key]?.length??0),context.elemental.history?1:0);
 return context;
}
async function runAction(sheet,task){
 if(!sheet.isEditable||!sheet.actor.isOwner||busy.has(sheet.actor.uuid))return;
 busy.add(sheet.actor.uuid);try{return await task();}catch(error){ui.notifications.warn(error.message);}finally{busy.delete(sheet.actor.uuid);}
}
async function train(sheet,target){return runAction(sheet,async()=>{
 const actor=sheet.actor,id=target.dataset.element,initial=conceptTrainingState(actor,id,{points:cultivationPoints(actor)});
 if(!initial.canPrepare&&!conceptTrainingState(actor,id,{points:cultivationPoints(actor),piSpent:Math.max(0,Number(actor.system.cultivation?.illumination)||0)}).canPrepare)throw new Error(initial.reason);
 const support=initial.supportRequired?'<fieldset><legend>Apoio ao treinamento</legend><p>A partir do 3º nível, use uma Matriz de Acúmulo de Qi ou Núcleo de Besta de '+escape(initial.element.label)+' de nível '+initial.nextLevel+'.</p><label>Recurso disponível<select name="supportKind"><option value="">Selecione</option><option value="matrix">Matriz elemental</option><option value="beastCore">Núcleo de Besta</option></select></label><label>Nível do recurso<input type="number" name="supportLevel" min="'+initial.nextLevel+'" max="'+initial.nextLevel+'" step="1" value="'+initial.nextLevel+'"></label><p>Informe o recurso que você e o narrador confirmaram disponível. Esta escolha não cria um item.</p></fieldset>':'';
 const choice=await foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Treinar '+initial.element.label},
  content:'<div class="standard-form"><p><strong>'+escape(initial.element.label)+'</strong>: nível '+initial.nextLevel+'.</p><p>'+initial.ptCost+' PC uma vez; '+initial.cost.qi+' Qi Refinado por dia; '+initial.cost.dias+' dia(s) em caso de sucesso. Uma falha consome apenas o dia atual.</p><p>Controle de Qi (Constituição), CD <strong>'+initial.cd+'</strong>. Somente atributo, proficiência e maestria: sem vantagens, bônus externos ou rerrolagens.'+(initial.failCount?' '+initial.failCount+' falha(s) acumulada(s).':'')+'</p>'+support+'<label>PI para reduzir a dificuldade <input type="number" name="piSpent" min="0" max="'+initial.illumination+'" step="1" value="0"></label><p>Cada PI reduz a CD em 3, até o mínimo de 1, e o custo em PC em 3. Qi e PI são gastos mesmo em uma falha.'+(initial.ptCost===0?' Após três falhas, este nível não consome mais PC.':'')+'</p></div>',
  buttons:[{action:'train',label:'Rolar Controle de Qi',default:true,callback:(_e,_b,d)=>({pi:Number(d.element.querySelector('[name="piSpent"]')?.value)||0,support:{kind:d.element.querySelector('[name="supportKind"]')?.value,level:Number(d.element.querySelector('[name="supportLevel"]')?.value),elementId:id}})},{action:'cancel',label:'Cancelar',type:'button',callback:()=>false}],rejectClose:false,close:()=>null});
 if(!choice||!sheet.isEditable||!actor.isOwner)return;
 const options={points:cultivationPoints(actor),piSpent:Number(choice.pi??0),expectedLevel:initial.level,support:choice.support,worldTime:globalThis.game?.time?.worldTime??0,ledgerPath:Ruleset.isV2()?'cultivation.spentTrainingPoints':'curseResources.spentTrainingPoints'};
 conceptTrainingUpdate(actor,id,{...options,rollTotal:0});const state=conceptTrainingState(actor,id,options);
 const result=await actor.rollSkill({skill:'arc',ability:'con',target:state.cd,legacy2:{elementalTraining:true},advantage:false,disadvantage:false,halflingLucky:false,reliableTalent:false},{configure:false},{data:{flavor:'Controle de Qi — '+initial.element.label+', nível '+initial.nextLevel+' (CD '+state.cd+')'}});
 const roll=Array.isArray(result)?result[0]:result;if(!roll||!sheet.isEditable||!actor.isOwner)return;
 const change=await withElementalActorLock(actor,'training:'+id,async()=>{
  if(!sheet.isEditable||!actor.isOwner)throw new Error('Você não pode editar esta ficha.');
  const result=conceptTrainingUpdate(actor,id,{...options,worldTime:game.time?.worldTime??0,points:cultivationPoints(actor),rollTotal:roll.total});
  if(Ruleset.isV2())Object.assign(result.updates,cultivationPointUpdates(actor,result.cost));
  await actor.update(result.updates);return result;
 });
 if(!change)return;if(change.success&&!change.pending)await syncElementalFeatures(actor);
 await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:'<p><strong>'+escape(actor.name)+'</strong>: '+escape(initial.element.label)+', nível '+change.nextLevel+' — '+(change.success?(change.pending?'teste bem-sucedido; treino em andamento':'treino concluído'):'falha no treino')+'. Resultado '+roll.total+' / CD '+change.cd+'. Custo inicial: '+change.cost+' PC e '+change.qiCost+' Qi Refinado'+(options.piSpent?', '+options.piSpent+' PI':'')+'.'+(change.pending?' Dias restantes: '+(change.days-1)+'. O calendário cobra somente Qi nos próximos dias.':'')+'</p>'});
});}
async function changeAbility(sheet,target,direction){return runAction(sheet,async()=>{
 const actor=sheet.actor,{element,ability}=target.dataset,initial=elementalAbilityState(actor,element,ability);
 if(direction==='undo'){
  if(!initial.canUndo)throw new Error(initial.undoReason);
  const confirmed=await foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Reduzir habilidade elemental'},content:'<p>Reduzir o grau de <strong>'+escape(initial.ability.name)+'</strong>? O ponto será devolvido ao conceito.</p>',rejectClose:false});
  if(!confirmed||!sheet.isEditable||!actor.isOwner)return;
  if(elementalAbilityState(actor,element,ability).tier!==initial.tier)throw new Error('A habilidade mudou. Abra a operação novamente.');
 }
 const result=elementalAbilityUpdate(actor,element,ability,{direction});await actor.update(result.updates);await syncElementalFeatures(actor);
});}
async function configureElementalGrant(sheet,target,create){return runAction(sheet,async()=>{
 const actor=sheet.actor,[elementId,abilityId]=String(target.dataset.slot).split(':'),slot=elementalGrantSlots(actor,elementId,abilityId).find(s=>s.id===target.dataset.slot);
 if(!slot?.active)throw Error('Esta vaga está indisponível no grau atual.');
 if(create){
  let kind=slot.maxGrade?'technique':'utility';
  if(slot.maxQi){kind=await foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:slot.label},content:'<p>'+escape(slot.requirement)+'</p><label>Tipo<select name="kind">'+(slot.maxGrade?'<option value="technique">Técnica de dano</option>':'')+'<option value="healing">Auxiliar de cura</option><option value="defense">Auxiliar de defesa</option><option value="utility">Auxiliar de utilidade</option></select></label>',buttons:[{action:'create',label:'Criar',default:true,callback:(_e,_b,d)=>d.element.querySelector('[name="kind"]').value},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});if(!kind)return;}
  const item=await actor.createEmbeddedDocuments('Item',[{name:slot.label+' — configurar',type:'spell',img:'systems/Immortals-system/assets/wuxia/tabs-neutras-v2/manual-de-cultivo.webp',system:{level:kind==='technique'?slot.maxGrade:0,method:'atwill'},flags:{[scope]:{elementalGrantOnly:true,elementalGrantDraft:slot.id,elementalTechnique:{nature:kind==='technique'?'attack':'support',purpose:kind==='technique'?'damage':kind}}}}]);
  item?.[0]?.sheet?.render(true);return;
 }
 const candidates=Array.from(actor.items??[]).filter(item=>item.type==='spell');if(!candidates.length)throw Error('Crie e configure uma técnica antes de vinculá-la.');
 const choice=await foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Vincular · '+slot.label},content:'<p>'+escape(slot.requirement)+'</p><label>Técnica<select name="technique">'+candidates.map(item=>{const v=validateElementalGrant(actor,slot.id,item);return '<option value="'+escape(item.id)+'">'+escape(item.name)+(v.valid?'':' — '+escape(v.reason))+'</option>';}).join('')+'</select></label>'+(elementId==='agua'?'<label>Finalidade da auxiliar<select name="purpose"><option value="healing">Cura</option><option value="defense">Defesa</option><option value="utility">Utilidade</option></select></label>':'')+'<p>Configure os custos e efeitos na própria técnica. Condições precisam estar incluídas na construção; a concessão não adiciona condições gratuitas.</p>',buttons:[{action:'link',label:'Vincular',default:true,callback:(_e,_b,d)=>({id:d.element.querySelector('[name="technique"]').value,purpose:d.element.querySelector('[name="purpose"]')?.value})},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
 if(!choice||!sheet.isEditable||!actor.isOwner)return;
 await withElementalActorLock(actor,'grant:'+slot.id,async()=>{const item=actor.items.get(choice.id);if(choice.purpose&&item)await item.update({['flags.'+scope+'.elementalTechnique']:{nature:'support',purpose:choice.purpose}});const result=await assignElementalGrant(actor,slot.id,item?.uuid);await actor.update(result.updates);});
 });}
export const elementalConceptActions={
 confirmWoodHeartDeath:function(){return runAction(this,()=>performElementalWoodHeartAction(this.actor,'confirmDeath'));},
 restoreWoodHeart:function(){return runAction(this,()=>performElementalWoodHeartAction(this.actor,'restore'));},
 reviewElementalProjectionRecognition:function(_e,target){return runAction(this,()=>reviewElementalIllusionRecognition(this.actor,{useId:target.dataset.projection}));},
 moveElementalOrb:function(_e,target){return runAction(this,()=>moveElementalOrbToMarker(this.actor,target.dataset.orb));},
 positionExistingElementalOrbs:function(){return runAction(this,()=>positionExistingElementalOrbs(this.actor));},
 beginElementalTransit:function(_e,target){return runAction(this,()=>beginElementalTransit(this.actor,target.dataset.job));},
 endElementalIllusion:function(_e,target){return runAction(this,async()=>{const id=target.dataset.illusion;if(saved(this.actor).elementalIllusions?.[id])await this.actor.update({['flags.'+scope+'.elementalIllusions.'+id+'.active']:false});});},
 reviewElementalIllusion:function(){return runAction(this,async()=>{if(!game.user.isGM)throw Error('Reconhecimento de ilusões é conferido pelo narrador.');const actors=Array.from(game.actors??[]).filter(a=>['character','npc'].includes(a.type));await foundry.applications.api.DialogV2.prompt({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Reconhecimento da ilusão · Narrador'},content:'<p>Conferência privada. Nenhum dado de observador oculto é enviado aos jogadores.</p>'+actors.map(a=>'<p><strong>'+escape(a.name)+'</strong> · '+({recognizes:'Reconhece a ilusão',affected:'Afetado pela ilusão',unknown:'Dados insuficientes; conferência manual'})[elementalIllusionRecognition(this.actor,a).outcome]+'</p>').join(''),ok:{label:'Fechar'},rejectClose:false});});},
 openElementalProjection:function(_e,target){const record=saved(this.actor).elementalProjections?.[target.dataset.projection];if(record?.kind==='illusionDouble'){const copy=fromUuidSync(record.actorUuid,{strict:false});if(copy?.isOwner)copy.sheet?.render(true);}},
 configureElementalArea:function(_e,target){return runAction(this,()=>configureElementalArea(this.actor,target.dataset.record,target.dataset.recordType));},
 configureElementalRealm:function(_e,target){return runAction(this,async()=>{
  const actor=this.actor,id=target.dataset.realm,record=saved(actor).elementalLongTerm?.realms?.[id];if(!record)return;
  const scenes=game.user?.isGM?Array.from(game.scenes??[]):[];
  const choice=await foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Configurar Reino Místico'},content:'<label>Nome<input name="name" value="'+escape(record.name??'Reino Místico')+'"></label><label>Descrição<textarea name="description" rows="4">'+escape(record.description)+'</textarea></label>'+(scenes.length?'<label>Cena<select name="scene"><option value="">Sem cena vinculada</option>'+scenes.map(scene=>'<option value="'+escape(scene.uuid)+'"'+(scene.uuid===record.sceneUuid?' selected':'')+'>'+escape(scene.name)+'</option>').join('')+'</select></label>':''),buttons:[{action:'save',label:'Salvar reino',default:true,callback:(_e,_b,d)=>({name:d.element.querySelector('[name="name"]').value,description:d.element.querySelector('[name="description"]').value,sceneUuid:d.element.querySelector('[name="scene"]')?.value})},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
  if(!choice)return;await withElementalActorLock(actor,'realm:'+id,async()=>{const current=saved(actor).elementalLongTerm?.realms?.[id];if(!current)return;await actor.update({['flags.'+scope+'.elementalLongTerm.realms.'+id]:{...current,name:String(choice.name).slice(0,120),description:String(choice.description).slice(0,4000),...(game.user?.isGM?{sceneUuid:choice.sceneUuid||null}:{})}});});
 });},
 damageElementalConstruct:function(_e,target){return runAction(this,async()=>{
  const record=elementalRecipientConstructs(this.actor).find(r=>r.id===target.dataset.construct);if(!record?.hp||record.unresolved)return;const owner=record.storageActorUuid===this.actor.uuid?this.actor:fromUuidSync(record.storageActorUuid,{strict:false});if(!owner||owner.isOwner===false&&!game.user.isGM)throw Error('O narrador precisa aplicar dano à integridade compartilhada.');
  const selection=await foundry.applications.api.DialogV2.wait({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Dano na estrutura'},content:'<p>Informe o dano de um ataque que atingiu a estrutura, usando a CR própria dela.</p><label>Dano<input type="number" name="damage" min="0" step="1" value="0"></label>'+(record.indestructibleBelowLevel?'<label>Nível normal do atacante<input type="number" name="level" min="1" max="30" step="1" value="1"></label>':''),buttons:[{action:'apply',label:'Aplicar à estrutura',default:true,callback:(_e,_b,d)=>({damage:Number(d.element.querySelector('[name="damage"]').value),level:Number(d.element.querySelector('[name="level"]')?.value??0)})},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});
  if(!selection||!Number.isInteger(selection.damage)||selection.damage<0)return;
  await withElementalActorLock(owner,'construct-damage:'+record.id,async()=>{const live=owner.flags[scope].elementalConstructs[record.id];const plan=planElementalConstructDamage(effectiveElementalPrison(live),[{type:'force',value:selection.damage}],{attackConstruct:true,sourceLevel:selection.level||undefined,worldTime:game.time?.worldTime??0});if(plan.pending)throw Error(plan.reason);await owner.update({['flags.'+scope+'.elementalConstructs.'+record.id]:plan.record});});
 });},
 endElementalTimeZone:function(_e,target){return runAction(this,async()=>{await endElementalTimeZone(this.actor,target.dataset.zone);});},
 editElementalTimeZone:function(_e,target){return runAction(this,async()=>{if(!game.user.isGM)throw Error('O narrador precisa confirmar os ocupantes no mapa.');const zone=this.actor.flags?.[scope]?.elementalCalendarEffects?.[target.dataset.zone];if(!zone)return;const actors=Array.from(new Map([this.actor,...Array.from(game.actors??[]),...Array.from(canvas.scene?.tokens??[],t=>t.actor).filter(Boolean)].map(actor=>[actor.uuid,actor])).values()).filter(actor=>['character','npc'].includes(actor.type));const selected=await foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-elemental-dialog'],window:{title:'Ocupantes da zona temporal'},content:'<p>Marque as criaturas dentro da área. Entradas e saídas passam a valer neste instante.</p>'+actors.map(actor=>'<label><input type="checkbox" name="occupant" value="'+escape(actor.uuid)+'" '+(zone.memberActorUuids?.includes(actor.uuid)?'checked':'')+'> '+escape(actor.name)+'</label>').join(''),buttons:[{action:'save',label:'Registrar ocupantes',default:true,callback:(_e,_b,d)=>Array.from(d.element.querySelectorAll('[name="occupant"]:checked'),input=>input.value)},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false});if(selected)await setElementalTimeZoneOccupants(this.actor,zone.id,actors.filter(actor=>selected.includes(actor.uuid)));});},
 endElementalPrisonUpkeep:function(_e,target){return runAction(this,async()=>{await endElementalPrisonUpkeep(this.actor,target.dataset.upkeep);});},
 endElementalConstruct:function(_e,target){return runAction(this,async()=>{const id=target.dataset.construct,record=elementalRecipientConstructs(this.actor).find(r=>r.id===id);if(!record||record.unresolved)return;const owner=record.storageActorUuid===this.actor.uuid?this.actor:fromUuidSync(record.storageActorUuid,{strict:false});if(!owner||owner.isOwner===false&&!game.user.isGM)throw Error('O narrador precisa encerrar esta estrutura compartilhada.');if(record.sourceActorUuid!==this.actor.uuid&&!game.user.isGM&&record.kind!=='bubble')throw Error('Somente o criador ou narrador pode encerrar esta estrutura.');const confirm=await foundry.applications.api.DialogV2.confirm({classes:['iw-dialog'],window:{title:'Encerrar estrutura'},content:'<p>Encerrar esta estrutura elemental?</p>',rejectClose:false});if(confirm)await withElementalActorLock(owner,'end-construct:'+id,async()=>{const live=effectiveElementalPrison(owner.flags?.[scope]?.elementalConstructs?.[id]??record);if(live.eternal)throw Error('Esta prisão se tornou eterna e não pode ser removida.');await owner.update({['flags.'+scope+'.elementalConstructs.'+id+'.active']:false});});});},
 createElementalGrant:function(_e,target){return configureElementalGrant(this,target,true);},
 assignElementalGrant:function(_e,target){return configureElementalGrant(this,target,false);},
 openElementalGrant:function(_e,target){const item=Array.from(this.actor.items??[]).find(i=>i.uuid===target.dataset.uuid);return item?.sheet?.render(true);},
 selectElementalConcept:function(_e,target){const id=target.dataset.element;if(!CONCEITO_POR_ID[id])return;this._elementSelected=id;const tab=this.element?.querySelector('.elemental-concepts-tab');if(!tab)return;for(const button of tab.querySelectorAll('[data-action="selectElementalConcept"]')){const active=button.dataset.element===id;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));}for(const pane of tab.querySelectorAll('[data-element-workspace]'))pane.hidden=pane.dataset.elementWorkspace!==id;},
 useIntegratedElementalAbility:function(_e,target){return runAction(this,async()=>{const item=this.actor.items?.get?.(target.dataset.itemId);if(!item?.flags?.[scope]?.elementalDerived)throw new Error('Esta habilidade ainda não está integrada à ficha.');const activity=item.system?.activities?.get?.(target.dataset.activityId);if(!activity?.use)throw new Error('Atividade elemental indisponível.');return await activity.use();});},
 removeElementalFrost:function(){return runAction(this,async()=>removeElementalFrost(this.actor,1));},
 trainElementalConcept:function(_e,t){return train(this,t);},advanceElementalAbility:function(_e,t){return changeAbility(this,t,'advance');},undoElementalAbility:function(_e,t){return changeAbility(this,t,'undo');},
 openElementalAbility:function(_e,t){const item=this.actor.items?.get?.(t.dataset.itemId);return item?.sheet?.render(true);},
 toggleGeneralElementalTraining:function(){return runAction(this,async()=>{await withElementalActorLock(this.actor,'general-training',async()=>this.actor.update(startGeneralTrainingUpdate(this.actor,!saved(this.actor).generalTraining?.active,{worldTime:game.time?.worldTime??0}))); });},
 exchangeCultivationTalent:function(){return runAction(this,async()=>{const confirmed=await foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Trocar PC por Talento de Qi'},content:'<p>Gastar 10 Pontos de Cultivo para receber uma escolha adicional de Talento de Qi?</p>',rejectClose:false});if(confirmed)await withElementalActorLock(this.actor,'talent-exchange',async()=>this.actor.update(cultivationTalentExchange(this.actor))); });},
 cancelElementalTraining:function(_e,t){return runAction(this,async()=>{const id=t.dataset.element;if(!saved(this.actor).elementalTrainingJobs?.[id])return;const confirmed=await foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Interromper treinamento'},content:'<p>Interromper este treinamento? O Qi e os PC já utilizados permanecem gastos.</p>',rejectClose:false});if(confirmed)await this.actor.update({['flags.'+scope+'.elementalTrainingJobs.-='+id]:null});});},
 endElementalEffect:function(_e,t){return runAction(this,async()=>{const key=t.dataset.effect;if(!Object.hasOwn(effectLabels,key))return;const state=saved(this.actor).elementalState?.[key];if(!state)return;const updates={['flags.'+scope+'.elementalState.-='+key]:null};if(key==='haste')updates['system.legacy2.actions.value']=Math.max(0,Number(this.actor.system.legacy2?.actions?.value??0)-Number(state.remaining??0));if(key==='illusionDouble'){const source=state.source??{};updates['flags.'+scope+'.elementalState.cooldowns.'+source.elementId+':'+source.abilityId+':double']={availableAt:(game.time?.worldTime??0)+30*86400,source};}await this.actor.update(updates);});}
};
export function bindElementalConceptsSheet(sheet){
 const tab=sheet.element.querySelector('.elemental-concepts-tab');if(!tab)return;
 sheet._elementOpenSections??=new Set();
 const tabs=Array.from(tab.querySelectorAll('[data-action="selectElementalConcept"]'));
 for(const button of tabs){if(button.dataset.keyboardBound)continue;button.dataset.keyboardBound='1';button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const current=tabs.indexOf(button),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+tabs.length)%tabs.length;tabs[next].focus();tabs[next].click();});}

 for(const details of tab.querySelectorAll('details[data-element-section]')){
  if(details.dataset.bound)continue;details.dataset.bound='1';details.open=sheet._elementOpenSections.has(details.dataset.elementSection);
  details.addEventListener('toggle',()=>{if(details.open)sheet._elementOpenSections.add(details.dataset.elementSection);else sheet._elementOpenSections.delete(details.dataset.elementSection);});
 }
 for(const select of tab.querySelectorAll('[data-element-setting]')){
  if(select.dataset.bound)continue;select.dataset.bound='1';select.addEventListener('change',()=>runAction(sheet,async()=>{
   const value=select.value,key=select.dataset.elementSetting;
   if(key==='focus'){
    if(value&&!CONCEITO_POR_ID[value])throw new Error('Especialização elemental inválida.');
    const preview={...sheet.actor,flags:{...sheet.actor.flags,[scope]:{...saved(sheet.actor),elementalSpecialization:value}}};
    if(value&&elementalSpecialization(preview)!==value)throw new Error('A especialização requer cultivar apenas o elemento escolhido.');
    await sheet.actor.update({['flags.'+scope+'.elementalSpecialization']:value});
   }else if(key==='mode'){
    const ids={fogo:'qiFlamejante',relampago:'qiEletrico',gelo:'frioCongelante'};
    if(value&&(!ids[value]||!(sheet.actor.system.elementAbilities?.[value]?.[ids[value]]>0)))throw new Error('Este modo de dano ainda não foi aprendido.');
    await sheet.actor.update({['flags.'+scope+'.elementalState.damageMode']:value});
   }
  }));
 }
}
