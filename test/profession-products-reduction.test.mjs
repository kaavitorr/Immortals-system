import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
const scope='Immortals-system',hooks=new Map();
globalThis.Hooks={on:(key,callback)=>hooks.set(key,callback),call:()=>true,callAll(){}};
globalThis.game={settings:{get:(_scope,key)=>key==='rulesetVersion'?'2.0':undefined},user:{id:'owner'},combat:{started:true}};
globalThis.CONFIG={DND5E:{abilities:{},activityActivationTypes:{}}};
const fields=Object.fromEntries(['ArrayField','DocumentUUIDField','FilePathField','NumberField','SchemaField','StringField','BooleanField','SetField','ObjectField'].map(key=>[key,class{}]));
globalThis.KeyboardManager={MODIFIER_CODES:{Alt:[],Control:[],Meta:[],Shift:[]},MODIFIER_KEYS:[]};
let choice={incrementos:0,persistente:false},duringDialog,duringRoll,duringPreparation,commitGate,failCommit=false;const warnings=[],messages=[],dialogs=[];
function assign(object,path,value){const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((entry,key)=>entry instanceof Map?entry.get(key):entry[key]??={},object),current=parent instanceof Map?parent.get(last):parent[last];if(value&&typeof value==='object'&&!Array.isArray(value)&&current&&typeof current==='object'){for(const[key,entry]of Object.entries(value))assign(current,key,entry);}else if(parent instanceof Map)parent.set(last,structuredClone(value));else parent[last]=structuredClone(value);}
function expand(flat){const result={};for(const[path,value]of Object.entries(flat))assign(result,path,value);return result;}
globalThis.foundry={data:{fields},utils:{getProperty:(object,path)=>path.split('.').reduce((entry,key)=>entry?.[key],object),isEmpty:object=>!object||!Object.keys(object).length,expandObject:expand,mergeObject:(object,other)=>{for(const[key,value]of Object.entries(other))assign(object,key,value);return object;}},applications:{api:{DialogV2:{wait:async config=>{dialogs.push(config);await duringDialog?.();return choice;}}}}};
globalThis.ui={notifications:{warn:message=>warnings.push(message),error:message=>warnings.push(message),info(){}}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async message=>messages.push(message)};
globalThis.Roll=class{static validate(){return true;}constructor(formula){this.formula=formula;this.total=Number(formula);}async evaluate(){await duringRoll?.();return this;}async toMessage(message){messages.push(message);}};
// Native preparation and native itemUses remain real; only Foundry's external commit is simulated.
const mixin=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8'),targets=readFileSync(new URL('../module/data/activity/fields/consumption-targets-field.mjs',import.meta.url),'utf8');
const prepareBody=mixin.match(/async _prepareUsageUpdates\(config, \{ returnErrors=false \}=\{\}\) \{([\s\S]*?)\n    \}/)[1],mergeBody=mixin.match(/    _mergeActivityUpdates\(updates\) \{([\s\S]*?)\n    \}/)[1];
const consumeBody=targets.match(/static async consumeItemUses\(config, updates\) \{([\s\S]*?)\n  \}/)[1],usesBody=targets.match(/async _usesConsumption\(config, \{ uses, type, rolls, delta \}\) \{([\s\S]*?)\n  \}/)[1];
const prepare=new Function('ConsumptionError','_loc','formatNumber','return async function(config,{returnErrors=false}={}){'+prepareBody+'}')(Error,key=>key,String),merge=new Function('return function(updates){'+mergeBody+'}')();
const consumeUses=new Function('_loc','return async function(config,updates){'+consumeBody+'}')(key=>key),usesConsumption=new Function('ConsumptionError','_loc','formatNumber','return async function(config,{uses,type,rolls,delta}){'+usesBody+'}')(Error,key=>key,String);
const {activateDamageReduction}=await import('../module/applications/actor/jj/reducao-dano.mjs');
function fixture(quantity=2){warnings.length=messages.length=dialogs.length=0;choice={incrementos:0,persistente:false};duringDialog=duringRoll=duringPreparation=commitGate=undefined;failCommit=false;game.combat.started=true;
 const source=professionProductDocument('talisma-de-barreira',{level:3}),item={...source,id:'talisman-owned',isOwner:true,isEmbedded:true},actor={id:'user',uuid:'Actor.profession-reduction',type:'character',name:'Lin',isOwner:true,flags:{},system:{details:{level:5},energy:{generated:20,total:100},legacy2:{actions:{value:6,max:6}}},items:new Map(),getFlag(scope,key){return this.flags[scope]?.[key];},getRollData(){return{nivelCultivo:5};},canUserModify(){return this.isOwner;},async unsetFlag(scope,key){delete this.flags[scope][key];},async update(){assert.fail('Barrier must not split actor and quantity writes');}};
 item.actor=actor;item.system.quantity=quantity;item.system.uses={...item.system.uses,max:1,value:1};const native=Object.values(item.system.activities)[0],activity={...native,id:native._id,item,actor};item.system.activities=new Map([[activity.id,activity]]);actor.items.set(item.id,item);actor.items.some=predicate=>[...actor.items.values()].some(predicate);
 for(const target of activity.consumption.targets){target.activity=activity;target.item=item;target.actor=actor;target.hasZeroCost=()=>false;target.resolveCost=()=>({total:1});target._usesConsumption=usesConsumption;target.consume=(config,updates)=>consumeUses.call(target,config,updates);}
 activity._prepareUsageUpdates=async function(config){const updates=await prepare.call(this,config);await duringPreparation?.();return updates;};activity._mergeActivityUpdates=merge;
 const batches=[];actor.performBulkUpdate=async updates=>{batches.push(updates);await commitGate;if(failCommit)throw Error('native batch rejected');for(const[path,value]of Object.entries(updates.actor))assign(actor,path,value);for(const update of updates.item){for(const[path,value]of Object.entries(update))if(path!=='_id')assign(actor.items.get(update._id),path,value);}for(const id of updates.delete)actor.items.delete(id);return[];};return{actor,item,activity,batches};
}

