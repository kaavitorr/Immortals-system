import {dispatchCultivationDestiny,cultivationDestinySnapshot} from '../../../systems/cultivation-destiny-authority.mjs';
import {CULTIVATION_DESTINIES, DESTINY_LINEAGES, destinyState, destinyLearningDC} from '../../../systems/cultivation-destiny.mjs';
import {selectCultivationDestiny, recordCultivationDestiny} from '../../../systems/cultivation-destiny-runtime.mjs';
import {divineManualState} from '../../../systems/divine-manual.mjs';
import {CULTIVATION_RANKS} from '../../../systems/cultivation-realms.mjs';
import {MANUAL_RANKS, MANUAL_QUALITIES} from '../../../systems/cultivation-manual.mjs';
import {CONCEITOS_ELEMENTOS} from '../../../systems/elemental-concepts-data.mjs';

const SCOPE='Immortals-system';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const abilityNames={str:'Força',dex:'Agilidade',con:'Constituição',int:'Intelecto',wis:'Sabedoria',cha:'Presença'};
const recordNames={'combat-manual':'Manual de Combate','cultivation-manual':'Manual de Cultivo','resource-contribution':'Entrega de recursos','legacy-exchange':'Troca de tesouros','resource-obligation':'Obrigação de recursos','reincarnated-obligation':'Constituição inicial'};
const realmName=rank=>CULTIVATION_RANKS.find(entry=>entry.rank===Number(rank))?.name??'';
const elementName=id=>CONCEITOS_ELEMENTOS.find(entry=>entry.id===id)?.label??id;
const classification=(rarity,quality)=>[MANUAL_RANKS.find(entry=>entry.value===rarity)?.label??rarity,MANUAL_QUALITIES.find(entry=>entry.value===quality)?.label??quality].filter(Boolean).join(' ');
const canEdit=sheet=>sheet?.isEditable===true&&sheet.actor?.isOwner===true&&!sheet.actor.limited&&destinyState(sheet.actor).active;
const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
const icons={edit:'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',book:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zM12 5v15',add:'M12 5v14M5 12h14',roll:'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 8h.01M16 16h.01M12 12h.01'};
const button=(action,label,kind='edit')=>'<button type="button" data-action="'+action+'">'+icon(icons[kind])+escape(label)+'</button>';
const recordsOf=records=>(Array.isArray(records)?records:Object.values(records??{}).flat()).filter(entry=>entry&&typeof entry==='object');
const paragraph=(label,value)=>'<p><span class="iw-destiny-label">'+escape(label)+'</span> '+escape(value)+'</p>';
const options=(entries,current,empty='')=>(empty?'<option value="">'+escape(empty)+'</option>':'')+entries.map(entry=>'<option value="'+escape(entry.value??entry.id??entry.key)+'"'+((entry.value??entry.id??entry.key)===current?' selected':'')+'>'+escape(entry.label??entry.name)+'</option>').join('');
const select=(name,label,entries,current,{empty='',required=false}={})=>'<label>'+escape(label)+'<select name="'+name+'"'+(required?' required':'')+'>'+options(entries,current,empty)+'</select></label>';
const textInput=(name,label,value='',extra='')=>'<label>'+escape(label)+'<input type="text" name="'+name+'" value="'+escape(value)+'" '+extra+'></label>';
const textArea=(name,label,value='',rows=5)=>'<label class="iw-destiny-wide">'+escape(label)+'<textarea name="'+name+'" rows="'+rows+'">'+escape(value)+'</textarea></label>';
const check=(name,label,checked=false)=>'<label class="iw-destiny-check"><input type="checkbox" name="'+name+'"'+(checked?' checked':'')+'><span>'+escape(label)+'</span></label>';
const formHTML=content=>'<div class="iw-destiny-form" data-destiny-form>'+content+'</div>';
const rootOf=dialog=>dialog.element?.querySelector?.('[data-destiny-form]');
const value=(root,name)=>root?.querySelector('[name="'+name+'"]')?.value??'';
const checked=(root,name)=>root?.querySelector('[name="'+name+'"]')?.checked===true;
const rawOf=actor=>actor?.flags?.[SCOPE]??{};
const snapshot=cultivationDestinySnapshot;
function requireFresh(sheet,revision,savedSnapshot){
 if(!canEdit(sheet))throw Error('Você não tem permissão para alterar esta herança.');
 if(destinyState(sheet.actor).revision!==revision||(savedSnapshot!==undefined&&snapshot(sheet.actor)!==savedSnapshot))throw Error('A herança mudou; abra a janela novamente.');
}

/** Own markup only; every narrative, name and saved property is escaped before interpolation. */
export function prepareCultivationDestinyContext(sheet){
 if(sheet?.actor?.limited)return {active:false,editable:false,html:''};
 const state=destinyState(sheet?.actor);if(!state.active)return {active:false,editable:false,html:''};
 const editable=canEdit(sheet),manual=divineManualState(sheet.actor),records=recordsOf(state.records);
 let content='<header class="iw-destiny-header"><h4>Talento que desafia os Céus</h4>'+(editable?button('cultivationChooseDestiny',state.key?'Revisar destino':'Escolher destino'):'')+'</header>';
 if(!state.definition)content+='<p class="iw-destiny-muted">Escolha como recebeu seu Manual Supremo Selado. Nenhum destino foi escolhido.</p>';
 else {
  content+='<div class="iw-destiny-choice"><strong>'+escape(state.definition.name)+'</strong><p>'+escape(state.definition.summary)+'</p></div>'+paragraph('Benefício.',state.definition.benefit)+paragraph('Penalidade.',state.definition.penalty);
  if(state.key==='divine-lineage')content+='<p class="iw-destiny-status">'+escape(state.unlocked?'Linhagem desperta':'Linhagem selada')+' · '+escape(state.lineageName||'Escolha uma Besta Divina')+'</p>'+paragraph('Afinidades.',state.elements.length?state.elements.map(elementName).join(', '):'Sem afinidade elemental')+'<p class="iw-destiny-muted">Poderes disponíveis no Núcleo Rotativo, ou desde o início para Meio Monstro. A linhagem concede sua característica e essência Suprema sem alterar sua espécie.</p>';
  if(editable&&state.key==='divine-lineage'&&manual.assimilations.some(entry=>!entry.elements?.length))content+='<div class="iw-destiny-actions">'+button('cultivationIdentifyManual','Confirmar afinidade de manual antigo','book')+'</div>';
  if(state.ownOrigin)content+=paragraph('Referência do mantra.',state.absorptionRealmLabel??'A definir')+'<p class="iw-destiny-muted">Absorção de PEQ conforme o mantra e a taxa definida para a campanha.</p>';
  if(state.key==='reincarnated')content+='<p class="iw-destiny-note">Constituição inicial: Humano Inferior. Evolução: dobro dos recursos. Uma constituição já registrada é preservada; combine a adequação com o narrador.</p>';
  if(state.key==='unrivaled-genius'){
   content+='<div class="iw-destiny-active"><p>'+escape(manual.activeAssimilations.length?'Manuais ativos: '+manual.activeAssimilations.map(entry=>entry.name).join(', '):'Nenhum conjunto de propriedades ativo.')+'</p>'+paragraph('Mantra ativo.',manual.mantras[manual.activeMantra]?.name??'Mantra de cultivo')+'</div>';
   if(editable)content+='<div class="iw-destiny-actions">'+button('cultivationManageManuals','Manuais ativos','book')+button('cultivationManageMantras','Gerenciar mantras','book')+button('cultivationLearningTest','Teste de aprendizado','roll')+'</div>';
  }
  const canRecord=state.key==='immortal-soul'||state.key==='supreme-legacy'&&state.rank>=3;
  if(editable&&canRecord)content+='<div class="iw-destiny-actions">'+button('cultivationRecordDestiny','Registrar entrega ou ensinamento','add')+'</div>';
  if(state.key==='supreme-legacy'&&state.rank<3)content+='<p class="iw-destiny-muted">As trocas do legado ficam disponíveis no Núcleo Rotativo.</p>';
 }
 if(state.story)content+='<details class="iw-destiny-history"><summary>Origem da herança</summary><p class="iw-destiny-prose">'+escape(state.story)+'</p></details>';
 if(records.length)content+='<details class="iw-destiny-history"><summary>Registros da herança ('+records.length+')</summary><ol>'+records.map(entry=>'<li><strong>'+escape(entry.name||recordNames[entry.kind]||'Registro')+'</strong><span class="iw-destiny-muted">'+escape([recordNames[entry.kind]??entry.kind,realmName(entry.rank),classification(entry.rarity,entry.quality)].filter(Boolean).join(' · '))+'</span>'+(entry.offeredName?paragraph('Oferecido.',entry.offeredName+' · '+classification(entry.offeredRarity,entry.offeredQuality)):'')+(entry.story||entry.text?'<p class="iw-destiny-prose">'+escape(entry.story||entry.text)+'</p>':'')+'</li>').join('')+'</ol></details>';
 return {...state,editable,records,manual,html:'<section class="iw-cultivation-destiny" aria-label="Talento que desafia os Céus">'+content+'</section>'};
}

function choiceContent(state){
 const lineage=DESTINY_LINEAGES.find(entry=>entry.id===state.lineageId);
 const previews=CULTIVATION_DESTINIES.map(entry=>'<article data-destiny-preview="'+entry.key+'"'+(state.key!==entry.key?' hidden':'')+'><p>'+escape(entry.narrative)+'</p>'+paragraph('Benefício.',entry.benefit)+paragraph('Penalidade.',entry.penalty)+(entry.key==='reincarnated'?'<p class="iw-destiny-note">A constituição deve começar Humano Inferior e sua evolução exige recursos dobrados. Confirmar este destino preserva a constituição que já está na ficha.</p>':'')+'</article>').join('');
 return formHTML(select('key','Origem da herança',CULTIVATION_DESTINIES,state.key,{empty:'Escolha um destino',required:true})+'<div class="iw-destiny-preview" aria-live="polite">'+previews+'</div><fieldset data-destiny-lineage-fields'+(state.key!=='divine-lineage'?' hidden':'')+'><legend>Linhagem Divina</legend>'+select('lineageId','Besta Divina',DESTINY_LINEAGES,state.lineageId,{empty:'Escolha uma linhagem',required:true})+select('ability','Atributo principal da essência',Object.entries(abilityNames).map(([value,label])=>({value,label})),state.ability,{empty:'Escolha um atributo',required:true})+'<div class="iw-destiny-grid" data-destiny-dragon'+(lineage?.id!=='dragon'?' hidden':'')+'>'+select('basicElement','Elemento básico',CONCEITOS_ELEMENTOS.filter(entry=>entry.raridade==='basico'),state.elements.find(id=>CONCEITOS_ELEMENTOS.some(entry=>entry.id===id&&entry.raridade==='basico')),{empty:'Escolha um elemento'})+select('intermediateElement','Elemento intermediário',CONCEITOS_ELEMENTOS.filter(entry=>entry.raridade==='intermediario'),state.elements.find(id=>CONCEITOS_ELEMENTOS.some(entry=>entry.id===id&&entry.raridade==='intermediario')),{empty:'Escolha um elemento'})+'</div><div data-destiny-taotie'+(lineage?.id!=='taotie'?' hidden':'')+'>'+check('taotieSpace','Afinidade com Espaço',state.elements.includes('espaco'))+check('taotieConfirmed','Resultado 16 ou mais confirmado com o narrador')+'</div><p class="iw-destiny-muted" data-destiny-fixed-elements></p><p class="iw-destiny-muted">A característica e a essência de Rank Supremo pertencem à linhagem escolhida. Poderes selados até Núcleo Rotativo, exceto para Meio Monstro. Sua espécie permanece a mesma.</p></fieldset>'+textArea('story','Como você recebeu sua herança?',state.story,7));
}
function mountChoice(dialog){
 const root=rootOf(dialog);if(!root)return;
 const refresh=()=>{const key=value(root,'key'),lineage=DESTINY_LINEAGES.find(entry=>entry.id===value(root,'lineageId'));for(const preview of root.querySelectorAll('[data-destiny-preview]'))preview.hidden=preview.dataset.destinyPreview!==key;const lineageFields=root.querySelector('[data-destiny-lineage-fields]');lineageFields.hidden=key!=='divine-lineage';lineageFields.disabled=key!=='divine-lineage';root.querySelector('[data-destiny-dragon]').hidden=lineage?.id!=='dragon';root.querySelector('[data-destiny-taotie]').hidden=lineage?.id!=='taotie';root.querySelector('[data-destiny-fixed-elements]').textContent=lineage&&!lineage.choices?'Afinidades: '+lineage.elements.map(elementName).join(', '):'';};
 root.querySelector('[name="key"]').addEventListener('change',refresh);root.querySelector('[name="lineageId"]').addEventListener('change',refresh);refresh();
}
function readChoice(dialog){
 const root=rootOf(dialog),key=value(root,'key'),input={key,story:value(root,'story')};
 if(key==='divine-lineage'){
  input.lineageId=value(root,'lineageId');input.ability=value(root,'ability');
  if(!Object.hasOwn(abilityNames,input.ability))throw Error('Escolha o atributo principal da essência.');
  const lineage=DESTINY_LINEAGES.find(entry=>entry.id===input.lineageId);
  if(lineage?.id==='dragon')input.elements=[value(root,'basicElement'),value(root,'intermediateElement')];
  else if(lineage?.id==='taotie'){
   if(checked(root,'taotieSpace')&&!checked(root,'taotieConfirmed'))throw Error('Confirme com o narrador o resultado 16 ou mais antes de escolher Espaço.');
   input.elements=checked(root,'taotieSpace')?['espaco']:[];
  }else input.elements=[...(lineage?.elements??[])];
 }
 return input;
}
function recordContent(state){
 const kinds=state.key==='immortal-soul'?['combat-manual','cultivation-manual','resource-contribution']:['legacy-exchange'];
 const initial=kinds[0];
 return formHTML(select('kind','Tipo de registro',kinds.map(value=>({value,label:recordNames[value]})),initial)+'<p class="iw-destiny-muted">Registre apenas uma entrega concreta confirmada pelo narrador. Nenhum item ou recurso é retirado ou criado por este registro.</p>'+textInput('name','Nome do manual, recurso ou tesouro recebido','','required maxlength="160"')+'<div data-destiny-record-classification><div class="iw-destiny-grid">'+select('rank','Reino de cultivo alcançado',CULTIVATION_RANKS.filter(entry=>entry.rank<=state.rank).map(entry=>({value:String(entry.rank),label:entry.name})),String(state.rank))+select('rarity','Raridade recebida',MANUAL_RANKS,'humano')+select('quality','Qualidade recebida',MANUAL_QUALITIES,'inferior')+'</div></div><p class="iw-destiny-muted" data-destiny-record-limit>Alma Imortal: um Manual de Combate por reino e até dois Manuais de Cultivo compatíveis, no máximo Divino Inferior.</p>'+(state.key==='supreme-legacy'?'<fieldset><legend>Tesouro oferecido em troca</legend>'+textInput('offeredName','Nome do tesouro oferecido','','required maxlength="160"')+'<div class="iw-destiny-grid">'+select('offeredRarity','Raridade oferecida',MANUAL_RANKS,'humano')+select('offeredQuality','Qualidade oferecida',MANUAL_QUALITIES,'inferior')+'</div><p class="iw-destiny-muted">A raridade e a qualidade oferecidas devem ser iguais às recebidas. O tesouro recebido é de uso exclusivo do personagem.</p></fieldset>':'')+textArea('story','Relato e detalhes da entrega','',5)+check('confirmedByNarrator','O narrador confirmou esta entrega, ensinamento ou troca.'));
}
function mountRecord(dialog){
 const root=rootOf(dialog);if(!root)return;
 const refresh=()=>{root.querySelector('[data-destiny-record-classification]').hidden=value(root,'kind')==='resource-contribution';const note=root.querySelector('[data-destiny-record-limit]');note.hidden=value(root,'kind')==='legacy-exchange';};
 root.querySelector('[name="kind"]').addEventListener('change',refresh);
 for(const [received,offered] of [['rarity','offeredRarity'],['quality','offeredQuality']]){const target=root.querySelector('[name="'+offered+'"]');if(target)root.querySelector('[name="'+received+'"]').addEventListener('change',()=>{target.value=value(root,received);});}
 refresh();
}
function readRecord(dialog){
 const root=rootOf(dialog),kind=value(root,'kind'),input={kind,name:value(root,'name'),story:value(root,'story'),confirmedByNarrator:checked(root,'confirmedByNarrator')};
 if(kind!=='resource-contribution')Object.assign(input,{rank:Number(value(root,'rank')),rarity:value(root,'rarity'),quality:value(root,'quality')});
 if(kind==='legacy-exchange')Object.assign(input,{offeredName:value(root,'offeredName'),offeredRarity:value(root,'offeredRarity')||input.rarity,offeredQuality:value(root,'offeredQuality')||input.quality});
 return input;
}
function mantrasContent(state){
 return formHTML('<p class="iw-destiny-muted">Mantenha até dois mantras. Apenas o escolhido alimenta a absorção diária e o calendário. Taxa em branco usa a região; zero interrompe a absorção.</p>'+Array.from({length:2},(_,index)=>{const mantra=state.mantras[index]??{};return '<fieldset><legend>Mantra '+(index+1)+'</legend>'+textInput('mantraName'+index,'Nome',mantra.name??'', 'maxlength="160"')+textArea('mantraText'+index,'Texto do mantra',mantra.text??'',5)+'<label>Essência por dia<input type="number" min="0" step="1" name="mantraRate'+index+'" value="'+escape(mantra.essencePerDay??'')+'" placeholder="Usar região"></label><label class="iw-destiny-check"><input type="radio" name="activeMantra" value="'+index+'"'+(state.activeMantra===index?' checked':'')+'><span>Usar este mantra</span></label></fieldset>';}).join(''));
}
function readMantras(dialog){
 const root=rootOf(dialog),selected=root.querySelector('[name="activeMantra"]:checked');
 const mantras=Array.from({length:2},(_,index)=>({name:value(root,'mantraName'+index),text:value(root,'mantraText'+index),essencePerDay:value(root,'mantraRate'+index)}));
 if(!selected)throw Error('Escolha um único mantra ativo.');
 return {mantras,activeMantra:Number(selected.value)};
}
function manualsContent(state){
 return formHTML('<p class="iw-destiny-muted">Escolha até dois manuais assimilados cujas propriedades permanecerão ativas. O histórico de assimilação é preservado.</p>'+(state.assimilations.length?state.assimilations.map((entry,index)=>'<fieldset><legend>'+escape(entry.name||'Manual '+(index+1))+'</legend><p class="iw-destiny-muted">'+escape(classification(entry.rank,entry.quality))+'</p><p class="iw-destiny-prose">'+escape(entry.properties||'Sem propriedades registradas.')+'</p><label class="iw-destiny-check"><input type="checkbox" name="activeManual" value="'+index+'"'+(state.activeIndices.includes(index)?' checked':'')+'><span>Manter propriedades ativas</span></label></fieldset>').join(''):'<p>Nenhum manual assimilado. Use a opção de estudo do Manual Supremo para registrar uma assimilação.</p>'));
}
function readManuals(dialog){return [...rootOf(dialog).querySelectorAll('[name="activeManual"]:checked')].map(control=>Number(control.value));}
const learningRolls=[{value:'skill:arc:con',label:'Controle de Qi com Constituição'},{value:'skill:ani:wis',label:'Criação com Sabedoria'},...Object.entries(abilityNames).map(([id,label])=>({value:'ability:'+id,label:'Teste de '+label}))];
function learningContent(){
 return formHTML(select('kind','Aprendizado',[{value:'combat-manual',label:'Manual de Combate'},{value:'proficiency',label:'Avanço de proficiência'}],'combat-manual')+'<label>CD base acordada com o narrador<input type="number" name="baseDC" min="1" step="1" required placeholder="Informe a CD base"></label>'+select('rollChoice','Rolagem acordada com o narrador',learningRolls,'',{empty:'Escolha a rolagem',required:true})+'<p class="iw-destiny-note" data-destiny-learning-preview aria-live="polite">Informe a CD base para calcular a redução de 3.</p><p class="iw-destiny-muted">Este teste usa a rolagem nativa e não concede conhecimentos ou remove custos. Confirme com o narrador a CD, a rolagem e os demais requisitos.</p>');
}
function learningInput(dialog){const root=rootOf(dialog);return {kind:value(root,'kind'),baseDC:Number(value(root,'baseDC')),rollChoice:value(root,'rollChoice')};}
function mountLearning(dialog,actor){
 const root=rootOf(dialog);if(!root)return;
 const refresh=()=>{const base=Number(value(root,'baseDC'));root.querySelector('[data-destiny-learning-preview]').textContent=Number.isFinite(base)&&base>=1?'CD base '+base+' − 3 = CD '+destinyLearningDC(actor,value(root,'kind'),base):'Informe uma CD base válida.';};
 root.querySelector('[name="baseDC"]').addEventListener('input',refresh);root.querySelector('[name="kind"]').addEventListener('change',refresh);refresh();
}
const busy=new Set();
async function runDialog(sheet,id,{title,content,read,mount,apply,genius=false,manualSnapshot=false}){
 if(!canEdit(sheet))return;
 const actor=sheet.actor,key=actor.uuid??actor.id??actor;if(busy.has(key))return;
 const state=destinyState(actor);if(genius&&state.key!=='unrivaled-genius')return;
 const revision=state.revision,savedSnapshot=manualSnapshot?snapshot(actor):undefined;
 busy.add(key);
 try {
  const answer=await globalThis.foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-destiny-dialog'],window:{title},position:{width:660},modal:true,content,render:(_event,dialog)=>mount?.(dialog),buttons:[{action:'save',label:id==='learning'?'Abrir rolagem':'Salvar',default:true,callback:(_event,_button,dialog)=>read(dialog)},{action:'cancel',label:'Cancelar',callback:()=>false}],rejectClose:false});
  if(!answer)return;
  requireFresh(sheet,revision,savedSnapshot);if(genius&&destinyState(actor).key!=='unrivaled-genius')throw Error('O destino mudou; abra a janela novamente.');
  await apply(answer,{revision,savedSnapshot});
 }catch(error){globalThis.ui?.notifications?.warn?.(error.message);}
 finally {busy.delete(key);}
}
async function manageManual(sheet,mode){
 if(!canEdit(sheet)||destinyState(sheet.actor).key!=='unrivaled-genius')return;
 const actor=sheet.actor,manual=divineManualState(actor);
 return runDialog(sheet,mode,{title:mode==='mantras'?'Mantras de cultivo':'Propriedades dos manuais ativos',content:mode==='mantras'?mantrasContent(manual):manualsContent(manual),read:mode==='mantras'?readMantras:readManuals,genius:true,manualSnapshot:true,
  apply:(answer,{revision,savedSnapshot})=>{requireFresh(sheet,revision,savedSnapshot);return dispatchCultivationDestiny(actor,mode,mode==='manuals'?{indices:answer}:answer,{expectedRevision:revision,snapshot:savedSnapshot});}});
}
export const cultivationDestinyActions={
 cultivationIdentifyManual:function(){
  if(!canEdit(this))return;const sheet=this,state=destinyState(this.actor);if(state.key!=='divine-lineage')return;
  const manual=divineManualState(this.actor),entries=manual.assimilations.map((entry,index)=>({...entry,index})).filter(entry=>!entry.elements?.length);if(!entries.length)return;
  const allowed=state.elements.length?state.elements:['neutro'];
  const content=formHTML('<p>Confirme com o narrador o elemento de um manual antigo que ainda não tinha essa informação. O histórico e as oportunidades usadas permanecem os mesmos.</p>'+select('manualIndex','Manual a identificar',entries.map(e=>({value:String(e.index),label:e.name})),String(entries[0].index))+select('element','Afinidade confirmada',allowed.map(id=>({value:id,label:elementName(id)})),allowed[0])+check('confirmedByNarrator','O narrador confirmou esta afinidade para o manual.'));
  return runDialog(sheet,'identify',{title:'Afinidade de manual antigo',content,manualSnapshot:true,read:dialog=>{const root=rootOf(dialog);return{index:Number(value(root,'manualIndex')),elements:[value(root,'element')],confirmedByNarrator:checked(root,'confirmedByNarrator')};},apply:(answer,{revision,savedSnapshot})=>dispatchCultivationDestiny(sheet.actor,'identify',answer,{expectedRevision:revision,snapshot:savedSnapshot})});
 },

 cultivationChooseDestiny:function(){
  if(!canEdit(this))return;
  const sheet=this,state=destinyState(this.actor);
  return runDialog(sheet,'choice',{title:'Talento que desafia os Céus',content:choiceContent(state),read:readChoice,mount:mountChoice,apply:(answer,{revision})=>selectCultivationDestiny(sheet.actor,answer,{expectedRevision:revision})});
 },
 cultivationRecordDestiny:function(){
  if(!canEdit(this))return;
  const sheet=this,state=destinyState(this.actor);if(state.key!=='immortal-soul'&&(state.key!=='supreme-legacy'||state.rank<3))return;
  return runDialog(sheet,'record',{title:'Registro da herança',content:recordContent(state),read:readRecord,mount:mountRecord,apply:(answer,{revision})=>recordCultivationDestiny(sheet.actor,answer,{expectedRevision:revision})});
 },
 cultivationManageMantras:function(){return manageManual(this,'mantras');},
 cultivationManageManuals:function(){return manageManual(this,'manuals');},
 cultivationLearningTest:function(){
  if(!canEdit(this)||destinyState(this.actor).key!=='unrivaled-genius')return;
  const sheet=this,actor=this.actor;
  return runDialog(sheet,'learning',{title:'Teste de aprendizado',content:learningContent(),read:learningInput,mount:dialog=>mountLearning(dialog,actor),genius:true,apply:async answer=>{
   if(!Number.isFinite(answer.baseDC)||answer.baseDC<1)throw Error('Informe uma CD base válida.');
   if(!learningRolls.some(entry=>entry.value===answer.rollChoice))throw Error('Escolha explicitamente a rolagem acordada com o narrador.');
   const target=destinyLearningDC(actor,answer.kind,answer.baseDC),parts=answer.rollChoice.split(':');
   if(parts[0]==='skill'&&typeof actor.rollSkill==='function')return actor.rollSkill({skill:parts[1],ability:parts[2],target});
   if(parts[0]==='ability'&&typeof actor.rollAbilityCheck==='function')return actor.rollAbilityCheck({ability:parts[1],target});
   globalThis.ui?.notifications?.info?.('CD base '+answer.baseDC+' − 3 = CD '+target+'. A rolagem nativa não está disponível nesta ficha; use esta CD na rolagem acordada com o narrador.');
  }});
 }
};
