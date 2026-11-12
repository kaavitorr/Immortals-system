import assert from "node:assert/strict";
import {test} from "node:test";
import * as cultivation from "../module/systems/cultivation.mjs";
import {conceptTrainingState} from "../module/systems/elemental-concepts.mjs";
import {professionCraftingPlan} from "../module/systems/profession-crafting-rules.mjs";
import {essenceState, essenceIntegrationAttempt} from "../module/systems/beast-essence-rules.mjs";
import {createBeastEssenceRuntime} from "../module/systems/beast-essence-runtime.mjs";
const S="Immortals-system";
const actor=(key=null,{rank=4,stage=3}={})=>({id:"hero",uuid:"Actor.hero",type:"character",isOwner:true,
 itemTypes:{class:[{type:"class",system:{identifier:"cultivador"}}]},items:[],
 flags:{[S]:{cultivationDestiny:{key,lineageId:"dragon",elements:["fogo"]}}},
 system:{cultivation:{rank,stage,essence:1e8,points:100,illumination:3},energy:{generated:1000},conceitos:{},legacy2:{actions:{value:3}},abilities:{str:{value:4}}}});
const essence=(lineageId="dragon")=>({version:1,id:"essence-"+lineageId,name:"Besta",growth:"supreme",lineageId,elements:["fogo"],ability:"str",features:[],attacks:[],naturalWeapons:[],normalFeatures:[],weakenedFeatures:[],normalAttacks:[],weakenedAttacks:[]});
const item=(lineageId="dragon")=>({id:"loot",type:"loot",system:{quantity:1},flags:{[S]:{beastEssenceItem:{version:1,definition:essence(lineageId)}}}});
const saveEssence=(a,lineageId="dragon",active=false)=>{const e=essence(lineageId);a.flags[S].beastEssence={version:1,integrated:e,transformation:{active,integrationId:e.id}};return a;};
const nativeRuntime=(a,{onRoll=()=>30,onTokens=()=>[],onBuild=()=>[]}={})=>{let commits=0;const runtime=createBeastEssenceRuntime({user:()=>({id:"u",isGM:true}),mayProcess:()=>true,tokenDocuments:onTokens,context:()=>({turn:null}),idFactory:()=>"grant",buildGrants:onBuild,rollIntegration:onRoll,commit:async()=>{commits++;}});return {runtime,get commits(){return commits;}};};

