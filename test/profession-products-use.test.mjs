import {elementalAreaLethargyEligible,prepareElementalAreaLethargy} from '../module/systems/elemental-area-lethargy.mjs';
import {elementalQiPayment} from '../module/systems/elemental-vortex.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
import {prepareProfessionProductUse} from '../module/systems/profession-products-activities.mjs';
import {withQiTalentActivationLock} from '../module/systems/qi-talents-use.mjs';
import {elementalActionsWerePaid,markElementalActionsPaid} from '../module/systems/elemental-runtime.mjs';
let api={};try{api=await import('../module/systems/profession-products-use.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const scope='Immortals-system',fn=name=>{assert.equal(typeof api[name],'function',name+' must exist');return api[name];};
const mixin=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8'),targets=readFileSync(new URL('../module/data/activity/fields/consumption-targets-field.mjs',import.meta.url),'utf8');
const consumeBody=mixin.match(/    async consume\(usageConfig, messageConfig\) \{([\s\S]*?)\n    \}/)[1],useBody=mixin.match(/    async use\(usage=\{\}, dialog=\{\}, message=\{\}\) \{([\s\S]*?)\n    \}/)[1];
const prepareBody=mixin.match(/async _prepareUsageUpdates\(config, \{ returnErrors=false \}=\{\}\) \{([\s\S]*?)\n    \}/)[1];
const targetBody=targets.match(/static async consumeItemUses\(config, updates\) \{([\s\S]*?)\n  \}/)[1],usesBody=targets.match(/async _usesConsumption\(config, \{ uses, type, rolls, delta \}\) \{([\s\S]*?)\n  \}/)[1];
const prepare=new Function('ConsumptionError','_loc','formatNumber','return async function(config,{returnErrors=false}={}){'+prepareBody+'}')(Error,key=>key,String),consumeItem=new Function('_loc','return async function(config,updates){'+targetBody+'}')(key=>key),consumeUses=new Function('ConsumptionError','_loc','formatNumber','return async function(config,{uses,type,rolls,delta}){'+usesBody+'}')(Error,key=>key,String);
function assign(object,path,value){const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((entry,key)=>entry[key]??={},object);parent[last]=structuredClone(value);}
function fixture(id='pilula-de-cura',config={level:3,quality:'common'},quantity=2){
 const source=professionProductDocument(id,config),actor={id:'actor',uuid:'Actor.profession-use',isOwner:true,flags:{[scope]:{pillToxins:{value:6,highestValue:12,blockedUntilClear:false}}},system:{details:{level:7},energy:{generated:40,total:100},legacy2:{actions:{value:6,max:6}}},items:new Map(),canUserModify(){return this.isOwner;},update(){assert.fail('No split actor writes');}};
 function makeItem(){const item={...structuredClone(source),id:'owned',isOwner:true,isEmbedded:true,actor};item.system.quantity=quantity;item.system.uses={...item.system.uses,max:1,value:1};item.updateSource=updates=>{for(const[path,value]of Object.entries(updates))assign(item,path,value);};const activity={...Object.values(item.system.activities)[0],id:Object.values(item.system.activities)[0]._id,item,actor};activity.updateSource=updates=>{for(const[path,value]of Object.entries(updates))assign(activity,path,value);};item.system.activities=new Map([[activity.id,activity]]);for(const target of activity.consumption.targets){target.actor=actor;target.item=item;target.activity=activity;target.hasZeroCost=()=>false;target.resolveCost=()=>({total:Number(target.value)});target._usesConsumption=consumeUses;target.consume=(cfg,updates)=>consumeItem.call(target,cfg,updates);}return{item,activity};}
 const owned=makeItem(),working=makeItem();actor.items.set(owned.item.id,owned.item);return{actor,item:working.item,activity:working.activity,liveItem:owned.item,liveActivity:owned.activity};
}
const warnings=[];
const foundry={utils:{getProperty:(object,path)=>path.split('.').reduce((entry,key)=>entry?.[key],object),isEmpty:object=>!object||!Object.keys(object).length,setProperty:assign,mergeObject:(first,second)=>({...first,...second})}};
globalThis.game={user:{id:'owner'}};globalThis.CONFIG={DND5E:{activityActivationTypes:{}}};globalThis.foundry=foundry;globalThis.ui={notifications:{warn:message=>warnings.push(message),error:message=>warnings.push(message)}};
function nativeConsume(f,{duringPreparation,fail=false,commitGate,hook}={}){
 const writes=[],deps={elementalAreaLethargyEligible,prepareElementalAreaLethargy,elementalQiPayment,...api,prepareProfessionProductUse,Hooks:{call:(...args)=>hook?.(...args)??true},Ruleset:{isV2:()=>true},ui:{notifications:{warn:message=>warnings.push(message)}},foundry,custoEfetivoEmAcoes:()=>Number(f.activity.activation.value)||0,withoutEnergyConsumption:(_activity,config)=>config,energyConsumptionPlan:()=>({payer:f.actor,updates:{}}),markElementalActionsPaid,commit:async updates=>{writes.push(updates);await commitGate;if(fail)throw Error('native commit failed');for(const[path,value]of Object.entries(updates.actor))assign(f.actor,path,value);for(const update of updates.item){const live=f.actor.items.get(update._id);for(const[path,value]of Object.entries(update))if(path!=='_id')assign(live,path,value);}for(const id of updates.delete??[])f.actor.items.delete(id);return{};}};
 const Native=new Function(...Object.keys(deps),'return class Native {async consume(usageConfig,messageConfig){'+consumeBody+'}async #applyUsageUpdates(updates){return commit(updates);}}')(...Object.values(deps));
 const activity=Object.assign(new Native(),f.activity);activity._prepareUsageUpdates=async function(config){const updates=await prepare.call(this,config);await duringPreparation?.();return updates;};return{activity,writes};
}

test('ordinary activation plans PA and current pill toxins without writing Qi or quantity',()=>{
 const f=fixture(),before=JSON.stringify({flags:f.actor.flags,system:f.actor.system});const plan=fn('prepareProfessionProductActivation')(f.activity,{consume:true},{actionCost:2});assert.equal(plan.actor['system.legacy2.actions.value'],4);assert.deepEqual(plan.actor['flags.'+scope+'.pillToxins'],{value:10,highestValue:12,blockedUntilClear:false});assert.equal(plan.actor['system.energy.generated'],undefined);assert.equal(plan.actor['system.quantity'],undefined);assert.equal(JSON.stringify({flags:f.actor.flags,system:f.actor.system}),before);
});

test('required native resource consumption cannot be unchecked and pending products cannot be activated',()=>{
 const f=fixture();for(const consume of [false,{resources:[]},{resources:false}])assert.throws(()=>fn('prepareProfessionProductActivation')(f.activity,{consume}),/consumo/i);
 const pending=fixture();pending.activity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';pending.liveActivity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';assert.throws(()=>fn('prepareProfessionProductActivation')(pending.activity,{consume:true}),/pendente/i);
});

test('working clones refresh live stock and counters without replacing their configured level or quality',()=>{
 const f=fixture();f.liveItem.system.quantity=5;f.liveItem.system.uses.spent=1;f.liveActivity.uses.spent=2;fn('refreshProfessionProductConsumption')(f.activity);assert.equal(f.item.system.quantity,5);assert.equal(f.item.system.uses.spent,1);assert.equal(f.activity.uses.spent,2);assert.equal(f.item.flags[scope].professionProduct.level,3);assert.equal(f.item.flags[scope].professionProduct.quality,'common');
 f.actor.items.delete(f.item.id);assert.throws(()=>fn('refreshProfessionProductConsumption')(f.activity),/inventário|existe|disponível/i);
});

test('changed live configuration and lost ownership abort instead of overwriting an owned product',()=>{
 const f=fixture();f.liveItem.flags[scope].professionProduct.level=4;f.liveActivity.flags[scope].professionProductActivity.level=4;assert.throws(()=>fn('refreshProfessionProductConsumption')(f.activity),/configur|mudou|alterad/i);assert.equal(f.item.flags[scope].professionProduct.level,3);
 const g=fixture();g.actor.isOwner=false;assert.throws(()=>fn('prepareProfessionProductActivation')(g.activity,{consume:true}),/permissão|control|usar/i);
});

test('the actual native consume commits stock and toxins together and marks actions only after success',async()=>{
 const f=fixture(),native=nativeConsume(f);const config={consume:true};await native.activity.consume(config,{});assert.equal(native.writes.length,1);assert.equal(f.liveItem.system.quantity,1);assert.equal(f.actor.flags[scope].pillToxins.value,10);assert.equal(elementalActionsWerePaid(config),true);
});

test('failed native commits cause no toxin or quantity write and do not mark PA paid',async()=>{
 const f=fixture(),native=nativeConsume(f,{fail:true}),config={consume:true};await assert.rejects(()=>native.activity.consume(config,{}),/native commit failed/);assert.equal(f.actor.flags[scope].pillToxins.value,6);assert.equal(f.liveItem.system.quantity,2);assert.equal(elementalActionsWerePaid(config),false);
});

test('native preparation changes to owner, stock or configuration abort before applying any payload',async()=>{
 for(const mutate of [f=>f.actor.isOwner=false,f=>f.liveItem.system.quantity=3,f=>f.actor.items.delete(f.item.id),f=>f.liveItem.flags[scope].professionProduct.quality='perfect']){const f=fixture(),native=nativeConsume(f,{duringPreparation:()=>mutate(f)});assert.equal(await native.activity.consume({consume:true},{}),false);assert.equal(native.writes.length,0);assert.equal(f.actor.flags[scope].pillToxins.value,6);}
});

test('fresh toxin state after asynchronous preparation is preserved in the combined native update',async()=>{
 const f=fixture(),native=nativeConsume(f,{duringPreparation:()=>f.actor.flags[scope].pillToxins.value=20});await native.activity.consume({consume:true},{});assert.equal(f.actor.flags[scope].pillToxins.value,24);assert.equal(f.liveItem.system.quantity,1);
});

test('duplicate product activations share the actor queue and cannot consume the final copy twice',async()=>{
 const f=fixture('pilula-de-cura',{level:3,quality:'common'},1);let release;const gate=new Promise(resolve=>release=resolve),native=nativeConsume(f,{commitGate:gate});const first=native.activity.consume({consume:true},{}).catch(error=>({error}));for(let attempt=0;attempt<40&&!native.writes.length;attempt++)await new Promise(resolve=>setTimeout(resolve,1));const second=native.activity.consume({consume:true},{}).catch(error=>({error}));await new Promise(resolve=>setTimeout(resolve,0));release();await Promise.all([first,second]);assert.equal(native.writes.length,1);assert.equal(f.actor.items.has(f.item.id),false);assert.equal(f.actor.flags[scope].pillToxins.value,10);
});

test('profession and Qi activations serialize through the same actor queue',async()=>{
 const f=fixture();let release,entered=false;const first=withQiTalentActivationLock({actor:f.actor,item:{id:'qi'},id:'qi-use'},async()=>new Promise(resolve=>release=resolve));await new Promise(resolve=>setImmediate(resolve));const second=fn('withProfessionProductActivationLock')(f.activity,async()=>{entered=true;});await new Promise(resolve=>setImmediate(resolve));assert.equal(entered,false);release();await Promise.all([first,second]);assert.equal(entered,true);
});

test('pending products are guarded before pre-use hooks or a custom activity handler can run',async()=>{
 const f=fixture();f.activity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';f.liveActivity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';let hooks=0,custom=0;const deps={...api,Ruleset:{isV2:()=>true},elementalActorActionState:()=>({allowed:true}),prepareProfessionProductUse,ui:{notifications:{warn:message=>warnings.push(message),error:message=>warnings.push(message)}},foundry,TargetsField:{getDescriptors:()=>[]},Hooks:{call:()=>{hooks++;return true;}}};
 const use=new Function(...Object.keys(deps),'return async function(usage={},dialog={},message={}){'+useBody+'}')(...Object.values(deps));f.liveItem.clone=()=>f.item;f.activity._prepareUsageConfig=usage=>usage;f.activity._useCustom=()=>{custom++;};f.liveActivity.canUse=true;f.liveActivity.metadata={usage:{dialog:class{}}};await use.call(f.liveActivity,{consume:true});assert.equal(hooks,0);assert.equal(custom,0);
});


test('refreshed native use data preserves live maximum, recovery and currently available charges',()=>{
 const f=fixture();f.liveItem.system.uses.max=1;f.liveItem.system.uses.value=0;f.liveItem.system.uses.spent=1;f.liveItem.system.uses.recovery=[{period:'day',type:'recoverAll'}];fn('refreshProfessionProductConsumption')(f.activity);assert.equal(f.item.system.uses.value,0);assert.deepEqual(f.item.system.uses.recovery,[{period:'day',type:'recoverAll'}]);
});

test('non-pill products plan actions without adding toxins or debiting their explicit Qi pool twice',()=>{
 const f=fixture('simbolo-do-selo-de-conflito',{level:4});const plan=fn('prepareProfessionProductActivation')(f.activity,{consume:true});assert.equal(plan.actor['system.legacy2.actions.value'],5);assert.equal(plan.actor['flags.'+scope+'.pillToxins'],undefined);assert.equal(plan.actor['system.energy.total'],undefined);
});

test('the native consume rejects unchecked consumption and unresolved costs before preparing a batch',async()=>{
 const f=fixture(),native=nativeConsume(f);assert.equal(await native.activity.consume({consume:false},{}),false);assert.equal(native.writes.length,0);
 const g=fixture();g.activity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';g.liveActivity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';const pending=nativeConsume(g);assert.equal(await pending.activity.consume({consume:true},{}),false);assert.equal(pending.writes.length,0);
});

test('a replaced live item with the same ID and configuration cannot reuse a prepared batch',async()=>{
 const f=fixture(),native=nativeConsume(f,{duringPreparation:()=>f.actor.items.set(f.item.id,{...f.liveItem})});assert.equal(await native.activity.consume({consume:true},{}),false);assert.equal(native.writes.length,0);
});


test('new pending costs on the live item are checked before hooks and custom handlers',async()=>{
 const f=fixture();f.liveActivity.flags[scope].professionProductActivity.pendingCost='Reserva ainda não confirmada';let hooks=0,custom=0;const deps={...api,Ruleset:{isV2:()=>true},elementalActorActionState:()=>({allowed:true}),prepareProfessionProductUse,ui:{notifications:{warn:message=>warnings.push(message),error:message=>warnings.push(message)}},foundry,TargetsField:{getDescriptors:()=>[]},Hooks:{call:()=>{hooks++;return true;}}};const use=new Function(...Object.keys(deps),'return async function(usage={},dialog={},message={}){'+useBody+'}')(...Object.values(deps));f.liveItem.clone=()=>f.item;f.activity._prepareUsageConfig=usage=>usage;f.activity._useCustom=()=>{custom++;};f.liveActivity.canUse=true;f.liveActivity.metadata={usage:{dialog:class{}}};await use.call(f.liveActivity,{consume:true});assert.equal(hooks,0);assert.equal(custom,0);
});


test('the author-confirmed explosive talisman spends two actions and one unit without adding pill toxins',async()=>{
 const f=fixture('talisma-explosivo',{level:3}),native=nativeConsume(f);await native.activity.consume({consume:true},{});assert.equal(native.writes.length,1);assert.equal(f.liveItem.system.quantity,1);assert.equal(f.actor.system.legacy2.actions.value,4);assert.equal(f.actor.flags[scope].pillToxins.value,6);
});
