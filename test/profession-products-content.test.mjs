import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
let content={},activities={};
try{content=await import('../module/systems/profession-products-content.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
try{activities=await import('../module/systems/profession-products-activities.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const scope='Immortals-system';
const call=(api,key,...args)=>{assert.equal(typeof api[key],'function',key+' must exist');return api[key](...args);};
const document=(id,config)=>call(content,'professionProductDocument',id,config);
function fixture(id,config){const item=document(id,config),actor={id:'owner',isOwner:true,system:{energy:{generated:30,total:100}},items:new Map()};item.id='owned';item.actor=actor;actor.items.set(item.id,item);const activity=Object.values(item.system.activities??{})[0];if(activity){activity.item=item;activity.actor=actor;}return{item,actor,activity};}
const prepare=(activity,options)=>call(activities,'prepareProfessionProductUse',activity,options);

test('one physical catalogue publishes 86 products under six folders with collision-free stable IDs',()=>{
 const docs=call(content,'professionProductCompendiumDocuments'),folders=docs.filter(d=>d.type==='Item'),items=docs.filter(d=>d.type!=='Item');
 assert.equal(folders.length,7);assert.equal(items.length,86);assert.equal(new Set(docs.map(d=>d._id)).size,93);
 const root=folders.find(d=>d.folder===null);assert.equal(root.name,'Profissões');assert.deepEqual(folders.filter(d=>d.folder===root._id).map(d=>d.name).sort(),['Ferramentas','Inscrições','Matrizes','Pílulas','Talismãs','Tesouros']);
 for(const item of items){assert.match(item._id,/^[a-f0-9]{16}$/);assert(folders.some(f=>f._id===item.folder));assert(item.flags[scope].professionProduct.id);assert(item.system.description.value.length>30);assert(!/[⬢★]/u.test(item.system.description.value));}
 assert.deepEqual(call(content,'professionProductCompendiumDocuments').map(d=>d._id),docs.map(d=>d._id));
});

test('configured products retain their printed level and quality independently of actor cultivation',()=>{
 const item=document('pilula-de-cura',{level:4,quality:'perfeita'});assert.deepEqual(item.flags[scope].professionProduct,{id:'pilula-de-cura',kind:'pill',profession:'alchemy',level:4,quality:'perfect'});
 assert.equal(item.type,'consumable');assert.equal(item.system.type.value,'potion');assert.equal(item.img,'systems/Immortals-system/assets/wuxia/pilulas-pintadas-v1/pilula-de-cura.webp');
 const f=fixture('pilula-de-cura',{level:4,quality:'perfeita'});f.actor.system.details={level:10};assert.equal(prepare(f.activity).ok,true);assert.equal(prepare(f.activity).product.level,4);
 item.flags[scope].professionProduct.level=99;assert.equal(document('pilula-de-cura',{level:4}).flags[scope].professionProduct.level,4);
 for(const config of [{level:0},{level:11},{level:2.5},{level:NaN},{quality:'legendaria'}])assert.throws(()=>document('pilula-de-cura',config),RangeError);
 assert.throws(()=>document('not-a-product'),RangeError);assert.throws(()=>document('pilula-das-9-revolucoes-da-mente',{level:4}),RangeError);
});

test('native itemUses consumes one pill per use and destroys only the final quantity',async()=>{
 const f=fixture('pilula-de-cura'),target=f.activity.consumption.targets.find(t=>t.type==='itemUses');assert(target);assert.equal(target.target,'');assert.equal(target.value,'1');assert.deepEqual(f.item.system.uses,{max:'1',spent:0,recovery:[],autoDestroy:true});
 assert.equal(f.activity.consumption.spellSlot,false);assert.equal(f.activity.consumption.scaling.allowed,false);
 const source=await readFile(new URL('../module/data/activity/fields/consumption-targets-field.mjs',import.meta.url),'utf8');
 const body=source.match(/  static async consumeItemUses\(config, updates\) \{([\s\S]*?)\n  \}/)[1];
 const consume=new Function('_loc','return async function(config,updates){'+body+'}')(key=>key);
 f.item.system.quantity=3;f.item.system.uses={...f.item.system.uses,max:1,value:1};
 const context={...target,item:f.item,actor:f.actor,_usesConsumption:async()=>({spent:1})};let updates={actor:{},item:[],delete:[],rolls:[]};await consume.call(context,{},updates);
 assert.deepEqual(updates.item,[{_id:'owned','system.uses.spent':0,'system.quantity':2}]);assert.deepEqual(updates.delete,[]);assert.equal(f.item.system.quantity,3);
 f.item.system.quantity=1;updates={actor:{},item:[],delete:[],rolls:[]};await consume.call(context,{},updates);assert.deepEqual(updates.delete,['owned']);assert.deepEqual(updates.item,[]);
});

test('healing pill rolls only initial level d4 plus Constitution and leaves timed recovery explicit',()=>{
 const f=fixture('pilula-de-cura',{level:4,quality:'comum'});assert.equal(f.activity.type,'heal');assert.equal(f.activity.healing.custom.formula,'4d4 + @abilities.con.mod');assert.deepEqual(f.activity.healing.types,['healing']);
 const result=prepare(f.activity);assert.equal(result.poison,4);assert.equal(result.meta.recurringHealing.formula,'4d4');assert.equal(result.meta.recurringHealing.intervalSeconds,60);assert.equal(result.meta.recurringHealing.repetitions,10);assert.deepEqual(f.item.effects,[]);
});

test('use guards reject permissions, corrupt stored configuration, empty stocks and unresolved costs without mutations',()=>{
 const f=fixture('pilula-de-cura',{level:2,quality:'inferior'}),before=JSON.stringify(f.actor.system);
 f.actor.isOwner=false;assert.equal(prepare(f.activity).ok,false);f.actor.isOwner=true;
 f.item.flags[scope].professionProduct.level=11;assert.equal(prepare(f.activity).ok,false);f.item.flags[scope].professionProduct.level=2;
 f.item.flags[scope].professionProduct.quality='invalid';assert.equal(prepare(f.activity).ok,false);f.item.flags[scope].professionProduct.quality='inferior';
 f.item.system.quantity=0;assert.equal(prepare(f.activity).ok,false);f.item.system.quantity=1;
 f.activity.flags[scope].professionProductActivity.pendingCost='Reserva indefinida';assert.equal(prepare(f.activity).ok,false);assert.equal(JSON.stringify(f.actor.system),before);
 assert.equal(prepare({}).ok,true);
});

test('talismans retain explicit action costs, damage split, reaction duration and manual destination',()=>{
 const explosive=fixture('talisma-explosivo',{level:3});assert.equal(explosive.activity.activation.value,2);assert.deepEqual(explosive.activity.damage.parts.map(p=>[p.custom.formula,p.types]),[['18',['bludgeoning']],['18',['fire']]]);assert.equal(explosive.activity.target.template.size,'12');assert.equal(explosive.activity.type,'save');assert.deepEqual(explosive.activity.save.ability,['dex']);assert.equal(explosive.activity.damage.onSave,'half');assert.equal(explosive.activity.save.dc.formula,'');assert.equal(explosive.activity.flags[scope].professionProductActivity.manualSaveDifficulty,true);assert.equal(explosive.activity.flags[scope].professionProductActivity.pendingResolution,undefined);assert.equal(prepare(explosive.activity).ok,true);
 const barrier=fixture('talisma-de-barreira',{level:3});assert.equal(barrier.activity.type,'reduction');assert.equal(barrier.activity.reduction.formula,'60');assert.equal(barrier.activity.activation.type,'reaction');assert.equal(barrier.activity.flags[scope].professionProductActivity.untilNextTurn,true);
 const escape=fixture('talisma-de-fuga',{level:3});assert.equal(escape.activity.range.value,'30000');assert.equal(escape.activity.activation.type,'reaction');assert.equal(escape.activity.flags[scope].professionProductActivity.manualDestination,true);
 const sealing=fixture('talisma-de-selamento',{level:3});assert.equal(sealing.activity.activation.value,1);assert.equal(sealing.activity.flags[scope].professionProductActivity.barrierHitPoints,450);assert.equal(sealing.activity.target.template.size,'30');
 for(const f of [barrier,escape,sealing])assert(f.activity.consumption.targets.some(t=>t.type==='itemUses'));
});

test('explicit Total Qi and refined Qi costs stay distinct from actions and do not grant possession effects',()=>{
 const conflict=fixture('simbolo-do-selo-de-conflito',{level:4});assert.equal(conflict.activity.activation.value,1);assert.deepEqual(conflict.activity.consumption.targets.map(t=>[t.type,t.target,t.value]),[['attribute','energy.total','7']]);assert.equal(conflict.activity.duration.value,'4');assert.equal(conflict.activity.duration.units,'round');assert.deepEqual(conflict.item.effects,[]);
 const strike=fixture('simbolo-avassalador',{level:3});assert.equal(strike.activity.activation.value,2);assert(strike.activity.consumption.targets.some(t=>t.type==='attribute'&&t.target==='energy.generated'&&t.value==='4'));assert.deepEqual(strike.item.effects,[]);
});

test('matrices have physical level-scaled HP and no invented refinement activity or actor passives',()=>{
 const defense=document('matriz-de-defesa',{level:4});assert.equal(defense.type,'equipment');assert.equal(defense.system.type.value,'vehicle');assert.equal(defense.system.hp.max,1200);assert.equal(defense.system.hp.value,1200);assert.equal(defense.system.armor.value,24);
 for(const id of ['matriz-de-refinamento-corporal','matriz-de-refinamento-da-alma']){const item=document(id,{level:3});assert.deepEqual(item.system.activities,{});assert.deepEqual(item.effects,[]);assert(item.flags[scope].professionProductAutomation.pending.some(text=>/efeito pendente/i.test(text)));}
});

test('tools retain explicit purchase prices and native material, book and tool classification',()=>{
 const docs=call(content,'professionProductCompendiumDocuments').filter(d=>d.flags?.[scope]?.professionProduct?.kind==='tool');assert.equal(docs.length,23);assert(docs.some(d=>d.type==='tool'));assert(docs.some(d=>d.type==='loot'&&d.system.type.value==='material'));assert(docs.some(d=>d.type==='loot'&&d.system.type.value==='gear'));assert(docs.some(d=>d.system.price?.value===50));for(const item of docs)assert.equal(item.flags[scope].professionProduct.level,null);
});

test('treasures are four configurable generic templates without chosen base weapons or automatic traits',()=>{
 const docs=call(content,'professionProductCompendiumDocuments').filter(d=>d.flags?.[scope]?.professionProduct?.kind==='treasure');assert.equal(docs.length,4);assert.deepEqual(docs.map(d=>d.flags[scope].professionProduct.id).sort(),['tesouro-acessorio','tesouro-arma','tesouro-armadura','tesouro-voador']);for(const item of docs){assert.deepEqual(item.effects,[]);assert(item.flags[scope].professionProductAutomation.manual.length);}
});


test('elemental pills require a stored element and never silently consume a generic blank template',()=>{
 const unconfigured=fixture('pilula-da-condensacao-elemental-de-x',{level:4});assert.equal(prepare(unconfigured.activity).ok,false);
 const configured=fixture('pilula-da-condensacao-elemental-de-x',{level:4,element:'fire'});assert.equal(prepare(configured.activity).ok,true);assert.equal(prepare(configured.activity).product.element,'fire');
});

test('the guard derives toxin dosage from stored quality and refuses edited native consumption',()=>{
 const f=fixture('pilula-de-cura',{quality:'perfect'});f.activity.flags[scope].professionProductActivity.poison=999;assert.equal(prepare(f.activity).poison,1);
 f.activity.consumption.targets=[];assert.equal(prepare(f.activity).ok,false);
});

test('native added-Qi scaling is constrained to this inscription level and cannot upscale fixed pills',()=>{
 const f=fixture('simbolo-avassalador',{level:3});assert.equal(prepare(f.activity,{usageConfig:{scaling:4}}).ok,true);assert.equal(prepare(f.activity,{usageConfig:{scaling:5}}).ok,false);assert.equal(prepare(f.activity,{usageConfig:{scaling:-1}}).ok,false);
 const pill=fixture('pilula-de-cura');assert.equal(prepare(pill.activity,{usageConfig:{scaling:1}}).ok,false);
});

test('the weapon treasure template prevents a guessed native default attack before its base item is chosen',()=>{
 const f=fixture('tesouro-arma');assert(f.activity);assert.equal(f.activity.type,'utility');assert.equal(prepare(f.activity).ok,false);assert.match(prepare(f.activity).reason,/base|configur/i);
});


test('material-only quotes become native gold sale prices while crystal ranks remain distinct',()=>{
 const first=document('pilula-de-cura',{level:1}),quote=first.flags[scope].professionProductPricing;assert(quote);assert.equal(first.flags[scope].professionProductsContentVersion,2);assert.equal(quote.basis,'ingredients');assert.equal(quote.creation.amount,600);assert.equal(quote.sale.amount,90);assert.deepEqual(first.system.price,{value:90,denomination:'gp'});assert.match(first.system.description.value,/600 PO/);assert.match(first.system.description.value,/90 PO/);
 const crystal=document('pilula-de-cura',{level:4});assert.equal(crystal.flags[scope].professionProductPricing.creation.amount,90);assert.equal(crystal.flags[scope].professionProductPricing.sale.amount,13.5);assert.equal(crystal.flags[scope].professionProductPricing.sale.currency,'spiritualCrystals');assert.equal(crystal.flags[scope].professionProductPricing.sale.rank,'human');assert.deepEqual(crystal.system.price,{value:13.5,denomination:'essence-human'});assert.match(crystal.system.description.value,/13,5 Cristais.*Humano/);
 const market=document('pilula-de-cura',{level:7});assert.equal(market.flags[scope].professionProductPricing.pending,false);assert.equal(market.flags[scope].professionProductPricing.sale.rank,'sacred');assert.deepEqual(market.system.price,{value:15,denomination:'essence-sacred'});assert.match(market.system.description.value,/Sagrado/);
});
