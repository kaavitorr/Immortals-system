import {elementalConceptTrainingBlocked} from './elemental-local-time.mjs';
import {destinyModifiers} from './cultivation-destiny.mjs';
import {constitutionTrainingModifiers,constitutionStudyUpdates} from './constitution-rules.mjs';
import {essenceAffinityCost} from "./beast-essence-rules.mjs";
import {cultivationRank, rankTrainingDifficultyReduction} from "./cultivation-rank-benefits.mjs";
import {CONCEITOS_ELEMENTOS,CONCEITO_POR_ID,custoConceito} from './elemental-concepts-data.mjs';
import {ELEMENT_ABILITIES} from './elemental-abilities-data.mjs';
import {startElementalTrainingJob} from './elemental-training-time.mjs';
const integer=(value,min=0,max=Infinity)=>Math.min(max,Math.max(min,Math.trunc(Number(value)||0)));
const scope='Immortals-system';
const flags=actor=>actor?.flags?.[scope]??{};
export const ELEMENTAL_ABILITY_LIMIT=10;
export const ELEMENTAL_TRAINING_POOL='generated';
const savedTier=(saved,ability)=>integer(saved?.[ability.id],0,ability.level10?1:3);

/** A single-element specialization cannot silently grant early mastery to multiple concepts. */
export function elementalSpecialization(actor){
 const focus=flags(actor).elementalSpecialization;
 if(!CONCEITO_POR_ID[focus])return null;
 if(Object.entries(actor.system?.conceitos??{}).some(([id,value])=>id!==focus&&integer(value?.level)>0))return null;
 if(Object.entries(actor.system?.elementAbilities??{}).some(([id,value])=>id!==focus&&Object.values(value??{}).some(tier=>integer(tier)>0)))return null;
 return focus;
}
export function elementalTrainingSupport(id,nextLevel,support){
 return nextLevel<=2||!!support&&['matrix','beastCore'].includes(support.kind)&&support.elementId===id&&Number.isInteger(support.level)&&support.level===nextLevel&&support.level<=10;
}
/** The same requirements drive the displayed button and final resource transaction. */
export function conceptTrainingState(actor,id,{points=0,piSpent=0,support}={}) {
 const element=CONCEITO_POR_ID[id];if(!element)throw new Error('Conceito elemental inválido.');
 const data=actor.system.conceitos?.[id]??{},level=integer(data.level,0,10),nextLevel=level+1,atMax=level>=10;
 let cost=atMax?null:custoConceito(id,nextLevel);
 // Lorde Divino changes resource/time costs, while rarity's difficulty remains explicit.
 if(cost&&(cultivationRank(actor)??0)>=6&&element.raridade==='intermediario'){
  const basic=custoConceito({...element,raridade:'basico',adicionais:{}},nextLevel);cost={...cost,qi:basic.qi,dias:basic.dias,pt:basic.pt};
 }
 const constitution=constitutionTrainingModifiers(actor,id,nextLevel);
 if(cost&&constitution.basicCosts){const basic=custoConceito({...element,raridade:'basico',adicionais:{}},nextLevel);cost={...cost,qi:basic.qi,cd:basic.cd,pt:basic.pt};}
 if(cost)cost=essenceAffinityCost(actor,id,nextLevel,cost);
 if(cost)cost={...cost,pt:constitution.freePC?0:Math.floor(cost.pt*constitution.pcFactor),qi:Math.max(1,Math.floor(cost.qi*constitution.qiFactor)),dias:Math.max(1,Math.floor(cost.dias*constitution.timeFactor)),cd:Math.max(1,Math.floor(cost.cd*constitution.cdFactor))};
 const failCount=integer(data.failures?.[nextLevel]),ptCost=failCount>=3?0:Math.max(0,(cost?.pt??0)-integer(piSpent)*3);
 const bodyReduction=integer(actor.system.cultivation?.bodyCultivation)>=7?4:0;
 const cd=cost?Math.max(1,cost.cd-bodyReduction-rankTrainingDifficultyReduction(actor,nextLevel)-destinyModifiers(actor).elementTrainingCDReduction-integer(piSpent)*3):0;
 const qi=integer(actor.system.energy?.[ELEMENTAL_TRAINING_POOL]),available=integer(points),illumination=integer(actor.system.cultivation?.illumination);
 const saved=flags(actor),job=saved.elementalTrainingJobs?.[id],day=integer(saved.elementalTrainingDay),attempt=saved.elementalTrainingAttempts?.[id];
 const supportRequired=nextLevel>=3&&!atMax&&!constitution.ignoreCore,supportValid=constitution.ignoreCore||elementalTrainingSupport(id,nextLevel,support);
 const missingSupport='Informe uma Matriz de Acúmulo de Qi ou Núcleo de Besta do mesmo elemento e nível-alvo.';
 const reason=(cultivationRank(actor)??0)<2?'Requer Formação de Núcleo.':atMax?'Conceito no nível máximo.':job?'Treinamento em andamento; aguarde os dias restantes.':saved.generalTraining?.active?'Encerre o treinamento geral antes de treinar conceitos.':(saved.elementalTrainingBlocked||elementalConceptTrainingBlocked(actor))?'Não é possível compreender conceitos nesta área de dilatação temporal.':attempt&&integer(attempt.day)===day?'Aguarde o próximo dia para treinar este elemento novamente.':cost?.essenceAffinityPending?'O desconto da afinidade da essência aguarda definição de arredondamento.':qi<cost.qi?'Qi Refinado insuficiente.':available<ptCost?'PC insuficientes.':!supportValid?missingSupport:'';
 return {element,data,level,nextLevel,atMax,cost,constitution,ptCost,failCount,bodyReduction,cd,qi,available,illumination,job,supportRequired,supportValid,day,
  canTrain:!reason,canPrepare:!reason||reason===missingSupport,reason};
}

