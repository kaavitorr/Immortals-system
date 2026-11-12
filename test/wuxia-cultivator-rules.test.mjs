import {elementalRollData} from "../module/systems/elemental-roll-data.mjs";
import {readFileSync} from "node:fs";
import {qiMaxCultivo} from "../module/systems/cultivation-data.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import Ruleset from "../module/systems/ruleset.mjs";
import {cultivatorClassData,ensureCultivatorClass} from "../module/systems/wuxia-character.mjs";
import {creationPrimaryOptions,creationDraft,allocateCreationRank} from "../module/applications/actor/creation/creation-model-2.mjs";
import {escolhasTotais} from "../module/systems/especializacoes-2.mjs";
globalThis.game={settings:{get:(_s,key)=>key==="rulesetVersion"?"2.0":key==="regraSalvaguarda"?true:undefined}};
globalThis.CONFIG={JUJUTSU:{trainingPoints:{criacao:4}}};
function actor(rank=1,stage=1,constitution=3){const cls=cultivatorClassData();cls.getFlag=(scope,key)=>cls.flags[scope]?.[key];return {type:"character",itemTypes:{class:[cls],race:[]},items:[cls],getFlag:()=>undefined,system:{details:{level:1},cultivation:{rank,stage,spentTrainingPoints:99,points:0},abilities:{str:{value:3},dex:{value:2},con:{value:constitution}},legacy2:{pontos:{extra:0,gastos:0}},energy:{intensiveTraining:{maxEnergy:0}}}};}
test("Cultivador life, Qi and effective level follow internal stages and realm crossings",()=>{
 for(const [rank,stage,hp,qi,level] of [[1,1,20,40,1],[1,2,25,50,2],[1,3,30,60,3],[2,1,40,80,4],[2,2,45,90,5],[10,3,210,520,30]]){
  const a=actor(rank,stage);assert.equal(Ruleset.maxHitPoints(a),hp);assert.equal(Ruleset.maxEnergy(a),qi);assert.equal(Ruleset.nivel(a),level);
 }
});
test("Constitution adds five life per point while wounds and manual maxima keep their native overrides",()=>{
 const a=actor(2,1,4);assert.equal(Ruleset.maxHitPoints(a),45);a.system._source={attributes:{hp:{max:77}}};assert.equal(Ruleset.maxHitPoints(a),77);
});
test("Cultivator proficiency and Qi talent budgets grow once each level without spending cultivation credit",()=>{
 for(const [rank,stage,pp,talents]of [[1,1,5,1],[2,1,8,4],[4,1,14,10],[10,3,34,30]]){
 const a=actor(rank,stage);assert.equal(Ruleset.trainingPointsTotal(a),pp);assert.equal(Ruleset.trainingPointsAvailable(a),pp);assert.equal(escolhasTotais(a),talents);
 }
});
test("the default class permits every primary attribute except Constitution",()=>{
 assert.deepEqual(creationPrimaryOptions(cultivatorClassData()),["str","dex","int","wis","cha"]);
});
test("creation shares five proficiency points across saves, weapons and skills",()=>{
 const cls=cultivatorClassData(),draft=creationDraft(actor());assert.equal(allocateCreationRank(draft,cls,"skills","ath",2),true);
 assert.equal(allocateCreationRank(draft,cls,"armas","martialM",2),true);assert.equal(allocateCreationRank(draft,cls,"saves","fortitude",1),true);
 assert.equal(allocateCreationRank(draft,cls,"skills","ath",3),false);
});
test("the cultivation damage die rises by realm and stops at d12",()=>{
 assert.equal(typeof Ruleset.standardDamageDie,"function");for(const [rank,die]of [[1,4],[2,6],[3,8],[4,10],[5,12],[10,12]])assert.equal(Ruleset.standardDamageDie(actor(rank,3)),die);
});

