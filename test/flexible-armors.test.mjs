import {beastCoreCompendiumDocuments} from "../module/systems/beast-cores.mjs";
import {essenceCrystalCompendiumDocuments} from "../module/systems/essence-crystals.mjs";
import {chineseWeaponCompendiumDocuments} from "../module/systems/chinese-weapons.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {prepareLegacy2ArmorClass} from "../module/systems/legacy2-armor.mjs";
import {professionProductCompendiumDocuments} from "../module/systems/profession-products-content.mjs";
import {ensureProfessionProductsCompendium} from "../module/systems/profession-products-compendium.mjs";
const rules=await import("../module/systems/flexible-armors.mjs").catch(error=>{if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;return {};});
const scope="Immortals-system";
const use=()=>{assert.equal(typeof rules.prepareFlexibleArmorUpdate,"function","the configured armor update must exist");return rules.prepareFlexibleArmorUpdate;};
const fixtures=[
 {_id:"leatherArmor0000",name:"Armadura de Couro",type:"equipment",system:{type:{value:"light"},armor:{value:6,dex:null,ability:"dex"}}},
 {_id:"brigandine000000",name:"Brigantina",type:"equipment",system:{type:{value:"medium"},armor:{value:11,dex:null,ability:"dex"}}},
 {_id:"chainMail0000000",name:"Cota de Malha",type:"equipment",system:{type:{value:"heavy"},armor:{value:14,dex:null,ability:""}}}
];
function apply(source,patch){for(const[key,value]of Object.entries(patch)){if(key==="_id")continue;const parts=key.split(".");let target=source;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=structuredClone(value);}return source;}
function actor(item,dex){item.system.equipped=true;return{type:"character",items:[item],itemTypes:{equipment:[item]},system:{abilities:{dex:{value:dex,mod:-2}},attributes:{ac:{bonus:0,override:null}},armorPoints:{value:7,max:20},legacy2:{resistances:{fire:{value:3}}}}};}
test("flexible armor applies the full Agility value with independent base and caps",()=>{
 const update=use();
 for(const [index,want10,want3]of [[0,12,5],[1,14,9],[2,16,15]]){
  for(const[dex,want]of [[10,want10],[3,want3]]){
   const item=apply(structuredClone(fixtures[index]),update(fixtures[index])),a=actor(item,dex);
   prepareLegacy2ArmorClass(a,99);
   assert.equal(a.system.attributes.ac.value,want);
   assert.deepEqual(a.system.armorPoints,{value:7,max:20});
   assert.deepEqual(a.system.legacy2.resistances,{fire:{value:3}});
  }
 }
});
test("the one-time armor revision preserves stock, price, folder, custom activities and effects",()=>{
 const source={...structuredClone(fixtures[1]),folder:"myFolder",img:"old.webp",effects:[{_id:"mine",changes:[]}],flags:{custom:{note:"keep"} }};
 Object.assign(source.system,{quantity:8,price:{value:27,denomination:"gp"},weight:{value:2,units:"kg"},activities:{mine:{name:"Custom"}}});
 const original=structuredClone(source),patch=use()(source);assert.deepEqual(source,original);
 apply(source,patch);
 for(const key of ["folder","effects"])assert.deepEqual(source[key],original[key]);
 for(const key of ["quantity","price","weight","activities"])assert.deepEqual(source.system[key],original.system[key]);
 assert.deepEqual(source.flags.custom,{note:"keep"});
 source.name="Armadura de família";source.system.armor.value=13;
 assert.equal(rules.prepareFlexibleArmorUpdate(source),null,"subsequent personal edits must survive reloads");
});
test("unrelated item IDs and mismatched armor categories never receive this revision",()=>{
 const source=structuredClone(fixtures[0]);source._id="myCustomArmor";
 assert.equal(use()(source),null);source._id=fixtures[0]._id;source.system.type.value="heavy";
 assert.equal(rules.prepareFlexibleArmorUpdate(source),null);
});
function publication({fail=false}={}){
 const catalogue=[...professionProductCompendiumDocuments(),...chineseWeaponCompendiumDocuments(),...essenceCrystalCompendiumDocuments(),...beastCoreCompendiumDocuments()],docs=new Map([...catalogue.filter(d=>d.type!=="Item"),...fixtures].map(d=>[d._id,structuredClone(d)]));
 const foreign={_id:"foreignArmor0001",type:"equipment",system:{type:{value:"light"},armor:{value:18}}};docs.set(foreign._id,structuredClone(foreign));
 const pack={collection:"Immortals-system.equipamentos",documentName:"Item",locked:true,folders:catalogue.filter(d=>d.type==="Item"),
  getIndex:async()=>[...docs.keys()].map(_id=>({_id})),getDocuments:async()=>[...docs.values()].map(doc=>({id:doc._id,isOwner:false,toObject:()=>structuredClone(doc)})),
  async configure(change){Object.assign(this,change);}};
 let batches=0;
 const Item={async updateDocuments(changes,options){assert.equal(options.pack,pack.collection);assert.equal(pack.locked,false);if(fail)throw Error("write failed");batches++;for(const patch of changes)apply(docs.get(patch._id),patch);},createDocuments(){throw Error("unexpected creation");}};
 const Folder={createDocuments(){throw Error("unexpected folder creation");}};
 const game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}},packs:new Map([[pack.collection,pack]])};
 return{docs,pack,options:{game,Item,Folder},foreign,get batches(){return batches;}};
}
test("the existing equipment publication updates exactly the three public armors once",async()=>{
 const f=publication();
 await ensureProfessionProductsCompendium(f.options);
 assert.equal(f.docs.get("leatherArmor0000").system.armor.value,2);
 assert.equal(f.docs.get("brigandine000000").system.armor.value,6);
 assert.equal(f.docs.get("chainMail0000000").system.armor.value,12);
 assert.deepEqual(f.docs.get(f.foreign._id),f.foreign);
 assert.equal(f.batches,1);assert.equal(f.pack.locked,true);
 f.docs.get("leatherArmor0000").system.armor.value=20;
 await ensureProfessionProductsCompendium(f.options);
 assert.equal(f.docs.get("leatherArmor0000").system.armor.value,20);assert.equal(f.batches,1);
});
test("a failed armor update restores the native pack lock",async()=>{
 const f=publication({fail:true});
 await assert.rejects(ensureProfessionProductsCompendium(f.options),/write failed/);
 assert.equal(f.pack.locked,true);
 assert.equal(f.docs.get("leatherArmor0000").system.armor.value,6);
});
