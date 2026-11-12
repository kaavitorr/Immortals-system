import {elementalAreaLethargyEligible,prepareElementalAreaLethargy} from '../module/systems/elemental-area-lethargy.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {elementalFeatureDocument} from '../module/systems/elemental-content.mjs';
import {elementalRollData} from '../module/systems/elemental-roll-data.mjs';
import {npcFeatureRollData} from '../module/systems/legacy2-npc-features.mjs';
import Ruleset from '../module/systems/ruleset.mjs';
import * as runtime from '../module/systems/elemental-runtime.mjs';
import {energyConsumptionPlan,withoutEnergyConsumption} from '../module/applications/activity/legacy2-activation.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const method=(source,start)=>{const index=source.indexOf(start);assert(index>=0,start);return source.slice(index,source.indexOf('\n  }',index)+4);};
globalThis.game={settings:{get:(_scope,key)=>key==='rulesetVersion'?'2.0':false},user:{isGM:true},time:{worldTime:0},combat:null};
globalThis.CONFIG={DND5E:{abilities:{str:{label:'Força'}}}};
const foundry={utils:{deepClone:structuredClone,getProperty:(obj,path)=>path.split('.').reduce((value,key)=>value?.[key],obj),isEmpty:obj=>!Object.keys(obj).length,setProperty(){}}};globalThis.foundry=foundry;
Set.prototype.first??=function(){return this.values().next().value;};
const actorMethod=method(read('module/documents/actor/actor.mjs'),'  getRollData(options={}) {');
const NativeActor=new Function('Ruleset','elementalRollData','npcFeatureRollData','ConditionData','return class extends class {getRollData(){return {}}} {'+actorMethod+'}')(Ruleset,elementalRollData,npcFeatureRollData,{hasLevels:()=>false});
const baseSource=read('module/data/activity/base-activity.mjs'),attackSource=read('module/data/activity/attack-data.mjs'),damageSource=read('module/data/shared/damage-field.mjs');
const AppliedRules={collect:()=>({toArray:()=>[]}),createIterator:()=>({filterWith:()=>({toFormula:()=>''})})};
const BaseActivity=new Function('Ruleset','AppliedRules','foundry','return class {static damageRuleCategory="damage";getRollData(){return this.actor.getRollData({roll:true});}_getDamageParts(){return this.damage.parts;}getActionType(){return "rsak";}'+method(baseSource,'  getDamageConfig(config={}, { formulaOptions, rollData }={}) {')+method(baseSource,'  _processDamagePart(damage, rollConfig, rollData, index=0, { formulaOptions, rules }={}) {')+'}')(Ruleset,AppliedRules,foundry);
const NativeAttack=new Function('BaseActivity','Ruleset','Roll','simplifyBonus','return class extends BaseActivity {'+method(attackSource,'  _processDamagePart(damage, rollConfig, rollData, index=0, options={}) {')+'}')(BaseActivity,Ruleset,class{},Number);
const NativeDamage=new Function('Scaling','Roll','return class {'+method(damageSource,'  _manualFormula({ modifiers }={}) {')+method(damageSource,'  scaledFormula(increase, options={}) {')+'}')(class{},class{});
const blast=item=>Object.values(item.system.activities).find(a=>a.flags['Immortals-system'].elementalActivity.key==='blast');
function actor(rank=1,type='character'){
 const a=Object.assign(new NativeActor(),{type,id:'caster',uuid:'Actor.caster',name:'Cultivador',isOwner:true,flags:{},statuses:new Set(),itemTypes:{class:[{type:'class',system:{identifier:'cultivador'},getFlag:()=>null}],race:[]}});
 a.system={cultivation:{rank,stage:1,soulCultivation:0},elementAbilities:{luz:{lightOrbs:1}},abilities:{str:{value:7},con:{value:5}},legacy2:{actions:{value:6,max:6},nd:10},energy:{generated:20,total:100}};
 a.system.getRollData=()=>({abilities:a.system.abilities,roll:{ability:'str'},mod:7,details:{level:1}});return a;
}
function fixture(rank=1,tier=1,type='character'){
 const a=actor(rank,type);a.system.elementAbilities.luz.lightOrbs=tier;const item=elementalFeatureDocument('luz','lightOrbs',tier);item.id=item._id;item.actor=a;item.isEmbedded=true;item.isOwner=true;item.getFlag=()=>undefined;item.system.uses.spent=0;
 const b=blast(item);b.id=b._id;b.actor=a;b.item=item;b.getRollData=()=>a.getRollData({roll:true});a.items=new Map([[item.id,item]]);return{a,item,b};
}
function nativeDamage(f){const activity=Object.assign(new NativeAttack(),f.b);activity.damage={...f.b.damage,parts:f.b.damage.parts.map(source=>Object.assign(new NativeDamage(),structuredClone(source),{types:new Set(source.types),modifiers:new Set()}))};return activity.getDamageConfig({ability:'str'});}

