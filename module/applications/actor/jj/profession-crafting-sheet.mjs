import {craftWorkbenchContent,openProfessionCraftWorkbench} from './profession-crafting-workbench.mjs';
import {PROFESSION_PRODUCTS,PROFESSION_GUIDES} from '../../../systems/profession-products-data.mjs';
import {professionProductDocument} from '../../../systems/profession-products-content.mjs';
import {performBeastProfessionAdvancement,prepareProfessionConfigurationUpdate} from '../../../systems/profession-crafting.mjs';
import {professionLevel,toxinState,toxinStateUpdate,detoxPeriod,beastDomesticationPlan,beastGrowthMultiplier} from '../../../systems/profession-crafting-rules.mjs';
import {CULTIVATION_RANKS} from '../../../systems/cultivation-data.mjs';
import {withElementalActorLock} from '../../../systems/elemental-runtime.mjs';
import {professionDifficultyReduction} from '../../../systems/cultivation-rank-benefits.mjs';
const scope='Immortals-system';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const keyOf=target=>target.dataset.profession??target.closest?.('[data-profession]')?.dataset.profession;
const editable=sheet=>!!sheet?.actor&&sheet.actor.isOwner!==false&&!sheet.actor.limited&&sheet.isEditable!==false;
const checked=(dialog,name)=>!!dialog.element.querySelector('[name="'+name+'"]')?.checked;
const value=(dialog,name)=>dialog.element.querySelector('[name="'+name+'"]')?.value??'';
const warning=error=>globalThis.ui?.notifications?.warn(error.message??String(error));
const busy=new Set();
async function action(sheet,callback,{read=false}={}){
 if(sheet.actor.limited||!read&&!editable(sheet))return;
 const key=sheet.actor.uuid??sheet.actor;
 if(busy.has(key))return;
 busy.add(key);try{return await callback();}catch(error){warning(error);}finally{busy.delete(key);}
}
async function dialog(title,content,collect,{read=false,render}={}){
 return foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-profession-dialog'],position:{width:580},window:{title},modal:true,content,render,
  buttons:read?[{action:'close',label:'Fechar',default:true,callback:()=>null}]:[{action:'save',label:'Confirmar',default:true,callback:(_event,_button,app)=>collect(app)},{action:'cancel',label:'Cancelar',callback:()=>null}],rejectClose:false,close:()=>null});
}
function select(name,options,selected){return '<select name="'+name+'">'+options.map(option=>'<option value="'+escape(option.value)+'"'+(String(selected)===String(option.value)?' selected':'')+'>'+escape(option.label)+'</option>').join('')+'</select>';}
function field(label,body){return '<label><span>'+escape(label)+'</span>'+body+'</label>';}
function rankOptions(){return CULTIVATION_RANKS.map((rank,index)=>({value:index+1,label:rank.name??rank.label??String(rank)}));}
/** Source text is data; only trusted, escaped fields enter editable forms. */
export const professionCraftDialogContent=craftWorkbenchContent;

async function configure(sheet,target){
 const key=keyOf(target),guide=PROFESSION_GUIDES[key];if(!guide)throw Error('Profissão inválida.');
 const saved=sheet.actor.flags?.[scope]?.professions?.[key]??{},before=professionLevel(sheet.actor,key);
 const content='<div class="iw-profession-editor"><p class="iw-profession-editor-wide">Use este registro para certificações e ajustes confirmados pelo narrador. Para evoluir com testes e custos, use Produzir na receita desejada.</p>'
  +field('Nível profissional',select('level',Array.from({length:11},(_v,index)=>({value:index,label:index?String(index):'0 · Não iniciado'})),before))
  +field('Guilda','<input name="guild" type="text" value="'+escape(saved.guild)+'">')
  +field('Pontos de Contribuição','<input name="contribution" type="number" min="0" value="'+(Number(saved.contribution)||0)+'">')
  +'<label><input type="checkbox" name="certified"'+(saved.certified?' checked':'')+'><span>Certificação reconhecida</span></label></div>';
 const result=await dialog(guide.title,content,app=>({level:value(app,'level'),guild:value(app,'guild'),contribution:value(app,'contribution'),certified:checked(app,'certified')}));
 if(!result||!editable(sheet))return;
 return withElementalActorLock(sheet.actor,'profession-configure:'+key,async()=>{if(!editable(sheet))return;if(professionLevel(sheet.actor,key)!==before)throw Error('O nível mudou enquanto esta janela estava aberta. Reabra o registro.');await sheet.actor.update(prepareProfessionConfigurationUpdate(sheet.actor,key,result));});
}
async function craft(sheet,target){
 const product=PROFESSION_PRODUCTS.find(entry=>entry.id===target.dataset.product);if(!product?.levels)throw Error('Esta ferramenta não possui uma receita de fabricação.');
 return openProfessionCraftWorkbench(sheet,product);
}

