import {test} from 'node:test';import assert from 'node:assert/strict';
import Ruleset from '../module/systems/ruleset.mjs';
import {EnergySystem} from '../module/systems/energy.mjs';
import {prepareRankUpdate} from '../module/applications/actor/jj/legacy2-sheet.mjs';
import {stepPlayerAbility} from '../module/applications/actor/jj/ability-steps-2.mjs';
const config={str:{},dex:{},con:{},int:{},wis:{},cha:{}};
globalThis.game={settings:{get:(_scope,key)=>key==='rulesetVersion'?'2.0':key==='regraSalvaguarda'?true:undefined}};
const actor=(body=0)=>{const cls={type:'class',system:{identifier:'cultivador'},getFlag:()=>undefined};return{type:'character',itemTypes:{class:[cls],race:[]},items:[cls],flags:{},system:{cultivation:{rank:1,stage:1,bodyCultivation:body},abilities:{str:{value:3},dex:{value:2},con:{value:3}},legacy2:{skills:{ath:0},pontos:{extra:0,gastos:0}},energy:{intensiveTraining:{maxEnergy:0}}}};};
test('os dez PV por nível de Corpo entram no máximo sem ampliar o orçamento geral de atributos',()=>{
 for(const [level,maximum] of [[0,20],[1,30],[2,40],[5,70],[10,120]])assert.equal(Ruleset.maxHitPoints(actor(level)),maximum);
 assert.equal(Ruleset.atributosAdicionais(actor(4)),0);
});
test('Atletismo recebe um degrau gratuito e alterar os pontos não cobra esse degrau',()=>{
 const a=actor(4);assert.equal(Ruleset.skillRank(a,'ath'),1);
 const result=prepareRankUpdate(a,'skills','ath',2,Ruleset,config);assert.equal(result.update['system.legacy2.skills'].ath,1);assert.equal(result.update['system.legacy2.pontos.gastos'],1);
 a.system.legacy2.skills.ath=4;assert.equal(Ruleset.skillRank(a,'ath'),4);
});
test('Refinamento da Morte soma metade de CON sem alterar bônus manual',()=>{
 const a=actor(10);a.flags['Immortals-system']={refinamentoBonus:5};a.system.abilities.con.value=7;assert.equal(EnergySystem.refinamentoBonus(a),8);
 a.system.cultivation.bodyCultivation=9;assert.equal(EnergySystem.refinamentoBonus(a),5);
});
test('setas respeitam o limite físico 15 e a soma de efeitos sem elevar atributos mentais',async()=>{
 const a=actor(6);a.system._source={abilities:{str:{value:12},wis:{value:12}}};a.system.abilities.str.value=14;a.system.abilities.wis={value:12};const writes=[];
 a.update=async patch=>writes.push(patch);const sheet={actor:a,isEditable:true,isEditMode:true};
 await stepPlayerAbility(sheet,{dataset:{ability:'str',step:'1'}});assert.deepEqual(writes,[{'system.abilities.str.value':13}]);
 a.system.abilities.str.value=15;await stepPlayerAbility(sheet,{dataset:{ability:'str',step:'1'}});
 await stepPlayerAbility(sheet,{dataset:{ability:'wis',step:'1'}});assert.equal(writes.length,1);
});

test('geração normal e geração com escolhas recebem o novo Refinamento da Morte',async()=>{
 for(const choices of [false,true]){const a=actor(10);a.system.abilities.con.value=7;a.system.energy={total:100,generated:0,bonuses:{},intensiveTraining:{},generation:{}};
 a.update=async patch=>{for(const[key,value]of Object.entries(patch)){let target=a;const parts=key.split('.'),last=parts.pop();for(const part of parts)target=target[part];target[last]=value;}};
 if(choices)await EnergySystem.processTurnStartWithChoices(a,{});else await EnergySystem.processTurnStart(a);
 assert.equal(a.system.energy.generated,5);assert.equal(a.system.energy.total,95);}
});
