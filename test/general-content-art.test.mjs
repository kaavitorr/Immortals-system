import assert from "node:assert/strict";
import {test} from "node:test";
import {backgroundDocuments} from "../module/systems/wuxia-backgrounds.mjs";
import {qiTalentDocument,qiTalentCompendiumDocuments} from "../module/systems/qi-talents-content.mjs";
import {cultivatorCompendiumDocuments} from "../module/systems/cultivator-content.mjs";
import {speciesDocuments} from "../module/systems/wuxia-species.mjs";
import {ensureCultivatorCompendium} from "../module/systems/cultivator-compendium.mjs";
const scope="Immortals-system";
const art=await import("../module/systems/general-content-art.mjs").catch(error=>{if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;return {};});
const migration=await import("../module/systems/general-content-art-migration.mjs").catch(error=>{if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;return {};});
const use=(object,key)=>{assert.equal(typeof object[key],"function",key+" must exist");return object[key];};
const copy=value=>structuredClone(value);
function apply(doc,patch){for(const[key,value]of Object.entries(patch)){if(key==="_id")continue;const parts=key.split(".");let target=doc;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=copy(value);}return doc;}
const qiOld="systems/Immortals-system/icons/svg/items/spell.svg";
function oldQi(){const item=qiTalentDocument("gestos-flecha-e-linha");item.img=qiOld;for(const a of Object.values(item.system.activities))a.img=qiOld;return item;}
function oldFeature(){const item=backgroundDocuments().find(d=>d.flags?.[scope]?.backgroundFeature==="comerciante");item.img="icons/svg/coins.svg";for(const a of Object.values(item.system.activities))a.img=item.img;return item;}
test("every background, its feature and every Qi talent has its own painted art, shared with its native activities",()=>{
 const bg=backgroundDocuments().filter(d=>d.type==="background"||d.flags?.[scope]?.backgroundFeature),qi=qiTalentCompendiumDocuments().filter(d=>d.type==="feat");
 assert.equal(bg.length,46);assert.equal(qi.length,67);assert.equal(new Set([...bg,...qi].map(d=>d.img)).size,113);
 for(const d of [...bg,...qi]){assert.match(d.img,/^systems\/Immortals-system\/assets\/wuxia\/.*\.webp$/);for(const a of Object.values(d.system.activities??{}))assert.equal(a.img,d.img);}
});
test("the three species have distinct painted icons in their canonical documents",()=>{
 const species=speciesDocuments().filter(d=>d.type==="race");
 assert.equal(species.length,3);assert.equal(new Set(species.map(d=>d.img)).size,3);
 for(const item of species){const key=item.flags[scope].species.key;assert.equal(item.img,use(art,"speciesImage")(key));assert.match(item.img,/\/especies-pintadas-v1\/(humano|demonio|meio-monstro)\.webp$/);}
 assert.throws(()=>art.speciesImage("unknown"),RangeError);
});
test("species artwork migration changes only stock icons and preserves progression and personal portraits",()=>{
 for(const canonical of speciesDocuments().filter(d=>d.type==="race")){
  const source=copy(canonical);source.img="systems/Immortals-system/icons/svg/items/race.svg";source.name="Nome pessoal";
  const before=copy(source),patch=use(art,"prepareGeneralContentArtUpdate")(source);
  assert.deepEqual(patch,{_id:source._id,img:canonical.img});assert.deepEqual(source,before);
  apply(source,patch);assert.deepEqual(source.system,before.system);assert.deepEqual(source.flags,before.flags);assert.equal(source.name,before.name);assert.equal(art.prepareGeneralContentArtUpdate(source),null);
  source.img="worlds/my-world/species.webp";assert.equal(art.prepareGeneralContentArtUpdate(source),null);
 }
});
test("the icon patch changes only legacy art and leaves all game data intact",()=>{
 const source=oldFeature();source.name="Minha negociação";source.system.uses.spent=1;source.effects=[{_id:"custom",changes:[]}];
 source.system.activities.custom={_id:"custom",name:"Minha atividade",img:"icons/svg/coins.svg"};
 const original=copy(source),patch=use(art,"prepareGeneralContentArtUpdate")(source);
 assert(patch);assert(Object.keys(patch).every(k=>k==="_id"||k==="img"||k.endsWith(".img")));
 assert.equal(patch["system.activities.custom.img"],undefined);assert.deepEqual(source,original);
 apply(source,patch);assert.equal(source.name,"Minha negociação");assert.equal(source.system.uses.spent,1);assert.deepEqual(source.effects,original.effects);
 assert.equal(art.prepareGeneralContentArtUpdate(source),null);
});
test("personal item and native-activity images survive while unedited Qi activities refresh",()=>{
 const source=oldQi(),[a,b]=Object.values(source.system.activities);a.img="worlds/my-world/gesture.webp";
 const patch=use(art,"prepareGeneralContentArtUpdate")(source);assert(patch);
 assert.equal(patch["system.activities."+a._id+".img"],undefined);assert(patch["system.activities."+b._id+".img"]);
 source.img="worlds/my-world/portrait.webp";assert.equal(art.prepareGeneralContentArtUpdate(source),null);
});
test("unknown metadata, limited items and non-owner actor items do not receive icon patches",()=>{
 const source=oldQi();source.flags[scope].talentoQi.id="not-authored";
 assert.equal(use(art,"prepareGeneralContentArtUpdate")(source),null);
 const limited=oldQi();limited.limited=true;assert.equal(art.prepareGeneralContentArtUpdate(limited),null);
 const readonly=oldQi();readonly.actor={isOwner:false};assert.equal(art.prepareGeneralContentArtUpdate(readonly),null);
});
function publicFixture(){
 const docs=cultivatorCompendiumDocuments(),items=new Map(docs.filter(d=>d.type!=="Item").map(d=>[d._id,copy(d)]));
 const originals=[oldQi(),oldFeature()];for(const d of originals)items.set(d._id,d);
 const pack={collection:"Immortals-system.geral",documentName:"Item",locked:true,folders:docs.filter(d=>d.type==="Item"),
 async getIndex(){return [...items.values()].map(d=>({_id:d._id}));},
 async getDocuments(){return [...items.values()].map(d=>({id:d._id,type:d.type,isOwner:false,toObject:()=>copy(d)}));},
 async configure(change){Object.assign(this,change);}};
 let batches=0;
 const Item={async updateDocuments(updates,options){assert.equal(pack.locked,false);assert.equal(options.pack,pack.collection);batches++;for(const u of updates)apply(items.get(u._id),u);}};
 const game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}},packs:new Map([[pack.collection,pack]])};
 return{items,originals,pack,options:{game,Item,Folder:{}},get batches(){return batches;}};
}
test("a complete Geral receives only icon updates and its native lock is restored",async()=>{
 const f=publicFixture();await ensureCultivatorCompendium(f.options);
 for(const source of f.originals)assert.match(f.items.get(source._id).img,/\.webp$/);
 assert.equal(f.batches,1);assert.equal(f.pack.locked,true);
 await ensureCultivatorCompendium(f.options);assert.equal(f.batches,1);
});
test("a secondary GM cannot update Geral icons",async()=>{
 const f=publicFixture();f.options.game.users.activeGM.id="another-gm";
 await ensureCultivatorCompendium(f.options);assert.equal(f.batches,0);assert.equal(f.pack.locked,true);
});
test("existing species in Geral receive their new icons through the native locked-pack update",async()=>{
 const f=publicFixture(),species=speciesDocuments().filter(d=>d.type==="race");
 for(const item of species)f.items.get(item._id).img="systems/Immortals-system/icons/svg/items/race.svg";
 await ensureCultivatorCompendium(f.options);
 for(const item of species)assert.equal(f.items.get(item._id).img,item.img);
 assert.equal(f.batches,1);assert.equal(f.pack.locked,true);
 await ensureCultivatorCompendium(f.options);assert.equal(f.batches,1);
});
function ownedFixture(){
 const sources=[oldQi(),oldFeature()],actor={id:"icon-actor",type:"character",isOwner:true,items:[],limited:false};
 actor.items=sources.map(d=>({id:d._id,actor,isOwner:true,toObject:()=>copy(d)}));
 let batches=0;
 actor.performBulkUpdate=async({item:patches})=>{batches++;for(const p of patches)apply(sources.find(d=>d._id===p._id),p);};
 const game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}}};
 return{actor,sources,game,get batches(){return batches;}};
}
test("owned antecedent features and Qi talents refresh once without changing spent uses",async()=>{
 const f=ownedFixture();f.sources[1].system.uses.spent=1;
 assert.equal(await use(migration,"migrateGeneralContentArt")(f.actor,{game:f.game}),2);
 assert.equal(f.batches,1);assert.equal(f.sources[1].system.uses.spent,1);
 assert.equal(await migration.migrateGeneralContentArt(f.actor,{game:f.game}),0);
});
test("players and actors without ownership cannot trigger owned icon writes",async()=>{
 const f=ownedFixture();f.game.user.isGM=false;
 assert.equal(await use(migration,"migrateGeneralContentArt")(f.actor,{game:f.game}),0);
 f.game.user.isGM=true;f.actor.isOwner=false;
 assert.equal(await migration.migrateGeneralContentArt(f.actor,{game:f.game}),0);assert.equal(f.batches,0);
});
test("the icon transaction rechecks authority after waiting for the shared actor queue",async()=>{
 const {withElementalActorLock}=await import("../module/systems/elemental-runtime.mjs");
 const f=ownedFixture();let release;const gate=new Promise(resolve=>release=resolve);
 const blocker=withElementalActorLock(f.actor,"testing-block",()=>gate);
 const pending=use(migration,"migrateGeneralContentArt")(f.actor,{game:f.game});
 f.actor.isOwner=false;release();await blocker;assert.equal(await pending,0);assert.equal(f.batches,0);
});

