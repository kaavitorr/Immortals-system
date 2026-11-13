import {test} from "node:test";
import assert from "node:assert/strict";
import {buildBeastEssenceGrants} from "../module/systems/beast-essence-grants.mjs";
import {createBeastEssenceItemData} from "../module/systems/beast-essence-capture.mjs";
let api;try{api=await import("../module/systems/beast-essence-selections.mjs");}catch(e){if(e.code!=="ERR_MODULE_NOT_FOUND")throw e;}
const scope="Immortals-system";
const entry=(key,level=1)=>({key,uuid:"Item."+key,level,data:{name:key,type:"feat",system:{activities:{},uses:{spent:0,max:5}},effects:[],flags:{}}});
const definition=()=>({version:1,id:"essence",name:"Besta",growth:"earth",ability:"str",elements:[],taxonomy:{name:"Taxonomia",features:[entry("taxonomy")]},archetype:{name:"Arquétipo",features:Array.from({length:10},(_,i)=>entry("arch"+(i+1),i+1))},features:[entry("extra1"),entry("extra2")],attacks:[],naturalWeapons:[],normalFeatures:["extra1"],weakenedFeatures:["extra2"],normalAttacks:[],weakenedAttacks:[]});
const selection=()=>({normalArchetypeFeatures:["arch1","arch3","arch5","arch7","arch10"],weakenedArchetypeFeatures:["arch9"],normalFeatures:["extra1"],weakenedFeatures:["extra2"],normalAttacks:[],weakenedAttacks:[]});
function actor(e=definition()){return {uuid:"Actor.hero",type:"character",isOwner:true,items:new Map(),system:{cultivation:{rank:4,stage:3}},flags:{[scope]:{beastEssence:{integrated:e,transformation:{active:true,integrationId:e.id}}}}};}
const grants=a=>{let count=0;return buildBeastEssenceGrants(a,{idFactory:()=>"id"+(++count)}).map(i=>i.flags[scope].beastEssenceGrant);};
test("creation persists separate five/one archetype selections without changing the original creature",()=>{
 const snapshot={...definition(),highestAbilities:["str"],sourceRealm:2,img:""},before=structuredClone(snapshot);
 const item=createBeastEssenceItemData(snapshot,{...selection(),growth:"earth",ability:"str",elements:[],id:"new"}),e=item.flags[scope].beastEssenceItem.definition;
 assert.deepEqual(e.normalArchetypeFeatures,["arch1","arch3","arch5","arch7","arch10"]);assert.deepEqual(e.weakenedArchetypeFeatures,["arch9"]);assert.deepEqual(snapshot,before);
});
test("normal and weakened forms grant only their chosen archetype skills and all eligible taxonomy traits",()=>{
 const a=actor({...definition(),...selection()});
 assert.deepEqual(grants(a).filter(g=>g.kind==="archetype").map(g=>g.key),["arch1","arch3","arch5","arch7","arch10"]);
 assert(grants(a).some(g=>g.kind==="taxonomy"&&g.key==="taxonomy"));
 a.system.cultivation.rank=5;assert.deepEqual(grants(a).filter(g=>g.kind==="archetype").map(g=>g.key),["arch9"]);
 a.system.cultivation.rank=6;assert.deepEqual(grants(a),[]);
});
test("chosen future abilities remain locked until their cultivation requirement is met",()=>{
 const a=actor({...definition(),...selection()});a.system.cultivation.rank=3;a.system.cultivation.stage=3;
 assert(!grants(a).some(g=>g.key==="arch10"));a.system.cultivation.rank=4;a.system.cultivation.stage=1;assert(grants(a).some(g=>g.key==="arch10"));
});
test("legacy essences without an archetype selection no longer grant the whole archetype automatically",()=>{
 assert.deepEqual(grants(actor()).filter(g=>g.kind==="archetype"),[]);
});
test("selection changes reject excess, duplicate and foreign skills while preserving the captured essence",()=>{
 assert.equal(typeof api?.withBeastEssenceSelections,"function");const e=definition(),before=structuredClone(e),updated=api.withBeastEssenceSelections(e,selection());assert.deepEqual(e,before);assert.equal(updated.growth,"earth");assert.equal(updated.archetype.features.length,10);
 for(const patch of [{normalArchetypeFeatures:["arch1","arch2","arch3","arch4","arch5","arch6"]},{weakenedArchetypeFeatures:["arch1","arch2"]},{normalArchetypeFeatures:["arch1","arch1"]},{weakenedArchetypeFeatures:["foreign"]},{normalArchetypeFeatures:"arch1"}])assert.throws(()=>api.withBeastEssenceSelections(e,{...selection(),...patch}),/Seleção|habilidades|Arquétipo/);
});


test("changing only archetype choices preserves the separate additional skills already selected",()=>{
 const e=definition(),updated=api.withBeastEssenceSelections(e,{normalArchetypeFeatures:["arch1"],weakenedArchetypeFeatures:["arch2"]});
 assert.deepEqual(updated.normalFeatures,["extra1"]);assert.deepEqual(updated.weakenedFeatures,["extra2"]);
});
