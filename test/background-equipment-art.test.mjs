import {test} from "node:test";
import assert from "node:assert/strict";
import {backgroundEquipmentDocuments} from "../module/systems/background-equipment.mjs";
import {prepareGeneralContentArtUpdate} from "../module/systems/general-content-art.mjs";
import {cultivatorCompendiumDocuments} from "../module/systems/cultivator-content.mjs";
import {ensureCultivatorCompendium} from "../module/systems/cultivator-compendium.mjs";

const scope="Immortals-system",base="systems/Immortals-system/assets/wuxia/equipamentos-antecedentes-pintados-v1/";
const oldImages={
 avaliacao:"icons/tools/hand/magnifying-glass.webp",
 alvos:"icons/sundries/books/book-leather-brown.webp",
 cantil:"icons/containers/bags/waterskin-leather-brown.webp",
 "vestes-pretas":"icons/equipment/chest/robe-layered-black.webp",
 "bugiganga-orfa":"icons/commodities/treasure/trinket-totem-wood-carved.webp",
 isca:"icons/consumables/meat/fish-salmon-cut-pink.webp",
 "bugiganga-vagabundo":"icons/commodities/treasure/trinket-totem-wood-carved.webp",
 "manual-ceu":"icons/sundries/books/book-embossed-gold.webp",
 "manual-sagrado":"icons/sundries/books/book-embossed-gold.webp",
 "manual-terra":"icons/sundries/books/book-embossed-gold.webp",
 "manual-humano-comum":"icons/sundries/books/book-embossed-gold.webp"
};
const gear=()=>backgroundEquipmentDocuments().filter(d=>d.flags?.[scope]?.backgroundEquipment in oldImages);
test("all eleven broken background-equipment references have distinct system-owned painted icons",()=>{
 const items=gear();assert.equal(items.length,11);assert.equal(new Set(items.map(d=>d.img)).size,11);
 for(const item of items)assert.equal(item.img,base+item.flags[scope].backgroundEquipment+".webp");
 const unaffected=backgroundEquipmentDocuments().find(d=>d.flags?.[scope]?.backgroundEquipment==="escalada");
 assert.equal(unaffected.img,"icons/sundries/survival/rope-wrapped-brown.webp");
});
test("existing equipment gets only an image patch while custom images and item rules survive",()=>{
 for(const canonical of gear()){
  const source=structuredClone(canonical),key=source.flags[scope].backgroundEquipment;
  source.img=oldImages[key];source.name="Nome personalizado";source.system.quantity=7;
  source.effects=[{_id:"personal-effect",changes:[]}];const before=structuredClone(source);
  const patch=prepareGeneralContentArtUpdate(source);assert.deepEqual(patch,{_id:source._id,img:canonical.img});assert.deepEqual(source,before);
  source.img=patch.img;assert.equal(prepareGeneralContentArtUpdate(source),null);
  source.img="worlds/my-world/personal-equipment.webp";assert.equal(prepareGeneralContentArtUpdate(source),null);
  source.img=oldImages[key];source.type="feat";assert.equal(prepareGeneralContentArtUpdate(source),null);
  source.type=canonical.type;delete source.flags[scope].backgroundEquipment;assert.equal(prepareGeneralContentArtUpdate(source),null);
 }
});
test("ready compendium synchronization repairs existing gear once and restores the native lock",async()=>{
 const docs=cultivatorCompendiumDocuments(),items=new Map(docs.filter(d=>d.type!=="Item").map(d=>[d._id,structuredClone(d)]));
 for(const item of items.values()){const key=item.flags?.[scope]?.backgroundEquipment;if(Object.hasOwn(oldImages,key))item.img=oldImages[key];}
 const originals=new Map([...items].map(([id,item])=>[id,structuredClone(item)]));let writes=0;
 const pack={collection:"Immortals-system.geral",documentName:"Item",locked:true,folders:docs.filter(d=>d.type==="Item"),
  async getIndex(){return [...items.keys()].map(_id=>({_id}));},
  async getDocuments(){return [...items.values()].map(item=>({id:item._id,isOwner:false,toObject:()=>structuredClone(item)}));},
  async configure(change){Object.assign(this,change);}};
 const Item={async updateDocuments(patches,options){assert.equal(pack.locked,false);assert.equal(options.pack,pack.collection);assert.equal(patches.length,11);writes++;for(const patch of patches){assert.deepEqual(Object.keys(patch).sort(),["_id","img"]);items.get(patch._id).img=patch.img;}}};
 const game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}},packs:new Map([[pack.collection,pack]])};
 const result=await ensureCultivatorCompendium({game,Item,Folder:{}});assert.equal(result.created,0);assert.equal(result.deleted,0);assert.equal(writes,1);assert.equal(pack.locked,true);
 for(const canonical of gear()){const item=items.get(canonical._id);assert.equal(item.img,canonical.img);const before=originals.get(item._id);assert.deepEqual(item.system,before.system);assert.deepEqual(item.flags,before.flags);}
 await ensureCultivatorCompendium({game,Item,Folder:{}});assert.equal(writes,1);
});
