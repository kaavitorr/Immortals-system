import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {qiTalentDocument} from '../module/systems/qi-talents-content.mjs';
const scope='Immortals-system';
globalThis.Hooks={on(){},call(){return true;},callAll(){}};
globalThis.game={settings:{get:(_s,key)=>key==='rulesetVersion'?'2.0':undefined},user:{id:'owner'},combat:{started:true}};
globalThis.CONFIG={DND5E:{abilities:{},activityActivationTypes:{}}};
const fields=Object.fromEntries(['ArrayField','DocumentUUIDField','FilePathField','NumberField','SchemaField','StringField','BooleanField','SetField','ObjectField'].map(key=>[key,class{}]));
globalThis.KeyboardManager={MODIFIER_CODES:{Alt:[],Control:[],Meta:[],Shift:[]},MODIFIER_KEYS:[]};
const warnings=[],dialogs=[],messages=[],rolls=[];let choice={incrementos:0,persistente:false},duringDialog,commitGate,failCommit=false,duringRoll,duringPreparation;
function assign(object,path,value){const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((o,k)=>o instanceof Map?o.get(k):o[k]??={},object),current=parent instanceof Map?parent.get(last):parent[last];if(value&&typeof value==='object'&&!Array.isArray(value)&&current&&typeof current==='object'){for(const[k,v]of Object.entries(value))assign(current,k,v);}else if(parent instanceof Map)parent.set(last,structuredClone(value));else parent[last]=structuredClone(value);}
function expand(flat){const result={};for(const[path,value]of Object.entries(flat))assign(result,path,value);return result;}
globalThis.foundry={data:{fields},utils:{getProperty:(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o),isEmpty:o=>!o||Object.keys(o).length===0,expandObject:expand,mergeObject:(a,b)=>{for(const[k,v]of Object.entries(b))assign(a,k,v);return a;}},applications:{api:{DialogV2:{wait:async config=>{dialogs.push(config);await duringDialog?.();return choice;}}}}};
globalThis.ui={notifications:{warn:message=>warnings.push(message),error:message=>warnings.push(message),info(){}}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async data=>messages.push(data)};
globalThis.Roll=class{static validate(){return true;}constructor(formula){this.formula=formula;this.total=20;}async evaluate(){rolls.push(this.formula);await duringRoll?.();return this;}async toMessage(data){messages.push(data);}};
// Exercise the real native use preparation; the external boundary below simulates one modifyBatch commit.
const mixin=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8'),targets=readFileSync(new URL('../module/data/activity/fields/consumption-targets-field.mjs',import.meta.url),'utf8');
const prepareBody=mixin.match(/async _prepareUsageUpdates\(config, \{ returnErrors=false \}=\{\}\) \{([\s\S]*?)\n    \}/)[1];
const mergeBody=mixin.match(/    _mergeActivityUpdates\(updates\) \{([\s\S]*?)\n    \}/)[1];
const consumeBody=targets.match(/static async consumeActivityUses\(config, updates\) \{([\s\S]*?)\n  \}/)[1],usesBody=targets.match(/async _usesConsumption\(config, \{ uses, type, rolls, delta \}\) \{([\s\S]*?)\n  \}/)[1];
const prepare=new Function('ConsumptionError','_loc','formatNumber','return async function(config,{returnErrors=false}={}){'+prepareBody+'}')(Error,x=>x,String);
const merge=new Function('return function(updates){'+mergeBody+'}')();
const consumeUses=new Function('_loc','return async function(config,updates){'+consumeBody+'}')(x=>x),usesConsumption=new Function('ConsumptionError','_loc','formatNumber','return async function(config,{uses,type,rolls,delta}){'+usesBody+'}')(Error,x=>x,String);
const {activateDamageReduction}=await import('../module/applications/actor/jj/reducao-dano.mjs');
const {getScaleOptions}=await import('../module/applications/actor/jj/jj-scale.mjs');
function reset(){warnings.length=dialogs.length=messages.length=rolls.length=0;choice={incrementos:0,persistente:false};duringDialog=duringRoll=duringPreparation=commitGate=undefined;failCommit=false;}
function fixture(id='canalizacao-de-combate',level=5){
 reset();const source=qiTalentDocument(id),item={...source,id:'qi-owned',isOwner:true,isEmbedded:true},actor={id:'cultivator',uuid:'Actor.cultivator',type:'character',name:'Lin',isOwner:true,flags:{},system:{details:{level},energy:{generated:20,total:100},legacy2:{actions:{value:6,max:6}}},items:new Map(),getFlag(){},getRollData(){return{nivelCultivo:this.system.details.level};},canUserModify(){return this.isOwner;},async update(){assert.fail('Qi reduction must not split actor writes');}};item.actor=actor;
 const activity={...Object.values(source.system.activities).find(a=>a.type==='reduction'),id:Object.values(source.system.activities).find(a=>a.type==='reduction')._id,item,actor};item.system.activities=new Map([[activity.id,activity]]);actor.items.set(item.id,item);actor.items.some=fn=>[...actor.items.values()].some(fn);
 Object.defineProperty(activity.uses,'value',{get(){return Math.max(0,Number(this.max||0)-this.spent);},configurable:true});
 for(const target of activity.consumption.targets){target.activity=activity;target.item=item;target.actor=actor;target.hasZeroCost=()=>Number(target.value)===0;target.resolveCost=()=>({total:Number(target.value),isDeterministic:true,evaluateSync:()=>({total:Number(target.value)})});if(target.type==='activityUses'){target._usesConsumption=usesConsumption;target.consume=(config,updates)=>consumeUses.call(target,config,updates);}}
 activity._prepareUsageUpdates=async function(config){const updates=await prepare.call(this,config);await duringPreparation?.();return updates;};activity._mergeActivityUpdates=merge;activity.updateSource=data=>{for(const[path,value]of Object.entries(data))assign(activity,path,value);};
 const batches=[];actor.performBulkUpdate=async updates=>{batches.push(updates);await commitGate;if(failCommit)throw Error('native batch rejected');for(const[path,value]of Object.entries(updates.actor))assign(actor,path,value);for(const update of updates.item){const live=actor.items.get(update._id);for(const[path,value]of Object.entries(update))if(path!=='_id')assign(live,path,value);}return[];};
 return{actor,item,activity,batches};
}
test('cultivation metadata caps the actual scale menu and labels refined Qi without changing legacy limits',()=>{
 const f=fixture();for(const[level,want]of [[1,0],[4,0],[5,1],[8,4]]){f.actor.system.details.level=level;const result=getScaleOptions({actor:f.actor,activity:f.activity,activationPaid:false});assert.equal(result.maxIncrementos,want);assert.equal(result.poolLabel,'Qi Refinado');assert(!result.optionsHtml.includes('value="'+(want+1)+'"'));}
});
test('a confirmed Qi reduction atomically spends Qi and PA once and omits persistent protection',async()=>{
 const f=fixture();choice={incrementos:1,persistente:true};const result=await activateDamageReduction(f.activity,{consume:true});assert(result);assert.equal(f.batches.length,1);assert.equal(f.actor.system.energy.generated,15);assert.equal(f.actor.system.legacy2.actions.value,4);assert.deepEqual(f.actor.flags[scope].reducaoDano,{valor:20,persistente:false});assert(!dialogs[0].content.includes('id="jj-red-persistente"'));assert.equal(result.persistente,false);assert.equal(rolls[0],'4d8 + 1d8');
});
test('forged scale and persistence choices cannot exceed the current cultivation limit',async()=>{
 const f=fixture();choice={incrementos:999,persistente:true};await activateDamageReduction(f.activity,{consume:true});assert.equal(rolls[0],'4d8 + 1d8');assert.equal(f.actor.system.energy.generated,15);assert.equal(f.actor.flags[scope].reducaoDano.persistente,false);
 const g=fixture('canalizacao-de-combate',4);choice={incrementos:99,persistente:true};await activateDamageReduction(g.activity,{consume:true});assert.equal(rolls[0],'4d8');assert.equal(g.actor.system.energy.generated,16);
});
test('Corpo Indestrutivel consumes its activity counter in the same native batch as its reduction',async()=>{
 const f=fixture('corpo-indestrutivel');await activateDamageReduction(f.activity,{consume:true});assert.equal(f.batches.length,1);assert.equal(f.item.system.activities.get(f.activity.id).uses.spent,1);assert.equal(f.actor.system.energy.generated,20);assert.equal(f.actor.system.legacy2.actions.value,6);assert.equal(f.actor.flags[scope].reducaoDano.valor,20);const before=messages.length;await activateDamageReduction(f.activity,{consume:true});assert.equal(f.batches.length,1);assert.equal(messages.length,before);
});
test('canceling or losing ownership, Qi, or PA during the dialogue creates no protection and spends nothing',async()=>{
 const a=fixture();choice=null;await activateDamageReduction(a.activity,{consume:true});assert.equal(a.batches.length,0);assert.equal(a.actor.flags[scope],undefined);
 for(const change of [f=>f.actor.isOwner=false,f=>f.actor.system.energy.generated=3,f=>f.actor.system.legacy2.actions.value=1]){const f=fixture();duringDialog=()=>change(f);await activateDamageReduction(f.activity,{consume:true});assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);}
});
test('a rejected native batch leaves uses, resources, and reduction unchanged and permits a safe retry',async()=>{
 const f=fixture('corpo-indestrutivel');failCommit=true;await assert.rejects(()=>activateDamageReduction(f.activity,{consume:true}),/native batch rejected/);assert.equal(f.activity.uses.spent,0);assert.equal(f.actor.flags[scope],undefined);assert.equal(messages.length,0);failCommit=false;await activateDamageReduction(f.activity,{consume:true});assert.equal(f.activity.uses.spent,1);assert.equal(f.batches.length,2);
});
test('duplicate confirmed clicks cannot consume the final use twice while the first native commit is pending',async()=>{
 const f=fixture('corpo-indestrutivel');let release;commitGate=new Promise(resolve=>release=resolve);const first=activateDamageReduction(f.activity,{consume:true}).catch(error=>({error}));for(let attempt=0;attempt<40&&f.batches.length===0;attempt++)await new Promise(resolve=>setTimeout(resolve,1));const second=activateDamageReduction(f.activity,{consume:true}).catch(error=>({error}));await new Promise(resolve=>setTimeout(resolve,0));release();await Promise.all([first,second]);assert.equal(f.batches.length,1);assert.equal(f.batches.length,1);assert.equal(f.activity.uses.spent,1);
});
test('current resources and cultivation are validated again after dice evaluation before the native commit',async()=>{
 const f=fixture();choice={incrementos:1,persistente:false};duringRoll=()=>f.actor.system.energy.generated=4;await activateDamageReduction(f.activity,{consume:true});assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);
 const g=fixture();choice={incrementos:1,persistente:false};duringRoll=()=>g.actor.system.details.level=4;await activateDamageReduction(g.activity,{consume:true});assert.equal(g.batches.length,0);assert.equal(g.actor.flags[scope],undefined);
});
test('an unavailable atomic native API or pending cost blocks the Qi reduction without a partial write',async()=>{
 const f=fixture();delete f.actor.performBulkUpdate;await activateDamageReduction(f.activity,{consume:true});assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);
 const g=fixture();g.activity.flags[scope].qiTalentActivity.pendingCost='Reserva não confirmada';await activateDamageReduction(g.activity,{consume:true});assert.equal(g.batches.length,0);assert.equal(g.actor.flags[scope],undefined);
});

