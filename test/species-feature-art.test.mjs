
import {test} from "node:test";
import assert from "node:assert/strict";
import {speciesDocuments,SPECIES_FEATURE_FOLDER_ID} from "../module/systems/wuxia-species.mjs";
import {SPECIES_FEATURES} from "../module/systems/wuxia-species-data.mjs";
import {prepareGeneralContentArtUpdate} from "../module/systems/general-content-art.mjs";
import {migrateGeneralContentArt} from "../module/systems/general-content-art-migration.mjs";
import {cultivatorCompendiumDocuments} from "../module/systems/cultivator-content.mjs";
import {ensureCultivatorCompendium} from "../module/systems/cultivator-compendium.mjs";
const scope="Immortals-system",oldImage="systems/Immortals-system/icons/svg/items/race.svg";
const features=()=>speciesDocuments().filter(d=>d.type==="feat"&&d.folder===SPECIES_FEATURE_FOLDER_ID);
test("all seventeen species features keep their individual icons alongside updated ancestry art",()=>{
 const items=features();assert.equal(items.length,17);assert.equal(new Set(items.map(d=>d.img)).size,17);
 assert.deepEqual(new Set(items.map(d=>d.name)),new Set(SPECIES_FEATURES.map(d=>d.name)));
 for(const item of items)assert.match(item.img,/^systems\/Immortals-system\/assets\/wuxia\/caracteristicas-especie-pintadas-v1\/[a-z0-9-]+\.webp$/);
 assert.match(speciesDocuments().find(d=>d.name==="Dragão").img,/\/ancestralidades-variantes-pintadas-v1\/dragao\.webp$/);
 assert(speciesDocuments().filter(d=>d.type==="race").every(d=>d.img.includes("/especies-pintadas-v1/")));
});
test("a renamed species feature receives only its icon while custom portraits and all game rules survive",()=>{
 for(const canonical of features()){
  const item=structuredClone(canonical);item.img=oldImage;item.name="Nome pessoal";item.effects=[{_id:"custom",changes:[]}];
  const before=structuredClone(item),patch=prepareGeneralContentArtUpdate(item);
  assert.deepEqual(patch,{_id:item._id,img:canonical.img});assert.deepEqual(item,before);
  item.img=patch.img;assert.equal(prepareGeneralContentArtUpdate(item),null);
  item.img="worlds/my-world/personal.webp";assert.equal(prepareGeneralContentArtUpdate(item),null);
  item.img=oldImage;item.flags[scope].speciesFeature="Desconhecida";assert.equal(prepareGeneralContentArtUpdate(item),null);
 }
});
test("Geral refreshes the seventeen existing features once through native locked-compendium updates",async()=>{
 const docs=cultivatorCompendiumDocuments(),items=new Map(docs.filter(d=>d.type!=="Item").map(d=>[d._id,structuredClone(d)]));
 for(const item of features())items.get(item._id).img=oldImage;
 let writes=0;const pack={collection:"Immortals-system.geral",documentName:"Item",locked:true,folders:docs.filter(d=>d.type==="Item"),
 async getIndex(){return [...items.keys()].map(_id=>({_id}));},
 async getDocuments(){return [...items.values()].map(item=>({id:item._id,isOwner:false,toObject:()=>structuredClone(item)}));},
 async configure(change){Object.assign(this,change);}};
 const game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}},packs:new Map([[pack.collection,pack]])};
 const Item={async updateDocuments(patches,options){assert.equal(pack.locked,false);assert.equal(options.pack,pack.collection);assert.equal(patches.length,17);writes++;for(const p of patches){assert.deepEqual(Object.keys(p).sort(),["_id","img"]);items.get(p._id).img=p.img;}}};
 const result=await ensureCultivatorCompendium({game,Item,Folder:{}});assert.equal(result.created,0);assert.equal(result.deleted,0);assert.equal(writes,1);assert.equal(pack.locked,true);
 for(const item of features())assert.equal(items.get(item._id).img,item.img);
 await ensureCultivatorCompendium({game,Item,Folder:{}});assert.equal(writes,1);
});
test("owned feature copies refresh without changing native progressions or personalized artwork",async()=>{
 const sources=features().map(d=>({...structuredClone(d),img:oldImage})),personal=structuredClone(sources[0]);personal._id="personal-feature";personal.img="worlds/my-world/personal.webp";sources.push(personal);
 const before=sources.map(d=>structuredClone(d)),actor={id:"species-feature-art",type:"character",isOwner:true,items:[]};
 actor.items=sources.map(d=>({id:d._id,actor,isOwner:true,toObject:()=>structuredClone(d)}));
 let writes=0;actor.performBulkUpdate=async({item:patches})=>{writes++;for(const patch of patches){assert.deepEqual(Object.keys(patch).sort(),["_id","img"]);sources.find(d=>d._id===patch._id).img=patch.img;}};
 const game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}}};
 assert.equal(await migrateGeneralContentArt(actor,{game}),17);assert.equal(writes,1);assert.equal(await migrateGeneralContentArt(actor,{game}),0);
 sources.forEach((d,i)=>{assert.deepEqual(d.system,before[i].system);assert.deepEqual(d.flags,before[i].flags);});assert.equal(personal.img,"worlds/my-world/personal.webp");
});
