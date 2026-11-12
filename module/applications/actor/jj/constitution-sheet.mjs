import {destinyModifiers} from '../../../systems/cultivation-destiny.mjs';
import {CONSTITUTIONS,CONSTITUTION_RARITIES} from '../../../systems/constitutions-data.mjs';
import {constitutionState,constitutionModifiers,constitutionDefinition,requiresReincarnatedInitialConstitution} from '../../../systems/constitution-rules.mjs';
import {CONCEITOS_ELEMENTOS} from '../../../systems/elemental-concepts-data.mjs';
import {CULTIVATION_RANKS} from '../../../systems/cultivation-data.mjs';
const SCOPE='Immortals-system',TEMPLATE='systems/Immortals-system/templates/apps/constitution-picker.hbs';
const qualities={inferior:'Inferior',comum:'Comum',superior:'Superior',unica:'Única'};
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraph=v=>'<p>'+escape(String(v).replace(/\s*\[⬢+\]/gu,''))+'</p>';
const rankName=rank=>CULTIVATION_RANKS.find(r=>r.rank===rank)?.name??'Condensação de Qi';
const canEdit=sheet=>sheet?.isEditable===true&&sheet.actor?.isOwner===true&&!sheet.actor.limited;
export function constitutionRulesHTML(def){
 return def.description.map(paragraph).join('')+'<dl class="iw-constitution-facts"><div><dt>Requisito</dt><dd>'+escape(def.minimumCultivation)+'</dd></div><div><dt>Evolução</dt><dd>'+escape(def.evolution==='-'?'Não indicada':def.evolution)+'</dd></div><div><dt>Método de evolução</dt><dd>'+escape(def.evolutionMethod==='-'?'Não indicado':def.evolutionMethod)+'</dd></div></dl>'+(def.additionalEffects.some(v=>v!=='Nenhum')?'<h4>Efeitos adicionais</h4>'+def.additionalEffects.map(paragraph).join(''):'')+(def.curse.length?'<h4>Maldição</h4>'+def.curse.map(paragraph).join(''):'')+(def.sourceNotes.length?'<details class="iw-constitution-source"><summary>Observações do livro</summary>'+def.sourceNotes.map(paragraph).join('')+'</details>':'');
}
function view(entry,state){
 if(!entry)return null;
 const def=entry.definition,m=def.mechanics;
 return {id:entry.id,name:def.name,rarityLabel:entry.rarity.label,qualityLabel:qualities[entry.quality],rulesHTML:constitutionRulesHTML(def),baseActive:entry.baseActive,additionalActive:entry.additionalActive,minimumName:rankName(def.minimumRank),additionalName:def.additionalRank?rankName(def.additionalRank):null,affinitiesLabel:entry.affinities.map(id=>CONCEITOS_ELEMENTOS.find(e=>e.id===id)?.label??id).join(', '),affinityMissing:(m.affinityCount??0)-entry.affinities.length,evolutionId:def.evolutionId,evolutionName:def.evolution,slot:entry.slot,manualAbility:['wrath','blood','imitation'].includes(m.family)};
}
function automationNotes(state){
 const notes=[];for(const entry of state.entries){const m=entry.definition.mechanics;
  if(entry.baseActive){
   if(m.family==='celestial-absorption')notes.push('Bônus de absorção diária da atmosfera.');
   if(m.family==='elemental'&&entry.affinityReady)notes.push('Descontos de PC, Qi e tempo nas afinidades escolhidas.');
   if(['yang','yin'].includes(m.family))notes.push('Descontos de treinamento para os elementos '+m.family.toUpperCase()+'.');
   if(m.family==='alchemy')notes.push('Redução de toxinas ao consumir pílulas.');
   if(m.family==='tribulation')notes.push('CD de ruptura reduzida, novo reino no estágio 2 e desconto nos dois primeiros conceitos por reino.');
   if(m.family==='heaven-refiner')notes.push('Metade do custo normal em PC; conceitos custam o dobro de PC.');
   if(m.family==='omni')notes.push('Descontos de conceitos, custos básicos e Essência dobrada para romper de reino.');
   if(m.family==='devourer'&&state.context.devourerCounting)notes.push('Meta de Essência conforme a contagem da maldição escolhida.');
   if(m.family==='celestial-god')notes.push('Imunidade a toxinas e dano de tribulação; pílulas benéficas somente de nível 5 ou superior.');
   if(m.freeCultivationThroughRank)notes.push('Avanço sem PC até o reino indicado na descrição.');
  }
  if(entry.additionalActive&&m.family==='alchemy')notes.push('Redução da CD de criação de pílulas conhecidas ou novas.');
  if(entry.additionalActive&&['yang','yin','wrath'].includes(m.family))notes.push('Absorção conforme as condições de cultivo declaradas abaixo.');
 }
 return [...new Set(notes)];
}
export function prepareConstitutionContext(sheet){
 const state=constitutionState(sheet.actor),modifiers=constitutionModifiers(sheet.actor);
 return {destinyReincarnated:destinyModifiers(sheet.actor).constitutionResourceMultiplier===2,editable:canEdit(sheet),revision:state.revision,current:view(state.primary,state),entries:state.entries.map(e=>view(e,state)),isDevourer:state.isDevourer,slots:state.isDevourer?Array.from({length:3},(_,index)=>({index,label:'Constituição absorvida '+(index+1),entry:view(state.absorbed[index],state)})):[],context:state.context,absorptionMultiplier:modifiers.absorptionMultiplier,showCultivationContext:state.entries.some(e=>['yang','yin','wrath'].includes(e.definition.mechanics.family)),pending:modifiers.pending,automation:automationNotes(state),manual:['Ativações, transformações, bônus de combate e limites de consumo são resolvidos com o Narrador conforme a descrição.','Evoluções, materiais, cópia de criaturas e efeitos de tesouros não são executados pela troca da constituição.']};
}
export function constitutionPickerContext(sheet,{slot='primary',presetId}={}){
 const state=constitutionState(sheet.actor),current=slot==='primary'?state.primary:state.absorbed[slot];
 const excluded=new Set(slot==='primary'?[]:state.absorbed.filter((_e,index)=>index!==slot).map(e=>e.id));
 const selectedId=presetId??current?.id??'',initialRestricted=slot==='primary'&&requiresReincarnatedInitialConstitution(sheet.actor);
 return {destinyReincarnated:destinyModifiers(sheet.actor).constitutionResourceMultiplier===2,selectedId,absorbed:slot!=='primary',groups:CONSTITUTION_RARITIES.filter(r=>(!initialRestricted||r.id==='human')&&(slot==='primary'||r.id!=='supreme')).map(r=>({...r,entries:CONSTITUTIONS.filter(d=>d.rarity===r.id&&!excluded.has(d.id)).map(def=>({id:def.id,name:def.name,rarity:def.rarity,rarityLabel:r.label,selected:def.id===selectedId,baseActive:state.rank>=def.minimumRank,minimumName:rankName(def.minimumRank),rulesHTML:constitutionRulesHTML(def),qualityOptions:r.qualities.filter(q=>!initialRestricted||q==='inferior').map(q=>({value:q,label:qualities[q],selected:q===(current?.id===def.id?current.quality:r.qualities[0])})),affinityCount:def.mechanics.affinityCount??0,elements:(def.mechanics.affinityCount?CONCEITOS_ELEMENTOS:[]).filter(e=>def.mechanics.advancedAffinities||e.raridade!=='avancado').map(e=>({id:e.id,label:e.label,checked:current?.id===def.id&&current.affinities.includes(e.id)}))}))}))};
}
/** Browser-only interactions change the preview; no actor data is saved until Dialog confirmation. */
export function mountConstitutionPicker(dialog){
 const root=dialog.element?.querySelector('[data-constitution-picker]');if(!root)return;
 const search=root.querySelector('[data-constitution-search]'),rank=root.querySelector('[data-constitution-rarity]');
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const show=id=>{root.dataset.selectedId=id;for(const b of root.querySelectorAll('[data-constitution-option]')){const active=b.dataset.constitutionOption===id;b.classList.toggle('is-selected',active);b.setAttribute('aria-selected',String(active));}for(const detail of root.querySelectorAll('[data-constitution-detail]'))detail.hidden=detail.dataset.constitutionDetail!==id;};
 const filter=()=>{const text=normalize(search.value);let visible=0;for(const group of root.querySelectorAll('[data-constitution-group]')){let count=0;for(const option of group.querySelectorAll('[data-constitution-option]')){const show=(!rank.value||group.dataset.constitutionGroup===rank.value)&&normalize(option.textContent).includes(text);option.hidden=!show;count+=Number(show);}group.hidden=!count;visible+=count;}const message=root.querySelector('[data-constitution-no-results]');if(message)message.hidden=visible>0;};
 search.addEventListener('input',filter);rank.addEventListener('change',filter);
 for(const option of root.querySelectorAll('[data-constitution-option]'))option.addEventListener('click',()=>show(option.dataset.constitutionOption));
 root.querySelector('[data-constitution-none]')?.addEventListener('click',()=>show(''));
 for(const field of root.querySelectorAll('[data-constitution-affinities]')){const update=()=>{const boxes=[...field.querySelectorAll('input[type="checkbox"]')],count=boxes.filter(b=>b.checked).length,limit=Number(field.dataset.constitutionAffinities);for(const b of boxes)b.disabled=!b.checked&&count>=limit;field.querySelector('[data-affinity-count]').textContent=count+' / '+limit;};field.addEventListener('change',update);update();}
 show(root.dataset.selectedId??'');filter();
}
export function readConstitutionPicker(dialog){
 const root=dialog.element.querySelector('[data-constitution-picker]'),id=root.dataset.selectedId;
 if(!id)return {selection:null};
 const article=[...root.querySelectorAll('[data-constitution-detail]')].find(e=>e.dataset.constitutionDetail===id);
 return {selection:{id,quality:article.querySelector('[data-constitution-quality]').value,affinities:[...article.querySelectorAll('[data-constitution-affinity]:checked')].map(e=>e.value)}};
}
const busy=new Set();
async function choose(sheet,target){
 if(!canEdit(sheet)||busy.has(sheet.actor.uuid))return;
 const actor=sheet.actor,raw=target?.dataset?.constitutionSlot,slot=raw===undefined||raw==='primary'?'primary':Number(raw),state=constitutionState(actor);
 if(slot!=='primary'&&!state.isDevourer)return;
 busy.add(actor.uuid);
 try{
  const content=await globalThis.foundry.applications.handlebars.renderTemplate(TEMPLATE,constitutionPickerContext(sheet,{slot,presetId:target?.dataset?.constitutionPreset}));
  if(!canEdit(sheet))return;
  const answer=await globalThis.foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-constitution-dialog'],window:{title:slot==='primary'?'Constituição do personagem':'Constituição absorvida'},position:{width:900},modal:true,content,render:(_event,dialog)=>mountConstitutionPicker(dialog),buttons:[{action:'choose',label:'Confirmar escolha',default:true,callback:(_e,_b,dialog)=>readConstitutionPicker(dialog)},{action:'cancel',label:'Cancelar',callback:()=>false}],rejectClose:false});
  if(!answer||!canEdit(sheet))return;
  const {selectConstitution}=await import('../../../systems/constitution-runtime.mjs');
  await selectConstitution(actor,answer.selection,{slot,expectedRevision:state.revision});
 }catch(error){globalThis.ui?.notifications?.warn?.(error.message);}finally{busy.delete(actor.uuid);}
}
export const constitutionActions={
 constitutionChoose:function(_e,target){return choose(this,target);}
};
export function bindConstitutionSheet(sheet){
 const root=sheet.element?.querySelector?.('[data-constitution-section]');if(!root)return;
 for(const control of root.querySelectorAll('[data-constitution-context]')){
  control.disabled=!canEdit(sheet);if(control.dataset.constitutionBound)continue;control.dataset.constitutionBound='1';
  control.addEventListener('change',async event=>{event.stopPropagation();if(!canEdit(sheet))return;const key=control.dataset.constitutionContext,allowed={dualPartner:['','yin','yang'],zoneAspect:['','yin','yang'],devourerCounting:['','additional','all']};let value=control.type==='checkbox'?control.checked:control.value;if(key!=='demonicQi'&&!allowed[key]?.includes(value))return;if(!['dualPartner','zoneAspect','devourerCounting','demonicQi'].includes(key))return;await sheet.actor.update({['flags.'+SCOPE+'.constitution.context.'+key]:value});});
 }
}
