import assert from "node:assert/strict";
import {test} from "node:test";
import * as cultivation from "../module/systems/cultivation.mjs";
import {cultivationPoints} from "../module/applications/actor/jj/cultivation-sheet.mjs";
import {conceptTrainingState,conceptTrainingUpdate} from "../module/systems/elemental-concepts.mjs";
globalThis.game={settings:{get:(_s,key)=>key==="rulesetVersion"?"2.0":undefined}};
globalThis.CONFIG={JUJUTSU:{trainingPoints:{criacao:4}}};
function actor(rank=1,stage=1){return {type:"character",system:{cultivation:{rank,stage,essence:100000000,points:20,illumination:3,spentTrainingPoints:7,foundation:{rank,encounters:0,years:0}},legacy2:{pontos:{extra:100,gastos:0},wounds:{value:4}},energy:{total:10,max:40},conceitos:{}},flags:{}};}
test("Cultivation reads and spends a separate balance without changing proficiency ranks",()=>{
 const a=actor();assert.equal(cultivationPoints(a),20);assert.equal(typeof cultivation.cultivationPointUpdates,"function");
 assert.deepEqual(cultivation.cultivationPointUpdates(a,5),{"system.cultivation.points":15,"system.cultivation.spentTrainingPoints":12});
 assert.throws(()=>cultivation.cultivationPointUpdates(a,21));assert.equal(a.system.legacy2.pontos.extra,100);
});
test("foundation only discounts encounters after the third and completed rank-length reclusion",()=>{
 assert.equal(typeof cultivation.cultivationDifficulty,"function");const a=actor(3,3);
 for(const [encounters,years,cd]of [[3,0,11],[4,0,10],[6,0,8],[3,2,11],[3,3,10],[3,6,9]]){
 a.system.cultivation.foundation={rank:3,encounters,years};assert.equal(cultivation.cultivationDifficulty(a.system.cultivation),cd);}
 a.system.cultivation.foundation={rank:2,encounters:99,years:99};assert.equal(cultivation.cultivationDifficulty(a.system.cultivation),11);
});
test("successful breakthrough resets the new realm's foundation while failure keeps accumulated foundation",()=>{
 const a=actor(3,3);a.system.cultivation.foundation.encounters=5;
 const success=cultivation.cultivationUpdate(a,"breakthrough",{points:20,rollTotal:9});assert.equal(success.success,true);
 assert.deepEqual(success.updates["system.cultivation.foundation"],{rank:4,encounters:0,years:0});
 const fail=cultivation.cultivationUpdate(a,"breakthrough",{points:20,rollTotal:8});assert.equal(fail.success,false);assert.equal(fail.updates["system.cultivation.persistentInjuries"],1);
});
test("tribulations begin when leaving Mar Divino and increase by six d10 for each higher realm",()=>{
 for(const [rank,dice]of [[3,0],[4,20],[5,26],[9,50]]){
 const result=cultivation.cultivationUpdate(actor(rank,3),"breakthrough",{points:99,rollTotal:1});assert.equal(result.tribulationDice,dice);}
 assert.equal(cultivation.cultivationUpdate(actor(4,3),"breakthrough",{points:99,rollTotal:20}).tribulationDice,0);
});
test("tribulation damage becomes wounds directly and never consumes life, temporary HP or shield",()=>{
 assert.equal(typeof cultivation.tribulationWoundsUpdate,"function");const a=actor(4,3);a.system.armorPoints={value:100};a.system.attributes={hp:{value:80,temp:50}};
 assert.deepEqual(cultivation.tribulationWoundsUpdate(a,37),{"system.legacy2.wounds.value":41});assert.equal(a.system.armorPoints.value,100);assert.equal(a.system.attributes.hp.temp,50);
});
test("combat stage advancement costs no cultivation credit and still advances only an eligible internal stage",()=>{
 const a=actor(1,1),result=cultivation.cultivationUpdate(a,"combat",{points:0});assert.equal(result.cost,0);assert.equal(result.updates["system.cultivation.stage"],2);
 assert.throws(()=>cultivation.cultivationUpdate(actor(1,3),"combat",{points:20}));
});
test("Entendimento discounts both elemental difficulty and cultivation-point cost without changing Qi cost",()=>{
 const a=actor(2,1);a.system.conceitos.fogo={level:4};a.system.energy.generated=100;
 const state=conceptTrainingState(a,"fogo",{points:99,piSpent:1});assert.equal(state.ptCost,2);assert.equal(state.cd,15);
 const update=conceptTrainingUpdate(a,"fogo",{points:99,piSpent:1,rollTotal:20,support:{kind:"matrix",elementId:"fogo",level:5}});assert.equal(update.cost,2);assert.equal(update.qiCost,90);
});
