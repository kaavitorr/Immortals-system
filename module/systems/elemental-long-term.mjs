import {soulDamageMaximum} from './soul-path.mjs';
import {elementalSecondsPerDay} from './elemental-local-time.mjs';
import {npcCultivationState} from './npc-cultivation.mjs';
const S='Immortals-system';
const integer=value=>Math.max(0,Math.trunc(Number(value)||0));
function progression(actor){if(actor?.type==='npc'){if(Object.hasOwn(actor.system?.legacy2??{},'nd'))return npcCultivationState(actor);const rank=Math.max(1,Math.min(10,integer(actor.flags?.[S]?.cultivationRank)));return{rank,stage:1,level:(rank-1)*3+1};}const rank=Math.min(10,Math.max(1,integer(actor.system?.cultivation?.rank))),stage=Math.min(3,Math.max(1,integer(actor.system?.cultivation?.stage)));return{rank,stage,level:(rank-1)*3+stage};}
/** A preview is data only. Permanent changes merge into the native paid actor batch after confirmation. */
export function previewElementalSacrifice(actor,ability){
 if(ability==='massRecovery'){if(actor?.isOwner===false||!['character','npc'].includes(actor?.type))throw Error('Sem permissão para esta ficha.');const constitution=Number(actor.system?.abilities?.con?.value);if(!Number.isFinite(constitution)||constitution<2)throw Error('Recuperação em Massa deve manter Constituição mínima de 1.');const debt=elementalMassRecoveryDebt(actor);return{version:1,ability,sourceActorUuid:actor.uuid,before:{constitution,debt},after:{constitution:constitution-1,debt:debt+1}};}
 if(ability!=='mysticalRealm')throw Error('O sacrifício desta habilidade ainda exige definição de regra.');
 if(actor?.isOwner===false||!['character','npc'].includes(actor?.type))throw Error('Sem permissão para esta ficha.');
 const before=progression(actor);if(before.rank<8)throw Error('Criar um Reino Místico exige Imperador Sagrado.');
 const level=before.level-2,after={level,rank:Math.ceil(level/3),stage:1+(level-1)%3};
 return{version:1,ability,sourceActorUuid:actor.uuid,before,after,qiCeiling:Number.isFinite(Number(actor.system?.energy?.max))?Number(actor.system.energy.max):null};
}
export function commitElementalSacrifice(preview,context,{actor,hpDelta=0}={}){
 if(!actor||actor.uuid!==preview.sourceActorUuid||actor.uuid!==context.sourceActorUuid||!context.requestId||!/^[a-zA-Z0-9_-]+$/.test(context.requestId))throw Error('Confirmação de sacrifício inválida.');
 if(preview.ability==='massRecovery'){const saved=actor.flags?.[S]?.elementalLongTerm?.massRecovery??{},existing=saved.receipts?.[context.requestId];if(existing)return{updates:{},record:existing,alreadyApplied:true};const fresh=previewElementalSacrifice(actor,'massRecovery');if(fresh.before.constitution!==preview.before.constitution||fresh.before.debt!==preview.before.debt)throw Error('Sua Constituição mudou; abra a prévia novamente.');const record={id:context.requestId,createdAt:context.worldTime??0,before:preview.before.constitution,after:preview.after.constitution},updates={['flags.'+S+'.elementalLongTerm.massRecovery.debt']:preview.after.debt,['flags.'+S+'.elementalLongTerm.massRecovery.receipts.'+context.requestId]:record};if(Number.isFinite(hpDelta)&&hpDelta<0){const hp=actor.system?.attributes?.hp,current=Number(hp?.value),maximum=soulDamageMaximum(actor);if(Number.isFinite(current)&&Number.isFinite(hp?.max))updates['system.attributes.hp.value']=Math.min(current,Math.max(0,maximum+hpDelta)+Math.max(0,current-maximum));}return{updates,record,alreadyApplied:false};}
 const existing=actor.flags?.[S]?.elementalLongTerm?.realms?.[context.requestId];if(existing)return{updates:{},record:existing,alreadyApplied:true};
 const fresh=previewElementalSacrifice(actor,preview.ability);if(fresh.before.level!==preview.before.level)throw Error('Seu cultivo mudou; abra a prévia novamente.');
 const record={version:1,id:context.requestId,kind:'mysticalRealm',sourceActorUuid:actor.uuid,originalCultivation:preview.before,qiCeiling:preview.qiCeiling,radiusKm:10000,createdAt:context.worldTime??0,sceneUuid:null,description:'',controllers:[actor.uuid]};
 const updates=actor.type==='npc'?{'system.legacy2.nd':String(preview.after.level)}:{'system.cultivation.rank':preview.after.rank,'system.cultivation.stage':preview.after.stage};
 updates['flags.'+S+'.elementalLongTerm.realms.'+record.id]=record;
 return{updates,record,alreadyApplied:false};
}

export function elementalMassRecoveryDebt(actor){return integer(actor.flags?.[S]?.elementalLongTerm?.massRecovery?.debt);}
export function elementalConstitutionDebt(actor){return elementalMassRecoveryDebt(actor)+Math.min(1,integer(actor.flags?.[S]?.elementalLongTerm?.woodHeart?.constitutionDebt));}
export function restoreElementalConstitutionDebt(actor){const previous=actor.system?._elementalConstitutionPrepared,field=actor.system?.abilities?.con;if(previous&&field?.value===previous.after)field.value=previous.before;if(actor.system)delete actor.system._elementalConstitutionPrepared;}
export function prepareElementalConstitutionDebt(actor){restoreElementalConstitutionDebt(actor);const field=actor.system?.abilities?.con,debt=elementalConstitutionDebt(actor);if(!field||!debt)return null;const before=Number(field.value),after=Math.min(before,Math.max(1,before-debt));field.value=after;return actor.system._elementalConstitutionPrepared={before,after,debt};}
export function elementalConstitutionView(actor,constitution){const view=Object.create(actor),system={...actor.system,abilities:{...actor.system.abilities,con:{...actor.system.abilities.con,value:constitution}}};Object.defineProperty(view,'system',{value:system,configurable:true});return view;}
export function elementalRestDebtUpdates(actor,{type='long',worldTime=globalThis.game?.time?.worldTime,secondsPerDay=elementalSecondsPerDay()}={}){const saved=actor.flags?.[S]?.elementalLongTerm?.massRecovery??{},debt=elementalMassRecoveryDebt(actor),day=Math.floor(worldTime/secondsPerDay);if(type!=='long'||!debt||!Number.isFinite(day)||Number.isFinite(saved.lastRecoveredDay)&&day<=saved.lastRecoveredDay)return{updates:{},remaining:debt,recovered:0,record:saved};const record={...saved,debt:debt-1,lastRecoveredDay:day};return{updates:{['flags.'+S+'.elementalLongTerm.massRecovery']:record},remaining:record.debt,recovered:1,record};}
