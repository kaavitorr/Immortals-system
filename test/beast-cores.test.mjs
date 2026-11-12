import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CONCEITOS_ELEMENTOS} from '../module/systems/elemental-concepts-data.mjs';
import {BEAST_CORES,BEAST_CORE_TYPE,beastCoreConfiguration,prepareBeastCoreChanges,createBeastCoreItemData,beastCoreCompendiumDocuments} from '../module/systems/beast-cores.mjs';
const scope='Immortals-system';
test('cores cover all thirteen concepts and neutral, with separate unique crystal artwork',()=>{
 assert.deepEqual(BEAST_CORES.map(c=>c.id),[...CONCEITOS_ELEMENTOS.map(c=>c.id),'neutro']);
 assert.equal(new Set(BEAST_CORES.map(c=>c.img)).size,14);
 for(const c of BEAST_CORES)assert.ok(c.img.includes("nucleos-pintados-v1/") && c.img.endsWith(".webp"));
});
test('core documents use their own consumable type and realm, never essence or crystal fuel',()=>{
 const data=createBeastCoreItemData({elementId:'fogo',rank:3});
 assert.equal(data.type,'consumable');assert.equal(data.system.type.value,BEAST_CORE_TYPE);assert.equal(data.system.type.subtype,'fogo');assert.equal(data.system.beastCore.rank,3);
 assert.equal(data.flags[scope].beastEssenceItem,undefined);assert.equal(data.flags[scope].essenceCrystal,undefined);
 assert.equal(data.effects.length,0);assert.equal(data.system.uses.max,'1');assert.equal(data.system.uses.autoDestroy,true);
 const activity=Object.values(data.system.activities)[0];assert.equal(activity.type,'utility');assert.equal(activity.consumption.targets.length,1);assert.equal(activity.consumption.targets[0].type,'itemUses');assert.equal(activity.consumption.targets[0].value,'1');
});
test('invalid elements or realms cannot create or silently downgrade a core',()=>{
 for(const elementId of ['',null,'inventado','__proto__','constructor'])assert.throws(()=>createBeastCoreItemData({elementId,rank:1}),/elemento/i);
 for(const rank of [0,11,1.5,'',null,NaN])assert.throws(()=>createBeastCoreItemData({elementId:'neutro',rank}),/reino/i);
});
test('neutral supplies no element and stock realm labels are material metadata',()=>{
 const item=createBeastCoreItemData({elementId:'neutro',rank:10});const c=beastCoreConfiguration(item);
 assert.equal(c.id,'neutro');assert.equal(c.rank,10);assert.equal(c.realmName,'Divindade');assert.equal(c.elementId,null);assert.match(item.system.description.value,/sem afinidade elemental/i);
 assert.equal(beastCoreConfiguration({type:'consumable',system:{type:{value:'essenceCrystal',subtype:'fogo'}}}),null);
});
test('created loot is private and records the death source without copying soul features',()=>{
 const item=createBeastCoreItemData({elementId:'gelo',rank:4,source:{actorUuid:'Scene.s.Token.t.Actor.a',name:'Lobo',deathEpisode:'death-1'}});
 assert.deepEqual(item.ownership,{default:0});assert.deepEqual(item.flags[scope].beastCore.source,{actorUuid:'Scene.s.Token.t.Actor.a',name:'Lobo',deathEpisode:'death-1'});assert.equal(item.flags[scope].beastCore.definition,undefined);
});
test('subtype edits refresh stock artwork and fixed one-unit use while preserving custom icons',()=>{
 const stock=createBeastCoreItemData({elementId:'fogo',rank:2});
 const update=prepareBeastCoreChanges(stock,{'system.type.subtype':'gelo'});
 assert.equal(update.img,BEAST_CORES.find(c=>c.id==='gelo').img);assert.equal(update['system.uses.max'],'1');
 assert.equal(prepareBeastCoreChanges({...stock,img:'worlds/campaign/custom.webp'},{'system.type.subtype':'agua'}).img,undefined);
 assert.equal(prepareBeastCoreChanges(stock,{img:'worlds/custom.webp','system.type.subtype':'agua'}).img,undefined);
 assert.throws(()=>prepareBeastCoreChanges(stock,{'system.beastCore.rank':0}),/reino/i);
 assert.equal(prepareBeastCoreChanges(stock,{'system.type.value':'potion'}),null);
});
test('catalogue contains fourteen independent items, one folder, unique stable Foundry IDs',()=>{
 const docs=beastCoreCompendiumDocuments();assert.equal(docs.length,15);assert.equal(new Set(docs.map(d=>d._id)).size,15);
 for(const d of docs)assert.match(d._id,/^[A-Za-z0-9]{16}$/);
 const items=docs.filter(d=>d.type==='consumable');assert.equal(items.length,14);assert.ok(items.every(d=>d.folder===docs[0]._id&&d.system.beastCore.rank===1));assert.ok(items.every(d=>!d.flags[scope].beastCore.source));
});


test('native consumption removes one core from a stack, destroys only its last unit and changes no actor resources',async()=>{
 const {readFile}=await import('node:fs/promises');const text=await readFile(new URL('../module/data/activity/fields/consumption-targets-field.mjs',import.meta.url),'utf8');
 const method=name=>{const start=text.indexOf(name);return text.slice(start,text.indexOf(String.fromCharCode(10)+'  }',start)+4);};
 const C=new Function('_loc','foundry','ConsumptionError','formatNumber','return class {'+method('static async consumeItemUses(')+method('async _usesConsumption(')+'}')((s)=>s,{utils:{mergeObject:Object.assign}},Error,String);
 for(const quantity of [1,2,7]){const item=createBeastCoreItemData({elementId:'agua',rank:2});item.id='core';item.system.quantity=quantity;item.system.uses={max:1,spent:0,value:1,autoDestroy:true};
 const target={item,actor:{system:{energy:{total:40,generated:3}}},activity:{name:'Consumir núcleo'},resolveCost:async()=>({total:1}),_usesConsumption:C.prototype._usesConsumption};const updates={actor:{},item:[],delete:[],rolls:[]};
 await C.consumeItemUses.call(target,{},updates);assert.deepEqual(updates.actor,{});assert.equal(target.actor.system.energy.generated,3);
 if(quantity===1)assert.deepEqual(updates.delete,['core']);else assert.deepEqual(updates.item,[{_id:'core','system.uses.spent':0,'system.quantity':quantity-1}]);
 item.system.uses.value=0;await assert.rejects(C.consumeItemUses.call(target,{},updates));
 }
});
test('dragging cores cannot merge away another realm from the same compendium template',async()=>{
 const {readFile}=await import('node:fs/promises');const text=await readFile(new URL('../module/applications/actor/api/base-actor-sheet.mjs',import.meta.url),'utf8');const start=text.indexOf('  _onDropStackConsumables('),end=text.indexOf(String.fromCharCode(10)+'  }',start)+4;const method=text.slice(start,end);
 const C=new Function('ESSENCE_CRYSTAL_TYPE','return class {'+method+'}')('essenceCrystal');const sheet=new C();sheet.inventorySource={sourcedItems:{get(){throw Error('core stacks must stay separate');}}};
 const doc=createBeastCoreItemData({elementId:'agua',rank:3});doc._stats={compendiumSource:'Compendium.equipamentos.core'};assert.equal(sheet._onDropStackConsumables({},doc),null);
});