async function openProduct(sheet,target){
 const product=PROFESSION_PRODUCTS.find(entry=>entry.id===target.dataset.product);if(!product)throw Error('Produto não encontrado.');
 const source=professionProductDocument(product.id),uuid='Compendium.Immortals-system.equipamentos.Item.'+source._id;
 let doc=await globalThis.fromUuid?.(uuid);if(!doc){source.folder=null;doc=new CONFIG.Item.documentClass(source);}
 return doc.sheet?.render(true);
}
async function showRules(sheet,target){
 const guide=PROFESSION_GUIDES[keyOf(target)];if(!guide)return;
 return dialog(guide.title,'<div class="iw-profession-rules">'+guide.rulesHTML+'</div>',()=>null,{read:true});
}
async function toxins(sheet){
 const initial=toxinState(sheet.actor),period=detoxPeriod(initial.value,{highestValue:initial.highestValue});
 const rate=period.pending?'A fonte ainda não define a remoção acima de 90 pontos.':period.requiresCalendar?'1 mês de cultivo por ponto; use o mês do calendário.':period.daysPerPoint+' dias de cultivo por ponto.';
 const result=await dialog('Toxinas de pílulas','<div class="iw-profession-editor"><p class="iw-profession-editor-wide">As pílulas acrescentam toxinas ao serem consumidas. Registre abaixo a remoção já realizada em jogo. O ritmo mais lento permanece até zerar.</p>'+field('Toxinas atuais','<input name="toxins" type="number" min="0" step="any" value="'+initial.value+'">')+'<p>'+escape(rate)+'</p><p class="iw-profession-editor-wide">Acima de 100 pontos, a absorção de Essência permanece bloqueada até remover todas as toxinas.</p></div>',app=>Number(value(app,'toxins')));
 if(result===null||result===undefined||!editable(sheet))return;
 return withElementalActorLock(sheet.actor,'profession-toxins',async()=>{if(!editable(sheet))return;if(toxinState(sheet.actor).value!==initial.value)throw Error('As toxinas mudaram durante a consulta. Reabra esta janela.');await sheet.actor.update(toxinStateUpdate(sheet.actor,result).updates);});
}
async function beast(sheet){
 const level=professionLevel(sheet.actor,'beasts'),records=sheet.actor.flags?.[scope]?.professions?.beasts?.taming??{};
 const options=[{value:'',label:'Nova besta'},...Object.entries(records).map(([id,record])=>({value:id,label:record.name+' · '+record.failures+' falhas'}))];
 const content='<div class="iw-profession-editor"><p class="iw-profession-editor-wide">A CD depende do rank adulto máximo; a duração-base é de 2 dias por rank atual. Três falhas tornam a doma impossível para essa besta. Para ingressar ou evoluir, confirme todo o trabalho com o narrador e realize a tentativa profissional.</p>'
  +field('Objetivo',select('mode',[{value:'daily',label:'Registrar teste diário de doma'},{value:'advancement',label:level?'Tentar próximo nível · '+(5*(level+1))+' PC':'Ingressar na profissão · 5 PC'}],level?'daily':'advancement'))
  +field('Registro',select('record',options,''))+field('Nome da besta','<input name="beast-name" type="text">')
  +field('Rank atual',select('current-rank',rankOptions(),1))+field('Rank máximo adulto',select('maximum-rank',rankOptions(),1))
  +'<label><input name="adult" type="checkbox"><span>A besta já é adulta</span></label><p>Nível do criador: '+level+'/10. O registro não cria uma criatura ou altera sua ficha.</p>'
  +'<label class="iw-profession-editor-wide"><input name="creation-confirmed" type="checkbox"><span>Ingresso/avanço: o narrador confirmou a criação do nível-alvo e todo o tempo necessário.</span></label>'
  +'<label class="iw-profession-editor-wide"><input name="prerequisites" type="checkbox"><span>Ingresso/avanço: confirmei mentor, talento de estudante, materiais e ferramentas.</span></label></div>';
 const request=await dialog('Criador de Bestas · Doma',content,app=>({mode:value(app,'mode'),id:value(app,'record'),name:value(app,'beast-name').trim(),currentRank:Number(value(app,'current-rank')),maxRank:Number(value(app,'maximum-rank')),adult:checked(app,'adult'),creationConfirmed:checked(app,'creation-confirmed'),prerequisitesConfirmed:checked(app,'prerequisites')}));
 if(!request||!editable(sheet))return;
 if(request.mode==='advancement'){
  const outcome=await performBeastProfessionAdvancement(sheet.actor,request);
  if(outcome&&!outcome.cancelled)ui.notifications.info(outcome.success?'Avanço profissional concluído: Criador de Bestas '+outcome.plan.targetLevel+'.':'Tentativa sem sucesso; o custo em PC foi registrado.');
  return outcome;
 }
 return withElementalActorLock(sheet.actor,'profession-beast',async()=>{
  if(!editable(sheet))return;
  const saved=sheet.actor.flags?.[scope]?.professions?.beasts?.taming?.[request.id],record=saved?{...saved}:request;
  if(!saved&&!record.name)throw Error('Informe um nome para a besta.');
  const plan=beastDomesticationPlan({professionLevel:professionLevel(sheet.actor,'beasts'),...record,failures:record.failures??0});
  if(!plan.eligible)throw Error(plan.adult?'A besta já é adulta.':plan.permanentFailure?'Três falhas impedem uma nova tentativa com essa besta.':'O rank atual da besta excede seu nível profissional.');
  const day=Number(sheet.actor.flags?.[scope]?.elementalTrainingDay??Math.floor((globalThis.game?.time?.worldTime??0)/86400));
  if(saved?.lastAttemptDay===day)throw Error('Esta besta já recebeu seu teste de doma neste dia. Avance o calendário antes de tentar novamente.');
  const dc=plan.dc-professionDifficultyReduction(sheet.actor,record.currentRank);
  const result=await sheet.actor.rollSkill({skill:'ani',ability:'wis',target:dc},{configure:false}),roll=Array.isArray(result)?result[0]:result;
  if(!roll||!editable(sheet))return;
  if(professionLevel(sheet.actor,'beasts')!==level)throw Error('O nível profissional mudou durante o teste.');
  const id=request.id||foundry.utils.randomID(),success=Number(roll.total)>=dc;
  await sheet.actor.update({['flags.'+scope+'.professions.beasts.taming.'+id]:{...record,id,failures:(record.failures??0)+(success?0:1),successes:(record.successes??0)+(success?1:0),lastTotal:Number(roll.total),lastAttemptDay:day,durationDays:plan.durationDays,growthMultiplier:beastGrowthMultiplier(professionLevel(sheet.actor,'beasts'),record.currentRank)}});
  ui.notifications.info((success?'Teste de doma aprovado.':'Teste de doma falhou.')+' Duração-base: '+plan.durationDays+' dias. Confirme o tempo transcorrido com o narrador.');
 });
}
export const professionRuleActions={
 professionConfigure:function(_event,target){return action(this,()=>configure(this,target));},
 professionCraft:function(_event,target){return action(this,()=>craft(this,target));},
 professionOpenProduct:function(_event,target){return action(this,()=>openProduct(this,target),{read:true});},
 professionRules:function(_event,target){return action(this,()=>showRules(this,target),{read:true});},
 professionToxins:function(){return action(this,()=>toxins(this));},
 professionBeast:function(){return action(this,()=>beast(this));}
};