/** First-day Qi/PC are charged once; earned levels wait for the actual calendar duration. */
export function conceptTrainingUpdate(actor,id,{points=0,rollTotal,piSpent=0,expectedLevel,support,worldTime=0,ledgerPath='cultivation.spentTrainingPoints'}={}) {
 if(!Number.isInteger(piSpent)||piSpent<0||piSpent>integer(actor.system.cultivation?.illumination))throw new Error('Quantidade de PI inválida.');
 const state=conceptTrainingState(actor,id,{points,piSpent,support});
 if(expectedLevel!==undefined&&state.level!==expectedLevel)throw new Error('O nível do conceito mudou durante o treino. Abra o treino novamente.');
 if(!state.canTrain)throw new Error(state.reason);
 if(!Number.isFinite(rollTotal))throw new Error('Resultado do teste de Controle de Qi inválido.');
 const success=rollTotal>=state.cd,pending=success&&state.cost.dias>1,failures={...(state.data.failures??{})};
 if(success)delete failures[state.nextLevel];else failures[state.nextLevel]=state.failCount+1;
 const entry={...state.data,level:success&&!pending?state.nextLevel:state.level,unlocked:success&&!pending||!!state.data.unlocked||state.level>0,failures,
  spentTrainingPoints:integer(state.data.spentTrainingPoints)+(success?state.ptCost:0),lostTrainingPoints:integer(state.data.lostTrainingPoints)+(success?0:state.ptCost)};
 const previous=ledgerPath.split('.').reduce((value,key)=>value?.[key],actor.system);
 const updates={['system.conceitos.'+id]:entry,['system.energy.'+ELEMENTAL_TRAINING_POOL]:state.qi-state.cost.qi,'system.cultivation.illumination':state.illumination-piSpent,['system.'+ledgerPath]:integer(previous)+state.ptCost,
  ['flags.'+scope+'.elementalTrainingAttempts.'+id]:{day:state.day,worldTime,targetLevel:state.nextLevel,success}};
 Object.assign(updates,constitutionStudyUpdates(actor,state.constitution.claims));
 if(pending)Object.assign(updates,startElementalTrainingJob(actor,id,{targetLevel:state.nextLevel,totalDays:state.cost.dias,qiPerDay:state.cost.qi,pool:ELEMENTAL_TRAINING_POOL,worldTime}));
 return {success,pending,cost:state.ptCost,qiCost:state.cost.qi,cd:state.cd,days:success?state.cost.dias:1,nextLevel:state.nextLevel,updates};
}

