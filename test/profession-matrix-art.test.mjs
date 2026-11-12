import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PROFESSION_PRODUCTS} from '../module/systems/profession-products-data.mjs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
import {professionProductImage,prepareProfessionProductArtUpdate} from '../module/systems/profession-product-art.mjs';
import {prepareProfessionProductContext} from '../module/systems/profession-ui-context.mjs';
import {prepareProfessionProductAuthorUpdate,migrateWorldProfessionProductArt,registerProfessionProductMigrations} from '../module/systems/profession-products-migration.mjs';
const scope='Immortals-system',products=PROFESSION_PRODUCTS.filter(p=>p.kind==='matrix');
const old='systems/Immortals-system/assets/wuxia/profissoes-pintadas-v1/matrices.webp';
const expected=id=>'systems/Immortals-system/assets/wuxia/matrizes-pintadas-v1/'+id+'.webp';
function previous(p,level=p.levels.min){const d=professionProductDocument(p.id,{level});d.img=old;for(const a of Object.values(d.system.activities??{}))a.img=old;return d;}
function apply(source,update){for(const [key,value] of Object.entries(update)){if(key==='_id')continue;const parts=key.split('.'),last=parts.pop();let target=source;for(const part of parts)target=target[part]??={};target[last]=value;}return source;}
function loose(p=products[0]){const source=previous(p),item={isOwner:true,calls:[],get flags(){return source.flags;},toObject:()=>structuredClone(source),async update(patch){item.calls.push(patch);apply(source,patch);}};return item;}
const activeGame=()=>({user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}});
test('all nineteen matrices have distinct portraits across documents, native activities and profession catalogue',()=>{
 assert.equal(products.length,19);const images=new Set();for(const p of products){const d=professionProductDocument(p.id);assert.equal(professionProductImage(p.id),expected(p.id));assert.equal(d.img,expected(p.id));images.add(d.img);for(const a of Object.values(d.system.activities??{}))assert.equal(a.img,d.img);}assert.equal(images.size,19);
 const cards=prepareProfessionProductContext({flags:{},system:{}},'matrices').productGroups.find(g=>g.kind==='matrix').items;assert.equal(cards.length,19);for(const c of cards)assert.equal(c.image,expected(c.id));
});
test('matrix image refresh only replaces stock portraits while retaining identity, effects and level configuration',()=>{
 for(const p of products)for(const level of [p.levels.min,p.levels.max]){const d=previous(p,level);d.name='Matriz editada';d.system.quantity=8;d.system.price={value:199,denomination:'gp'};d.effects.push({name:'Efeito de campanha'});const before=structuredClone(d),patch=prepareProfessionProductAuthorUpdate(d);assert(patch);assert.equal(patch.img,expected(p.id));assert(Object.keys(patch).every(k=>k==='_id'||k==='img'||k.endsWith('.img')));assert.deepEqual(d,before);const revised=apply(structuredClone(d),patch);assert.equal(prepareProfessionProductArtUpdate(revised),null);assert.equal(revised.name,before.name);assert.deepEqual(revised.flags,before.flags);assert.deepEqual(revised.effects,before.effects);}
});
test('matrix artwork respects custom portraits, ownership and canonical native equipment metadata',()=>{
 const p=products[0];for(const change of [d=>d.img='worlds/custom-matrix.webp',d=>d.isOwner=false,d=>d.limited=true,d=>d.actor={isOwner:false},d=>d.type='weapon',d=>d.flags[scope].professionProduct.level=0,d=>d.flags[scope].professionProduct.level=11,d=>d.flags[scope].professionProduct.extraMode=true,d=>d.flags[scope].professionProduct.kind='inscription']){const d=previous(p);change(d);assert.equal(prepareProfessionProductArtUpdate(d),null);}
 const owned=previous(p);owned.flags[scope].professionProductManaged=false;owned.actor={isOwner:true};assert.equal(prepareProfessionProductArtUpdate(owned).img,expected(p.id));const a=Object.values(owned.system.activities)[0];a.img='worlds/custom-activity.webp';assert(!Object.keys(prepareProfessionProductArtUpdate(owned)).some(k=>k.startsWith('system.activities.')));
});
test('ready and import hooks refresh loose world matrices once using native image-only updates',async()=>{
 const previousGame=globalThis.game,callbacks={},hooks={once:(k,fn)=>callbacks[k]=fn,on:(k,fn)=>callbacks[k]=fn},items=products.map(p=>loose(p));try{registerProfessionProductMigrations(hooks);globalThis.game={...activeGame(),actors:[],items};await callbacks.ready();assert(items.every(i=>i.calls.length===1));for(const item of items)assert(Object.keys(item.calls[0]).every(k=>k==='_id'||k==='img'||k.endsWith('.img')));await callbacks.ready();assert(items.every(i=>i.calls.length===1));const imported=loose();await callbacks.createItem(imported);assert.equal(imported.calls.length,1);const readOnly=loose();readOnly.pack='other.pack';assert.equal(await migrateWorldProfessionProductArt(readOnly,{game:activeGame()}),0);}finally{if(previousGame===undefined)delete globalThis.game;else globalThis.game=previousGame;}
});
