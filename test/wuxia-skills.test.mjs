import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import * as skills from '../module/systems/legacy2-skills.mjs';
import {buildLegacy2Context} from '../module/applications/actor/jj/legacy2-sheet.mjs';
import Ruleset from '../module/systems/ruleset.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replaceAll('\r\n','\n');
const body=(p,signature)=>{const s=read(p),start=s.indexOf(signature);assert(start>=0);const from=start+signature.length,to=s.indexOf('\n  }',from);assert(to>from);return s.slice(from,to);};
globalThis.game={settings:{get:(_s,k)=>k==='rulesetVersion'?'2.0':false}};
globalThis.CONFIG={JUJUTSU:{trainingPoints:{criacao:4}},DND5E:{skillPassive:{base:10,modifier:5},characterFlags:{}}};
globalThis.foundry={utils:{deepClone:structuredClone}};
globalThis.dnd5e={settings:{rulesVersion:'modern'}};
Number.isNumeric??=(n=>n!==null&&n!==''&&Number.isFinite(Number(n)));
const actor=()=>({type:'character',items:[],itemTypes:{},system:{
 abilities:{str:{value:2},dex:{value:2},con:{value:8},int:{value:2},wis:{value:5},cha:{value:2}},
 skills:{arc:{ability:'int'},ani:{ability:'wis'}},attributes:{hp:{value:20,max:20},init:{total:0}},
 details:{level:1},energy:{total:10,max:10},legacy2:{skills:{arc:1,ani:1},pontos:{gastos:2}}}});
const config={abilities:Object.fromEntries([['str','Força','FOR'],['dex','Agilidade','AGI'],['con','Constituição','CON'],['int','Intelecto','INT'],['wis','Sabedoria','SAB'],['cha','Presença','PRE']].map(([k,label,abbreviation])=>[k,{label,abbreviation}]))};
test('skill cards use CON for Qi Control and WIS for Creation while retaining trained ranks',()=>{
 const a=actor(),ctx=buildLegacy2Context(a,config,Ruleset),qi=ctx.skills.find(s=>s.key==='arc'),creation=ctx.skills.find(s=>s.key==='ani');
 assert.equal(qi.label,'Controle de Qi');assert.equal(qi.ability,'con');assert.equal(qi.abilityAbbr,'CON');assert.equal(qi.total,8);assert.equal(qi.rank,1);
 assert.equal(creation.label,'Criação');assert.equal(creation.ability,'wis');assert.equal(creation.total,5);assert.equal(creation.rank,1);
 assert(qi.description?.includes('Qi'));assert(creation.description?.includes('profissão'));
 assert.deepEqual(a.system.skills,{arc:{ability:'int'},ani:{ability:'wis'}});
});
test('character and NPC clicks roll the prescribed abilities even on older skill source data',()=>{
 for(const file of ['module/applications/actor/character-sheet.mjs','module/applications/actor/npc-sheet.mjs']){
  class Base{_roll(){throw Error('Unexpected native fallback');}}
  const Sheet=new Function('Base','Ruleset','SKILL_GROUPS','return class extends Base{_roll(event,target){'+body(file,'  _roll(event, target) {')+'}}')(Base,Ruleset,skills.SKILL_GROUPS);
  const calls=[],sheet=Object.assign(new Sheet(),{actor:{system:{skills:{arc:{ability:'int'},ani:{ability:'int'}}},rollSkill:c=>calls.push(c)}});
  for(const [key,want]of [['arc','con'],['ani','wis']]){const event={},target={dataset:{type:'skill'},closest:()=>({dataset:{key}})};assert.equal(sheet._roll(event,target),false);assert.deepEqual(calls.at(-1),{skill:key,ability:want,event});}
 }
});
test('fresh native skill data receives the Immortals governing abilities',()=>{
 const source=read('module/config.mjs'),start=source.indexOf('DND5E.skills = ')+15,end=source.indexOf('\n};',start)+2;
 const nativeSkills=new Function('WUXIA_SKILLS','return ('+source.slice(start,end)+')')(skills.WUXIA_SKILLS);
 const initial=new Function('CONFIG','key','initial',body('module/data/actor/templates/creature.mjs','  static _initialSkillValue(key, initial) {'));
 const cfg={DND5E:{skills:nativeSkills}};
 assert.deepEqual(initial(cfg,'arc',{}),{ability:'con'});assert.deepEqual(initial(cfg,'ani',{}),{ability:'wis'});
});
test('native preparation fixes old Qi Control and Perception defaults without overwriting saved data or explicit alternate rolls',()=>{
 const signature='  prepareSkill(skillId, {\n    skillData, rollData, originalSkills, globalBonuses,\n    globalCheckBonus, globalSkillBonus, ability\n  }={}) {';
 const fn=new Function('WUXIA_SKILLS','simplifyBonus','AppliedRules','AdvantageModeField','return function(skillId,options={}){const {skillData:inputSkillData,rollData:inputRollData,originalSkills:inputOriginalSkills,globalBonuses:inputGlobalBonuses,globalCheckBonus:inputGlobalCheckBonus,globalSkillBonus:inputGlobalSkillBonus,ability:inputAbility}=options;let skillData=inputSkillData,rollData=inputRollData,originalSkills=inputOriginalSkills,globalBonuses=inputGlobalBonuses,globalCheckBonus=inputGlobalCheckBonus,globalSkillBonus=inputGlobalSkillBonus,ability=inputAbility;'+body('module/data/actor/templates/creature.mjs',signature)+'}')(skills.WUXIA_SKILLS,v=>Number(v)||0,{collect:()=>({filterWith:()=>({toFormula:()=>0,toAdvantageCounts:()=>({})})})},{combineFields:()=>({mode:0})});
 const saved={ability:'int',value:1,roll:{bonus:0}},model={parent:{flags:{},conditionRollReduction:0,getRollData:()=>({})},skills:{arc:saved},abilities:{int:{mod:2},con:{mod:8},wis:{mod:5}},rolls:{ability:{}},calculateAbilityCheckProficiency:()=>({multiplier:1,term:0,flat:0})};
 const result=fn.call(model,'arc');assert.equal(result.ability,'con');assert.equal(result.total,8);assert.equal(saved.ability,'int');
 model.skills.prc={ability:'int',value:1,roll:{bonus:0}};
 const perception=fn.call(model,'prc');assert.equal(perception.ability,'wis');assert.equal(perception.total,5);assert.equal(model.skills.prc.ability,'int');
 const alternate=fn.call(model,'arc',{ability:'int'});assert.equal(alternate.ability,'int');assert.equal(alternate.total,2);
});


