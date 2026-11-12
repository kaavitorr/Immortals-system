import assert from "node:assert/strict";
import {test} from "node:test";
import Ruleset from "../module/systems/ruleset.mjs";
import {buildLegacy2Context} from "../module/applications/actor/jj/legacy2-sheet.mjs";
import {cultivatorClassData} from "../module/systems/wuxia-character.mjs";

const abilities=Object.fromEntries(["str","dex","con","int","wis","cha"].map(key=>[key,{label:key,abbreviation:key}]));
const config={abilities,movementTypes:{walk:{}}};
globalThis.game={settings:{get:(_scope,key)=>key==="rulesetVersion"?"2.0":key==="regraSalvaguarda"?true:undefined}};
globalThis.CONFIG={JUJUTSU:{...config,trainingPoints:{criacao:4}}};

function fixture(rank=1,stage=1,body=0,soul=0){
 const cls=cultivatorClassData();cls.getFlag=(scope,key)=>cls.flags[scope]?.[key];
 const base={str:3,dex:3,con:3,int:3,wis:2,cha:2};
 return {type:"character",flags:{},statuses:new Set(),itemTypes:{class:[cls],race:[],background:[]},items:[cls],getFlag:()=>undefined,
 system:{details:{level:25},cultivation:{rank,stage,bodyCultivation:body,soulCultivation:soul},
 abilities:Object.fromEntries(Object.entries(base).map(([key,value])=>[key,{value,_source:{value}}])),
 legacy2:{skills:{},saves:{},alternativeSaves:{},armas:{},pontos:{extra:0,gastos:0}},
 attributes:{hp:{value:20,max:20},movement:{speeds:{walk:9},units:"m"}},energy:{generated:0,total:40,max:40,intensiveTraining:{}},conceitos:{}}};
}
const budget=actor=>buildLegacy2Context(actor,config,Ruleset).atributos;

test("body and soul advancement never adds points to the sheet's normal attribute budget",()=>{
 for(let body=0;body<=10;body++)for(let soul=0;soul<=10;soul++){
  const a=fixture(1,1,body,soul);assert.equal(Ruleset.nivel(a),1);assert.equal(Ruleset.atributosAdicionais(a),0);
  assert.equal(budget(a).orcamento,16);assert.equal(budget(a).soma,16);
 }
});

test("only normal cultivation advances the free attribute pool through all thirty levels",()=>{
 const a=fixture(1,1,10,10);
 for(let level=1;level<=30;level++){a.system.cultivation.rank=Math.ceil(level/3);a.system.cultivation.stage=1+(level-1)%3;
  assert.equal(Ruleset.nivel(a),level);assert.equal(budget(a).orcamento,16+level-1);}
 a.system.cultivation.rank=1;a.system.cultivation.stage=1;assert.equal(budget(a).orcamento,16);
});

test("explicit origin bonuses remain additive while derived path bonuses do not spend base points",()=>{
 const a=fixture(2,1,6,9);a.itemTypes.race=[{getFlag:(_scope,key)=>key==="atributosAdicionais"?2:undefined}];
 a.system.abilities.str.value=4; // An existing effect changed the prepared value, not its base.
 const before=JSON.stringify(a);assert.equal(Ruleset.atributosAdicionais(a),2);
 const result=budget(a);assert.equal(result.orcamento,21);assert.equal(result.soma,16);assert.equal(JSON.stringify(a),before);
});
