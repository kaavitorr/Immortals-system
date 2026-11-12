import assert from 'node:assert/strict';
import {test} from 'node:test';
import {backgroundDocuments} from '../module/systems/wuxia-backgrounds.mjs';
import {grantCurrencyUpdate,grantItemQuantity} from '../module/systems/advancement-grants.mjs';
import {speciesDocuments} from '../module/systems/wuxia-species.mjs';
const scope='Immortals-system';
test('all backgrounds expose starting equipment, exact quantities, money and required choices in native progression',()=>{
 const docs=backgroundDocuments(),bgs=docs.filter(d=>d.type==='background');assert.equal(bgs.length,23);
 for(const bg of bgs){const advances=Object.values(bg.system.advancement),gear=advances.find(a=>a.configuration.currency?.gp);assert(gear,bg.name);assert.equal(gear.configuration.currency.gp,bg.flags[scope].background.startingGold);assert(gear.configuration.items.length||advances.some(a=>a.type==='ItemChoice'),bg.name);assert.equal(gear.level,0);}
 const assassin=bgs.find(d=>d.flags[scope].background.key==='matador-de-aluguel');assert(Object.values(assassin.system.advancement).some(a=>a.configuration.items?.some(i=>i.uuid.endsWith('dagger0000000000')&&i.quantity===5)));
 const actor=bgs.find(d=>d.flags[scope].background.key==='ator');assert(Object.values(actor.system.advancement).some(a=>a.configuration.items?.some(i=>i.uuid.endsWith('disguiseToolkit0')&&i.quantity===2)));
 for(const key of ['aprendiz-marcial','cacador-de-recompensas','jovem-mestre','servo-do-jovem-mestre','musico'])assert(Object.values(bgs.find(d=>d.flags[scope].background.key===key).system.advancement).some(a=>a.type==='ItemChoice'),key);
});
test('currency awards are repeat safe, add PO/PS/PC without changing legacy balances and reverse only the receipt',()=>{
 const actor={system:{currency:{gp:7,sp:8,cp:9,yen:456}}};
 assert.deepEqual(grantCurrencyUpdate(actor,{gp:100},{}),{'system.currency.gp':107});
 assert.deepEqual(grantCurrencyUpdate(actor,{gp:100},{currency:{gp:100}}),{});
 assert.deepEqual(grantCurrencyUpdate(actor,{gp:100},{currency:{gp:100}},{reverse:true}),{'system.currency.gp':0});
 assert.equal(actor.system.currency.yen,456);assert.equal(grantItemQuantity({quantity:5}),5);assert.equal(grantItemQuantity({}),1);
});
test('book species have separate native features, a single lineage/variant choice and cultivation unlocks',()=>{
 const docs=speciesDocuments(),races=docs.filter(d=>d.type==='race'),ids=new Set(docs.map(d=>d._id));assert.equal(races.length,3);assert.equal(ids.size,docs.length);
 for(const race of races){assert.equal(race.system.movement.units,'m');for(const a of Object.values(race.system.advancement)){for(const i of a.configuration.items??[])assert(ids.has(i.uuid.split('.').at(-1)),i.uuid);}}
 const human=races.find(d=>d.flags[scope].species.key==='humano'),half=races.find(d=>d.flags[scope].species.key==='meio-monstro'),demon=races.find(d=>d.flags[scope].species.key==='demonio');
 assert.equal(human.flags[scope].pvAdicional,4);assert.equal(half.flags[scope].pvAdicional,8);assert.equal(demon.flags[scope].pvAdicional,10);
 assert.equal(human.system.movement.speeds.walk,10);assert.equal(demon.system.movement.speeds.swim,4.5);
 assert.equal(Object.values(half.system.advancement).find(a=>a.title==='Ancestralidade').configuration.pool.length,8);
 assert.equal(Object.values(demon.system.advancement).find(a=>a.title==='Variante demoníaca').configuration.pool.length,3);
 assert(Object.values(half.system.advancement).some(a=>a.type==='ItemGrant'&&a.level===7));
 assert(Object.values(human.system.advancement).some(a=>a.type==='ItemChoice'&&a.configuration.choices?.[4]?.count===1));
 assert.equal(Object.values(demon.system.advancement).find(a=>a.type==='AbilityScoreImprovement').configuration.points,2);
});

