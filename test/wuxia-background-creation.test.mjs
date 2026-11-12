import assert from "node:assert/strict";
import {test} from "node:test";
import {backgroundDocuments} from "../module/systems/wuxia-backgrounds.mjs";
import {cultivatorDefinition,CULTIVATOR_UUID} from "../module/systems/wuxia-character.mjs";
import {creationDraft} from "../module/applications/actor/creation/creation-model-2.mjs";
import {prepareCreationCompletion,commitCreation} from "../module/applications/actor/creation/creation-completion-2.mjs";
const equipmentSources=new Map();
for(const file of await (await import('node:fs/promises')).readdir(new URL('../packs/_source/equipamentos/',import.meta.url))){if(!/\.(yml|json)$/.test(file))continue;const text=await(await import('node:fs/promises')).readFile(new URL('../packs/_source/equipamentos/'+file,import.meta.url),'utf8');const doc=file.endsWith('.json')?JSON.parse(text):(await import('js-yaml')).load(text);if(doc.type!=='Item')equipmentSources.set('Compendium.Immortals-system.equipamentos.Item.'+doc._id,doc);}
for(const doc of (await import('../module/systems/profession-products-content.mjs')).professionProductCompendiumDocuments())if(doc.type!=='Item')equipmentSources.set('Compendium.Immortals-system.equipamentos.Item.'+doc._id,doc);
function fixture(key){
 globalThis.game={settings:{get:()=>"2.0"}};
 const backgrounds=backgroundDocuments().filter(d=>d.type==="background").map(d=>({...d,uuid:"Compendium.Immortals-system.geral.Item."+d._id}));
 const bg=backgrounds.find(d=>d.flags["Immortals-system"].background.key===key),actor={name:"Novo",type:"character",isOwner:true,items:[],system:{currency:{gp:7,sp:8,cp:9,yen:456}},getFlag(){},img:"portrait.webp",prototypeToken:{texture:{src:"token.webp"}}};
 const draft=creationDraft(actor);Object.assign(draft,{style:CULTIVATOR_UUID,background:bg.uuid,primary:"str",name:"Novo Cultivador"});draft.abilities={str:4,dex:3,con:4,int:2,wis:2,cha:1};
 const catalog={wuxia:true,species:[],backgrounds,styles:[cultivatorDefinition()],customization:Object.fromEntries(Object.keys(draft.customization).map(k=>[k,[]])),graph:{porNome:new Map()}};
 let id=0;return {actor,draft,catalog,bg,options:{idFactory:()=>"created"+String(++id).padStart(9,"0"),resolve:async uuid=>uuid===bg.uuid?bg:equipmentSources.get(uuid)??null}};
}
test("creation grants the selected background feature and PO once, preserving other currency denominations",async()=>{
 const f=fixture("ator"),plan=await prepareCreationCompletion(f.actor,f.draft,f.catalog,f.options);
 assert.equal(plan.create.filter(d=>d.type==="background").length,1);assert.equal(plan.create.filter(d=>d.flags?.["Immortals-system"]?.backgroundFeature==="ator").length,1);
 assert.equal(plan.actor["system.currency.gp"],107);assert.equal(plan.actor["system.currency.sp"],undefined);assert.deepEqual(f.actor.system.currency,{gp:7,sp:8,cp:9,yen:456});
 const bg=plan.create.find(d=>d.type==="background"),feat=plan.create.find(d=>d.flags?.["Immortals-system"]?.backgroundFeature==="ator");assert.equal(plan.actor["system.details.background"],bg._id);assert.equal(feat.flags["Immortals-system"].advancementOrigin,bg._id+"."+Object.keys(bg.system.advancement)[0]);
 let count=0,completed=false;f.actor.getFlag=()=>({completed});f.actor.performBulkUpdate=async()=>{count++;completed=true;};
 await Promise.all([commitCreation(f.actor,f.draft,f.catalog,{...f.options,advance:async(_a,p)=>p}),commitCreation(f.actor,f.draft,f.catalog,{...f.options,advance:async(_a,p)=>p})]);assert.equal(count,1);await assert.rejects(commitCreation(f.actor,f.draft,f.catalog,f.options));
});
test("the young master's servant starts in stage three with the corresponding HP and Qi",async()=>{
 const f=fixture("servo-do-jovem-mestre"),plan=await prepareCreationCompletion(f.actor,f.draft,f.catalog,f.options);
 assert.equal(plan.actor["system.cultivation.rank"],1);assert.equal(plan.actor["system.cultivation.stage"],3);assert.equal(plan.actor["system.attributes.hp.value"],35);assert.equal(plan.actor["system.energy.total"]+plan.actor["system.energy.generated"],60);assert.equal(plan.actor["system.currency.gp"],507);
});
test("the monk starts bald while other origins preserve the chosen hair",async()=>{
 const f=fixture("monge");f.draft.physical.hair="Longo";const plan=await prepareCreationCompletion(f.actor,f.draft,f.catalog,f.options);assert.equal(plan.actor["system.details.hair"],"Careca");
 const other=fixture("soldado");other.draft.physical.hair="Longo";const same=await prepareCreationCompletion(other.actor,other.draft,other.catalog,other.options);assert.equal(same.actor["system.details.hair"],"Longo");
});

test("saved background feature edits are preserved when creating a character",async()=>{
 const f=fixture("ator"),source=backgroundDocuments().find(d=>d.type==="feat"&&d.flags["Immortals-system"].backgroundFeature==="ator"),uuid="Compendium.Immortals-system.geral.Item."+source._id;
 const edited={...source,uuid,name:"Atuação editada pelo narrador"},base=f.options.resolve;
 const plan=await prepareCreationCompletion(f.actor,f.draft,f.catalog,{...f.options,resolve:async id=>id===uuid?edited:base(id)});
 assert.equal(plan.create.find(d=>d.flags?.["Immortals-system"]?.backgroundFeature==="ator").name,edited.name);
});
test("authored backgrounds remain selectable when the native source is not populated yet",async()=>{
 const f=fixture("ator"),plan=await prepareCreationCompletion(f.actor,f.draft,f.catalog,{...f.options,resolve:async uuid=>{if(equipmentSources.has(uuid))return equipmentSources.get(uuid);throw Error("Unknown compendium");}});
 assert.equal(plan.create.find(d=>d.type==="background").name,"Ator");assert.equal(plan.actor["system.currency.gp"],107);
});

test('creator uses the edited native currency grant for both deposit and receipt',async()=>{const f=fixture('ator'),gear=Object.values(f.bg.system.advancement).find(a=>a.configuration.currency);gear.configuration.currency={gp:200,sp:4,cp:5};const plan=await prepareCreationCompletion(f.actor,f.draft,f.catalog,f.options),bg=plan.create.find(d=>d.type==='background'),receipt=Object.values(bg.system.advancement).find(a=>a.configuration.currency).value.currency;assert.equal(plan.actor['system.currency.gp'],207);assert.equal(plan.actor['system.currency.sp'],12);assert.equal(plan.actor['system.currency.cp'],14);assert.deepEqual(receipt,{gp:200,sp:4,cp:5});});
