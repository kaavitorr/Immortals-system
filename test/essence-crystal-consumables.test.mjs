import {BEAST_CORE_TYPE,prepareBeastCoreChanges} from "../module/systems/beast-cores.mjs";
import {test} from 'node:test';import assert from 'node:assert/strict';
import {essenceCrystalConfiguration,essenceCrystalCompendiumDocuments,crystalCultivationProjection} from '../module/systems/essence-crystals.mjs';
let data;try{data=await import('../module/systems/essence-crystal-data.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;data={};}
const scope='Immortals-system';
const item=(id='humano-inferior',spent=0)=>({id:'owned',type:'consumable',system:{type:{value:'essenceCrystal',subtype:id},quantity:1,equipped:true,uses:{max:'999',spent,recovery:[],autoDestroy:false}},flags:{}});

test('the sixteen crystal capacities match the entire authored table exactly',()=>{
 assert.equal(data.ESSENCE_CRYSTALS?.length,16);assert.deepEqual(data.ESSENCE_CRYSTALS.map(c=>c.capacity),[10,15,20,60,80,100,200,250,400,500,1000,2000,3000,6000,10000,25000]);
 assert.deepEqual(data.ESSENCE_CRYSTALS.map(c=>c.id),['humano-inferior','humano-comum','humano-superior','terra-inferior','terra-comum','terra-superior','ceu-inferior','ceu-comum','ceu-superior','sagrado-inferior','sagrado-comum','sagrado-superior','divino-inferior','divino-comum','divino-superior','supremo-unico']);
});
test('all crystals publish as distinct consumables, full and unequipped with no rest refill',()=>{
 const docs=essenceCrystalCompendiumDocuments(),items=docs.filter(d=>d.type!=='Item');assert.equal(items.length,16);assert.equal(new Set(docs.map(d=>d._id)).size,17);
 for(const [index,c] of items.entries()){assert.equal(c.type,'consumable');assert.equal(c.system.type.value,'essenceCrystal');assert.equal(c.system.type.subtype,data.ESSENCE_CRYSTALS[index].id);
 assert.equal(c.system.uses.max,String(data.ESSENCE_CRYSTALS[index].capacity));assert.equal(c.system.uses.spent,0);assert.deepEqual(c.system.uses.recovery,[]);assert.equal(c.system.uses.autoDestroy,false);assert.equal(c.system.equipped,false);assert.equal(c.img.endsWith('/'+data.ESSENCE_CRYSTALS[index].id+'.webp'),true);}
});
test('the consumable reserve uses the authored capacity and native spent counter',()=>{
 const c=item('divino-superior',2500),state=essenceCrystalConfiguration(c);assert.equal(state.enabled,true);assert.equal(state.capacity,10000);assert.equal(state.remaining,7500);
 c.system.uses.spent=20000;assert.equal(essenceCrystalConfiguration(c).remaining,0);
 c.system.type.subtype='unrecognized';assert.equal(essenceCrystalConfiguration(c).enabled,false);
});
test('calendar spending changes native uses.spent while keeping crystal identity and source intact',()=>{
 const c=item('terra-comum',5),actor={type:'character',items:[c],system:{cultivation:{rank:1,stage:1,essence:0}},getFlag:()=>10};
 const before=structuredClone(c),p=crystalCultivationProjection(actor,2,{level:'mediano'});assert.equal(p.gain,40);
 assert.deepEqual(p.itemUpdates,[{_id:'owned','system.uses.spent':25}]);assert.deepEqual(c,before);
});
test('legacy equipment crystals still use their saved reserve without being retyped or refilled',()=>{
 const c={id:'old',type:'equipment',system:{quantity:1,equipped:true},flags:{[scope]:{essenceCrystal:{enabled:true,capacity:80,remaining:17}}}};
 assert.equal(essenceCrystalConfiguration(c).remaining,17);assert.equal(essenceCrystalConfiguration(c).enabled,true);
});


test('editing a crystal quality sets its fixed capacity without rest recovery or auto destruction',()=>{
 assert.equal(typeof data.prepareCrystalConsumableChanges,'function');
 const old=item('humano-inferior',3);const update=data.prepareCrystalConsumableChanges(old,{'system.type.subtype':'terra-comum'});
 assert.deepEqual(update,{'system.uses.max':'80','system.uses.spent':3,'system.uses.recovery':[],'system.uses.autoDestroy':false});
 assert.equal(data.prepareCrystalConsumableChanges({...old,system:{type:{value:'potion'}}},{}),null);
 assert.throws(()=>data.prepareCrystalConsumableChanges(old,{'system.uses.spent':-1}),/Essência/);
});


test('native consumable preparation applies the capacity before uses are prepared, keeping spent PEQ',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../module/data/item/consumable.mjs',import.meta.url),'utf8');
 const body=source.match(/  prepareFinalData\(\) \{([\s\S]*?)\r?\n  \}/)[1];
 const prepare=new Function('crystalConsumableDefinition','BEAST_CORE_TYPE','return function(){'+body+'}')(data.crystalConsumableDefinition,BEAST_CORE_TYPE);
 for(const entry of data.ESSENCE_CRYSTALS){const doc=item(entry.id,3);doc.getRollData=()=>({});let calls=0;
  const model={parent:doc,type:doc.system.type,uses:{max:'999',spent:3,recovery:[{period:'lr'}],autoDestroy:true},
   prepareFinalActivityData(){assert.equal(this.uses.max,String(entry.capacity));this.uses.value=Number(this.uses.max)-this.uses.spent;calls++;},prepareFinalEquippableData(){calls++;}};
  prepare.call(model);assert.equal(model.uses.value,entry.capacity-3);assert.equal(model.uses.spent,3);assert.deepEqual(model.uses.recovery,[]);assert.equal(model.uses.autoDestroy,false);assert.equal(calls,2);
 }
});

test('native consumable pre-update validates and merges quality changes without editing other item fields',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../module/data/item/consumable.mjs',import.meta.url),'utf8');
 const method=source.match(/  async _preUpdate\(changed, options, user\) \{[\s\S]*?\r?\n  \}/)[0];
 const expand=object=>{const out={};for(const [path,value]of Object.entries(object)){const keys=path.split('.');let target=out;for(const key of keys.slice(0,-1))target=target[key]??={};target[keys.at(-1)]=value;}return out;};
 const merge=(target,patch)=>{for(const [key,value]of Object.entries(patch)){if(value&&typeof value==='object'&&!Array.isArray(value))merge(target[key]??={},value);else target[key]=value;}return target;};
 class Base{async _preUpdate(){return this.cancel?false:undefined;}}
 const C=new Function('Base','prepareCrystalConsumableChanges','prepareBeastCoreChanges','foundry','return class extends Base{'+method+'}')(Base,data.prepareCrystalConsumableChanges,prepareBeastCoreChanges,{utils:{expandObject:expand,mergeObject:merge}});
 const model=new C();model.parent=item('humano-inferior',4);model.preUpdateIdentifiable=async()=>{};
 const changed={name:'Cristal do personagem',system:{type:{subtype:'terra-superior'},quantity:3}};await model._preUpdate(changed,{},{});
 assert.equal(changed.system.uses.max,'100');assert.equal(changed.system.uses.spent,4);assert.equal(changed.name,'Cristal do personagem');assert.equal(changed.system.quantity,3);
 model.cancel=true;const untouched={name:'cancelado'};assert.equal(await model._preUpdate(untouched,{},{}),false);assert.deepEqual(untouched,{name:'cancelado'});
});


