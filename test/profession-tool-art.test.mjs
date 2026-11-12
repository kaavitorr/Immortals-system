import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSION_PRODUCTS} from '../module/systems/profession-products-data.mjs';
import {professionProductImage,prepareProfessionProductArtUpdate} from '../module/systems/profession-product-art.mjs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
import {prepareProfessionProductContext} from '../module/systems/profession-ui-context.mjs';
import {prepareProfessionProductAuthorUpdate,migrateWorldProfessionProductArt,registerProfessionProductMigrations} from '../module/systems/profession-products-migration.mjs';
const tools=PROFESSION_PRODUCTS.filter(p=>p.kind==='tool'),scope='Immortals-system';
const expected=id=>'systems/Immortals-system/assets/wuxia/ferramentas-pintadas-v1/'+id+'.webp';
const old=p=>'systems/Immortals-system/assets/wuxia/profissoes-pintadas-v1/'+p.profession+'.webp';
function oldTool(p){const doc=professionProductDocument(p.id);doc.img=old(p);doc.system.activities={use:{_id:'use',type:'utility',img:old(p),activation:{value:2},flags:{[scope]:{professionProductActivity:{productId:p.id}}}}};return doc;}
test('all 23 tools use individual painted objects in the shared resolver and native documents',()=>{
 assert.equal(tools.length,23);const images=new Set();
 for(const p of tools){const doc=professionProductDocument(p.id);assert.equal(professionProductImage(p),expected(p.id));assert.equal(doc.img,expected(p.id));images.add(doc.img);for(const activity of Object.values(doc.system.activities??{}))assert.equal(activity.img,doc.img);}
 assert.equal(images.size,23);
});
test('profession catalogues show the same dedicated tool illustrations as the compendium',()=>{
 for(const profession of new Set(tools.map(p=>p.profession))){const context=prepareProfessionProductContext({flags:{},system:{}},profession);const cards=context.tools;assert(cards.length>0);for(const card of cards)assert.equal(card.image,expected(card.id));}
});
test('generic old tool images and matching activities update without changing quantities, names or mechanics',()=>{
 for(const p of tools){const item=oldTool(p);item.name='Nome do mestre';item.system.quantity=9;item.system.price={value:127,denomination:'gp'};item.effects=[{name:'Efeito próprio'}];const before=structuredClone(item),patch=prepareProfessionProductArtUpdate(item);assert(patch);assert.equal(patch.img,expected(p.id));assert.equal(patch['system.activities.use.img'],expected(p.id));assert(Object.keys(patch).every(k=>k==='_id'||k==='img'||k.endsWith('.img')));assert.deepEqual(item,before);}
});
test('the existing author migration refreshes both public and owned copies of old tools',()=>{
 for(const id of ['kit-de-primeiros-socorros','livro-sobre-bestas-magicas-e-demoniacas','racao-para-bestas','livro-sobre-biomas']){const p=tools.find(p=>p.id===id),item=oldTool(p);assert.equal(prepareProfessionProductAuthorUpdate(item).img,expected(id));item.actor={isOwner:true};item.flags[scope].professionProductManaged=false;assert.equal(prepareProfessionProductAuthorUpdate(item).img,expected(id));}
});
test('custom tool artwork, readonly actors and inconsistent tool metadata are preserved',()=>{
 const p=tools.find(p=>p.id==='kit-de-primeiros-socorros');
 const custom=oldTool(p);custom.img='worlds/campaign/custom.webp';assert.equal(prepareProfessionProductArtUpdate(custom),null);
 const readonly=oldTool(p);readonly.actor={isOwner:false};assert.equal(prepareProfessionProductArtUpdate(readonly),null);
 const unowned=oldTool(p);unowned.isOwner=false;assert.equal(prepareProfessionProductArtUpdate(unowned),null);
 const wrong=oldTool(p);wrong.flags[scope].professionProduct.level=1;assert.equal(prepareProfessionProductArtUpdate(wrong),null);
 const wrongType=oldTool(p);wrongType.type='weapon';assert.equal(prepareProfessionProductArtUpdate(wrongType),null);
 const activity=oldTool(p);activity.system.activities.use.img='worlds/campaign/use.webp';const activityPatch=prepareProfessionProductArtUpdate(activity);assert(activityPatch);assert.equal(activityPatch['system.activities.use.img'],undefined);
});
test('tool image refresh is idempotent once item and activity portraits are current',()=>{
 for(const p of tools){const item=oldTool(p);item.img=expected(p.id);item.system.activities.use.img=expected(p.id);assert.equal(prepareProfessionProductArtUpdate(item),null);}
});

const activeGame=()=>({user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}});
function worldTool(){const item=oldTool(tools[0]);item.isOwner=true;item.calls=[];item.update=async patch=>{item.calls.push(patch);item.img=patch.img;};return item;}
test('loose world tools receive image-only updates through the native item API',async()=>{
 const item=worldTool(),before=structuredClone(item.system);assert.equal(await migrateWorldProfessionProductArt(item,{game:activeGame()}),1);assert.equal(item.calls.length,1);assert(Object.keys(item.calls[0]).every(k=>k==='_id'||k==='img'||k.endsWith('.img')));assert.deepEqual(item.system,before);
 item.system.activities.use.img=expected(tools[0].id);assert.equal(await migrateWorldProfessionProductArt(item,{game:activeGame()}),0);
});
test('world image refresh requires the active GM, editable loose tools and stock artwork',async()=>{
 for(const change of [(i,g)=>g.user.isGM=false,(i,g)=>g.users.activeGM.id='other',i=>i.isOwner=false,i=>i.limited=true,i=>i.parent={},i=>i.pack='another.pack',i=>i.actor={},i=>i.canUserModify=()=>false,i=>i.img='worlds/custom.webp',i=>i.flags[scope].professionProductManaged=false]){const item=worldTool(),game=activeGame();change(item,game);assert.equal(await migrateWorldProfessionProductArt(item,{game}),0);assert.equal(item.calls.length,0);}
 const pill=professionProductDocument('pilula-de-cura');pill.isOwner=true;pill.update=()=>{throw Error('Pills must stay unchanged');};assert.equal(await migrateWorldProfessionProductArt(pill,{game:activeGame()}),0);
});
test('ready and createItem hooks update loose tool portraits without reapplying rules',async()=>{
 const previousGame=globalThis.game,callbacks={},hooks={once:(key,fn)=>callbacks[key]=fn,on:(key,fn)=>callbacks[key]=fn},item=worldTool();
 try{registerProfessionProductMigrations(hooks);globalThis.game={...activeGame(),actors:[],items:[item]};await callbacks.ready();assert.equal(item.calls.length,1);const imported=worldTool();await callbacks.createItem(imported);assert.equal(imported.calls.length,1);}finally{if(previousGame===undefined)delete globalThis.game;else globalThis.game=previousGame;}
});
