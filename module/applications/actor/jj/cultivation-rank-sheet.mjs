import {npcCultivationState,npcCultivationUpdate} from '../../../systems/npc-cultivation.mjs';
import {withElementalActorLock} from '../../../systems/elemental-runtime.mjs';
import {SOUL_PATH} from "../../../systems/caminhos-data.mjs";
import {soulLevel} from "../../../systems/soul-path.mjs";
import Ruleset from '../../../systems/ruleset.mjs';
import {cultivationRank,cultivationRankBenefits,meditationUpdate,illuminationGrantUpdate} from '../../../systems/cultivation-rank-benefits.mjs';
import {CULTIVATION_RANKS} from '../../../systems/cultivation-data.mjs';
const busy=new WeakSet();
const editable=sheet=>Ruleset.isV2()&&sheet.isEditable&&sheet.actor.isOwner&&!sheet.actor.limited;
async function resourceAction(sheet,kind) {
 const actor=sheet.actor,isGrant=kind==='illumination';
 if(!editable(sheet)||busy.has(actor)||(isGrant&&!game.user?.isGM))return;
 const rank=cultivationRank(actor),benefits=cultivationRankBenefits(rank);
 if(!isGrant&&!benefits.meditationQi)return;
 busy.add(actor);
 try{
  const title=isGrant?'Conceder Iluminação':'Meditar',label=isGrant?'PI concedidos pelo mestre':'Minutos de meditação';
  const result=await foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-cultivation-dialog'],modal:true,window:{title},
   content:'<p>'+(isGrant?'O bônus do reino é aplicado apenas à nova concessão.':'Recupere '+benefits.meditationQi+' Qi por bloco completo de 10 minutos, até o máximo. O Narrador acompanha o tempo.')+'</p><label>'+label+'<input type="number" name="rank-resource" min="1" step="1" value="'+(isGrant?1:10)+'"></label>',
   buttons:[{action:'confirm',label:isGrant?'Conceder PI':'Concluir meditação',default:true,callback:(_e,_b,dialog)=>({amount:Number(dialog.element.querySelector('[name="rank-resource"]').value)})},
    {action:'cancel',label:'Cancelar',type:'button',callback:()=>false}],rejectClose:false,close:()=>false});
  if(!result||!editable(sheet)||(isGrant&&!game.user?.isGM))return;
  if(cultivationRank(actor)!==rank)throw Error('O reino mudou. Abra a janela novamente.');
  if(!Number.isSafeInteger(result.amount)||result.amount<1)throw Error('Informe um valor inteiro positivo.');
  const change=isGrant?illuminationGrantUpdate(actor,result.amount):meditationUpdate(actor,result.amount);
  await actor.update(change.updates);
  ui.notifications.info(isGrant?change.received+' PI recebidos.':change.recovered+' Qi recuperados na meditação.');
 }catch(error){ui.notifications.warn(error.message);}finally{busy.delete(actor);}
}
export const rankBenefitActions={cultivationMeditate:function(){return resourceAction(this,'meditation');},cultivationGrantIllumination:function(){return resourceAction(this,'illumination');}};
export function npcCultivationRankOptions(actor){
 const value=npcCultivationState(actor).rank;
 return CULTIVATION_RANKS.map(realm=>({value:String(realm.rank),label:realm.name,selected:value===realm.rank}));
}
/** No name attribute: blank removes the optional flag instead of becoming Mortal (zero). */
export function npcSoulCultivationOptions(actor){
 const level=soulLevel(actor);return[{value:'',label:'Não definido',selected:level===null},{value:'0',label:'Sem cultivo da alma',selected:level===0},
  ...SOUL_PATH.map(step=>({value:String(step.level),label:step.level+' · '+step.name,selected:level===step.level}))];
}
/** Serialize edits so a fast stage change observes the realm that was just selected. */
export async function setNpcCultivation(sheet,change){
 const allowed=()=>editable(sheet)&&sheet.actor.type==='npc'&&(!sheet.actor.canUserModify||sheet.actor.canUserModify(globalThis.game?.user,'update'));
 if(!allowed())return false;
 return withElementalActorLock(sheet.actor,Symbol('npc-cultivation'),async()=>{
  if(!allowed())return false;
  await sheet.actor.update(npcCultivationUpdate(sheet.actor,change));return true;
 });
}
export function bindNpcCultivationRank(sheet){
 for(const [selector,field]of [['[data-npc-cultivation-level]','level'],['[data-npc-cultivation-rank]','rank'],['[data-npc-cultivation-stage]','stage'],['[data-npc-soul-cultivation]','soul']]){
  for(const input of sheet.element.querySelectorAll(selector)){
   if(input.dataset.rankBound)continue;input.dataset.rankBound='1';
   input.addEventListener('change',async event=>{
    event.stopPropagation();if(!editable(sheet)||sheet.actor.type!=='npc')return;
    const raw=input.value;
    try{
     if(field==='soul'){
      const value=Number(raw);if(raw!==''&&(!Number.isInteger(value)||value<0||value>10))return;
      await sheet.actor.update(raw===''?{'flags.Immortals-system.-=soulCultivation':null}:{'flags.Immortals-system.soulCultivation':value});
     }else await setNpcCultivation(sheet,{[field]:raw});
    }catch(error){
     if(field!=='soul')input.value=String(npcCultivationState(sheet.actor)[field]);
     globalThis.ui?.notifications?.warn?.(error.message);
    }
   });
  }
 }
}