test("destiny absorption penalties use the native cap and apply once before rounding",()=>{
 for(const [key,want]of [[null,15],["supreme-legacy",9],["divine-lineage",12]]){const a=actor(key);assert.equal(cultivation.dailyEssenceGain({level:"mediano"},20,a.system.cultivation,a),want);}
 const a=actor("divine-lineage");a.system.cultivation.soulCultivation=8;a.flags[S].constitution={primary:{id:"human-alinhamento-celestial",quality:"inferior"}};
 assert.equal(cultivation.dailyEssenceGain({level:"supremo"},1,a.system.cultivation,a),3);
 assert.equal(cultivation.dailyEssenceGain({level:"supremo"},0,a.system.cultivation,a),0);
});
test("NPC and characters without the Cultivador class receive no destiny absorption modifier",()=>{
 const a=actor("supreme-legacy");a.type="npc";assert.equal(cultivation.dailyEssenceGain({level:"mediano"},15,a.system.cultivation,a),15);
 a.type="character";a.itemTypes.class=[];assert.equal(cultivation.dailyEssenceGain({level:"mediano"},15,a.system.cultivation,a),15);
});
test("reincarnated breakthrough combines foundation, toxins, constitution and illumination reductions",()=>{
 const a=actor("reincarnated");a.system.cultivation.foundation={rank:4,encounters:4,years:0};a.flags[S].pillToxins={value:20};a.flags[S].constitution={primary:{id:"sacred-corpo-da-tribulacao-sagrado",quality:"inferior"}};
 assert.equal(cultivation.cultivationAdvanceState(a,"breakthrough",{piSpent:1}).cd,2);
 assert.equal(cultivation.cultivationAdvanceState(a,"stage").cd,10);
 a.system.cultivation.illumination=3;assert.equal(cultivation.cultivationAdvanceState(a,"breakthrough",{piSpent:3}).cd,1);
});
test("reincarnated does not reduce the separate Body and Soul path difficulties",()=>{
 const a=actor("reincarnated");Object.assign(a.system.cultivation,{bodyPills:{1:10},soulCultivation:3,soulPills:{4:20}});
 assert.equal(cultivation.cultivationUpdate(a,"body",{points:100}).cd,11);
 assert.equal(cultivation.cultivationUpdate(a,"soul",{points:100,rollTotal:10}).success,false);
 assert.equal(cultivation.cultivationUpdate(a,"soul",{points:100,rollTotal:10}).cd,11);
});
test("reincarnated concept comprehension stacks with Body, realm and illumination reductions",()=>{
 const a=actor("reincarnated",{rank:5});a.system.cultivation.bodyCultivation=7;a.system.conceitos.fogo={level:4};
 const state=conceptTrainingState(a,"fogo",{points:100,piSpent:1});assert.equal(state.cd,5);
 a.system.cultivation.illumination=10;assert.equal(conceptTrainingState(a,"fogo",{points:100,piSpent:10}).cd,1);
});
test("reincarnated reduces professional entry and advancement while ordinary crafting and quality retain their DC",()=>{
 const a=actor("reincarnated",{rank:5});a.system.cultivation.soulCultivation=8;a.flags[S].constitution={primary:{id:"earth-corpo-de-pilula-superior",quality:"inferior"}};a.flags[S].professions={alchemy:{level:3}};
 const product={id:"pill",profession:"alchemy",kind:"pill",levels:{min:1,max:10},dc:{min:20,max:20}},plan=options=>professionCraftingPlan(a,{profession:"alchemy",product,...options});
 assert.equal(plan({level:4,advancement:true}).dc,11);assert.equal(plan({level:3}).dc,8);
 a.flags[S].professions.alchemy.level=0;const entry=plan({level:1,advancement:true});assert.equal(entry.dc,9);assert.equal(entry.qualityCheck.dc,8);
});
test("genius tribulation follows the existing realm gate and preserves ordinary dice",()=>{
 assert.equal(typeof cultivation.cultivationTribulationDice,"function");
 for(const [key,rank,want]of [["unrivaled-genius",3,0],["unrivaled-genius",4,40],["unrivaled-genius",5,50],["unrivaled-genius",10,100],[null,4,20],[null,5,26]])assert.equal(cultivation.cultivationTribulationDice(actor(key,{rank})),want);
});
test("failed normal and Soul advances use the shared genius dice while success and constitution immunity prevent damage",()=>{
 const a=actor("unrivaled-genius");assert.equal(cultivation.cultivationUpdate(a,"breakthrough",{points:100,rollTotal:0}).tribulationDice,40);
 assert.equal(cultivation.cultivationUpdate(a,"breakthrough",{points:100,rollTotal:99}).tribulationDice,0);
 Object.assign(a.system.cultivation,{soulCultivation:3,soulPills:{4:20}});assert.equal(cultivation.cultivationUpdate(a,"soul",{points:100,rollTotal:0}).tribulationDice,40);
 a.flags[S].constitution={primary:{id:"supreme-corpo-do-deus-celestial",quality:"unica"}};assert.equal(cultivation.cultivationTribulationDice(a),0);assert.equal(cultivation.cultivationUpdate(a,"breakthrough",{points:100,rollTotal:0}).tribulationDice,0);
});
test("divine lineage rejects incompatible essence integration before points or inventory change",()=>{
 const a=actor("divine-lineage"),loot=item("phoenix");a.system.cultivation.points=0;const before=structuredClone({a,loot});
 assert.throws(()=>essenceIntegrationAttempt(a,loot,{rollTotal:99}),/linhagem/i);assert.deepEqual({a,loot},before);
});
test("divine lineage seals manual integration until realm three while Meio Monstro can integrate immediately",()=>{
 const a=actor("divine-lineage",{rank:2}),loot=item();assert.throws(()=>essenceIntegrationAttempt(a,loot,{rollTotal:99}),/linhagem|Núcleo Rotativo/i);
 a.system.cultivation.rank=3;assert.equal(essenceIntegrationAttempt(a,loot,{rollTotal:99}).pointsRemaining,95);
 a.system.cultivation.rank=1;a.itemTypes.race=[{type:"race",system:{identifier:"especie-meio-monstro"}}];assert.equal(essenceIntegrationAttempt(a,loot,{rollTotal:99}).success,true);
});
test("sealed and incompatible saved essence loses powers without deleting the integration",()=>{
 for(const [rank,lineage]of [[2,"dragon"],[4,"phoenix"]]){const a=saveEssence(actor("divine-lineage",{rank}),lineage,true),before=structuredClone(a),state=essenceState(a);assert.equal(state.active,false);assert.equal(state.qiBonus,0);assert.equal(state.abilityBonus,0);assert.deepEqual(state.elements,[]);assert.deepEqual(a,before);}
 const a=saveEssence(actor("divine-lineage",{rank:3}),"dragon",true);assert.equal(essenceState(a).active,true);assert.deepEqual(essenceState(a).elements,["fogo"]);
});
test("queue and completed rest cannot prepare or spend on an incompatible essence",async()=>{
 const a=actor("divine-lineage");a.items=[item("phoenix")];let rolls=0;const f=nativeRuntime(a,{onRoll:()=>{rolls++;return 99;}});
 await assert.rejects(()=>f.runtime.queueBeastEssenceIntegration(a,"loot"),/linhagem/i);assert.equal(f.commits,0);
 a.flags[S].beastEssence={pendingItemId:"loot",completedRest:{id:"rest",itemId:"loot"}};
 await assert.rejects(()=>f.runtime.completeBeastEssenceIntegration(a,"rest"),/linhagem/i);assert.equal(rolls,0);assert.equal(f.commits,0);assert.equal(a.system.cultivation.points,100);assert.equal(a.items[0].system.quantity,1);
});
test("activation blocks sealed or incompatible saved essence before actions, Qi, grants or native writes",async()=>{
 for(const [rank,lineage]of [[2,"dragon"],[4,"phoenix"]]){const a=saveEssence(actor("divine-lineage",{rank}),lineage),before=structuredClone(a);let grants=0;const f=nativeRuntime(a,{onBuild:()=>{grants++;return [];}});await assert.rejects(()=>f.runtime.activateBeastEssence(a),/linhagem|Núcleo Rotativo/i);assert.equal(grants,0);assert.equal(f.commits,0);assert.deepEqual(a,before);}
});
test("activation rechecks lineage compatibility after awaiting native token documents",async()=>{
 const a=saveEssence(actor("divine-lineage")),f=nativeRuntime(a,{onTokens:async()=>{a.flags[S].cultivationDestiny.lineageId="phoenix";return [];}});
 await assert.rejects(()=>f.runtime.activateBeastEssence(a),/linhagem/i);assert.equal(f.commits,0);assert.equal(a.system.energy.generated,1000);assert.equal(a.system.legacy2.actions.value,3);
});