test('barrier atomically consumes one talisman and grants reduction until the next turn even if consumption is unchecked',async()=>{
 const f=fixture();const result=await activateDamageReduction(f.activity,{consume:false});assert(result);assert.equal(result.persistente,true);assert.equal(f.batches.length,1);assert.equal(f.item.system.quantity,1);assert(!dialogs[0].content.includes('id="jj-red-persistente"'));assert.equal(f.actor.system.energy.generated,20);assert.equal(f.actor.system.legacy2.actions.value,6);assert.deepEqual(f.actor.flags[scope].reducaoDano,{valor:60,persistente:true});
});

test('the final talisman is removed in the same commit and its protection expires on the next turn',async()=>{
 const f=fixture(1);await activateDamageReduction(f.activity,{consume:true});assert.equal(f.actor.items.has(f.item.id),false);assert.deepEqual(f.batches[0].delete,[f.item.id]);assert.equal(f.actor.flags[scope].reducaoDano.persistente,true);
 await hooks.get('combatTurnChange')({combatants:new Map([['turn',{actor:f.actor}]])},{},{combatantId:'turn'});assert.equal(f.actor.flags[scope].reducaoDano,undefined);
});

test('cancel, lost ownership, empty stock and an unavailable native batch grant no barrier',async()=>{
 const canceled=fixture();choice=null;await activateDamageReduction(canceled.activity);assert.equal(canceled.batches.length,0);
 for(const change of [f=>f.actor.isOwner=false,f=>f.item.system.quantity=0,f=>delete f.actor.performBulkUpdate]){const f=fixture();duringDialog=()=>change(f);await activateDamageReduction(f.activity);assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);}
 const outside=fixture();game.combat.started=false;await activateDamageReduction(outside.activity);assert.equal(outside.batches.length,0);
});

test('failed native commits grant no protection or item loss and leave a retry available',async()=>{
 const f=fixture(1);failCommit=true;await assert.rejects(()=>activateDamageReduction(f.activity),/native batch rejected/);assert.equal(f.actor.items.has(f.item.id),true);assert.equal(f.actor.flags[scope],undefined);assert.equal(messages.length,0);failCommit=false;await activateDamageReduction(f.activity);assert.equal(f.actor.items.has(f.item.id),false);assert.equal(f.actor.flags[scope].reducaoDano.valor,60);
});

test('stock and ownership are checked again after dice and after asynchronous use preparation',async()=>{
 for(const stage of ['roll','prepare'])for(const mutate of [f=>f.item.system.quantity=0,f=>f.actor.isOwner=false,f=>f.actor.items.delete(f.item.id)]){const f=fixture();if(stage==='roll')duringRoll=()=>mutate(f);else duringPreparation=()=>mutate(f);await activateDamageReduction(f.activity);assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);}
});

test('duplicate confirmations cannot consume the final talisman twice while a native commit is pending',async()=>{
 const f=fixture(1);let release;commitGate=new Promise(resolve=>release=resolve);const first=activateDamageReduction(f.activity);for(let attempt=0;attempt<40&&!f.batches.length;attempt++)await new Promise(resolve=>setTimeout(resolve,1));const second=activateDamageReduction(f.activity);await new Promise(resolve=>setTimeout(resolve,0));release();await Promise.all([first,second]);assert.equal(f.batches.length,1);assert.equal(f.actor.items.has(f.item.id),false);
});


test('changing the configured talisman level while dice evaluate requires a new activation',async()=>{
 const f=fixture();duringRoll=()=>{f.item.flags[scope].professionProduct.level=4;f.activity.flags[scope].professionProductActivity.level=4;};await activateDamageReduction(f.activity);assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);
});


test('stock edits during native preparation cannot delete newly added copies or overwrite a newer count',async()=>{
 const f=fixture(1);duringPreparation=()=>f.item.system.quantity=2;await activateDamageReduction(f.activity);assert.equal(f.batches.length,0);assert.equal(f.actor.items.has(f.item.id),true);assert.equal(f.item.system.quantity,2);assert.equal(f.actor.flags[scope],undefined);
});