test("standalone world backgrounds and talents receive art-only native updates; personal art survives",async()=>{
 const first=oldQi(),second=oldFeature(),personal=oldQi();personal._id="personal";personal.img="worlds/my/custom.webp";
 const items=[first,second,personal],game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}},items};
 let writes=0;const Item={async updateDocuments(patches,options){assert.equal(options,undefined);writes++;for(const p of patches)apply(items.find(d=>d._id===p._id),p);}};
 assert.equal(await use(migration,"migrateWorldGeneralContentArt")({game,Item}),2);
 assert.equal(writes,1);assert.equal(personal.img,"worlds/my/custom.webp");
 assert.equal(await migration.migrateWorldGeneralContentArt({game,Item}),0);
 game.user.isGM=false;assert.equal(await migration.migrateWorldGeneralContentArt({game,Item}),0);
});

test("world items imported while an art batch is pending are included before migration finishes",async()=>{
 const items=[oldQi()],game={user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}},items};
 let release,entered,first=true;const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 const Item={async updateDocuments(patches){if(first){first=false;entered();await gate;}for(const patch of patches)apply(items.find(d=>d._id===patch._id),patch);}};
 const a=migration.migrateWorldGeneralContentArt({game,Item});await started;
 items.push(oldFeature());const b=migration.migrateWorldGeneralContentArt({game,Item});release();
 await Promise.all([a,b]);assert(items.every(d=>d.img.endsWith(".webp")),"a concurrent import must not keep its old SVG");
});
test("actor items imported while an art batch is pending are included without another reload",async()=>{
 const f=ownedFixture(),nativeUpdate=f.actor.performBulkUpdate;let release,entered,first=true;
 const gate=new Promise(resolve=>release=resolve),started=new Promise(resolve=>entered=resolve);
 f.actor.performBulkUpdate=async data=>{if(first){first=false;entered();await gate;}return nativeUpdate(data);};
 const a=migration.migrateGeneralContentArt(f.actor,{game:f.game});await started;
 const extra=backgroundDocuments().find(d=>d.type==="background"&&d.flags?.[scope]?.background?.key==="monge");extra.img="icons/svg/holy-shield.svg";
 f.sources.push(extra);f.actor.items.push({id:extra._id,actor:f.actor,isOwner:true,toObject:()=>copy(extra)});
 const b=migration.migrateGeneralContentArt(f.actor,{game:f.game});release();
 await Promise.all([a,b]);assert(f.sources.every(d=>d.img.endsWith(".webp")),"the active actor batch must rescan new imports");
});
