import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {PROFESSION_PRODUCTS} from '../module/systems/profession-products-data.mjs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
import {prepareProfessionProductContext} from '../module/systems/profession-ui-context.mjs';
import {prepareProfessionProductArtUpdate} from '../module/systems/profession-product-art.mjs';
import {prepareProfessionProductAuthorUpdate,migrateWorldProfessionProductArt,registerProfessionProductMigrations} from '../module/systems/profession-products-migration.mjs';

const scope='Immortals-system';
const products=PROFESSION_PRODUCTS.filter(product=>product.kind==='treasure');
const placeholder='systems/Immortals-system/assets/wuxia/profissoes-pintadas-v1/artisan.webp';
function oldTreasure(product,level=1){
  const item=professionProductDocument(product.id,{level});
  item.img=placeholder;
  for(const activity of Object.values(item.system.activities??{}))activity.img=placeholder;
  return item;
}
function apply(source,patch){
  for(const [key,value] of Object.entries(patch)){
    if(key==='_id')continue;
    const parts=key.split('.'),last=parts.pop();
    let target=source;
    for(const part of parts)target=target[part]??={};
    target[last]=value;
  }
  return source;
}
function looseTreasure(product){
  const source=oldTreasure(product);
  const item={isOwner:true,calls:[],toObject:()=>structuredClone(source),
    async update(patch){item.calls.push(patch);apply(source,patch);}};
  return item;
}
const activeGame=()=>({user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}}});

test('the four treasure entries show distinct existing paintings in the profession list and their native items',()=>{
  const cards=prepareProfessionProductContext({flags:{},system:{}},'artisan').productGroups.find(group=>group.kind==='treasure').items;
  assert.equal(cards.length,4);
  const images=new Set();
  for(const card of cards){
    const document=professionProductDocument(card.id);
    assert.notEqual(card.image,placeholder);
    assert.equal(document.img,card.image);
    assert(document.img.endsWith('.webp'));
    assert(existsSync(new URL('../'+document.img.replace('systems/Immortals-system/',''),import.meta.url)));
    images.add(document.img);
    for(const activity of Object.values(document.system.activities??{}))assert.equal(activity.img,document.img);
  }
  assert.equal(images.size,4);
});

test('refreshing stock treasure art changes only image fields and leaves level, rarity, effects and authored numbers intact',()=>{
  for(const product of products)for(const level of [1,10]){
    const item=oldTreasure(product,level);
    item.name='Tesouro da campanha';item.system.quantity=7;
    item.system.price={value:321,denomination:'gp'};
    item.effects.push({name:'Efeito pessoal'});
    const before=structuredClone(item),patch=prepareProfessionProductAuthorUpdate(item);
    assert(patch,product.id);
    assert.equal(patch.img,professionProductDocument(product.id,{level}).img);
    assert(Object.keys(patch).every(key=>key==='_id'||key==='img'||key.endsWith('.img')));
    assert.deepEqual(item,before);
    const revised=apply(structuredClone(item),patch);
    assert.equal(revised.name,before.name);
    assert.deepEqual(revised.flags,before.flags);
    assert.deepEqual(revised.effects,before.effects);
    assert.equal(prepareProfessionProductArtUpdate(revised),null);
  }
});

test('treasure art refresh respects custom portraits, native types, ownership and crafted copies',()=>{
  const weapon=products.find(product=>product.id==='tesouro-arma');
  for(const mutate of [
    item=>item.img='worlds/campaign/custom.webp',
    item=>item.isOwner=false,
    item=>item.limited=true,
    item=>item.actor={isOwner:false},
    item=>item.type='equipment',
    item=>item.flags[scope].professionProduct.level=11,
    item=>item.flags[scope].professionProduct.kind='matrix'
  ]){
    const item=oldTreasure(weapon);mutate(item);
    assert.equal(prepareProfessionProductArtUpdate(item),null);
  }
  const crafted=oldTreasure(weapon);
  crafted.actor={isOwner:true};crafted.flags[scope].professionProductManaged=false;
  const [activity]=Object.values(crafted.system.activities);
  activity.img='worlds/campaign/custom-use.webp';
  const patch=prepareProfessionProductArtUpdate(crafted);
  assert(patch);
  assert.equal(patch.img,professionProductDocument(weapon.id).img);
  assert(!Object.keys(patch).some(key=>key.startsWith('system.activities.')));
});

test('ready and later imports refresh loose treasure items once through image-only native updates',async()=>{
  const previousGame=globalThis.game,callbacks={},hooks={once:(key,fn)=>callbacks[key]=fn,on:(key,fn)=>callbacks[key]=fn};
  const items=products.map(looseTreasure);
  try{
    registerProfessionProductMigrations(hooks);
    globalThis.game={...activeGame(),actors:[],items};
    await callbacks.ready();
    assert(items.every(item=>item.calls.length===1));
    for(const item of items)assert(Object.keys(item.calls[0]).every(key=>key==='_id'||key==='img'||key.endsWith('.img')));
    await callbacks.ready();
    assert(items.every(item=>item.calls.length===1));
    const imported=looseTreasure(products[0]);await callbacks.createItem(imported);
    assert.equal(imported.calls.length,1);
    const packed=looseTreasure(products[0]);packed.pack='another.pack';
    assert.equal(await migrateWorldProfessionProductArt(packed,{game:activeGame()}),0);
  }finally{
    if(previousGame===undefined)delete globalThis.game;else globalThis.game=previousGame;
  }
});
