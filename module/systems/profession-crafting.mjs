import {professionRecipe} from './profession-material-recipes.mjs';
import {PROFESSION_PRODUCTS} from './profession-products-data.mjs';
import {professionProductDocument} from './profession-products-content.mjs';
import {professionCraftingPlan,qualityResult,professionLevel,treasureCraftingDC,BEAST_MAX_RANK_DIFFICULTIES} from './profession-crafting-rules.mjs';
import {PROFESSION_SCOPE,getProfessionDefinition} from './wuxia-professions.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
const scope=PROFESSION_SCOPE;
const canWrite=actor=>{if(!actor||actor.isOwner===false||actor.limited)throw Error('Você não tem permissão para alterar esta criatura.');};
const finite=value=>typeof value!=='boolean'&&value!==null&&value!==''&&Number.isFinite(Number(value));

/** Quantity is a batch result, never an effect applied on possession or creation. */
export function professionBatchQuantity(product,quality){
 if(product.kind!=='pill')return 1;
 const index=quality?.qualityIndex;
 if(!Number.isInteger(index)||index<0||index>3)throw Error('Defina a qualidade do lote.');
 if(['pilula-de-cura','pilula-de-recuperacao-de-qi'].includes(product.id))return 3+2*index;
 if(product.id==='pilula-de-limpeza-de-meridianos')return 1+index;
 if(product.id==='pilula-de-cura-de-veneno')return 3+3*index;
 return 1;
}

/** Manual corrections/certification are explicit and never spend progression resources. */
export function prepareProfessionConfigurationUpdate(actor,key,{level,certified=false,guild='',contribution=0}={}){
 canWrite(actor);getProfessionDefinition(key);
 if(!finite(level)||!Number.isInteger(Number(level))||Number(level)<0||Number(level)>10)throw Error('O nível profissional deve ser de 0 a 10.');
 if(!finite(contribution)||Number(contribution)<0)throw Error('Pontos de Contribuição inválidos.');
 const prefix='flags.'+scope+'.professions.'+key+'.';
 return {[prefix+'level']:Number(level),[prefix+'certified']:certified===true,[prefix+'guild']:String(guild??'').trim(),[prefix+'contribution']:Number(contribution)};
}