import {speciesTalentAllowed,speciesGrantedTalentNames,pendingSpeciesSteps} from '../module/systems/species-progression.mjs';
import {qiTalentDocument} from '../module/systems/qi-talents-content.mjs';
import {backgroundAdvancementMigration} from '../module/systems/wuxia-species.mjs';
test('racial talent choices enforce actual Qi prerequisites and gifts are outside paid choices',()=>{
 const actor={type:'character',items:[],system:{cultivation:{rank:1,stage:1}}},basic=qiTalentDocument('aceleracao-marcial'),higher=qiTalentDocument('levitacao-de-qi');assert(speciesTalentAllowed(actor,basic));assert(!speciesTalentAllowed(actor,higher));
 const gifted=structuredClone(basic);gifted.flags[scope].speciesTalentGrant=true;actor.items.push(gifted);assert.deepEqual(speciesGrantedTalentNames(actor),[basic.name]);assert(!speciesTalentAllowed(actor,basic));assert(speciesTalentAllowed(actor,basic,{allowOwned:true}));
 actor.system.cultivation.rank=2;assert(speciesTalentAllowed(actor,higher));
});
test('older backgrounds receive additive progression while preserving edits and custom advancements',()=>{
 const canonical=backgroundDocuments().find(d=>d.type==='background'),old=structuredClone(canonical);old.flags[scope].backgroundRuleVersion=1;old.system.description.value='Editado';old.system.advancement={custom:{_id:'custom',type:'ItemGrant',configuration:{items:[]}}};
 const patch=backgroundAdvancementMigration(old,canonical);assert(patch);assert.equal(old.system.description.value,'Editado');assert.equal(patch['system.description.value'],undefined);assert.equal(patch['system.advancement.custom'],undefined);assert.equal(patch['flags.'+scope+'.backgroundRuleVersion'],2);assert.equal(backgroundAdvancementMigration(canonical,canonical),null);
});
test('normal cultivation queues only unreceived species progression, leaving initial awards alone',()=>{
 const seen=[],race={flags:{[scope]:{species:{key:'humano'}}}},flows=new Map([[0,[{advancement:{configuredForLevel:()=>true}}]],[4,[{advancement:{configuredForLevel:()=>false}}]]]);
 class Manager{static flowsForLevel(item,level){seen.push(level);return flows.get(level)??[];}}const manager=new Manager();manager.clone={items:[race]};assert.equal(pendingSpeciesSteps(manager,3).length,0);assert.equal(pendingSpeciesSteps(manager,4).length,1);assert.equal(pendingSpeciesSteps(manager,4)[0].level,4);
});

import {SPECIES_LINEAGES} from '../module/systems/wuxia-species-data.mjs';
test('each ancestry contains only its own complete book excerpt',()=>{assert.deepEqual(SPECIES_LINEAGES.map(l=>l.paragraphs.length),[4,5,4,4,4,4,4,5]);for(const lineage of SPECIES_LINEAGES){assert(lineage.paragraphs[1].startsWith('Raridade:'),lineage.name);assert(lineage.paragraphs[2].startsWith('Afinidade:'),lineage.name);assert(!lineage.paragraphs.some(p=>/ESCOLHENDO UMA ESPÉCIE|DEMÔNIOS|CARACTERÍSTICAS DA ESPÉCIE/.test(p)));}});

