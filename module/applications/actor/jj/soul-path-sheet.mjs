import Ruleset from '../../../systems/ruleset.mjs';
import {soulLevel,soulBenefits,soulBarrierState,soulBarrierUpdate,soulWoundsState,soulWoundsUpdate,soulAvatarUpdate,soulChannelUpdate} from '../../../systems/soul-path.mjs';
const scope='Immortals-system',pending=new WeakMap(),busy=new WeakSet();
const editable=sheet=>Ruleset.isV2()&&sheet.isEditable&&sheet.actor.isOwner&&!sheet.actor.limited;
/** Reconcile only managed Soul effects; passive resistance and conditional saves are derived. */
export async function ensureSoulPathEffects(actor){
 if(!Ruleset.isV2()||actor.type!=='character'||!actor.isOwner||actor.limited||actor.pack||actor.compendium)return;
 if(pending.has(actor))return pending.get(actor);
 const operation=(async()=>{
  const level=soulLevel(actor)??0,effects=Array.from(actor.effects??[]),fixed=effects.filter(effect=>effect.flags?.[scope]?.soulEffect==='soulRev2');
  const obsolete=effects.filter(effect=>{const flags=effect.flags?.[scope]??{},tag=flags.cultivationAttribute;
   return flags.soulEffect==='soulRev3'||flags.soulEffect==='soulRev2'&&(level<3||effect!==fixed[0])
    ||/^soul:\d+$/.test(tag??'')&&Number(tag.split(':')[1])>level||/^soul:insight:[12]$/.test(tag??'')&&level<9;});
  if(obsolete.length)await actor.deleteEmbeddedDocuments('ActiveEffect',obsolete.map(effect=>effect.id),{render:false});
  if(level<3)return;
  const changes=[{key:'system.abilities.int.value',mode:2,value:'1'},{key:'system.abilities.wis.value',mode:2,value:'1'}];
  const existing=fixed[0];
  if(!existing){await actor.createEmbeddedDocuments('ActiveEffect',[{name:'Segunda Revolução da Alma',img:'systems/Immortals-system/icons/svg/conceitos/ilusao.svg',origin:actor.uuid,flags:{[scope]:{soulEffect:'soulRev2',soulPathVersion:1}},changes}],{render:false});return;}
  const current=Array.from(existing.changes??[],({key,mode,value})=>({key,mode,value:String(value)}));
  if(JSON.stringify(current)!==JSON.stringify(changes))await existing.update({name:'Segunda Revolução da Alma',changes},{render:false});
 })();pending.set(actor,operation);try{return await operation;}finally{pending.delete(actor);}
}
export function prepareSoulPathContext(sheet,context){
 const actor=sheet.actor,benefits=Ruleset.soulBenefits(actor),flags=actor.flags?.[scope]??{};
 const pendingChoice=[1,2].find(index=>!Array.from(actor.effects??[]).some(effect=>effect.flags?.[scope]?.cultivationAttribute==='soul:insight:'+index));
 context.soulTraining={...benefits,selectedChannel:flags.soulChannel??"",editable:editable(sheet),barrier:soulBarrierState(actor),wounds:soulWoundsState(actor),
  avatarActive:benefits.level>0&&!!flags.soulAvatar?.active,extraChoice:benefits.extraMentalChoices?pendingChoice:null,lastRest:flags.soulLastRest??null};
 return context;
}
async function avatar(sheet){
 const actor=sheet.actor;if(!editable(sheet)||busy.has(actor))return;busy.add(actor);
 try{
  const active=!!actor.flags?.[scope]?.soulAvatar?.active,level=soulLevel(actor);soulAvatarUpdate(actor,!active);
  const answer=await foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-cultivation-dialog'],modal:true,window:{title:active?'Recolher Avatar':'Manifestar Avatar da Alma'},
   content:active?'<p>Recolher o avatar não restitui a ação utilizada para manifestá-lo.</p>':'<p>Manifestar seu avatar consome <strong>1 Ponto de Ação</strong>. Ele é visível apenas a cultivadores de rank superior ou a outros cultivadores da alma.</p>',
   buttons:[{action:'confirm',label:active?'Recolher avatar':'Manifestar avatar',default:true,callback:()=>true},{action:'cancel',label:'Cancelar',type:'button',callback:()=>false}],rejectClose:false,close:()=>false});
  if(!answer||!editable(sheet))return;
  if(soulLevel(actor)!==level||!!actor.flags?.[scope]?.soulAvatar?.active!==active)throw Error('O avatar mudou. Abra a janela novamente.');
  await actor.update(soulAvatarUpdate(actor,!active));
 }catch(error){ui.notifications.warn(error.message);}finally{busy.delete(actor);}
}
async function save(sheet){
 if(!editable(sheet)||Ruleset.soulBenefits(sheet.actor).mentalDefense<1)return;
 const ability=await foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-cultivation-dialog'],modal:true,window:{title:'Defesa da mente e da alma'},content:'<p>Contra ataques à mente ou à alma, a Terceira Revolução concede <strong>+1 em Fortitude e Vontade</strong>. Escolha a salvaguarda exigida pelo efeito.</p>',
  buttons:[{action:'fortitude',label:'Fortitude',callback:()=> 'fortitude'},{action:'vontade',label:'Vontade',callback:()=> 'vontade'},{action:'cancel',label:'Cancelar',type:'button',callback:()=>false}],rejectClose:false,close:()=>false});
 if(!['fortitude','vontade'].includes(ability)||!editable(sheet)||Ruleset.soulBenefits(sheet.actor).mentalDefense<1)return;
 return sheet.actor.rollSavingThrow({ability,legacy2:{mindSoul:true}});
}
export const soulPathActions={cultivationSoulAvatar:function(){return avatar(this);},cultivationSoulDefense:function(){return save(this);}};
export function bindSoulPathSheet(sheet){
 const tab=sheet.element.querySelector('.cultivation-tab');if(!tab)return;
 const channel=tab.querySelector('[data-soul-channel]');if(channel&&!channel.dataset.soulBound){channel.dataset.soulBound='1';channel.disabled=!editable(sheet);channel.addEventListener('change',async event=>{event.stopPropagation();if(!editable(sheet))return;try{await sheet.actor.update(soulChannelUpdate(sheet.actor,channel.value));}catch(error){channel.value=sheet.actor.flags?.[scope]?.soulChannel??'';ui.notifications.warn(error.message);}});}
 for(const [selector,prepare,read]of [['[data-soul-barrier]',soulBarrierUpdate,a=>soulBarrierState(a).value],['[data-soul-wounds]',soulWoundsUpdate,a=>soulWoundsState(a).value]]){
  const input=tab.querySelector(selector);if(!input||input.dataset.soulBound)continue;input.dataset.soulBound='1';input.disabled=!editable(sheet);
  input.addEventListener('change',async event=>{event.stopPropagation();if(!editable(sheet))return;try{await sheet.actor.update(prepare(sheet.actor,input.value.trim()===''?NaN:Number(input.value)));}catch(error){input.value=read(sheet.actor);ui.notifications.warn(error.message);}});
 }
}
export function registerSoulPathMigration(hooks){
 hooks.once('ready',async()=>{if(!Ruleset.isV2()||!game.user?.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return;
  for(const actor of game.actors??[])try{await ensureSoulPathEffects(actor);}catch(error){console.error('Immortals Legacy | Caminho da Alma',actor.id,error);}
 });
}