/** Native checks and one bulk commit; no price, ingredient or calendar conversion is presumed. */
export async function performProfessionCraft(actor,request,{
 rollSkill=async(subject,check,plan)=>{const result=await subject.rollSkill({skill:check.skill,ability:check.ability,target:plan.dc},{configure:false});const roll=Array.isArray(result)?result[0]:result;return roll?.total??null;},
 commit=async(subject,updates)=>{if(typeof subject.performBulkUpdate!=='function')throw Error('A gravação nativa de criações não está disponível.');return subject.performBulkUpdate(updates,{isEnergySystem:true});},
 randomID=()=>globalThis.foundry.utils.randomID(),now=()=>Date.now(),onProgress,shouldCancel=()=>false
}={}){
 canWrite(actor);
 const product=PROFESSION_PRODUCTS.find(entry=>entry.id===request?.productId);
 if(!product?.levels||product.kind==='tool')throw Error('Escolha uma receita de produto com nível definido.');
 if(request.prerequisitesConfirmed!==true)throw Error('Confirme os requisitos, ferramentas e materiais com o narrador.');
 return withElementalActorLock(actor,'profession-craft:'+product.id,async()=>{
  canWrite(actor);
  const recipe=professionRecipe(product.id,Number(request.level),request.element);
  if(recipe?.requiresElement)throw Error('Escolha o elemento desta receita antes de produzir.');
  const current=professionLevel(actor,product.profession),level=Number(request.level),advancement=level>current;
  const firstRecipe=request.firstRecipe??!actor.flags?.[scope]?.professions?.[product.profession]?.craftedLevels?.[product.id+'-'+level];
  let baseDC=request.baseDC;
  if(product.kind==='treasure')baseDC=treasureCraftingDC({equipmentLevel:level,equivalentLevel:request.materialLevel??level});
  const makePlan=()=>professionCraftingPlan(actor,{profession:product.profession,product,level,firstRecipe,advancement,baseDC});
  const plan=makePlan();
  if(plan.dc===null||plan.pending.includes('qualityDC'))throw Error('Confirme a CD desta receita antes de iniciar a criação.');
  if(!plan.pcAffordable)throw Error('Pontos de Cultivo (PC) insuficientes para esta tentativa.');
  if(plan.entry&&product.profession==='alchemy'&&Number(actor.system?.conceitos?.fogo?.level??0)<1)throw Error('O ingresso em Alquimia requer Conceito do Fogo de nível 1.');
  const totals=[],totalChecks=plan.checks.length+(plan.qualityCheck?1:0);
  // Presentation receives detached snapshots and cannot turn a completed transaction into a failure.
  const notify=async(phase,extra={})=>{if(typeof onProgress!=='function')return;try{await onProgress(structuredClone({phase,plan,completedChecks:totals.length,totalChecks,...extra}));}catch(error){console.warn('Immortals Legacy | Não foi possível atualizar o acompanhamento da criação.',error);}};
  const cancelled=async()=>{await notify('cancelled');return {cancelled:true,success:false,plan};};
  const attemptCheck=async(check,index,dc)=>{
   if(shouldCancel())return false;
   canWrite(actor);
   await notify('rolling',{index,check:{...check,dc}});
   if(shouldCancel())return false;
   canWrite(actor);
   const total=await rollSkill(actor,check,{...plan,dc});
   if(total===null||total===undefined||total===false||shouldCancel())return false;
   if(!finite(total))throw Error('O teste de criação não retornou um resultado válido.');
   totals.push({skill:check.skill,total:Number(total),dc});
   canWrite(actor);
   await notify('rolled',{index,check:{...check,dc},rollTotal:Number(total)});
   return !shouldCancel();
  };
  await notify('prepared');
  if(shouldCancel())return cancelled();
  for(const [index,check] of plan.checks.entries())if(!await attemptCheck(check,index,plan.dc))return cancelled();
  // Admission has its own Qi check. Pill quality still requires an actual Creation roll.
  if(plan.qualityCheck&&totals.every(check=>check.total>=check.dc)){
   if(!await attemptCheck(plan.qualityCheck,plan.checks.length,plan.qualityCheck.dc))return cancelled();
  }
  await notify('committing');
  if(shouldCancel())return cancelled();
  canWrite(actor);
  const fresh=makePlan();
  if(fresh.currentLevel!==current||fresh.dc!==plan.dc||fresh.qualityCheck?.dc!==plan.qualityCheck?.dc)throw Error('O ofício mudou durante os testes; revise a tentativa.');
  if(!fresh.pcAffordable)throw Error('Pontos de Cultivo (PC) insuficientes para concluir a tentativa.');
  const success=totals.every(check=>check.total>=check.dc);
  const quality=product.kind==='pill'&&success?qualityResult(totals.filter(check=>check.skill==='ani'),plan.qualityCheck?.dc??plan.dc,{method:'creation'}):{success,key:null,label:null,qualityIndex:null};
  const actorUpdates={},updates={actor:actorUpdates,create:[]},prefix='flags.'+scope+'.professions.'+product.profession+'.';
  if(plan.pcCost){actorUpdates['system.cultivation.points']=fresh.pcAvailable-plan.pcCost;actorUpdates['system.cultivation.spentTrainingPoints']=Math.max(0,Number(actor.system?.cultivation?.spentTrainingPoints)||0)+plan.pcCost;}
  const stamp=now(),record={productId:product.id,level,success,quality:quality.key,dc:plan.dc,totals,at:stamp,durationHours:plan.durationHours};
  actorUpdates[prefix+'lastCraft']=record;
  let quantity=0,documentId=null;
  if(success){
   if(advancement)actorUpdates[prefix+'level']=level;
   actorUpdates[prefix+'craftedLevels.'+product.id+'-'+level]=stamp;
   quantity=professionBatchQuantity(product,quality);
   if(request.quantity!==undefined){if(!finite(request.quantity)||!Number.isInteger(Number(request.quantity))||Number(request.quantity)<1||Number(request.quantity)>quantity)throw Error('A quantidade excede o limite deste lote.');quantity=Number(request.quantity);}
   const element=typeof request.element==='string'&&request.element.trim()?request.element.trim():undefined;
   const doc=professionProductDocument(product.id,{level,quality:product.kind==='pill'?quality.key:null,element});
   documentId=randomID();doc._id=documentId;doc.folder=null;doc.system.quantity=quantity;
   doc.flags[scope].professionProductManaged=false;doc.flags[scope].professionCraft=record;
   doc._stats={compendiumSource:'Compendium.Immortals-system.equipamentos.Item.'+professionProductDocument(product.id)._id};
   updates.create.push(doc);
  }
  canWrite(actor);
  await commit(actor,updates);
  await notify('complete',{success,quality,quantity,documentId});
  return {success,quality,quantity,plan,product,totals,documentId,updates};
 });
}

