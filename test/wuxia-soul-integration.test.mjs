import {test} from 'node:test';import assert from 'node:assert/strict';
import Ruleset from '../module/systems/ruleset.mjs';import {cultivatorClassData} from '../module/systems/wuxia-character.mjs';
import {cultivationUpdate,dailyEssenceGain} from '../module/systems/cultivation.mjs';import {buildPeqEntries} from '../module/systems/peq.mjs';
import {professionDifficultyReduction} from '../module/systems/cultivation-rank-benefits.mjs';
import {conceptTrainingState} from '../module/systems/elemental-concepts.mjs';import {applyLegacy2TestRoll} from '../module/applications/dice/legacy2-test-roll.mjs';
import {resistanceCards,applyNumericResistances} from '../module/systems/legacy2-resistances.mjs';
globalThis.game={settings:{get:(_scope,key)=>key==='rulesetVersion'?'2.0':key==='regraSalvaguarda'?true:undefined}};
globalThis.CONFIG={Dice:{D20Roll:{ADV_MODE:{NORMAL:0}}}};
const actor=(soul=0)=>{const cls=cultivatorClassData();return{type:'character',id:'lin',uuid:'Actor.lin',flags:{},getFlag:()=>undefined,itemTypes:{class:[cls],race:[]},items:[cls],system:{cultivation:{rank:1,stage:1,soulCultivation:soul},abilities:{str:{value:3},dex:{value:2},con:{value:3},int:{value:2},wis:{value:2},cha:{value:2}},legacy2:{alternativeSaves:{fortitude:1,vontade:1},resistances:{}},attributes:{},energy:{total:999},conceitos:{}}};};
test('PV da Alma somam ao Corpo sem ampliar o orçamento geral e a Oitava Revolução eleva os limites mentais',()=>{
 assert.equal(Ruleset.maxHitPoints(actor(0)),20);assert.equal(Ruleset.maxHitPoints(actor(1)),21);const a=actor(3);a.system.cultivation.bodyCultivation=2;assert.equal(Ruleset.maxHitPoints(a),43);assert.equal(Ruleset.atributosAdicionais(a),0);
 a.system.cultivation.soulCultivation=9;assert.equal(Ruleset.attributeLimit(a,'int'),15);assert.equal(Ruleset.attributeLimit(a,'wis'),15);assert.equal(Ruleset.attributeLimit(a,'cha'),15);assert.equal(Ruleset.attributeLimit(a,'str'),12);
});
test('Soul 8 triplica a absorção uma única vez na concessão diária, inclusive manual limitado e taxa zero',()=>{
 const zone={level:'mediano'},a=actor(8);a.getFlag=()=>10;a.system.cultivation.essence=0;
 assert.equal(dailyEssenceGain(zone,10,a.system.cultivation),30);assert.equal(dailyEssenceGain(zone,null,a.system.cultivation),45);assert.equal(dailyEssenceGain(zone,0,a.system.cultivation),0);
 const entry=buildPeqEntries([a],2,zone)[0];assert.equal(entry.gainPerDayLabel,30);assert.equal(entry.projected,60);
});
test('a redução profissional da Alma não reduz CD de treinamento elemental',()=>{
 const a=actor(8);a.system.cultivation.rank=5;assert.equal(professionDifficultyReduction(a,5),9);assert.equal(professionDifficultyReduction(a,6),5);assert.equal(conceptTrainingState(a,'fogo',{points:99}).cd,6);
});
test('a tentativa do terceiro nível já exige teste e a falha tem a tribulação do reino',()=>{
 const a=actor(2);a.system.cultivation={...a.system.cultivation,rank:4,stage:2,soulPills:{3:20}};
 assert.throws(()=>cultivationUpdate(a,'soul',{points:99}),/teste de Alma/);const result=cultivationUpdate(a,'soul',{points:99,rollTotal:1});
 assert.equal(result.success,false);assert.equal(result.cost,30);assert.equal(result.tribulationDice,20);assert.equal(result.updates['system.cultivation.stage'],1);assert.equal(result.updates['system.cultivation.soulPills.3'],0);assert.equal(result.updates['system.cultivation.soulCultivation'],undefined);
});
test('defesa condicional entra uma vez na rolagem e sai ao mudar para Reflexo',()=>{
 const a=actor(4),process={subject:a,ability:'str',hookNames:['SavingThrow'],legacy2:{mindSoul:true},rolls:[{}]},roll={parts:['@mod'],data:{abilityId:'str'},options:{}};
 applyLegacy2TestRoll(roll,process);applyLegacy2TestRoll(roll,process);assert.equal(roll.data.soulDefense,1);assert.equal(roll.parts.filter(p=>p==='@soulDefense').length,1);
 process.ability='dex';roll.data.abilityId='dex';applyLegacy2TestRoll(roll,process);assert.equal(roll.data.soulDefense,0);assert(!roll.parts.includes('@soulDefense'));
});
test('resistência exibida e aplicada usa uma única fonte para o bônus da Alma',()=>{
 const a=actor(4);a.system.legacy2.resistances.psychic={value:2};a.system.conceitos.ilusao={level:1};
 const card=resistanceCards(a).find(card=>card.key==='psychic');assert.equal(card.value,15);const damage=[{type:'psychic',value:20}];applyNumericResistances(a,damage);assert.equal(damage[0].value,5);
});