test("an owned automatically seeded Cultivador uses integrated rules without feature grants, preserving class levels",async()=>{
 const a=actor();a.isOwner=true;a.name="Lin";a.getFlag=(_scope,key)=>key==="creation2"?{completed:true}:undefined;
 const cls=a.itemTypes.class[0];cls.id="ownedclass000001";cls.name="Cultivador";cls.system.levels=6;cls.flags["Immortals-system"].legacy2.atributoPrincipal="str";delete cls.flags["Immortals-system"].cultivatorVersion;
 cls.update=async patch=>{for(const[key,value]of Object.entries(patch)){const parts=key.split("."),last=parts.pop();let target=cls;for(const p of parts)target=target[p]??={};target[last]=structuredClone(value);}};
 a.createEmbeddedDocuments=async(type,docs)=>{const added=docs.map((doc,index)=>({...doc,id:"grant"+index}));a.items.push(...added);return added;};
 await ensureCultivatorClass(a);await ensureCultivatorClass(a);assert.deepEqual(cls.flags["Immortals-system"].legacy2.atributoPrincipal,["str","dex","int","wis","cha"]);
 assert.equal(cls.system.levels,6);assert.equal(a.items.filter(item=>item.type==="feat").length,0);
});

test("the published cultivation Qi table agrees with the active class at realm boundaries",()=>{
 for(const [rank,stage,maximum]of [[1,1,40],[1,3,60],[2,1,80],[10,3,520]])assert.equal(qiMaxCultivo(rank,stage),maximum);
});
test("native actor roll data exposes cultivation level and damage without rewriting the source class level",()=>{
 const source=readFileSync(new URL("../module/documents/actor/actor.mjs",import.meta.url),"utf8");
 const method=source.match(/  getRollData\(options=\{\}\) \{[\s\S]*?\n  \}/)[0];
 const getRollData=new Function("Ruleset","elementalRollData","return class RollDataBoundary extends class {} {"+method+"}.prototype.getRollData;")(Ruleset,elementalRollData);
 const a=actor(2,1);a.name="Lin";a.flags={};a.statuses=new Set();a.system.getRollData=()=>({details:{level:1}});
 const roll=getRollData.call(a);assert.equal(roll.danoCultivo,"1d6");assert.equal(roll.nivelCultivo,4);assert.equal(roll.details.level,4);assert.equal(a.system.details.level,1);
});

test('realm progression stays integrated and preserves manual references on regression',async()=>{
 const a=actor(5,1);a.isOwner=true;a.getFlag=()=>({completed:true});const cls=a.itemTypes.class[0];cls.id='cultivator-owned';
 a.createEmbeddedDocuments=async(_type,docs)=>{const added=docs.map((doc,index)=>({...doc,id:'granted-'+a.items.length+'-'+index}));a.items.push(...added);return added;};
 a.deleteEmbeddedDocuments=async(_type,ids)=>{a.items=a.items.filter(item=>!ids.includes(item.id));};
 await ensureCultivatorClass(a);await ensureCultivatorClass(a);
 assert.equal(a.items.filter(item=>item.flags?.['Immortals-system']?.cultivatorRank).length,0);
 a.items.push({id:'manual-reference',type:'feat',flags:{'Immortals-system':{cultivatorRank:9,cultivatorFeature:'rank-9'}}});
 a.system.cultivation.rank=3;await ensureCultivatorClass(a);
 assert.deepEqual(a.items.filter(item=>item.flags?.['Immortals-system']?.cultivationRankManaged).map(item=>item.flags['Immortals-system'].cultivatorRank),[]);
 assert(a.items.some(item=>item.id==='manual-reference'));
});
test('upgrading the managed class preserves a chosen primary attribute and native ItemChoice selections',async()=>{
 const a=actor();a.isOwner=true;a.getFlag=()=>({completed:true});const cls=a.itemTypes.class[0];cls.id='class-existing';cls.flags['Immortals-system'].cultivatorVersion=1;cls.flags['Immortals-system'].legacy2.atributoPrincipal='dex';
 cls.system.advancement={choice:{_id:'choice',type:'ItemChoice',value:{added:{old:'Item.manual'}},configuration:{choices:1}}};const before=structuredClone(cls.system.advancement.choice);
 cls.update=async patch=>{for(const[key,value]of Object.entries(patch)){const parts=key.split('.'),last=parts.pop();let target=cls;for(const part of parts)target=target[part]??={};target[last]=structuredClone(value);}};
 a.createEmbeddedDocuments=async()=>assert.fail('integrated rules do not grant feats');await ensureCultivatorClass(a);
 assert.equal(cls.flags['Immortals-system'].legacy2.atributoPrincipal,'dex');assert.deepEqual(cls.system.advancement.choice,before);assert.equal(cls.flags['Immortals-system'].cultivatorVersion,3);
});