/** The narrator confirms the completed taming work; this final test does not create an NPC. */
export async function performBeastProfessionAdvancement(actor,request,options={}){
 canWrite(actor);
 if(request?.prerequisitesConfirmed!==true||request?.creationConfirmed!==true)throw Error('Confirme a criação, os requisitos e todo o tempo de doma com o narrador.');
 return withElementalActorLock(actor,'profession-beast-advancement',async()=>{
  canWrite(actor);
  const current=professionLevel(actor,'beasts'),target=current+1;
  if(target>10||request.currentRank!==target)throw Error('A criação deve corresponder ao próximo nível profissional.');
  if(!Number.isInteger(request.maxRank)||request.maxRank<target||request.maxRank>10||request.adult===true)throw Error('Confirme o potencial de uma besta que ainda não seja adulta.');
  const baseDC=BEAST_MAX_RANK_DIFFICULTIES[request.maxRank-1];
  const product={id:'doma-de-besta',profession:'beasts',levels:{min:1,max:10},dc:{min:baseDC,max:baseDC}};
  const quote=()=>professionCraftingPlan(actor,{profession:'beasts',product,level:target,advancement:true});
  const plan=quote();
  if(!plan.pcAffordable)throw Error('Pontos de Cultivo (PC) insuficientes.');
  const nativeRoll=async(subject,check,p)=>{const result=await subject.rollSkill({skill:check.skill,ability:check.ability,target:p.dc},{configure:false});return (Array.isArray(result)?result[0]:result)?.total??null;};
  const total=await (options.rollSkill??nativeRoll)(actor,plan.checks[0],plan);
  if(total===null||total===undefined||total===false)return {cancelled:true,success:false,plan};
  if(!finite(total))throw Error('O teste não retornou um resultado válido.');
  canWrite(actor);if(professionLevel(actor,'beasts')!==current)throw Error('O nível profissional mudou durante o teste.');
  const fresh=quote();if(fresh.dc!==plan.dc)throw Error('A dificuldade mudou durante o teste; revise a tentativa.');
  if(!fresh.pcAffordable)throw Error('Pontos de Cultivo (PC) insuficientes.');
  const success=Number(total)>=plan.dc,prefix='flags.'+scope+'.professions.beasts.',updates={actor:{
   'system.cultivation.points':fresh.pcAvailable-plan.pcCost,
   'system.cultivation.spentTrainingPoints':Math.max(0,Number(actor.system?.cultivation?.spentTrainingPoints)||0)+plan.pcCost,
   [prefix+'lastAdvancement']:{targetLevel:target,currentRank:request.currentRank,maxRank:request.maxRank,total:Number(total),dc:plan.dc,success,at:(options.now??Date.now)()}
  }};
  if(success)updates.actor[prefix+'level']=target;
  const nativeCommit=async(subject,data)=>{if(typeof subject.performBulkUpdate!=='function')throw Error('A gravação nativa não está disponível.');return subject.performBulkUpdate(data,{isEnergySystem:true});};
  await (options.commit??nativeCommit)(actor,updates);
  return {success,total:Number(total),plan,updates};
 });
}
