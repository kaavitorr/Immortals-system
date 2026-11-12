import Ruleset from './ruleset.mjs';
import {elementalConstitutionDebt,elementalConstitutionView} from './elemental-long-term.mjs';
import {elementalCalendarSubjects,elementalSecondsPerDay} from './elemental-local-time.mjs';
import {soulDamageMaximum} from './soul-path.mjs';
import {elementalWoodHeartQiDebt,elementalWoodHeartQiMaximum} from './elemental-wood-heart-state.mjs';
export {elementalWoodHeartQiDebt,elementalWoodHeartQiMaximum};

const S='Immortals-system',P='flags.'+S+'.elementalLongTerm.woodHeart';
const copy=value=>structuredClone(value);
const nonnegative=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const saved=actor=>actor?.flags?.[S]?.elementalLongTerm?.woodHeart;
const now=value=>{value??=globalThis.game?.time?.worldTime??0;if(!Number.isFinite(value))throw Error('O coração exige um horário válido do mundo.');return value;};
const statuses=new Set(['dead','jj-morto']);
const isDead=actor=>[...statuses].some(status=>actor.statuses?.has?.(status));
function permission(actor,user,{gm=false}={}){
 if(gm&&!user?.isGM)throw Error('O narrador precisa confirmar esta etapa do Coração de Madeira.');
 if(!actor||!['character','npc'].includes(actor.type)||actor.isOwner===false&&!user?.isGM||actor.canUserModify&&user&&!actor.canUserModify(user,'update'))throw Error('Sem permissão para atualizar esta criatura.');
}
function identity(actor,context){
 if(context?.sourceActorUuid!==actor.uuid||!/^[a-zA-Z0-9_-]+$/.test(context?.requestId??''))throw Error('Confirmação do Coração de Madeira inválida.');
}
function dayLength(calendar){const d=calendar?.days,n=Number(d?.hoursPerDay)*Number(d?.minutesPerHour)*Number(d?.secondsPerMinute);return n>0&&Number.isFinite(n)?n:elementalSecondsPerDay();}
/** A calendar anniversary uses the world's own year/leap-year conversion, not a fixed Earth year. */
function tenYears(at,calendar){
 if(calendar?.timeToComponents&&calendar?.componentsToTime){
  const date=calendar.timeToComponents(at),target={...date,year:Number(date.year)+10},months=calendar.months?.values;
  // Core conversion consumes the day of year. Rebuild it from the anniversary month and day.
  if(Array.isArray(months)&&Number.isInteger(date.month)&&date.month>=0&&date.month<months.length&&Number.isFinite(date.dayOfMonth)){
   const leap=calendar.isLeapYear?.(target.year)??false,lengths=months.map(month=>Number(leap?(month.leapDays??month.days):month.days));
   if(lengths.slice(0,date.month+1).every(length=>Number.isFinite(length)&&length>0)){
    target.dayOfMonth=Math.min(date.dayOfMonth,lengths[date.month]-1);
    target.day=lengths.slice(0,date.month).reduce((total,length)=>total+length,0)+target.dayOfMonth;
    target.leapYear=leap;
   }
  }
  const deadline=calendar.componentsToTime(target);if(Number.isFinite(deadline)&&deadline>at)return deadline;
 }
 const days=Number(calendar?.days?.daysPerYear);return at+10*(Number.isFinite(days)&&days>0?days:365)*dayLength(calendar);
}
function constitutionResources(actor,constitution){
 const view=elementalConstitutionView(actor,constitution),hp=actor.system?.attributes?.hp??{};
 const hpDelta=Ruleset.maxHitPoints(view)-Ruleset.maxHitPoints(actor);
 view.system.attributes={...actor.system?.attributes,hp:{...hp,max:nonnegative(hp.max)+hpDelta}};
 return{maximumHP:soulDamageMaximum(view),qiDelta:Ruleset.maxEnergy(view)-Ruleset.maxEnergy(actor)};
}

