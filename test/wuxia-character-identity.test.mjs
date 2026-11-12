import assert from "node:assert/strict";
import { test } from "node:test";
globalThis.document={querySelector:()=>true};
globalThis.foundry={applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:C=>C}},utils:{randomID:()=>"class00000000001"}};
const {registerCreationHooks}=await import("../module/applications/actor/creation/creation-hooks-2.mjs");
const {creationDraft,validateCreation,shouldOpenCreation}=await import("../module/applications/actor/creation/creation-model-2.mjs");
const {loadCreationCatalog}=await import("../module/applications/actor/creation/creation-catalog-2.mjs");
const {prepareCreationCompletion}=await import("../module/applications/actor/creation/creation-completion-2.mjs");
const identity=await import("../module/systems/wuxia-character.mjs").catch(()=>({}));
const CLASS_UUID="Immortals.Cultivador";
function world(items=[],packs=new Map()){globalThis.game={user:{id:"me"},items,packs,settings:{get:(_scope,key)=>key==="rulesetVersion"?"2.0":key==="regraSalvaguarda"||key==="characterCreation2Enabled"?true:{}}};}
function actor(items=[]){return {id:"hero",name:"Lin",type:"character",isOwner:true,itemTypes:{class:items.filter(i=>i.type==="class")},items,
  system:{details:{level:1}},_source:{items},getFlag(){},updateSource(data){this._source={...this._source,...data};this.items=data.items??this.items;this.itemTypes.class=this.items.filter(i=>i.type==="class");}};}
async function choices(backgrounds=[]){world(backgrounds);return loadCreationCatalog();}
function draftFor(a){const draft=creationDraft(a);draft.name="Lin";draft.abilities={str:4,dex:3,con:3,int:2,wis:2,cha:2};return draft;}