test('dropping another crystal never auto-stacks away its independent PEQ reserve',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../module/applications/actor/api/base-actor-sheet.mjs',import.meta.url),'utf8');
 const body=source.match(/  _onDropStackConsumables\(event, itemData, \{ container=null \}=\{\}\) \{([\s\S]*?)\r?\n  \}/)[1];
 const stack=new Function('ESSENCE_CRYSTAL_TYPE','return function(event,itemData,{container=null}={}){'+body+'}')(data.ESSENCE_CRYSTAL_TYPE);
 let writes=0;const existing={name:'Crystal',system:{quantity:1,uses:{spent:80}},async update(){writes++;return this;}};
 const sheet={inventorySource:{sourcedItems:{get:()=>({filter:()=>({first:()=>existing})})}}};
 const drop={type:'consumable',name:'Crystal',_stats:{compendiumSource:'Compendium.test.Item.crystal'},system:{type:{value:'essenceCrystal',subtype:'terra-comum'},quantity:1,uses:{spent:0}}};
 assert.equal(await stack.call(sheet,{},drop),null);assert.equal(writes,0);assert.equal(existing.system.uses.spent,80);
 drop.system.type.value='potion';await stack.call(sheet,{},drop);assert.equal(writes,1);
});

test('exporting an owned crystal preserves spent PEQ while ordinary consumables retain native reset behavior',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../module/data/item/consumable.mjs',import.meta.url),'utf8');
 const method=source.match(/  static _resetData\(source\) \{[\s\S]*?\r?\n  \}/)?.[0];assert(method,'crystal reset preservation must exist');
 class Base{static _resetData(source){delete source.uses.spent;delete source.equipped;}}
 const C=new Function('Base','ESSENCE_CRYSTAL_TYPE','return class extends Base{'+method+'}')(Base,data.ESSENCE_CRYSTAL_TYPE);
 const crystal={type:{value:'essenceCrystal',subtype:'terra-comum'},uses:{max:'80',spent:57},equipped:true};C._resetData(crystal);
 assert.equal(crystal.uses.spent,57);assert.equal(crystal.equipped,undefined);
 const potion={type:{value:'potion'},uses:{max:'3',spent:1},equipped:true};C._resetData(potion);assert.equal(potion.uses.spent,undefined);
});


test('a crystal eligible by effective absorption grants only its remaining bonus on a partial last day',()=>{
 const c=item('humano-inferior',3),a={type:'character',items:[c],system:{cultivation:{rank:1,stage:1,essence:0}},getFlag:()=>20};
 const before=structuredClone(c),p=crystalCultivationProjection(a,2,{level:'denso'});
 assert.equal(p.basePerDay,20);assert.equal(p.crystals[0].minimum,10);assert.equal(p.crystals[0].eligible,true);
 assert.equal(p.gain,47);assert.equal(p.crystalSpent,7);assert.equal(p.crystalBonus,7);
 assert.deepEqual(p.itemUpdates,[{_id:'owned','system.uses.spent':10}]);assert.deepEqual(c,before);
});