/** Read-only cost preview. Native activity consumption commits its returned debts in the same actor batch. */
export function previewElementalWoodHeart(actor,{user=globalThis.game?.user,worldTime,calendar=globalThis.game?.time?.calendar}={}){
 permission(actor,user);if(saved(actor))throw Error('Esta criatura já possui um núcleo de Coração de Madeira. Use o ciclo do coração existente.');
 if(!(Number(actor.system?.elementAbilities?.madeira?.coracaoMadeira)>0))throw Error('Coração de Madeira ainda não foi aprendido.');
 const constitution=Number(actor.system?.abilities?.con?.value),qiMaximum=Number(actor.system?.energy?.max),at=now(worldTime);
 if(!Number.isFinite(constitution)||constitution<2)throw Error('O sacrifício de 1 Constituição deve manter Constituição mínima de 1.');
 if(!Number.isFinite(qiMaximum)||qiMaximum<100)throw Error('Criar o coração exige sacrificar 100 Pontos de Qi máximo.');
 const resources=constitutionResources(actor,constitution-1);
 return{version:1,ability:'woodHeart',sourceActorUuid:actor.uuid,createdAt:at,constitutionRecoveryAt:tenYears(at,calendar),
  before:{constitution,qiMaximum,constitutionDebt:elementalConstitutionDebt(actor)},
  after:{constitution:constitution-1,qiMaximum:Math.max(0,qiMaximum+resources.qiDelta-100),maximumHP:resources.maximumHP},
  sacrifice:{qiMaximum:100,constitution:1},rebirthDays:30,manualLifespanFraction:0.01};
}
export function commitElementalWoodHeart(preview,context,{actor,user=globalThis.game?.user,calendar=globalThis.game?.time?.calendar}={}){
 permission(actor,user);identity(actor,context);
 const existing=saved(actor);if(existing?.id===context.requestId)return{updates:{},record:existing,alreadyApplied:true};
 if(!preview||preview.version!==1||preview.ability!=='woodHeart'||preview.sourceActorUuid!==actor.uuid)throw Error('Confirme a prévia do sacrifício antes de criar o coração.');
 const fresh=previewElementalWoodHeart(actor,{user,worldTime:now(context.worldTime),calendar});
 if(JSON.stringify(fresh.before)!==JSON.stringify(preview.before))throw Error('Sua Constituição ou Qi máximo mudou; abra a prévia novamente.');
 const record={version:1,id:context.requestId,status:'prepared',createdAt:fresh.createdAt,qiDebt:100,constitutionDebt:1,
  constitutionRecoveryAt:fresh.constitutionRecoveryAt,deaths:{},restorations:{},activeDeathId:null};
 const updates={[P]:record},hp=Number(actor.system?.attributes?.hp?.value),qi=Number(actor.system?.energy?.total);
 if(hp>fresh.after.maximumHP)updates['system.attributes.hp.value']=fresh.after.maximumHP;
 if(qi>fresh.after.qiMaximum)updates['system.energy.total']=fresh.after.qiMaximum;
 return{updates,record,alreadyApplied:false};
}
export async function confirmElementalWoodHeart(actor,options={}){
 const preview=previewElementalWoodHeart(actor,options),accepted=await globalThis.foundry.applications.api.DialogV2.confirm({
  classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],window:{title:'Criar Coração de Madeira'},rejectClose:false,
  content:'<p>Sacrificar <strong>100 Pontos de Qi máximo</strong> e <strong>1 Constituição</strong>.</p><p>Qi máximo: '+preview.before.qiMaximum+' → '+preview.after.qiMaximum+'. Constituição: '+preview.before.constitution+' → '+preview.after.constitution+'. A Constituição retorna após 10 anos do calendário do mundo, contados deste sacrifício.</p><p>Uma morte real, reconhecida pelo estado morto ou confirmada pelo narrador, consome o núcleo. O corpo renasce após 30 dias, com PV e Qi total completos.</p><p>O prazo de 1/100 da vida é conferido manualmente pelo narrador; a confirmação recria o núcleo e devolve apenas o máximo de Qi ainda sacrificado.</p>'});
 return accepted?preview:null;
}