export function elementalAbilityState(actor,elementId,abilityId) {
 const list=ELEMENT_ABILITIES[elementId],ability=list?.find(a=>a.id===abilityId);
 if(!ability)throw new Error('Habilidade elemental inválida.');
 const all=actor.system.elementAbilities??{},saved=all[elementId]??{},tier=savedTier(saved,ability),maxTier=ability.level10?1:3,nextTier=tier+1;
 const level=integer(actor.system.conceitos?.[elementId]?.level,0,10),rank=integer(cultivationRank(actor),0,10);
 const spent=list.reduce((sum,a)=>sum+savedTier(saved,a),0),available=Math.max(0,level-spent);
 const count=Object.entries(ELEMENT_ABILITIES).reduce((sum,[key,abilities])=>sum+abilities.filter(a=>savedTier(all[key],a)>0).length,0);
 const dominated=list.filter(a=>!a.level10).every(a=>savedTier(saved,a)>=2);
 const focus=elementalSpecialization(actor);
 const requiredRank=Math.max(1,(ability.level10?2:nextTier===2?4:nextTier===3?6:2)-(focus===elementId?1:0));
 const uniqueCount=Object.entries(ELEMENT_ABILITIES).reduce((sum,[key,abilities])=>sum+abilities.filter(a=>a.level10&&savedTier(all[key],a)>0).length,0);
 let reason='';
 if(tier>=maxTier)reason='Habilidade no grau máximo.';
 else if(level===0)reason='Treine este conceito primeiro.';
 else if(tier===0&&count>=ELEMENTAL_ABILITY_LIMIT)reason='Limite de 10 habilidades elementais atingido.';
 else if(available<1)reason='Pontos deste conceito esgotados.';
 else if(ability.level10&&uniqueCount>0)reason='Só é possível aprender uma habilidade única de nível 10.';
 else if(ability.level10&&level<10)reason='Requer conceito no nível 10.';
 else if(ability.level10&&!dominated)reason='Requer todas as outras habilidades deste elemento dominadas.';
 else if(rank<requiredRank)reason='Requer reino de cultivo '+requiredRank+'.';
 const hasUnique=list.some(a=>a.level10&&savedTier(saved,a)>0);
 const undoReason=tier===0?'Habilidade ainda não aprendida.':!ability.level10&&tier<=2&&hasUnique?'Reduza primeiro a habilidade de nível 10 deste elemento.':'';
 return {ability,elementId,tier,maxTier,nextTier,level,rank,spent,available,count,requiredRank,canAdvance:!reason,reason,canUndo:!undoReason,undoReason};
}

export function elementalAbilityUpdate(actor,elementId,abilityId,{direction='advance'}={}) {
 const state=elementalAbilityState(actor,elementId,abilityId);
 if(!['advance','undo'].includes(direction))throw new Error('Operação de habilidade inválida.');
 if(direction==='advance'&&!state.canAdvance)throw new Error(state.reason);
 if(direction==='undo'&&!state.canUndo)throw new Error(state.undoReason);
 const next=direction==='advance'?state.nextTier:state.tier-1,entry={...(actor.system.elementAbilities?.[elementId]??{})};
 if(next>0)entry[abilityId]=next;else delete entry[abilityId];
 return {tier:next,updates:{['system.elementAbilities.'+elementId]:entry}};
}

/** Numeric resistance is derived at its shared display/application boundary, never written over a manual value. */
export function conceptResistanceBonuses(concepts={}) {
 const result={};for(const element of CONCEITOS_ELEMENTOS){const level=integer(concepts[element.id]?.level,0,10);if(!level)continue;for(const [type,perLevel]of Object.entries(element.resistencia))result[type]=(result[type]??0)+level*perLevel;}return result;
}
