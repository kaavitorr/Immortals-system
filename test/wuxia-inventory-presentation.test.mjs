import test from "node:test";
import assert from "node:assert/strict";
import {prepareInventoryPresentation} from "../module/applications/actor/jj/inventory-presentation.mjs";
const make=()=>({sections:[
 {id:"weapons",label:"Armas",dataset:{"group-type":"weapon"},items:[]},
 {id:"equipment",label:"Equipamentos",dataset:{"group-type":"equipment"},items:[]},
 {id:"containers",label:"Recipientes",dataset:{"group-type":"container"},items:[]},
 {id:"contents",label:"Conteúdo",dataset:{"group-contents":"contents"},items:[]},
 {items:[{id:"sword",type:"weapon"}],columns:[{id:"quantity"}]}
],listControls:{sorting:[{key:"m"}],filters:[{key:"equipped"}],grouping:[{key:"type"},{key:"contents"}]}});
test("empty inventory keeps its category sections, native columns and a hidden fallback",()=>{
 const source=make(),before=structuredClone(source),out=prepareInventoryPresentation(source,{containerShortcuts:true});
 assert.equal(out.keepEmpty,true);assert.equal(out.iwInventory,true);
 assert.deepEqual(out.sections.slice(0,-1).map(s=>s.id),["weapons","equipment"]);
 assert.deepEqual(out.listControls.grouping.map(g=>g.key),["type"]);
 assert.equal(out.sections.at(-1).hidden,true);assert.equal(out.sections.at(-1).iwFallback,true);
 assert.equal(out.sections.at(-1).items,source.sections.at(-1).items);
 assert.equal(out.sections.at(-1).columns,source.sections.at(-1).columns);
 assert.deepEqual(source,before);
});
test("inventories without container shortcuts retain a container category",()=>{
 const out=prepareInventoryPresentation(make());
 assert(out.sections.some(s=>s.id==="containers"));
 assert.equal(out.listControls.sorting[0].key,"m");
 assert.equal(out.listControls.filters[0].key,"equipped");
});