/** Call after a freshly computed maximum. The marker also makes direct repeat preparation harmless. */
export function prepareElementalWoodHeartQiDebt(actor){
 const energy=actor.system?.energy;if(!energy)return null;
 const previous=actor.system._elementalWoodHeartQiPrepared;
 if(previous&&energy.max===previous.after)energy.max=previous.before;
 delete actor.system._elementalWoodHeartQiPrepared;
 const before=nonnegative(energy.max),debt=elementalWoodHeartQiDebt(actor),after=elementalWoodHeartQiMaximum(actor,before);
 energy.max=after;if(energy.total>after)energy.total=after;
 if(!debt)return null;return actor.system._elementalWoodHeartQiPrepared={before,after,debt};
}

/** Only the first activation sacrifices resources. A manually recreated nucleus reuses the same cycle. */
export function prepareElementalWoodHeartDeath(actor,{requestId,worldTime,user=globalThis.game?.user,confirmed=false,calendar=globalThis.game?.time?.calendar}={}){
 permission(actor,user,{gm:true});identity(actor,{requestId,sourceActorUuid:actor.uuid});const at=now(worldTime),old=saved(actor);
 if(old?.deaths?.[requestId])return{updates:{},record:old,operations:[],alreadyApplied:true};
 if(old?.status!=='prepared')throw Error('O coração precisa estar preparado para reconhecer uma nova morte.');
 if(!confirmed&&!isDead(actor))throw Error('Confirme uma morte real; chegar a zero PV não basta para considerar a criatura morta.');
 const record=copy(old);record.status='regenerating';record.activeDeathId=requestId;record.deaths??={};
 record.deaths[requestId]={id:requestId,confirmedAt:at,confirmedBy:user.id??null,rebirthAt:at+30*dayLength(calendar),rebornAt:null};
 return{updates:{[P]:record},record,operations:[],alreadyApplied:false};
}
export function elementalWoodHeartWorldUpdates(actor,{worldTime,user=globalThis.game?.user}={}){
 permission(actor,user,{gm:true});const at=now(worldTime),old=saved(actor),updates={},operations=[];
 if(!old)return{updates,operations,record:null};const record=copy(old);let changed=false,recovered=0;
 if(record.constitutionDebt>0&&Number.isFinite(record.constitutionRecoveryAt)&&at>=record.constitutionRecoveryAt){
  recovered=Math.min(1,record.constitutionDebt);record.constitutionDebt=0;record.constitutionRecoveredAt=at;changed=true;
 }
 const death=record.deaths?.[record.activeDeathId];
 if(record.status==='regenerating'&&death&&Number.isFinite(death.rebirthAt)&&at>=death.rebirthAt&&!Number.isFinite(death.rebornAt)){
  const resources=constitutionResources(actor,Number(actor.system?.abilities?.con?.value??1)+recovered);
  updates['system.attributes.hp.value']=resources.maximumHP;
  updates['system.energy.total']=Math.max(0,nonnegative(actor.system?.energy?.max)+resources.qiDelta);
  const ids=[],effectUpdates=[],removed=status=>statuses.has(status)||status==='unconscious'||status==='jj-inconsciente';
  for(const effect of actor.effects?.values?.()??actor.effects??[]){
   const id=effect.id??effect._id,all=Array.from(effect.statuses??[]);
   // Core unconscious conditions own implicit statuses; independent effects keep their incapacitation.
   const implicit=effect.type==='condition'&&effect.system?.type==='unconscious'&&all.includes('unconscious')?
    new Set(globalThis.CONFIG?.statusEffects?.unconscious?.statuses??globalThis.CONFIG?.DND5E?.conditionTypes?.unconscious?.statuses??[]):new Set();
   const remaining=all.filter(status=>!removed(status)&&!implicit.has(status));
   if(!id||remaining.length===all.length)continue;
   if(remaining.length||effect.changes?.length)effectUpdates.push({_id:id,statuses:remaining});else ids.push(id);
  }
  if(ids.length)operations.push({action:'delete',documentName:'ActiveEffect',parent:actor,ids});
  if(effectUpdates.length)operations.push({action:'update',documentName:'ActiveEffect',parent:actor,updates:effectUpdates});
  death.rebornAt=at;record.status='spent';changed=true;
 }
 if(changed)updates[P]=record;return{updates,operations,record,recoveredConstitution:recovered};
}
/** The GM attests the 1/100 lifespan deadline; no lifespan estimate or additional sacrifice is invented. */
export function prepareElementalWoodHeartRestoration(actor,{requestId,worldTime,user=globalThis.game?.user,confirmed=false}={}){
 permission(actor,user,{gm:true});identity(actor,{requestId,sourceActorUuid:actor.uuid});const at=now(worldTime),old=saved(actor);
 if(old?.restorations?.[requestId])return{updates:{},operations:[],record:old,restoredMaximum:0,alreadyApplied:true};
 if(old?.status!=='spent')throw Error('O núcleo precisa estar consumido e o corpo já recriado antes de confirmar o prazo manual.');
 if(!confirmed)throw Error('O narrador deve confirmar que o prazo manual de 1/100 da vida foi cumprido.');
 const record=copy(old),restoredMaximum=elementalWoodHeartQiDebt(actor);record.qiDebt=0;record.status='prepared';record.restorations??={};
 record.restorations[requestId]={id:requestId,at,confirmedBy:user.id??null,deathId:record.activeDeathId,restoredMaximum};record.activeDeathId=null;
 return{updates:{[P]:record},operations:[],record,restoredMaximum,alreadyApplied:false};
}
export function elementalWoodHeartState(actor,{user=globalThis.game?.user,worldTime}={}){
 const record=saved(actor),death=record?.deaths?.[record.activeDeathId],at=now(worldTime);
 return{exists:!!record,status:record?.status??'absent',prepared:record?.status==='prepared',regenerating:record?.status==='regenerating',awaitingManual:record?.status==='spent',
  qiSacrificed:elementalWoodHeartQiDebt(actor),constitutionSacrificed:Math.min(1,nonnegative(record?.constitutionDebt)),constitutionRecoveryAt:record?.constitutionRecoveryAt??null,
  rebirthAt:death?.rebirthAt??null,rebirthRemaining:death?Math.max(0,death.rebirthAt-at):null,
  canConfirmDeath:!!user?.isGM&&record?.status==='prepared',canRestore:!!user?.isGM&&record?.status==='spent',restoreMaximum:elementalWoodHeartQiDebt(actor)};
}
async function commit(actor,plan){
 if(!Object.keys(plan.updates).length&&!plan.operations?.length)return plan;
 if(!actor.performBulkUpdate)throw Error('A atualização conjunta do coração e da ficha não está disponível.');
 await actor.performBulkUpdate({actor:plan.updates,item:[],create:[],delete:[],operations:(plan.operations??[]).map(operation=>({...operation,elementalWoodHeart:true}))},{elementalWoodHeart:true});return plan;
}
export async function performElementalWoodHeartAction(actor,action,{user=globalThis.game?.user,worldTime,...options}={}){
 permission(actor,user,{gm:true});if(!['confirmDeath','restore'].includes(action))throw Error('Etapa do Coração de Madeira desconhecida.');
 const{withElementalActorLock}=await import('./elemental-runtime.mjs');
 return withElementalActorLock(actor,'wood-heart:'+action,async()=>{
  const state=elementalWoodHeartState(actor,{user,worldTime});if(action==='confirmDeath'&&!state.canConfirmDeath||action==='restore'&&!state.canRestore)return{updates:{},operations:[],alreadyApplied:true};
  const confirmed=options.confirmed===true||await globalThis.foundry.applications.api.DialogV2.confirm({classes:['dnd5e2','iw-dialog','iw-elemental-dialog'],rejectClose:false,
   window:{title:action==='confirmDeath'?'Confirmar morte real':'Recriar Coração de Madeira'},
   content:action==='confirmDeath'?'<p>Confirma que a criatura realmente morreu? O núcleo será consumido e o corpo renascerá após 30 dias do calendário do mundo com PV e Qi total completos.</p>':'<p>Confirma que transcorreu o prazo de <strong>1/100 da vida</strong>, conferido manualmente? O núcleo será preparado novamente e serão devolvidos <strong>'+state.restoreMaximum+' Pontos de Qi máximo</strong> ainda sacrificados. O saldo de Qi atual permanece como está.</p>'});
  if(!confirmed)return{updates:{},operations:[],cancelled:true};
  const requestId=globalThis.foundry?.utils?.randomID?.()??globalThis.crypto?.randomUUID?.()??'heart-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const prepare=action==='confirmDeath'?prepareElementalWoodHeartDeath:prepareElementalWoodHeartRestoration;
  return commit(actor,prepare(actor,{...options,requestId,worldTime:now(worldTime),user,confirmed:true}));
 });
}
function authority(){const user=globalThis.game?.user;if(!user?.isGM)return false;const active=globalThis.game?.users?.activeGM;return !active||active.id===user.id;}
/** Safe for world actors and synthetic token actors. Actor locks share the native activation queue. */
export async function advanceElementalWoodHeart(actor,{worldTime=globalThis.game?.time?.worldTime,user=globalThis.game?.user,calendar=globalThis.game?.time?.calendar}={}){
 permission(actor,user,{gm:true});if(!saved(actor))return null;const{withElementalActorLock}=await import('./elemental-runtime.mjs');
 return withElementalActorLock(actor,'wood-heart:world:'+now(worldTime),async()=>{
  const at=now(worldTime),old=saved(actor);
  if(old?.status==='prepared'&&isDead(actor)){
   const requestId='death-'+old.id+'-'+Object.keys(old.deaths??{}).length;
   await commit(actor,prepareElementalWoodHeartDeath(actor,{requestId,worldTime:at,user,calendar}));
  }
  return commit(actor,elementalWoodHeartWorldUpdates(actor,{worldTime:at,user}));
 });
}
export function registerElementalWoodHeartHooks(){
 if(registerElementalWoodHeartHooks.installed)return;registerElementalWoodHeartHooks.installed=true;
 const advance=actor=>{if(!authority()||!saved(actor))return;void advanceElementalWoodHeart(actor).catch(error=>{console.error('Immortals Legacy | Coração de Madeira',error);globalThis.ui?.notifications?.warn?.('Não foi possível atualizar o Coração de Madeira: '+error.message);});};
 globalThis.Hooks?.on?.('updateWorldTime',(_time,delta)=>{if(delta>0)for(const actor of elementalCalendarSubjects())advance(actor);});
 globalThis.Hooks?.on?.('updateActor',(actor,_delta,options={})=>{if(!options.elementalWoodHeart&&!options.elementalRewind&&!options.elementalHistoryInternal)advance(actor);});
 const effectChanged=(effect,options={})=>{if(!options.elementalWoodHeart&&!options.elementalRewind&&!options.elementalHistoryInternal)advance(effect.parent??effect.actor);};
 for(const type of ['createActiveEffect','deleteActiveEffect'])globalThis.Hooks?.on?.(type,(effect,options)=>effectChanged(effect,options));
 globalThis.Hooks?.on?.('updateActiveEffect',(effect,_change,options)=>effectChanged(effect,options));
 for(const actor of elementalCalendarSubjects())advance(actor);
}