test('Qi and ownership are rechecked after asynchronous native use preparation, immediately before committing',async()=>{
 const f=fixture();duringPreparation=()=>f.actor.system.energy.generated=3;await activateDamageReduction(f.activity,{consume:true});assert.equal(f.batches.length,0);assert.equal(f.actor.flags[scope],undefined);
 const g=fixture();duringPreparation=()=>g.actor.isOwner=false;await activateDamageReduction(g.activity,{consume:true});assert.equal(g.batches.length,0);assert.equal(g.actor.flags[scope],undefined);
});
test('a stale working clone cannot reuse a counter exhausted on the live owned activity',async()=>{
 const f=fixture('corpo-indestrutivel'),clone={...f.activity,uses:{max:'1',spent:0,value:1,recovery:[{period:'lr'}]},item:{...f.item,actor:f.actor}};duringDialog=()=>f.activity.uses.spent=1;await activateDamageReduction(clone,{consume:true});assert.equal(f.batches.length,0);assert.equal(f.activity.uses.spent,1);assert.equal(f.actor.flags[scope],undefined);
});
test('explicit Qi costs and counters cannot be unchecked while still receiving protection',async()=>{
 const f=fixture('corpo-indestrutivel');await activateDamageReduction(f.activity,{consume:false});assert.equal(f.activity.uses.spent,1);assert.equal(f.batches.length,1);
 const g=fixture();await activateDamageReduction(g.activity,{consume:{resources:[]}});assert.equal(g.actor.system.energy.generated,16);assert.equal(g.actor.system.legacy2.actions.value,4);
});
