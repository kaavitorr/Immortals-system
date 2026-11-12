import Ruleset from '../../../systems/ruleset.mjs';
import {bodyLevel,bodyBenefits,bodyCureUpdate,bodyMaravilhasUpdate,bodyWoundRecovery} from '../../../systems/body-path.mjs';
import {rankInfo} from '../../../systems/cultivation-data.mjs';
const pending=new WeakMap(),busy=new WeakSet();
const editable=sheet=>Ruleset.isV2()&&sheet.isEditable&&sheet.actor.isOwner&&!sheet.actor.limited;
/** Remove only effects created by the superseded Body rules, never a manual effect. */
export async function ensureBodyPathEffects(actor){
 if(!Ruleset.isV2()||actor.type!=='character'||!actor.isOwner||actor.limited||actor.pack||actor.compendium)return;
 if(pending.has(actor))return pending.get(actor);
 const operation=(async()=>{
  const level=bodyLevel(actor),obsolete=Array.from(actor.effects??[]).filter(effect=>{
   const flags=effect.flags?.['Immortals-system']??{};
   if(['bodyLimite','bodyMaravilhas','bodyDor'].includes(flags.bodyEffect))return true;
   const tag=flags.cultivationAttribute;
   return tag==='body:limit'?level<4:/^body:\d+$/.test(tag??'')&&Number(tag.split(':')[1])>level;
  });
  if(obsolete.length)await actor.deleteEmbeddedDocuments('ActiveEffect',obsolete.map(effect=>effect.id),{render:false});
 })();pending.set(actor,operation);try{return await operation;}finally{pending.delete(actor);}
}
export function prepareBodyPathContext(sheet,context){
 const actor=sheet.actor,benefits=Ruleset.bodyBenefits(actor),flags=actor.flags?.['Immortals-system']??{};
 const combat=globalThis.game?.combat,id=combat?.uuid??combat?.id;
 const used=flags.bodyMaravilhas?.combat===id?Number(flags.bodyMaravilhas?.uses)||0:0;
 let cureReason='',maravilhasReason='';
 try{bodyCureUpdate(actor);}catch(error){cureReason=error.message;}
 try{bodyMaravilhasUpdate(actor);}catch(error){maravilhasReason=error.message;}
 const armor=benefits.naturalArmor;
 context.bodyTraining={...benefits,maravilhasRemaining:Math.max(0,3-used),
  woundShortPct:100*bodyWoundRecovery(actor,"short").rate,woundLongPct:100*bodyWoundRecovery(actor,"long").rate,
  basePending:benefits.lifeBaseBonus>0||benefits.qiBaseBonus>0,cureRemaining:Math.max(0,5-(Number(flags.bodyCureUses)||0)),
  limitChoicePending:benefits.level>=4&&!Array.from(actor.effects??[]).some(effect=>effect.flags?.['Immortals-system']?.cultivationAttribute==='body:limit'),
  canCure:editable(sheet)&&!cureReason,cureReason,canMaravilhas:editable(sheet)&&!maravilhasReason,maravilhasReason,
  armorLabel:armor?'Flexível '+armor.kind+' · '+(armor.rank>10?'acima de Divino':rankInfo(armor.rank).name):null};
 return context;
}
async function activate(sheet,kind){
 const actor=sheet.actor;if(!editable(sheet)||busy.has(actor))return;busy.add(actor);
 const prepare=kind==='cure'?bodyCureUpdate:bodyMaravilhasUpdate;
 try{
  prepare(actor);const level=bodyLevel(actor);
  const answer=await foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-cultivation-dialog'],modal:true,
   window:{title:kind==='cure'?'Portão da Cura':'Portão das Maravilhas'},
   content:kind==='cure'?'<p>Sacrifique <strong>1 Ponto de Ação</strong> para recuperar PV iguais à Constituição. Um uso por turno, até cinco por descanso longo.</p>':'<p>Seu deslocamento é triplicado neste turno. Apareça a <strong>1 metro</strong> de uma criatura dentro desse alcance e receba <strong>6 vantagens no próximo acerto</strong>. Até três usos por encontro.</p><p>Escolha o destino do deslocamento no campo de batalha.</p>',
   buttons:[{action:'confirm',label:'Ativar portão',default:true,callback:()=>true},{action:'cancel',label:'Cancelar',type:'button',callback:()=>false}],rejectClose:false,close:()=>false});
  if(!answer||!editable(sheet))return;
  if(bodyLevel(actor)!==level)throw Error('O nível do Corpo mudou. Abra o portão novamente.');
  const result=prepare(actor);await actor.update(result.updates);
  ui.notifications.info(kind==='cure'?result.healed+' PV recuperados.':'Maravilhas: movimento triplo e seis vantagens preparados para este turno.');
 }catch(error){ui.notifications.warn(error.message);}finally{busy.delete(actor);}
}
export const bodyPathActions={cultivationBodyCure:function(){return activate(this,'cure');},cultivationBodyMaravilhas:function(){return activate(this,'maravilhas');}};

/** Existing managed effects are reconciled before characters need to open their sheets. */
export function registerBodyPathMigration(hooks){
 hooks.once('ready',async()=>{
  if(!Ruleset.isV2()||!game.user?.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return;
  for(const actor of game.actors??[])try{await ensureBodyPathEffects(actor);}catch(error){console.error('Immortals Legacy | Caminho do Corpo',actor.id,error);}
 });
}