test('skill hover metadata uses the Immortals names, descriptions, and governing attributes',()=>{
 const ctx=buildLegacy2Context(actor(),config,Ruleset);
 for(const [key,label,ability]of [['arc','Controle de Qi','Constituição'],['ani','Criação','Sabedoria']]){
  const skill=ctx.skills.find(s=>s.key===key);
  assert.equal(typeof skill.tooltip,'string');
  assert(skill.tooltip.includes(label));
  assert(skill.tooltip.includes(ability));
  assert(skill.tooltip.includes(skills.WUXIA_SKILLS[key].description));
  assert(!/Sobrenatural|Feitiço|Feitiçaria/.test(skill.tooltip));
 }
 assert.equal(ctx.skills.find(s=>s.key==='ath').tooltip,null);
});

test('Immortals skill hovers replace old compendium references without breaking other skill hovers',async()=>{
 const {injectSkillRefs,applyJJTextTooltips}=await import('../module/applications/actor/jj/tooltips.mjs');
 const rows=['arc','ani','ath'].map(key=>({dataset:{key,jjRef:'old-'+key,jjTooltipBound:'1',tooltip:'Old description'}}));
 const root={querySelectorAll:selector=>{
  if(selector==='li[data-key]')return rows;
  if(selector==='[data-jj-ref]')return rows.filter(row=>row.dataset.jjRef);
  throw Error('Unexpected selector: '+selector);
 }};
 const calls=[],previous=globalThis.fromUuid;
 globalThis.fromUuid=async uuid=>{calls.push(uuid);return {text:{content:'Athletics reference'}}};
 try{
  delete rows[2].dataset.jjTooltipBound;
  injectSkillRefs(root);
  for(const row of rows.slice(0,2)){
   assert.equal(row.dataset.jjRef,undefined);
   assert.equal(row.dataset.tooltipDirection,'UP');
   assert(row.dataset.tooltip.includes(skills.WUXIA_SKILLS[row.dataset.key].label));
  }
  applyJJTextTooltips(root);await Promise.resolve();
  assert.equal(calls.length,1);
  assert.equal(calls[0],rows[2].dataset.jjRef);
  assert.equal(rows[2].dataset.tooltip,'Athletics reference');
  assert(rows[0].dataset.tooltip.includes('Controle de Qi'));
  assert(rows[1].dataset.tooltip.includes('Criação'));
 }finally{globalThis.fromUuid=previous}
});