test('Light Blast creates real native radiant damage at every orb tier using the existing cultivation die',()=>{
 for(const[tier,rank,want]of [[1,1,'1d4'],[2,2,'1d6'],[3,3,'1d8'],[1,4,'1d10'],[2,5,'1d12'],[3,10,'1d12']]){
  const f=fixture(rank,tier);assert.equal(f.b.damage.parts.length,1);const before=structuredClone(f.b.damage.parts);
  const card=nativeDamage(f);assert.equal(card.rolls.length,1);assert.equal(card.rolls[0].options.type,'radiant');assert.deepEqual(card.rolls[0].options.types,['radiant']);
  const formula=card.rolls[0].parts.join(' + ').replace(/@danoCultivo\b/g,card.rolls[0].data.danoCultivo);
  assert.equal(formula,want);assert.deepEqual(f.b.damage.parts,before);assert.equal(f.b.damage.includeBase,false);
 }
});

test('Light Blast uses no extra Qi, one existing orb and a narrator boundary for specific attack modifications',()=>{
 const {item,b}=fixture();assert.deepEqual(b.consumption.targets.map(t=>[t.type,t.value]),[['itemUses','1']]);
 assert.match(item.system.description.value,/modificaç[õo]es específicas.*ataque padrão.*narrador/i);assert.match(item.system.description.value,/PdN.*configurar.*dano/i);
});

test('unknown NPC default damage is blocked in the actual consume flow before orb or action spending',async()=>{
 const f=fixture(1,1,'npc'),warnings=[];let prepared=0,spent=0;
 const Hooks={call:()=>true},ui={notifications:{warn:message=>warnings.push(message)}};
 const consumeBody=read('module/documents/activity/mixin.mjs').match(/    async consume\(usageConfig, messageConfig\) \{([\s\S]*?)\n    \}/)[1];
 const Native=new Function('elementalAreaLethargyEligible','prepareElementalAreaLethargy','Hooks','Ruleset','ui','foundry','isElementalActivity','prepareElementalActivation','withElementalActivationLock','markElementalActionsPaid','refreshElementalConsumption','custoEfetivoEmAcoes','withoutEnergyConsumption','energyConsumptionPlan','commit','return class {async consume(usageConfig,messageConfig){'+consumeBody+'}async #applyUsageUpdates(updates){return commit(updates);}}')(elementalAreaLethargyEligible,prepareElementalAreaLethargy,Hooks,Ruleset,ui,foundry,runtime.isElementalActivity,runtime.prepareElementalActivation,runtime.withElementalActivationLock,runtime.markElementalActionsPaid,runtime.refreshElementalConsumption,()=>0,withoutEnergyConsumption,energyConsumptionPlan,async()=>{spent++;f.item.system.uses.spent++;return{};});
 const live=Object.assign(new Native(),f.b);live._prepareUsageUpdates=async()=>{prepared++;return{actor:{},operations:[],rolls:[]};};
 const result=await live.consume({consume:true,scaling:0},{});assert.equal(result,false);assert.equal(prepared,0);assert.equal(spent,0);assert.equal(f.item.system.uses.spent,0);assert.equal(f.a.system.energy.generated,20);assert.equal(f.a.system.legacy2.actions.value,6);assert.match(warnings[0],/Light Blast.*narrador|PdN.*dano/i);
});

test('a narrator can explicitly configure NPC Light Blast with existing NPC scale or a manual value',()=>{
 for(const formula of ['@escala','5','2d6 + @mod']){const f=fixture(1,1,'npc');f.b.damage.parts=[{types:['radiant'],custom:{enabled:true,formula},scaling:{mode:''}}];f.b.getRollData=()=>({...f.a.getRollData({roll:true}),escala:'2d8'});
  assert.doesNotThrow(()=>runtime.prepareElementalRuntimeUpdates(f.b,{consume:true,scaling:0},{user:game.user}));
 }
});
