import {loadNpcGeneratorCatalog,npcGeneratorArchetypes,previewNpcGenerator,createGeneratedNpc,validGeneratorEquipment} from '../../../systems/npc-generator-builder.mjs';
import {NPC_EQUIPMENT_FOLDERS,npcGeneratorEquipmentMatches,npcGeneratorProfileKey} from '../../../systems/npc-generator-catalogue.mjs';
import {activateNpcEquipmentBrowser} from './npc-generator-browser.mjs';
import {CULTIVATION_RANKS} from '../../../systems/cultivation-data.mjs';
import {NPC_CLASSIFICATIONS} from '../../../systems/legacy2-npc-classification.mjs';
import {BEAST_CORES} from '../../../systems/beast-cores.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const abilityNames={str:'Força',dex:'Agilidade',con:'Constituição',int:'Intelecto',wis:'Sabedoria',cha:'Presença'};
const ART='systems/Immortals-system/assets/wuxia/gerador-pdn/';
let current=null;
const grouped=rows=>[...new Set(rows.map(row=>row.folderNames?.at(-1)??'Mundo'))].map(label=>({label,options:rows.filter(row=>(row.folderNames?.at(-1)??'Mundo')===label)}));

export class NpcGeneratorApp extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'iw-npc-generator',tag:'div',classes:['iw-dialog','iw-npc-generator','theme-dark'],position:{width:1100,height:840},window:{title:'Gerador de PdNs',resizable:true},actions:{generate:this.onGenerate,cancel:this.onCancel,addEquipment:this.onAddEquipment,removeEquipment:this.onRemoveEquipment,openSource:this.onOpenSource,switchPanel:this.onSwitchPanel}};
 static PARTS={main:{template:'systems/Immortals-system/templates/apps/npc-generator.hbs',templates:['systems/Immortals-system/templates/actors/parts/jj2-icon.hbs'],scrollable:['.iw-ng-scroll','.iw-ng-equipment-list','.iw-ng-feature-results']}};
 constructor(options={}){
  super(options);this.catalog=null;this.catalogPromise=null;this.cache=new Map();
  this.draft={name:'',taxonomyUuid:'',archetypeUuid:'',rank:1,stage:1,category:'normal',nature:'',excludedFeatures:[],excludedEquipment:[],equipment:[],loot:{essence:false,core:false,elementId:'neutro'}};
  this.errors=[];this.busy=false;this.cancelled=false;this.pending=false;this.preview=null;this.natureEdited=false;
  this.gearFilters={folder:'base',query:'',source:''};this.panel='equipment';this.scrollPositions=new Map();this.openDetails=new Set(['loot','element-folders']);
 }
 async resolve(uuid){if(!this.cache.has(uuid))this.cache.set(uuid,Promise.resolve().then(()=>globalThis.fromUuid(uuid)).catch(()=>null));return this.cache.get(uuid);}
 normalizeSelection(){
  const tax=this.catalog?.taxonomies.find(t=>t.uuid===this.draft.taxonomyUuid),choices=npcGeneratorArchetypes(tax,this.catalog?.archetypes);
  if(tax&&!choices.some(a=>a.uuid===this.draft.archetypeUuid))this.draft.archetypeUuid=choices[0]?.uuid??'';
  if(tax&&!this.natureEdited)this.draft.nature=tax.families.includes('humanoides')||['humano','humanos'].includes(npcGeneratorProfileKey(tax))?'human':'beast';
  return {tax,choices};
 }
 capture(){
  for(const input of this.element?.querySelectorAll('[data-field]')??[]){if(input.type==='radio'&&!input.checked)continue;const key=input.dataset.field;this.draft[key]=['rank','stage'].includes(key)?Number(input.value):input.value;}
  for(const input of this.element?.querySelectorAll('[data-loot]')??[])this.draft.loot[input.dataset.loot]=input.type==='checkbox'?input.checked:input.value;
 }
 rememberView(){
  for(const node of this.element?.querySelectorAll('[data-scroll]')??[])this.scrollPositions.set(node.dataset.scroll,node.scrollTop);
  for(const detail of this.element?.querySelectorAll('[data-detail-key]')??[])detail.open?this.openDetails.add(detail.dataset.detailKey):this.openDetails.delete(detail.dataset.detailKey);
  const active=this.element?.ownerDocument?.activeElement;
  this.focusState=active?.dataset?.focusKey?{key:active.dataset.focusKey,start:active.selectionStart,end:active.selectionEnd}:null;
 }
 async _prepareContext(options){
  const context=await super._prepareContext(options);this.errors=[];
  try{this.catalog??=await(this.catalogPromise??=loadNpcGeneratorCatalog());}catch(error){this.catalogPromise=null;this.errors=[error.message];return {...context,errors:this.errors,catalogReady:false};}
  const {tax,choices}=this.normalizeSelection();this.preview=await previewNpcGenerator(structuredClone(this.draft),this.catalog,{resolve:uuid=>this.resolve(uuid)});
  const p=this.preview,d=this.draft,chosen=new Set(p.equipment.map(e=>e.uuid));
  const equipmentChoices=this.catalog.equipment.map(entry=>({...entry,folder:entry.folder??'base',selected:chosen.has(entry.uuid),hidden:!npcGeneratorEquipmentMatches({...entry,folder:entry.folder??'base'},this.gearFilters)}));
  const folders=NPC_EQUIPMENT_FOLDERS.map(folder=>({...folder,count:folder.key==='all'?equipmentChoices.length:equipmentChoices.filter(e=>e.folder===folder.key).length,selected:folder.key===this.gearFilters.folder}));
  const feature=entry=>({...entry,open:this.openDetails.has(entry.uuid)});
  const taxonomies=this.catalog.taxonomies.map(t=>({...t,selected:t.uuid===d.taxonomyUuid})),archetypes=choices.map(a=>({...a,selected:a.uuid===d.archetypeUuid}));
  return {...context,catalogReady:true,draft:d,preview:p,errors:this.errors,warnings:this.catalog.warnings,
   taxonomies,archetypes,taxonomyGroups:grouped(taxonomies),archetypeGroups:grouped(archetypes),
   archetypeHint:tax?(choices.length?'Arquétipos compatíveis com '+tax.name+'.':'Nenhum arquétipo compatível disponível.'):'Escolha uma taxonomia para ver os arquétipos.',
   realms:CULTIVATION_RANKS.map(r=>({value:r.rank,label:r.name,selected:r.rank===d.rank})),stages:[1,2,3].map(n=>({value:n,label:'Estágio '+n,selected:n===d.stage})),
   classifications:Object.entries(NPC_CLASSIFICATIONS).map(([value,c])=>({value,label:c.label,multiplier:String(c.hpMultiplier).replace('.',','),actions:c.actions,img:ART+value+'.webp',selected:value===d.category})),
   natures:[{value:'human',label:'Humano',selected:d.nature==='human'},{value:'beast',label:'Besta',selected:d.nature==='beast'}],
   currentFeatures:p.features.filter(f=>f.eligible).map(feature),futureFeatures:p.features.filter(f=>!f.eligible).map(feature),selectedFeatures:p.features.filter(f=>f.selected).length,
   abilities:Object.entries(p.stats?.abilities??{}).map(([key,value])=>({key,label:abilityNames[key],value})),equipmentChoices,
   baseFolder:folders.find(f=>f.key==='base'),armorFolder:folders.find(f=>f.key==='armor'),allFolder:folders.find(f=>f.key==='all'),equipmentFolders:folders.filter(f=>['base','armor','all'].includes(f.key)),elementFolders:folders.filter(f=>!['base','armor','all'].includes(f.key)&&f.count),
   equipmentSources:[...new Set(equipmentChoices.map(e=>e.pack))].sort((a,b)=>a.localeCompare(b,'pt-BR')),gearFilters:this.gearFilters,
   visibleEquipment:equipmentChoices.filter(e=>!e.hidden).length,folderLabel:folders.find(f=>f.selected)?.label,
   lootOpen:this.openDetails.has('loot'),elementFoldersOpen:this.openDetails.has('element-folders'),equipmentPanel:this.panel==='equipment',featuresPanel:this.panel==='features',headerImage:'systems/Immortals-system/assets/wuxia/ancestralidades-variantes-pintadas-v1/qilin.webp',
   elements:BEAST_CORES.map(e=>({value:e.id,label:e.label,selected:e.id===d.loot.elementId})),canGenerate:p.ready&&!this.busy,futureOpen:this.futureOpen===true,selectedTaxonomy:tax,selectedArchetype:choices.find(a=>a.uuid===d.archetypeUuid)};
 }
 async refresh(){
  this.rememberView();this.pending=true;if(this.refreshing)return this.refreshing;
  this.refreshing=(async()=>{while(this.pending&&!this.cancelled){this.pending=false;await this.render({force:true});}})().finally(()=>{this.refreshing=null;});return this.refreshing;
 }
 _onRender(context,options){
  super._onRender(context,options);const root=this.element;
  this.bindingController?.abort();this.bindingController=new AbortController();const signal=this.bindingController.signal,content=root.querySelector('.iw-ng-main');
  activateNpcEquipmentBrowser(root,this.gearFilters,{signal});
  content?.addEventListener('change',event=>{
   if(this.busy)return;const target=event.target;
   if(target.matches('[data-field],[data-loot]')){this.capture();if(target.dataset.field==='nature')this.natureEdited=true;void this.refresh();}
   else if(target.matches('[data-feature]')){const excluded=new Set(this.draft.excludedFeatures);target.checked?excluded.delete(target.dataset.feature):excluded.add(target.dataset.feature);this.draft.excludedFeatures=[...excluded];this.capture();void this.refresh();}
   else if(target.matches('[data-equipment-choice]')){this.capture();this.toggleGear(target.value,target.checked);void this.refresh();}
   else if(target.matches('[data-gear-field]')){
    this.capture();const uuid=target.closest('[data-gear-uuid]').dataset.gearUuid,gear=this.preview.equipment.find(e=>e.uuid===uuid);if(!gear)return;
    const overrides=new Map(this.draft.equipment.map(e=>[e.uuid,e]));overrides.set(uuid,{uuid,quantity:gear.quantity,equipped:gear.equipped,...overrides.get(uuid),inherited:overrides.get(uuid)?.inherited??gear.inherited,[target.dataset.gearField]:target.type==='checkbox'?target.checked:Number(target.value)});this.draft.equipment=[...overrides.values()];void this.refresh();
   }
  },{signal});
  content?.addEventListener('toggle',event=>{if(event.target.matches('.iw-ng-future'))this.futureOpen=event.target.open;}, {capture:true,signal});
  if(this.busy)for(const e of content?.querySelectorAll('button,input,select')??[])e.disabled=true;
  content?.addEventListener('dragover',event=>{if(event.target.closest('[data-equipment-drop]'))event.preventDefault();},{signal});
  content?.addEventListener('drop',async event=>{
   if(!event.target.closest('[data-equipment-drop]')||this.busy)return;event.preventDefault();
   try{const payload=JSON.parse(event.dataTransfer.getData('text/plain'));if(!payload.uuid)throw Error('Arraste uma arma ou armadura.');const doc=await this.resolve(payload.uuid);if(!validGeneratorEquipment(doc))throw Error('Arraste uma arma ou armadura.');this.capture();this.addGear(payload.uuid);await this.refresh();}catch(error){ui.notifications.warn(error.message);}
  },{signal});
  for(const node of root.querySelectorAll('[data-scroll]'))if(this.scrollPositions.has(node.dataset.scroll))node.scrollTop=this.scrollPositions.get(node.dataset.scroll);
  const focused=[...root.querySelectorAll('[data-focus-key]')].find(node=>node.dataset.focusKey===this.focusState?.key);
  if(focused){focused.focus({preventScroll:true});if(typeof focused.setSelectionRange==='function'&&typeof this.focusState.start==='number')try{focused.setSelectionRange(this.focusState.start,this.focusState.end);}catch{}}
  for(const image of root.querySelectorAll('img[data-fallback]'))image.addEventListener('error',()=>{if(image.getAttribute('src')!==image.dataset.fallback)image.src=image.dataset.fallback;},{signal});
 }
 addGear(uuid){const existing=this.draft.equipment.find(e=>e.uuid===uuid);if(existing)existing.inherited=false;else this.draft.equipment.push({uuid,quantity:1,equipped:true,inherited:false});this.draft.excludedEquipment=this.draft.excludedEquipment.filter(id=>id!==uuid);}
 toggleGear(uuid,checked){if(checked)this.addGear(uuid);else{this.draft.equipment=this.draft.equipment.filter(e=>e.uuid!==uuid);this.draft.excludedEquipment=[...new Set([...this.draft.excludedEquipment,uuid])];}}
 static async onAddEquipment(){if(this.busy)return;this.capture();const uuid=this.element.querySelector('[data-equipment-picker]')?.value;if(!uuid)return;this.addGear(uuid);await this.refresh();}
 static async onRemoveEquipment(_event,target){if(this.busy)return;this.capture();this.toggleGear(target.dataset.uuid,false);await this.refresh();}
 static onSwitchPanel(_event,target){
  if(this.busy)return;this.panel=target.dataset.panel;
  for(const button of this.element.querySelectorAll('[data-action="switchPanel"]'))button.setAttribute('aria-selected',String(button===target));
  for(const pane of this.element.querySelectorAll('[data-generator-panel]'))pane.hidden=pane.dataset.generatorPanel!==this.panel;
 }
 static async onOpenSource(_event,target){const doc=await this.resolve(target.dataset.uuid);if(doc?.sheet)doc.sheet.render({force:true});}
 static async onGenerate(){
  if(this.busy||this.cancelled)return;this.capture();this.normalizeSelection();this.busy=true;this.errors=[];
  for(const e of this.element.querySelector('.iw-ng-main')?.querySelectorAll('button,input,select')??[])e.disabled=true;
  try{const actor=await createGeneratedNpc(structuredClone(this.draft),this.catalog);if(!actor)throw Error('A criação do NPC não foi concluída.');this.completed=true;await this.close();actor.sheet?.render({force:true});ui.notifications.info('NPC criado: '+actor.name);return actor;}
  catch(error){this.errors=[error.message];ui.notifications.warn(error.message);}
  finally{this.busy=false;if(!this.cancelled){const errors=this.errors;await this.refresh();this.errors=errors;const alert=this.element.querySelector('[data-generator-error]');if(alert){alert.textContent=errors.join(' ');alert.hidden=!errors.length;}}}
 }
 static onCancel(){if(!this.busy)return this.close();}
 async close(options){if(this.busy&&!this.completed)return this;this.cancelled=true;this.bindingController?.abort();if(current===this)current=null;return super.close(options);}
}
export function openNpcGeneratorApp(){if(!game.user?.isGM){ui.notifications.warn('Apenas o Narrador pode gerar NPCs.');return null;}if(current&&!current.cancelled){current.bringToFront?.();return current;}current=new NpcGeneratorApp();current.render({force:true});return current;}

/** One dedicated row below Foundry's native create buttons; rerenders never duplicate it. */
export function mountNpcGeneratorButton(_app,html,open=openNpcGeneratorApp){
 const root=html instanceof HTMLElement?html:html?.[0];if(!root||!globalThis.game?.user?.isGM)return null;
 const actions=root.querySelector('.header-actions')??root.querySelector('.directory-header');if(!actions)return null;
 let row=root.querySelector('.iw-npc-generator-launcher');if(!row){row=root.ownerDocument.createElement('div');row.className='iw-npc-generator-launcher';}
 const legacy=root.querySelector('.jj-npc-gen-btn');if(legacy&&!row.contains(legacy))legacy.remove();actions.after(row);
 if(!row.firstElementChild){const button=root.ownerDocument.createElement('button');button.type='button';button.className='iw-npc-generator-button';button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 6 4 2 4-5 4 5 4-2-2 12-6 3-6-3Z M8 12h.01M16 12h.01M9 16l3 2 3-2"/></svg><span>Gerar NPC</span>';button.addEventListener('click',()=>open());row.append(button);}
 return row;
}

