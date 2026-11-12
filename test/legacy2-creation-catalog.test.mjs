import assert from "node:assert/strict";
import { test } from "node:test";
const catalog = await import("../module/applications/actor/creation/creation-catalog-2.mjs").catch(()=>({}));
test("creation classifies real customization feats by saved section or compendium folder",()=>{
  assert.equal(typeof catalog.creationCustomizationCategory,"function");
  assert.equal(catalog.creationCustomizationCategory({type:"feat",flags:{"Immortals-system":{featureSection:"jj-flaws"}}}),"jj-flaws");
  assert.equal(catalog.creationCustomizationCategory({type:"feat",folder:{name:"Peculiaridades"}}),null);
  assert.equal(catalog.creationCustomizationCategory({type:"feat",folder:{name:"Desvantagens"}}),null);
  assert.equal(catalog.creationCustomizationCategory({type:"spell",folder:{name:"Defeitos"}}),null);
  assert.equal(catalog.creationCustomizationCategory({type:"feat",name:"Uma habilidade qualquer"}),null);
});
test("missing optional content still provides Cultivador and the authored backgrounds",async()=>{
  assert.equal(typeof catalog.loadCreationCatalog,"function");
  globalThis.game={packs:new Map(),items:[],settings:{get:()=>({})}};
  const result=await catalog.loadCreationCatalog();
  assert.deepEqual(result.species,[]);assert.deepEqual(result.styles.map(item=>item.name),["Cultivador"]);assert.equal(result.backgrounds.length,23);
  assert.equal(result.graph.porNome.size,67);
  assert.deepEqual(Object.keys(result.customization),["jj-flaws"]);
});

test("legacy creation references recover from missing-pack errors using the current source",async()=>{
  const calls=[],current="Compendium.jujutsu-compendium.geral-2-0.Item.granted",doc={uuid:current,type:"feat"};
  globalThis.fromUuid=async uuid=>{calls.push(uuid);if(uuid===current)return doc;throw new Error("Unknown compendium");};
  assert.equal(await catalog.resolveCreationDocument("Compendium.hunter-legacy-module.hl-geral.Item.granted"),doc);
  assert.equal(calls.length,2);
  await assert.rejects(catalog.resolveCreationDocument("Item.broken"),/Unknown compendium/);
});

test("authored backgrounds resolve before legacy aliases, while saved user edits take precedence",async()=>{
 const {backgroundDocuments}=await import("../module/systems/wuxia-backgrounds.mjs"),bg=backgroundDocuments().find(d=>d.type==="background"),uuid="Compendium.Immortals-system.geral.Item."+bg._id;
 globalThis.fromUuid=async()=>null;const fallback=await catalog.resolveCreationDocument(uuid);assert.equal(fallback.name,bg.name);assert.equal(fallback.uuid,uuid);
 const edited={...bg,name:"Editado pelo mestre",uuid};globalThis.fromUuid=async()=>edited;assert.equal(await catalog.resolveCreationDocument(uuid),edited);
 const pack={documentName:"Item",visible:true,getDocuments:async()=>[edited],getIndex:async()=>[{_id:bg._id,type:"background"}],getDocument:async()=>edited};globalThis.game={packs:new Map([["Immortals-system.geral",pack]]),items:[],settings:{get:()=>({})}};
 const result=await catalog.loadCreationCatalog();assert.equal(result.backgrounds.length,23);assert.equal(result.backgrounds.find(d=>d.uuid===uuid),edited);
});

test("creation ignores retired categories in saved flags and legacy compendium folders", async()=>{
  const removed=["jj-peculiarities","jj-variant-penalties","jj-legendary-modifiers"];
  const names=["Peculiaridades","Penalidades Variantes","Modificadores Lendários"];
  const docs=removed.map((id,i)=>({type:"feat",uuid:"Item.retired"+i,name:names[i],folder:{name:names[i]},flags:{"Immortals-system":{featureSection:id}}}));
  for(const doc of docs){
    assert.equal(catalog.creationCustomizationCategory(doc),null);
    assert.equal(catalog.creationCustomizationCategory({...doc,folder:{name:"Defeitos"}}),null);
    assert.equal(catalog.creationCustomizationCategory({type:"feat",folder:doc.folder}),null);
  }
  globalThis.game={packs:new Map([["jujutsu-compendium.geral-2-0",{visible:true,getDocuments:async()=>docs}]]),items:[],settings:{get:()=>({})}};
  const result=await catalog.loadCreationCatalog();
  assert.deepEqual(Object.keys(result.customization),["jj-flaws"]);
  assert.deepEqual(result.customization["jj-flaws"],[]);
});