test("a new character draft already selects Cultivador without requiring an origin",async()=>{
  const catalog=await choices(),draft=draftFor(actor());
  assert.equal(draft.style,CLASS_UUID);assert.equal(draft.primary,"str");assert.equal(draft.background,null);
  assert.deepEqual(validateCreation(draft,catalog),[]);
});
test("the creator offers one built-in class and real backgrounds, never Jujutsu styles or races",async()=>{
  const bg={uuid:"Item.scholar",name:"Estudioso",type:"background"};
  const catalog=await choices([bg,{uuid:"Item.race",name:"Linhagem",type:"race"},{uuid:"Item.fighter",name:"Lutador",type:"class",flags:{"Immortals-system":{legacy2:{}}}}]);
  assert.deepEqual(catalog.styles.map(i=>i.name),["Cultivador"]);assert.equal(catalog.backgrounds.length,24);assert(catalog.backgrounds.includes(bg));assert.equal(catalog.backgrounds.filter(d=>d.flags?.["Immortals-system"]?.background).length,23);assert.deepEqual(catalog.species,[]);
});
test("backgrounds from visible Item packs are available without reading hidden packs",async()=>{
  const bg={uuid:"Compendium.world.bg.Item.scholar",name:"Estudioso",type:"background"};let hiddenReads=0;
  world([],new Map([["world.bg",{collection:"world.bg",documentName:"Item",visible:true,getIndex:async()=>[{_id:"scholar",type:"background"}],getDocument:async id=>{assert.equal(id,"scholar");return bg;}}],
    ["hidden",{documentName:"Item",visible:false,getIndex:()=>{hiddenReads++;throw Error("hidden");}}]]));
  const catalog=await loadCreationCatalog();assert.equal(catalog.backgrounds.length,24);assert(catalog.backgrounds.includes(bg));assert.equal(hiddenReads,0);
});
test("preCreate gives a fresh local character the native class even when the creator is disabled",()=>{
  world();game.settings.get=(_scope,key)=>key==="rulesetVersion"?"2.0":false;const handlers=new Map();
  registerCreationHooks({on:(key,fn)=>handlers.set(key,fn)},()=>{});const a=actor();
  handlers.get("preCreateActor")(a,{}, {},"me");
  assert.equal(a.items.length,1);assert.equal(a.items[0].type,"class");assert.equal(a.items[0].name,"Cultivador");assert.equal(a.items[0].system.levels,1);assert.equal(a._source["system.details.originalClass"],a.items[0]._id);
});
test("automatic class insertion still allows the creator and never duplicates the class",()=>{
  world();const handlers=new Map(),opened=[];registerCreationHooks({on:(key,fn)=>handlers.set(key,fn)},a=>opened.push(a));const a=actor(),options={renderSheet:true};
  handlers.get("preCreateActor")(a,{},options,"me");handlers.get("preCreateActor")(a,{},options,"me");
  assert.equal(a.items.length,1);assert.equal(options.renderSheet,false);handlers.get("createActor")(a,options,"me");assert.deepEqual(opened,[a]);
  assert.equal(shouldOpenCreation(a,{},"me","me",true),true);
});
test("default insertion leaves NPCs, imports, clones, and remote creates untouched",()=>{
  world();const handlers=new Map();registerCreationHooks({on:(key,fn)=>handlers.set(key,fn)},()=>{});
  for(const [change,data,options,user] of [[{type:"npc"},{},{},"me"],[{}, {_stats:{compendiumSource:"Actor.import"}}, {},"me"],[{}, {},{keepId:true},"me"],[{}, {},{},"other"]]){
    const a=Object.assign(actor(),change);handlers.get("preCreateActor")(a,data,options,user);assert.deepEqual(a.items,[]);
  }
});
test("completion creates Cultivador without resolving or creating a race when no background was chosen",async()=>{
  const a=actor(),catalog=await choices(),draft=draftFor(a);let id=0;
  const plan=await prepareCreationCompletion(a,draft,catalog,{resolve:async()=>{throw Error("No source required");},idFactory:()=>"new"+(++id)});
  assert.deepEqual(plan.create.filter(i=>i.type==="class").map(i=>[i.type,i.name]),[["class","Cultivador"]]);
  assert.equal(plan.actor["system.details.originalClass"],plan.create[0]._id);assert.equal(plan.actor["system.attributes.hp.value"],20);
});
test("a selected native background is granted with Cultivador and associated with details.background",async()=>{
  const bg={uuid:"Item.scholar",name:"Estudioso",type:"background",system:{description:{value:""}}};
  const a=actor(),catalog=await choices([bg]),draft=draftFor(a);draft.background=bg.uuid;let id=0;
  const plan=await prepareCreationCompletion(a,draft,catalog,{resolve:async uuid=>uuid===bg.uuid?bg:null,idFactory:()=>"new"+(++id)});
  assert.deepEqual(plan.create.filter(i=>i.type!=="feat").map(i=>i.type).sort(),["background","class"]);
  assert.equal(plan.actor["system.details.background"],plan.create.find(i=>i.type==="background")._id);assert.equal(plan.create.some(i=>i.type==="race"),false);
});
test("completion reuses the automatically attached class instead of duplicating it or adding levels",async()=>{
  const catalog=await choices(),existing={...catalog.styles[0],_id:"owned-class",id:"owned-class"};
  const a=actor([existing]),draft=draftFor(a);let id=0;
  const plan=await prepareCreationCompletion(a,draft,catalog,{resolve:async()=>null,idFactory:()=>"new"+(++id)});
  assert.equal(plan.create.filter(i=>i.type==="class").length,0);assert.equal(plan.actor["system.details.originalClass"],"owned-class");assert.equal(a.items[0].system.levels,1);
});
test("background selection rejects race items and unrelated class selections",async()=>{
  const race={uuid:"Item.race",name:"Linhagem",type:"race"},catalog=await choices([race]),draft=draftFor(actor());draft.background=race.uuid;
  assert.ok(validateCreation(draft,catalog).some(e=>e.step===0));
  draft.background=null;draft.style="Item.fighter";assert.ok(validateCreation(draft,catalog).some(e=>e.step===1));
});
test("existing class initialization is owner-only and preserves levels and mechanics",async()=>{
  assert.equal(typeof identity.ensureCultivatorClass,"function");world();const writes=[];
  const cls={id:"owned",name:"Lutador",type:"class",system:{levels:6,identifier:"lutador"},flags:{"Immortals-system":{legacy2:{vidaBase:7}}},update:async data=>{writes.push(data);Object.assign(cls,data);}};
  const a=actor([cls]);await identity.ensureCultivatorClass({...a,isOwner:false});assert.deepEqual(writes,[]);
  await identity.ensureCultivatorClass(a);await identity.ensureCultivatorClass(a);assert.equal(writes.length,1);assert.equal(cls.name,"Cultivador");
  assert.equal(cls.system.levels,6);assert.equal(cls.system.identifier,"lutador");assert.equal(cls.flags["Immortals-system"].legacy2.vidaBase,7);
});

test("viewing a source compendium character never rewrites its class",async()=>{
  const writes=[];const cls={type:"class",name:"Original",update:async data=>writes.push(data)};
  await identity.ensureCultivatorClass({...actor([cls]),pack:"world.characters"});assert.deepEqual(writes,[]);
});
test("simultaneous sheet preparations create only one native Cultivador class",async()=>{
  world();const a=actor();let writes=0,release;const gate=new Promise(resolve=>release=resolve);
  a.createEmbeddedDocuments=async(type,data)=>{assert.equal(type,"Item");writes++;await gate;
    const cls={...data[0],id:"native-class"};a.items.push(cls);a.itemTypes.class.push(cls);return[cls];};
  const first=identity.ensureCultivatorClass(a),second=identity.ensureCultivatorClass(a);release();
  const [one,two]=await Promise.all([first,second]);assert.equal(writes,1);assert.equal(one,two);assert.equal(one.name,"Cultivador");
});