import {advancementCompletionError,advancementCleanupLevel} from '../module/systems/advancement-grants.mjs';
test('required equipment and lineage choices cannot be confirmed incomplete',()=>{for(const max of [1,2]){const flow={level:0,advancement:{type:'ItemChoice',getCounts:()=>({current:0,max,full:false})}};assert.match(advancementCompletionError(flow),/Escolha/);flow.advancement.getCounts=()=>({current:max,max,full:true});assert.equal(advancementCompletionError(flow),null);}});
test('demon species must assign available attribute points, with a safe exception when every attribute is capped',()=>{const actor={system:{abilities:{str:{value:4,max:20}},_source:{abilities:{str:{value:4}}}}},flow={item:{flags:{[scope]:{species:{key:'demonio'}}}},points:{available:2,total:2},advancement:{type:'AbilityScoreImprovement',actor,configuration:{locked:new Set(),cap:2,max:20},value:{assignments:{}},canImprove:()=>true}};assert.match(advancementCompletionError(flow),/Distribua/);flow.points.available=0;assert.equal(advancementCompletionError(flow),null);flow.points.available=2;actor.system._source.abilities.str.value=20;assert.equal(advancementCompletionError(flow),null);});
test('species cleanup reaches an earned level-four or level-seven benefit after cultivation regression',()=>{for(const key of ['humano','meio-monstro']){const race=speciesDocuments().find(d=>d.flags?.[scope]?.species?.key===key);assert.equal(advancementCleanupLevel(race,3),key==='humano'?4:7);}assert.equal(advancementCleanupLevel({type:'background',system:{advancement:{}}},3),3);});

import {revalidateSpeciesTalentGrants} from '../module/systems/species-progression.mjs';
test('removing an adaptation prerequisite also revokes an invalid gift from a separate level-four species advancement',async()=>{
 const base=qiTalentDocument('aceleracao-marcial'),child=qiTalentDocument('aceleracao-arriscada'),items=new Map(),actor={items,system:{cultivation:{rank:2,stage:1}}};
 const source='Compendium.Immortals-system.geral.Item.'+child._id;child._id='child';child.flags[scope].speciesTalentGrant=true;child.flags[scope].advancementOrigin='human.future';
 const future={configuration:{speciesTalents:true},value:{added:{4:{child:source}}},async reverse(level,{uuid,skipEvaluation}){assert.equal(level,4);assert.equal(uuid,source);assert(skipEvaluation);delete this.value.added[4].child;items.delete('child');}};
 items.set('human',{advancement:{byId:{future}}});items.set('child',child);items.set('prerequisite',base);
 await revalidateSpeciesTalentGrants(actor);assert(items.has('child'));items.delete('prerequisite');await revalidateSpeciesTalentGrants(actor);assert(!items.has('child'));assert.deepEqual(future.value.added[4],{});
});

import {readFile,readdir} from 'node:fs/promises';import {load} from 'js-yaml';import {cultivatorCompendiumDocuments} from '../module/systems/cultivator-content.mjs';
test('every equipment, taxonomy, variant and talent UUID resolves to a published source',async()=>{const known=new Set(cultivatorCompendiumDocuments().filter(d=>d.type!=='Item').map(d=>'Compendium.Immortals-system.geral.Item.'+d._id));for(const [dir,pack]of [['equipamentos','equipamentos'],['profissoes','equipamentos'],['pdns-immortals','pdns-immortals']])for(const file of await readdir(new URL('../packs/_source/'+dir+'/',import.meta.url))){if(!/\.(yml|json)$/.test(file))continue;const text=await readFile(new URL('../packs/_source/'+dir+'/'+file,import.meta.url),'utf8'),doc=file.endsWith('.json')?JSON.parse(text):load(text);if(doc.type!=='Item')known.add('Compendium.Immortals-system.'+pack+'.Item.'+doc._id);}for(const item of [...backgroundDocuments(),...speciesDocuments()])for(const advancement of Object.values(item.system?.advancement??{}))for(const entry of advancement.configuration?.items??advancement.configuration?.pool??[])assert(known.has(entry.uuid),item.name+': '+entry.uuid);});
