import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ruleset from '../module/systems/ruleset.mjs';
import {prepareLegacy2ArmorClass} from '../module/systems/legacy2-armor.mjs';
let version='2.0';globalThis.game={settings:{get:()=>version}};
const actor=(tiers={},state={})=>({type:'character',flags:{'Immortals-system':{elementalState:state}},itemTypes:{class:[],equipment:[]},system:{elementAbilities:tiers,conceitos:{vento:{level:8}},abilities:{str:{value:17},dex:{value:17},con:{value:17}},attributes:{ac:{bonus:0,override:null}},_source:{attributes:{ac:{bonus:0}}}}});
const required=name=>{assert.equal(typeof Ruleset[name],'function',name+' must be exposed');return Ruleset[name].bind(Ruleset);};
const characterSource=readFileSync(new URL('../module/data/actor/character.mjs',import.meta.url),'utf8');
const start=characterSource.indexOf('      const bonusCREfeitos ='),end=characterSource.indexOf('      // Override de CR',start);
const prepareCharacterArmor=new Function('Ruleset','prepareLegacy2ArmorClass','actor2','seisCr',characterSource.slice(start,end)+'return this.attributes.ac.value;');
const armor=a=>prepareCharacterArmor.call(a.system,Ruleset,prepareLegacy2ArmorClass,a,0);

test('Wind clone armor bonus requires a learned active selection and clamps to each tier budget',()=>{
 const bonus=required('elementalArmorClassBonus');
 assert.equal(bonus(actor({}, {windClones:{remaining:9,maximumArmorClass:30}})),0);
 assert.equal(bonus(actor({vento:{controleVento:1}})),0);
 for(const [tier,want]of [[1,3],[2,5],[3,8]])assert.equal(bonus(actor({vento:{controleVento:tier}},{windClones:{remaining:99,maximumArmorClass:30}})),want);
 assert.equal(bonus(actor({vento:{controleVento:3}},{windClones:{remaining:2,maximumArmorClass:30}})),2);
});

test('malformed or exhausted clones grant no armor and cannot increase the concept-level budget',()=>{
 const bonus=required('elementalArmorClassBonus');
 for(const remaining of [-1,0,undefined,Infinity,'invalid'])assert.equal(bonus(actor({vento:{controleVento:2}},{windClones:{remaining,maximumArmorClass:999}})),0);
 const a=actor({vento:{controleVento:3}},{windClones:{remaining:99,maximumArmorClass:999}});a.system.conceitos.vento.level=99;assert.equal(bonus(a),10);
 a.system.conceitos.vento.level=0;assert.equal(bonus(a),0);
});

test('active selected Darkness Cloak grants only the mastered or perfect stealth bonus',()=>{
 const bonus=required('elementalSkillBonus');
 for(const [tier,want]of [[0,0],[1,0],[2,5],[3,10]]){
  const a=actor({escuridao:{darknessCloak:tier}},{darknessCloak:{active:true,stealthBonus:999,source:'escuridao.darknessCloak'}});
  assert.equal(bonus(a,'ste'),want);assert.equal(bonus(a,'ath'),0);
 }
 assert.equal(bonus(actor({escuridao:{darknessCloak:3}}),'ste'),0);
 assert.equal(bonus(actor({escuridao:{darknessCloak:3}},{darknessCloak:{active:false}}),'ste'),0);
});

test('elemental stat helpers do not modify saved source values and remain inactive in ruleset 1.0',()=>{
 const armorBonus=required('elementalArmorClassBonus'),skillBonus=required('elementalSkillBonus');
 const a=actor({vento:{controleVento:3},escuridao:{darknessCloak:3}},{windClones:{remaining:8,maximumArmorClass:30},darknessCloak:{active:true}}),before=structuredClone(a);
 assert.equal(armorBonus(a),8);assert.equal(armorBonus(a),8);assert.equal(skillBonus(a,'ste'),10);assert.deepEqual(a,before);
 try{version='1.0';assert.equal(armorBonus(a),0);assert.equal(skillBonus(a,'ste'),0);}finally{version='2.0';}
});

test('Character CR reaches at most 30 while valid clones remain and returns to its normal cap when depleted',()=>{
 const a=actor({vento:{controleVento:1}},{windClones:{remaining:3,maximumArmorClass:30}});
 const source=structuredClone(a.system._source);assert.equal(armor(a),30);assert.equal(armor(a),30);assert.deepEqual(a.system._source,source);
 a.flags['Immortals-system'].elementalState.windClones.remaining=0;a.system.attributes.ac.bonus=10;assert.equal(armor(a),28);
 a.flags['Immortals-system'].elementalState.windClones.remaining=1;assert.equal(armor(a),30);
});

test('unlearned clone flags and base Qi Imutavel never raise CR or the normal maximum',()=>{
 const a=actor({terra:{qiImutavel:3}},{windClones:{remaining:3,maximumArmorClass:30}});assert.equal(armor(a),27);
 a.system.attributes.ac.bonus=10;assert.equal(armor(a),28);
});
