import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSION_PRODUCTS} from '../module/systems/profession-products-data.mjs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
import {professionProductImage,prepareProfessionProductArtUpdate} from '../module/systems/profession-product-art.mjs';
import {prepareProfessionProductContext} from '../module/systems/profession-ui-context.mjs';
import * as migration from '../module/systems/profession-products-migration.mjs';
const scope='Immortals-system',products=PROFESSION_PRODUCTS.filter(p=>p.kind==='inscription');
const old='systems/Immortals-system/assets/wuxia/profissoes-pintadas-v1/inscriptions.webp';
const expected=id=>'systems/Immortals-system/assets/wuxia/inscricoes-pintadas-v1/'+id+'.webp';
const game=()=>({user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}});
function previous(p,level=p.levels.min){const d=professionProductDocument(p.id,{level});d.img=old;for(const a of Object.values(d.system.activities??{}))a.img=old;return d;}
function apply(source,update){for(const [key,value] of Object.entries(update)){if(key==='_id')continue;const parts=key.split('.'),last=parts.pop();let target=source;for(const part of parts)target=target[part]??={};target[last]=value;}return source;}
function loose(p=products[0]){const source=previous(p),item={isOwner:true,calls:[],get flags(){return source.flags;},toObject:()=>structuredClone(source),async update(patch){item.calls.push(patch);apply(source,patch);}};return item;}
test('each of the ten inscription symbols has its own portrait in documents, activities and profession catalogue',()=>{
 assert.equal(products.length,10);const images=new Set();for(const p of products){assert.equal(professionProductImage(p),expected(p.id));const d=professionProductDocument(p.id);assert.equal(d.img,expected(p.id));images.add(d.img);for(const a of Object.values(d.system.activities))assert.equal(a.img,d.img);}assert.equal(images.size,10);
 const cards=prepareProfessionProductContext({flags:{},system:{}},'inscriptions').productGroups.find(g=>g.kind==='inscription').items;assert.equal(cards.length,10);for(const c of cards)assert.equal(c.image,expected(c.id));
});
test('old inscriptions at their authored level bounds receive only portrait patches and preserve all mechanics',()=>{
 for(const p of products)for(const level of [p.levels.min,p.levels.max]){const d=previous(p,level);d.name='Símbolo personalizado do mestre';d.system.quantity=7;d.system.price={value:117,denomination:'gp'};d.effects.push({name:'Efeito próprio'});const before=structuredClone(d),patch=prepareProfessionProductArtUpdate(d);assert(patch);assert.equal(patch.img,expected(p.id));assert(Object.keys(patch).every(k=>k==='_id'||k==='img'||k.endsWith('.img')));assert.deepEqual(d,before);const revised=apply(structuredClone(d),patch);assert.equal(prepareProfessionProductArtUpdate(revised),null);for(const a of Object.values(revised.system.activities))assert.equal(a.img,revised.img);}
});
test('custom inscription art and unsupported levels, metadata or item types never get replaced',()=>{
 for(const change of [d=>d.img='worlds/custom-symbol.webp',d=>d.type='weapon',d=>d.flags[scope].professionProduct.level=0,d=>d.flags[scope].professionProduct.level=11,d=>d.flags[scope].professionProduct.extraMode=true,d=>d.flags[scope].professionProduct.kind='talisman']){const d=previous(products[0]);change(d);assert.equal(prepareProfessionProductArtUpdate(d),null);}
 const d=previous(products[0]),a=Object.values(d.system.activities)[0];a.img='worlds/custom-use.webp';const patch=prepareProfessionProductArtUpdate(d);assert(patch);assert(!Object.keys(patch).some(k=>k.startsWith('system.activities.')));
});
test('existing authored and player-owned inscription copies refresh art without changing provenance',()=>{
 for(const p of products){const d=previous(p);assert.equal(migration.prepareProfessionProductAuthorUpdate(d).img,expected(p.id));d.flags[scope].professionProductManaged=false;d.actor={isOwner:true};assert.equal(migration.prepareProfessionProductAuthorUpdate(d).img,expected(p.id));d.actor.isOwner=false;assert.equal(migration.prepareProfessionProductAuthorUpdate(d),null);}
});
test('native world-directory image migration includes inscriptions and remains permission-safe and idempotent',async()=>{
 assert.equal(typeof migration.migrateWorldProfessionProductArt,'function');const item=loose();assert.equal(await migration.migrateWorldProfessionProductArt(item,{game:game()}),1);assert.equal(item.calls.length,1);assert.equal(await migration.migrateWorldProfessionProductArt(item,{game:game()}),0);
 for(const change of [(i,g)=>g.user.isGM=false,(i,g)=>g.users.activeGM.id='other',i=>i.isOwner=false,i=>i.limited=true,i=>i.parent={},i=>i.pack='another.pack',i=>i.canUserModify=()=>false]){const readonly=loose(),g=game();change(readonly,g);assert.equal(await migration.migrateWorldProfessionProductArt(readonly,{game:g}),0);assert.equal(readonly.calls.length,0);}
});
test('ready and import hooks refresh existing loose inscriptions through the native item API',async()=>{
 const originalGame=globalThis.game,callbacks={},hooks={once:(key,fn)=>callbacks[key]=fn,on:(key,fn)=>callbacks[key]=fn},items=products.map(p=>loose(p));try{migration.registerProfessionProductMigrations(hooks);globalThis.game={...game(),actors:[],items};await callbacks.ready();assert(items.every(i=>i.calls.length===1));await callbacks.ready();assert(items.every(i=>i.calls.length===1));const imported=loose();await callbacks.createItem(imported);assert.equal(imported.calls.length,1);}finally{if(originalGame===undefined)delete globalThis.game;else globalThis.game=originalGame;}
});
