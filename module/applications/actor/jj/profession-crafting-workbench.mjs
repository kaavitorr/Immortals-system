import {PROFESSION_GUIDES} from '../../../systems/profession-products-data.mjs';
import {professionProductImage} from '../../../systems/profession-product-art.mjs';
import {professionRecipe,professionRecipeHtml,isElementalRecipe,RECIPE_ELEMENTS} from '../../../systems/profession-material-recipes.mjs';
import {professionLevel,professionCraftingPlan,treasureCraftingDC} from '../../../systems/profession-crafting-rules.mjs';
import {performProfessionCraft} from '../../../systems/profession-crafting.mjs';
import {TREASURE_RARITIES} from '../../../systems/refined-equipment.mjs';
const scope='Immortals-system';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={pill:'Pílula',talisman:'Talismã',inscription:'Inscrição',matrix:'Matriz',treasure:'Tesouro'};
const svg=(kind)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({check:'<path d="m5 12 4 4L19 6"/>',roll:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M12 2v10"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',book:'<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM7 16h12M8 7h7M8 10h5"/>',cross:'<path d="m6 6 12 12M18 6 6 18"/>'}[kind]??'')+'</svg>';
const field=(label,control)=>'<label><span>'+escape(label)+'</span>'+control+'</label>';
const select=(name,options,selected)=>'<select name="'+name+'">'+options.map(o=>'<option value="'+escape(o.value)+'"'+(String(o.value)===String(selected)?' selected':'')+'>'+escape(o.label)+'</option>').join('')+'</select>';
function defaults(actor,product){const current=professionLevel(actor,product.profession),max=Math.min(product.levels.max,current+1),level=Math.max(product.levels.min,Math.min(current||1,max));return {level,baseDC:product.dc?.min,materialLevel:level,element:'',firstRecipe:!actor.flags?.[scope]?.professions?.[product.profession]?.craftedLevels?.[product.id+'-'+level],prerequisitesConfirmed:false};}
function checksHtml(checks,results=[],active=-1,finished=false){return '<ol class="iw-craft-checks">'+checks.map((c,i)=>{const r=results[i],passed=r&&r.total>=r.dc,status=r?(passed?'passed':'failed'):i===active?'rolling':finished?'skipped':'pending';return '<li data-check-index="'+i+'" data-status="'+status+'"><span class="iw-craft-check-mark">'+(r?svg(passed?'check':'cross'):i+1)+'</span><div><strong>'+escape(c.label)+'</strong><small>'+ (r?(passed?'Aprovado':'Não atingiu a CD'):status==='rolling'?'Rolando…':status==='skipped'?'Não realizado':'Aguardando')+'</small></div><span class="iw-craft-check-score">'+(r?'<b>'+r.total+'</b> / ':'')+'CD '+c.dc+'</span></li>';}).join('')+'</ol>';}
function planHtml(preview){if(!preview.plan)return '<p class="iw-craft-guidance">'+escape(preview.issues[0])+'</p>';const p=preview.plan;return '<div class="iw-craft-plan-heading"><h3>Plano da tentativa</h3><span>'+ (p.entry?'Ingresso no ofício':p.advancement?'Avanço profissional':'Produção')+'</span></div><dl class="iw-craft-facts"><div><dt>Ofício atual</dt><dd>'+p.currentLevel+'<small> / 10</small></dd></div><div><dt>Custo de avanço</dt><dd>'+p.pcCost+'<small> PC</small></dd></div><div><dt>Tempo de trabalho</dt><dd>'+(p.durationHours===null?'<span>Acordado com o narrador</span>':p.durationHours+'<small> h</small>')+'</dd></div></dl>'+checksHtml(preview.checks)+'<p class="iw-craft-guidance">'+(p.pcCost?'O custo de avanço é registrado ao concluir a tentativa, mesmo na falha.':'Esta produção não consome PC de avanço.')+'</p>';}
/** A read-only preview, always using the same rules as the actual native attempt. */
export function craftWorkbenchPreview(actor,product,request={}){
 const input={...defaults(actor,product),...request},issues=[];let plan=null,recipe=null,checks=[];
 try{
  const level=Number(input.level),baseDC=product.kind==='treasure'?treasureCraftingDC({equipmentLevel:level,equivalentLevel:Number(input.materialLevel)}):input.baseDC;
  plan=professionCraftingPlan(actor,{profession:product.profession,product,level,firstRecipe:input.firstRecipe,advancement:level>professionLevel(actor,product.profession),baseDC});
  checks=[...plan.checks.map(c=>({...c,dc:plan.dc})),...(plan.qualityCheck?[{...plan.qualityCheck,label:plan.qualityCheck.label+' · qualidade'}]:[])];
  recipe=professionRecipe(product.id,level,input.element);
  if(recipe?.requiresElement)issues.push('Escolha o elemento da receita.');
  if(!plan.pcAffordable)issues.push('PC insuficientes: a tentativa exige '+plan.pcCost+' PC.');
  if(plan.pending.length||plan.dc===null)issues.push('Defina a CD da receita.');
  if(plan.entry&&product.profession==='alchemy'&&Number(actor.system?.conceitos?.fogo?.level??0)<1)issues.push('O ingresso exige Conceito do Fogo de nível 1.');
 }catch(error){issues.push(error.message);}
 if(actor.isOwner===false||actor.limited)issues.push('Você não tem permissão para realizar esta criação.');
 if(!input.prerequisitesConfirmed)issues.push('Confirme os requisitos e os materiais para iniciar.');
 return {input,plan,recipe,checks,issues,ready:issues.length===0};
}
/** Product artwork and an ingredient ledger remain visible through setup, native rolls and outcome. */
export function craftWorkbenchContent(actor,product){
 if(!product?.levels)throw Error('Esta ferramenta não possui uma receita de fabricação.');
 const input=defaults(actor,product),current=professionLevel(actor,product.profession),maximum=Math.min(product.levels.max,current+1),preview=craftWorkbenchPreview(actor,product,input),guide=PROFESSION_GUIDES[product.profession];
 const levels=Array.from({length:Math.max(0,maximum-product.levels.min+1)},(_v,n)=>{const level=product.levels.min+n;return {value:level,label:(product.kind==='treasure'?TREASURE_RARITIES[level].label:'Nível '+level)+(level>current?' · avanço':'')};});
 let controls=field('Nível do produto',select('product-level',levels,input.level));
 if(product.dc?.min!==product.dc?.max)controls+=field('CD base da receita','<input name="base-dc" type="number" min="'+product.dc.min+'" max="'+product.dc.max+'" value="'+product.dc.min+'">');
 if(product.kind==='treasure')controls+=field('Nível dos materiais','<input name="material-level" type="number" min="1" max="10" value="'+input.materialLevel+'">');
 if(isElementalRecipe(product.id))controls+=field('Elemento',select('product-element',[{value:'',label:'Escolha o elemento'},...RECIPE_ELEMENTS.map(e=>({value:e.label,label:e.label}))],''));
 let recipeHtml;try{recipeHtml=professionRecipeHtml(product.id,input.level);}catch(error){recipeHtml='<p>'+escape(error.message)+'</p>';}
 return '<div class="iw-craft-workbench" data-craft-state="ready"><header class="iw-craft-hero"><div class="iw-craft-art-frame"><img class="iw-craft-product-art" src="'+escape(professionProductImage(product))+'" alt="'+escape(product.name)+'" width="112" height="112"></div><div class="iw-craft-title"><p>'+escape(guide?.title??labels[product.kind])+'</p><h2>'+escape(product.name)+'</h2><span class="iw-craft-subtitle">'+escape(labels[product.kind])+'<span data-craft-product-level> · Nível '+input.level+'</span></span>'+(product.kind==='pill'?'<small><strong>Qualidade:</strong> usa somente a margem do teste de Criação. Os demais testes exigidos precisam passar.</small>':'<small>Prepare os componentes e acompanhe os testes da sua criação.</small>')+'</div></header><div class="iw-craft-options" data-craft-options>'+controls+'<label class="iw-craft-first-recipe"><input type="checkbox" name="first-recipe"'+(input.firstRecipe?' checked':'')+'><span>Primeira produção desta receita<small>Alquimia e Matrizes levam 10 vezes mais tempo.</small></span></label></div><div class="iw-craft-columns"><div class="iw-craft-ingredients" data-profession-recipe-preview>'+recipeHtml+'</div><aside class="iw-craft-plan" data-craft-plan>'+planHtml(preview)+'</aside></div><details class="iw-craft-requirements"><summary>'+svg('book')+'Requisitos e preparo</summary><p>'+escape(guide?.requiredTalent??'')+'. Materiais, receita, ferramentas e tempo são conferidos com o narrador. Os custos externos são resolvidos antes da tentativa.</p></details><label class="iw-craft-confirmation"><input type="checkbox" name="prerequisites" required><span>Confirmei os requisitos, os materiais, as ferramentas e o tempo de trabalho com o narrador.</span></label><section class="iw-craft-attempt" aria-label="Acompanhamento da criação"><div class="iw-craft-status-row"><strong data-craft-status>Preparar a tentativa</strong><span data-craft-count>'+preview.checks.length+' testes</span></div><div class="iw-craft-progress" role="progressbar" aria-label="Etapas da tentativa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-craft-progress-fill></span></div><p class="iw-craft-status-detail" data-craft-message role="status" aria-live="polite">'+escape(preview.issues[0]??'Tudo pronto para iniciar.')+'</p><div data-craft-result hidden></div></section></div>';
}
const nextPaint=()=>typeof globalThis.requestAnimationFrame==='function'?new Promise(resolve=>{let settled=false;const done=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve();};const timer=setTimeout(done,40);globalThis.requestAnimationFrame(()=>globalThis.requestAnimationFrame(done));}):Promise.resolve();
/** Bind this specific dialog; no actor sheet rerender and no new game mechanics. */
export function bindCraftWorkbench(app,actor,product,{perform=performProfessionCraft,paint=nextPaint,onReset}={}){
 const host=app.element,root=host.querySelector('.iw-craft-workbench');if(!root)return null;
 const q=selector=>root.querySelector(selector),button=host.querySelector('[data-action="attempt"]'),closeButton=host.querySelector('[data-action="dismiss"]');
 const state={phase:'ready',busy:false,closed:false,terminal:false,outcome:null,preview:null,results:[]};
 const input=name=>q('[name="'+name+'"]');
 const collect=()=>({productId:product.id,level:Number(input('product-level')?.value),baseDC:input('base-dc')?Number(input('base-dc').value):undefined,materialLevel:input('material-level')?Number(input('material-level').value):undefined,element:input('product-element')?.value??'',firstRecipe:!!input('first-recipe')?.checked,prerequisitesConfirmed:!!input('prerequisites')?.checked});
 const text=(selector,value)=>{const node=q(selector);if(node)node.textContent=value;};
 const setLabel=label=>{if(button)(button.querySelector('span')??button).textContent=label;};
 const setProgress=value=>{const bar=q('[role="progressbar"]');bar?.setAttribute('aria-valuenow',String(value));if(q('[data-craft-progress-fill]'))q('[data-craft-progress-fill]').style.width=value+'%';};
 const freeze=disabled=>{for(const field of root.querySelectorAll('input,select'))field.disabled=disabled;};
 const displayMessage=(message,error=false)=>{text('[data-craft-message]',message);q('[data-craft-message]')?.classList.toggle('is-error',error);};
 function refresh(){
  if(state.closed||state.busy||state.terminal)return;
  const data=collect();if(data.baseDC===undefined)delete data.baseDC;if(data.materialLevel===undefined)delete data.materialLevel;
  const preview=state.preview=craftWorkbenchPreview(actor,product,data);
  q('[data-craft-plan]').innerHTML=planHtml(preview);
  try{q('[data-profession-recipe-preview]').innerHTML=professionRecipeHtml(product.id,data.level,data.element);}catch(error){q('[data-profession-recipe-preview]').textContent=error.message;}
  text('[data-craft-product-level]',' · Nível '+data.level+(data.element?' · '+data.element:''));
  for(const link of q('[data-profession-recipe-preview]').querySelectorAll('[data-iw-material]'))link.setAttribute('href','#');
  for(const row of q('[data-profession-recipe-preview]').querySelectorAll('li')){const price=row.querySelector('.iw-recipe-price'),quantity=row.querySelector('.iw-recipe-quantity');if(price&&quantity)quantity.title=quantity.textContent+' unidades · '+price.title+' · subtotal '+price.textContent;}
  text('[data-craft-count]',preview.checks.length+(preview.checks.length===1?' teste':' testes'));displayMessage(preview.issues[0]??'Tudo pronto para iniciar.');
  if(button)button.disabled=!preview.ready;
 }
 function renderRolls(event){const checks=state.preview?.checks??[];const list=q('.iw-craft-checks');if(list)list.outerHTML=checksHtml(checks,state.results,event.phase==='rolling'?event.index:-1,event.phase==='complete'||event.phase==='cancelled');}
 async function progress(event){
  if(state.closed)return;
  state.phase=event.phase;root.dataset.craftState=event.phase;
  if(event.phase==='prepared'){state.results=[];text('[data-craft-status]','Tentativa em andamento');displayMessage('Preparando os testes.');setProgress(4);q('.iw-craft-attempt')?.scrollIntoView?.({block:'nearest',behavior:'instant'});}
  if(event.phase==='rolling'){text('[data-craft-status]',event.check.label??'Rolagem');displayMessage('Resolvendo '+(event.check.label??'o teste')+' · CD '+event.check.dc+'.');text('[data-craft-count]',(event.index+1)+' / '+event.totalChecks);setProgress(Math.round(8+event.completedChecks/event.totalChecks*76));}
  if(event.phase==='rolled'){state.results[event.index]={total:event.rollTotal,dc:event.check.dc};displayMessage((event.check.label??'Teste')+': '+event.rollTotal+' / CD '+event.check.dc+'.');setProgress(Math.round(8+event.completedChecks/event.totalChecks*76));}
  if(event.phase==='committing'){text('[data-craft-status]','Registrando resultado');displayMessage('Concluindo a tentativa e atualizando a ficha.');setProgress(94);}
  renderRolls(event);await paint();
 }
 function showOutcome(outcome){
  state.outcome=outcome;state.terminal=true;state.phase=outcome.cancelled?'cancelled':'complete';root.dataset.craftState=state.phase;
  freeze(true);setLabel('Nova tentativa');if(button)button.disabled=false;
  if(outcome.cancelled){text('[data-craft-status]','Tentativa interrompida');displayMessage('A tentativa foi interrompida antes da gravação.');setProgress(0);return;}
  const success=outcome.success,quality=outcome.quality?.label,pc=outcome.plan.pcCost;
  text('[data-craft-status]',success?'Criação concluída':'Criação sem sucesso');text('[data-craft-count]',outcome.totals.length+(outcome.totals.length===1?' teste realizado':' testes realizados'));setProgress(100);
  displayMessage(success?'O produto foi adicionado ao inventário.':('Nenhum produto foi criado.'+(pc?' O custo de '+pc+' PC da tentativa foi registrado.':'')));
  q('[data-craft-result]').hidden=false;
  q('[data-craft-result]').innerHTML='<div class="iw-craft-outcome" data-success="'+success+'">'+svg(success?'check':'cross')+'<div><strong>'+(success?outcome.quantity+' × '+escape(product.name):'O preparo não foi concluído')+'</strong><span>'+(success?(quality?'Qualidade '+escape(quality)+' · ':'')+'Nível '+outcome.plan.targetLevel:'Revise os testes antes de tentar novamente.')+'</span></div>'+(success&&outcome.documentId?'<button type="button" data-craft-open-result>'+svg('arrow')+'Ver item</button>':'')+'</div>';
  renderRolls({phase:'complete'});q('.iw-craft-attempt')?.scrollIntoView?.({block:'nearest',behavior:'instant'});
 }
 async function submit(){
  if(state.closed||state.busy)return false;
  if(state.terminal){await onReset?.();return false;}
  refresh();if(!state.preview?.ready){displayMessage(state.preview?.issues[0]??'Revise os dados da receita.',true);return false;}
  const request=collect();state.busy=true;freeze(true);if(button)button.disabled=true;if(closeButton)closeButton.disabled=false;
  try{const outcome=await perform(actor,request,{onProgress:progress,shouldCancel:()=>state.closed});if(state.closed)return outcome;if(!outcome){freeze(false);state.busy=false;refresh();displayMessage('Outra tentativa está em andamento para esta criatura. Aguarde a conclusão.',true);return outcome;}showOutcome(outcome);return outcome;}
  catch(error){if(!state.closed){state.terminal=true;state.phase='error';root.dataset.craftState='error';text('[data-craft-status]','Tentativa não concluída');displayMessage(error.message??String(error),true);setLabel('Revisar tentativa');if(button)button.disabled=false;}return false;}
  finally{state.busy=false;}
 }
 root.addEventListener('change',event=>{if(state.busy||state.terminal)return;if(event.target?.name==='product-level'){const level=Number(input('product-level')?.value);input('first-recipe').checked=!actor.flags?.[scope]?.professions?.[product.profession]?.craftedLevels?.[product.id+'-'+level];}refresh();});
 root.addEventListener('click',async event=>{
  const material=event.target.closest?.('[data-iw-material]');if(material){event.preventDefault();event.stopPropagation();try{const doc=await globalThis.fromUuid?.(material.dataset.uuid);doc?.sheet?.render(true);}catch(error){displayMessage(error.message,true);}return;}
  if(event.target.closest?.('[data-craft-open-result]')){event.preventDefault();try{const doc=actor.items?.get(state.outcome?.documentId);if(!doc)throw Error('O produto não está mais no inventário.');await doc.sheet?.render(true);}catch(error){displayMessage(error.message,true);}}
 });
 setLabel('Iniciar tentativa');refresh();return {submit,refresh,close:()=>{state.closed=true;},state};
}
/** Native DialogV2 remains open after submission so the completed lot can be inspected. */
export async function openProfessionCraftWorkbench(sheet,product){
 if(sheet.isEditable===false||sheet.actor?.isOwner===false||sheet.actor?.limited)return null;
 let controller;const hooked=new WeakSet();
 const bind=app=>{
  if(!hooked.has(app)){
   const nativeClose=app.close;
   app.close=function(...args){controller?.close();return nativeClose.apply(this,args);};
   hooked.add(app);
  }
  controller?.close();
  controller=bindCraftWorkbench(app,sheet.actor,product,{onReset:async()=>{
   controller?.close();
   const content=app.element.querySelector('.dialog-content');
   content.innerHTML=craftWorkbenchContent(sheet.actor,product);content.scrollTop=0;
   // Native _onSubmit restores its captured buttons after the callback. Replace only this footer
   // so those old references cannot re-enable the newly unconfirmed attempt.
   for(const old of app.element.querySelectorAll('.form-footer button')){const fresh=old.cloneNode(true);fresh.disabled=false;old.replaceWith(fresh);}
   bind(app);content.querySelector('select,input')?.focus({preventScroll:true});
  }});
 };
 return foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-profession-dialog','iw-craft-dialog'],position:{width:760},window:{title:'Criar · '+product.name},form:{closeOnSubmit:false},modal:false,content:craftWorkbenchContent(sheet.actor,product),
  render:(_event,app)=>bind(app),
  buttons:[{action:'attempt',label:'Iniciar tentativa',default:true,callback:()=>controller?.submit()},{action:'dismiss',label:'Fechar',type:'button',callback:(_event,_button,app)=>{controller?.close();return app.close();}}],rejectClose:false,close:()=>{controller?.close();return null;}});
}
