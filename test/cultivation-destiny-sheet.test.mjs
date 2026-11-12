import {registerCultivationDestinyAuthority} from '../module/systems/cultivation-destiny-authority.mjs';
import {createCultivationDestinyRuntime} from '../module/systems/cultivation-destiny-runtime.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {withElementalActorLock} from '../module/systems/elemental-runtime.mjs';
let api={};
try { api=await import('../module/applications/actor/jj/cultivation-destiny-sheet.mjs'); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
const S='Immortals-system';
let answer=false,config,warnings=[],infos=[],rolls=[];
function apply(actor,patch) {
 for(const [path,value] of Object.entries(patch)) {
  const keys=path.split('.');let obj=actor;
  for(const key of keys.slice(0,-1))obj=obj[key]??=( {} );
  const last=keys.at(-1);if(last.startsWith('-='))delete obj[last.slice(2)];else obj[last]=structuredClone(value);
 }
}
function owner(key=null) {
 answer=false;config=undefined;warnings=[];infos=[];rolls=[];
 globalThis.ui={notifications:{warn:m=>warnings.push(m),info:m=>infos.push(m)}};
 const user={id:'owner',isGM:true,active:true};const users=[user];users.activeGM=user;users.get=id=>users.find(u=>u.id===id);globalThis.game={user,users,socket:{on(){},emit(){}}};
 let nextId=0;
 globalThis.foundry={utils:{randomID:()=>String(++nextId).padStart(16,'0')},applications:{api:{DialogV2:{wait:async c=>{config=c;return typeof answer==='function'?answer(c):answer;}}}}};
 const actor={id:'hero',uuid:'Actor.hero',type:'character',isOwner:true,limited:false,
  system:{cultivation:{rank:3}},flags:{[S]:{cultivationDestiny:{key,revision:2,story:''}}},items:[],
  itemTypes:{class:[{type:'class',system:{identifier:'cultivador'}}]},
  async update(patch){apply(this,patch);return this;},
  async performBulkUpdate(change){apply(this,change.actor??{});this.items=this.items.filter(i=>!change.delete?.includes(i._id??i.id));this.items.push(...(change.create??[]));return this;},
  async rollSkill(...args){rolls.push(['skill',...args]);},async rollAbilityCheck(...args){rolls.push(['ability',...args]);}};
 registerCultivationDestinyAuthority(createCultivationDestinyRuntime());
 return {actor,isEditable:true};
}
function form(values={}) {
 const controls=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value:typeof value==='boolean'?'on':value,checked:value===true}]));
 return {querySelector(selector){if(selector==='[data-destiny-form]')return this;const name=selector.match(/\[name="([^"]+)"\]/)?.[1];return controls[name]??null;},
 querySelectorAll(selector){const name=selector.match(/\[name="([^"]+)"\]/)?.[1];return (values[name]??[]).map(value=>({value:String(value),checked:true}));}};
}
function submit(values) {return c=>c.buttons.find(b=>b.action==='save').callback({}, {}, {element:form(values)});}
const action=name=>{assert.equal(typeof api.cultivationDestinyActions?.[name],'function','destiny action is implemented');return api.cultivationDestinyActions[name];};

test('panel has explicit empty choice, owner controls and escaped private narrative',()=>{
 const sheet=owner();assert.equal(typeof api.prepareCultivationDestinyContext,'function');
 let view=api.prepareCultivationDestinyContext(sheet);assert.equal(view.active,true);assert.equal(view.key,null);assert.match(view.html,/Talento que desafia os Céus/);assert.match(view.html,/Escolher destino/);
 sheet.actor.flags[S].cultivationDestiny={key:'immortal-soul',revision:2,story:'<img src=x onerror=evil()>',records:[{kind:'resource-contribution',name:'<script>bad</script>',story:'<b>relato</b>'}]};
 view=api.prepareCultivationDestinyContext(sheet);assert.match(view.html,/&lt;img/);assert.match(view.html,/&lt;script&gt;/);assert.doesNotMatch(view.html,/<img|<script>|<b>relato/);assert.match(view.html,/<details/);assert.match(view.html,/<svg/);
 sheet.actor.isOwner=false;view=api.prepareCultivationDestinyContext(sheet);assert.doesNotMatch(view.html,/data-action=/);
 sheet.actor.limited=true;assert.equal(api.prepareCultivationDestinyContext(sheet).active,false);
 sheet.actor.limited=false;sheet.actor.type='npc';assert.equal(api.prepareCultivationDestinyContext(sheet).active,false);
});

test('lineage panel reports sealed and awakened states without changing species',()=>{
 const sheet=owner('divine-lineage');Object.assign(sheet.actor.flags[S].cultivationDestiny,{lineageId:'phoenix',ability:'con'});sheet.actor.system.cultivation.rank=1;
 assert.match(api.prepareCultivationDestinyContext(sheet).html,/Linhagem selada/);
 sheet.actor.system.cultivation.rank=3;assert.match(api.prepareCultivationDestinyContext(sheet).html,/Linhagem desperta/);assert.equal(sheet.actor.items.length,0);
});

test('choice dialog previews six choices, requires essence ability and commits only on save',async()=>{
 const sheet=owner();await action('cultivationChooseDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,null);
 assert.equal((config.content.match(/data-destiny-preview=/g)??[]).length,6);assert.match(config.content,/name="story"/);assert.match(config.content,/name="ability"/);assert.match(config.content,/Resultado 16/);assert.equal(config.buttons.filter(b=>b.action==='cancel').length,1);assert.equal(config.buttons.some(b=>b.action==='close'),false);
 answer=submit({key:'divine-lineage',lineageId:'dragon',story:'Herança',basicElement:'fogo',intermediateElement:'gelo',ability:''});await action('cultivationChooseDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,null);assert.match(warnings.at(-1),/atributo/i);
 answer=submit({key:'own-origin',story:'Uma relíquia'});await action('cultivationChooseDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,'own-origin');assert.equal(sheet.actor.flags[S].cultivationDestiny.story,'Uma relíquia');
});

test('Taotie space affinity needs explicit confirmed result and fixed affinities are preserved',async()=>{
 const sheet=owner();answer=submit({key:'divine-lineage',lineageId:'taotie',ability:'wis',taotieSpace:true,taotieConfirmed:false});await action('cultivationChooseDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,null);assert.match(warnings.at(-1),/16/);
 answer=submit({key:'divine-lineage',lineageId:'taotie',ability:'wis',taotieSpace:true,taotieConfirmed:true});await action('cultivationChooseDestiny').call(sheet);assert.deepEqual(sheet.actor.flags[S].cultivationDestiny.elements,['espaco']);assert.equal(sheet.actor.items.filter(i=>i.flags?.[S]?.cultivationDestinyEssence).length,1);
 answer=submit({key:'divine-lineage',lineageId:'phoenix',ability:'con'});await action('cultivationChooseDestiny').call(sheet);assert.deepEqual(sheet.actor.flags[S].cultivationDestiny.elements,['fogo']);assert.equal(sheet.actor.items.filter(i=>i.flags?.[S]?.cultivationDestinyEssence).length,1);
});

test('changed permission or revision while a dialog is open cancels the choice',async()=>{
 const sheet=owner();answer=()=>{sheet.actor.isOwner=false;return {key:'reincarnated',story:'Outra vida'};};await action('cultivationChooseDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,null);
 sheet.actor.isOwner=true;answer=()=>{sheet.actor.flags[S].cultivationDestiny.revision++;return {key:'reincarnated'};};await action('cultivationChooseDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,null);assert.match(warnings.at(-1),/mudou/);
});

test('record form separates realm numbers and classification and requires narrator confirmation',async()=>{
 const sheet=owner('immortal-soul');await action('cultivationRecordDestiny').call(sheet);assert.match(config.content,/name="rank"/);assert.match(config.content,/name="rarity"/);assert.match(config.content,/name="confirmedByNarrator"/);
 answer=submit({kind:'combat-manual',rank:'3',rarity:'terra',quality:'inferior',name:'Passo',story:'Ensinado',confirmedByNarrator:false});await action('cultivationRecordDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.records,undefined);
 answer=submit({kind:'combat-manual',rank:'3',rarity:'terra',quality:'inferior',name:'Passo',confirmedByNarrator:true});await action('cultivationRecordDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.records[0].rank,3);assert.equal(sheet.actor.flags[S].cultivationDestiny.records[0].rarity,'terra');
 await action('cultivationRecordDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.records.length,1);assert.match(warnings.at(-1),/já foi registrado/);
});

test('legacy exchange carries offered classification and blocks opening before realm three',async()=>{
 const sheet=owner('supreme-legacy');sheet.actor.system.cultivation.rank=2;await action('cultivationRecordDestiny').call(sheet);assert.equal(config,undefined);
 sheet.actor.system.cultivation.rank=3;answer=submit({kind:'legacy-exchange',rank:'3',rarity:'sagrado',quality:'comum',name:'Jade recebido',offeredName:'Jade oferecido',offeredRarity:'sagrado',offeredQuality:'comum',confirmedByNarrator:true});await action('cultivationRecordDestiny').call(sheet);assert.equal(sheet.actor.flags[S].cultivationDestiny.records[0].offeredRarity,'sagrado');assert.equal(sheet.actor.flags[S].cultivationDestiny.records[0].personalUseOnly,true);
});

test('two mantras feed only the selected mantra into daily cultivation and preserve zero',async()=>{
 const sheet=owner('unrivaled-genius');answer=submit({mantraName0:'Região',mantraText0:'Primeiro',mantraRate0:'',mantraName1:'Pausa',mantraText1:'Segundo',mantraRate1:'0',activeMantra:'1'});
 await action('cultivationManageMantras').call(sheet);assert.equal(sheet.actor.flags[S].mantraText,'Segundo');assert.equal(sheet.actor.flags[S].manualEssencePerDay,0);assert.equal(sheet.actor.flags[S].divineManual.mantras[0].essencePerDay,null);
 answer=submit({mantraName0:'Região',mantraText0:'Primeiro',mantraRate0:'',mantraName1:'Pausa',mantraText1:'Segundo',mantraRate1:'0',activeMantra:'0'});await action('cultivationManageMantras').call(sheet);assert.equal('manualEssencePerDay' in sheet.actor.flags[S],false);
});

test('stale manual snapshot and changed destination prevent overwriting a concurrent update',async()=>{
 const sheet=owner('unrivaled-genius');answer=()=>{sheet.actor.flags[S].divineManual={mantras:[{name:'Concorrente',text:'Novo',essencePerDay:7}],activeMantra:0};return {mantras:[{name:'Velho',text:'Velho',essencePerDay:0}],activeMantra:0};};await action('cultivationManageMantras').call(sheet);assert.equal(sheet.actor.flags[S].divineManual.mantras[0].name,'Concorrente');assert.match(warnings.at(-1),/mudou/);
 answer=()=>{sheet.actor.flags[S].cultivationDestiny.key='own-origin';return {mantras:[{name:'Outro'}],activeMantra:0};};await action('cultivationManageMantras').call(sheet);assert.equal(sheet.actor.flags[S].divineManual.mantras[0].name,'Concorrente');
});

test('genius activates selected historical properties without losing assimilation history',async()=>{
 const sheet=owner('unrivaled-genius');sheet.actor.flags[S].divineManual={assimilations:[{name:'<Primeiro>',properties:'<script>bad</script>',rank:'humano',quality:'inferior'},{name:'Segundo',properties:'Água',rank:'terra',quality:'comum'},{name:'Terceiro',properties:'Gelo',rank:'ceu',quality:'superior'}],activeAssimilations:[0,1]};
 answer=submit({activeManual:['1','2']});await action('cultivationManageManuals').call(sheet);assert.deepEqual(sheet.actor.flags[S].divineManual.activeAssimilations,[1,2]);assert.equal(sheet.actor.flags[S].divineManual.assimilations.length,3);assert.match(config.content,/&lt;Primeiro&gt;/);assert.doesNotMatch(config.content,/<script>/);
});

test('learning asks for explicit roll and base DC, applies reduction and does not grant knowledge',async()=>{
 const sheet=owner('unrivaled-genius');await action('cultivationLearningTest').call(sheet);assert.equal(rolls.length,0);assert.match(config.content,/name="baseDC"/);assert.match(config.content,/name="rollChoice"/);
 answer=submit({kind:'combat-manual',baseDC:'17',rollChoice:'skill:arc:con'});await action('cultivationLearningTest').call(sheet);assert.deepEqual(rolls,[['skill',{skill:'arc',ability:'con',target:14}]]);assert.equal(sheet.actor.flags[S].divineManual,undefined);
 answer=submit({kind:'proficiency',baseDC:'12',rollChoice:'ability:wis'});await action('cultivationLearningTest').call(sheet);assert.deepEqual(rolls.at(-1),['ability',{ability:'wis',target:9}]);
 answer=submit({kind:'combat-manual',baseDC:'',rollChoice:'skill:arc:con'});await action('cultivationLearningTest').call(sheet);assert.equal(rolls.length,2);
});

test('read-only sheet cannot open any editing dialog or initiate learning',async()=>{
 const sheet=owner('unrivaled-genius');sheet.isEditable=false;for(const name of ['cultivationChooseDestiny','cultivationRecordDestiny','cultivationManageMantras','cultivationManageManuals','cultivationLearningTest'])await action(name).call(sheet);assert.equal(config,undefined);assert.equal(rolls.length,0);
});

test('destiny interface uses existing palette, compact responsive layout and no motion or emoji',async()=>{
 const css=await readFile(new URL('../less/wuxia-cultivation-destiny.css',import.meta.url),'utf8');assert.doesNotMatch(css,/#(?:[a-f0-9]{3}|[a-f0-9]{6})\b|rgba?\(|hsla?\(|animation\s*:|transition\s*:/i);assert.match(css,/min-width:\s*0/);assert.match(css,/Segoe UI/);assert.match(css,/@media/);
 const tokens=new Set((await readFile(new URL('../less/wuxia-palette.css',import.meta.url),'utf8')).match(/--iw-color-[\w-]+/g));for(const token of css.match(/--iw-color-[\w-]+/g))assert(tokens.has(token),token);
 assert.doesNotMatch(api.prepareCultivationDestinyContext(owner('unrivaled-genius')).html,/\p{Extended_Pictographic}/u);
});


test('choice preview changes without actor writes and disables hidden required lineage fields',async()=>{
 const sheet=owner();await action('cultivationChooseDestiny').call(sheet);
 const listeners={},key={value:'own-origin',addEventListener:(type,fn)=>listeners.key=fn},lineage={value:'phoenix',addEventListener:(type,fn)=>listeners.lineage=fn};
 const fields={hidden:false,disabled:false},dragon={},taotie={},fixed={},previews=[{dataset:{destinyPreview:'own-origin'},hidden:true},{dataset:{destinyPreview:'divine-lineage'},hidden:true}];
 const nodes={'[name="key"]':key,'[name="lineageId"]':lineage,'[data-destiny-lineage-fields]':fields,'[data-destiny-dragon]':dragon,'[data-destiny-taotie]':taotie,'[data-destiny-fixed-elements]':fixed};
 const root={querySelector:s=>nodes[s]??null,querySelectorAll:()=>previews};
 config.render({}, {element:{querySelector:()=>root}});
 assert.equal(fields.hidden,true);assert.equal(fields.disabled,true);assert.equal(previews[0].hidden,false);assert.equal(previews[1].hidden,true);
 key.value='divine-lineage';listeners.key();assert.equal(fields.disabled,false);assert.equal(previews[1].hidden,false);assert.equal(fixed.textContent,'Afinidades: Fogo');
 lineage.value='dragon';listeners.lineage();assert.equal(dragon.hidden,false);assert.equal(taotie.hidden,true);assert.equal(sheet.actor.flags[S].cultivationDestiny.key,null);
});

test('queued mantra write revalidates permission and concurrent data after acquiring the actor lock',async()=>{
 const sheet=owner('unrivaled-genius');let unlock;const barrier=new Promise(resolve=>unlock=resolve);
 const held=withElementalActorLock(sheet.actor,'other-operation',async()=>barrier);
 answer={mantras:[{name:'Stale',text:'Stale',essencePerDay:9}],activeMantra:0};
 const pending=action('cultivationManageMantras').call(sheet);await new Promise(resolve=>setImmediate(resolve));
 sheet.actor.flags[S].divineManual={mantras:[{name:'Concurrent',text:'New',essencePerDay:3}],activeMantra:0};
 unlock();await held;await pending;assert.equal(sheet.actor.flags[S].divineManual.mantras[0].name,'Concurrent');assert.match(warnings.at(-1),/mudou/);
 let unlockNext;const heldNext=withElementalActorLock(sheet.actor,'other-operation',async()=>new Promise(resolve=>unlockNext=resolve));
 const next=action('cultivationManageMantras').call(sheet);await new Promise(resolve=>setImmediate(resolve));sheet.actor.isOwner=false;unlockNext();await heldNext;await next;assert.equal(sheet.actor.flags[S].divineManual.mantras[0].name,'Concurrent');assert.match(warnings.at(-1),/permissão/);
});
