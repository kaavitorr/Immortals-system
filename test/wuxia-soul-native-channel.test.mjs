import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import Ruleset from '../module/systems/ruleset.mjs';
globalThis.game={settings:{get:()=> '2.0'}};Set.prototype.first??=function(){return this.values().next().value;};
const source=readFileSync(new URL('../module/data/activity/base-activity.mjs',import.meta.url),'utf8');
const start=source.indexOf('  _processDamagePart(damage, rollConfig, rollData, index=0, { formulaOptions, rules }={}) {');const end=source.indexOf('\n  }',start);assert(start>0);
const native=new Function('Ruleset','foundry','return function(damage,rollConfig,rollData,index=0,{formulaOptions,rules}={}){'+source.slice(start+'  _processDamagePart(damage, rollConfig, rollData, index=0, { formulaOptions, rules }={}) {'.length,end)+'}')(Ruleset,{utils:{deepClone:structuredClone,getProperty:()=>undefined}});
test('canalização nativa muda apenas a cópia de rolagem e conserva a identificação no card',()=>{
 const actor={type:'character',flags:{'Immortals-system':{soulAvatar:{active:true},soulChannel:'psychic'}},system:{cultivation:{soulCultivation:1}}};
 const context={actor,item:{type:'spell',system:{},getFlag:()=>undefined},target:{template:{}},constructor:{damageRuleCategory:'damage'},getActionType:()=> 'msak'};
 const damage={types:new Set(['fire']),scaledFormula:()=> '1d6'};const output=native.call(context,damage,{}, {roll:{properties:[]}});
 assert.equal(output.options.type,'psychic');assert.equal(output.options.soulChannel,'psychic');assert(damage.types.has('fire'));
 context.target.template.type='cone';assert.equal(native.call(context,damage,{}, {roll:{}}).options.type,'fire');
 context.target.template={};context.constructor.damageRuleCategory='healing';assert.equal(native.call(context,damage,{}, {roll:{}}).options.type,'fire');
});
