import test from 'node:test';
import assert from 'node:assert/strict';
import {convertAscensionEquipment} from '../utils/ascension-equipment-conversion.mjs';
const config={weapons:{heavy2:{hands:2,range:3,actionCost:3,ranged:false,scaling:'strength'},light1:{hands:1,range:1,actionCost:2,ranged:false,scaling:'dexterity'},projectile2:{hands:2,range:120,actionCost:3,ranged:true,scaling:'strength.dexterity'},shieldLight:{hands:1,range:1,actionCost:2,defense:{block:2}}},armor:{heavy:{armor:{min:14,max:18}},unarmored:{armor:{min:0,max:0}}}};
const source=(type,system={})=>({_id:'sourceItem000000',_key:'!items!sourceItem000000',name:'Equipamento',type,img:'icons/weapons/swords/greatsword-crossguard-silver.webp',system:{identifier:'sourceItem',quantity:1,weight:3,price:240,quality:'standard',enchantment:'mundane',description:{public:'<p>Descrição pública.</p>',private:'Segredo do mestre'},properties:[],...system},effects:[],folder:null,flags:{core:{sheetClass:'ascension.LegacySheet'}}});
test('weapons become native inventory items with original art and deliberately empty damage dice',()=>{
 const original=source('weapon',{category:'heavy2',damage:9,damageType:'slashing'}),before=structuredClone(original);
 const item=convertAscensionEquipment(original,{config,id:'targetItem000000'});
 assert.deepEqual(original,before);assert.equal(item._id,'targetItem000000');assert.equal(item.img,original.img);
 assert.deepEqual(item.system.type,{value:'martialM',baseItem:''});assert.deepEqual(item.system.weight,{value:3,units:'kg'});assert.deepEqual(item.system.price,{value:240,denomination:'yen'});
 assert(item.system.properties.includes('two'));assert(item.system.properties.includes('hvy'));
 assert.equal(item.system.damage.base.number,null);assert.equal(item.system.damage.base.denomination,null);assert.deepEqual(item.system.damage.base.types,['slashing']);
 const attack=Object.values(item.system.activities)[0];assert.equal(attack.type,'attack');assert.equal(attack.activation.value,3);assert.equal(attack.range.units,'m');assert.equal(attack.range.value,3);
 assert.deepEqual(attack.consumption.targets.map(t=>[t.target,t.value]),[['energy.generated','3']]);assert.equal(item.flags.core?.sheetClass,undefined);
 assert(!item.system.description.value.includes('Segredo do mestre'));
});
test('ranged and thrown weapons retain their usable modes and no imported damage formula',()=>{
 const bow=convertAscensionEquipment(source('weapon',{category:'projectile2',damageType:'piercing'}),{config});
 assert.equal(bow.system.type.value,'martialR');assert.equal(bow.system.range.value,120);assert(bow.system.properties.includes('amm'));assert.equal(Object.values(bow.system.activities)[0].attack.type.value,'ranged');
 const dagger=convertAscensionEquipment(source('weapon',{category:'light1',properties:['thrown','versatile','ambush'],damageType:'piercing'}),{config});
 assert(dagger.system.properties.includes('thr'));assert(dagger.system.properties.includes('ver'));assert(dagger.system.description.value.includes('Emboscada'));assert.equal(dagger.system.range.value,30);
 assert.equal(dagger.system.damage.versatile.number,null);assert.equal(dagger.system.damage.base.custom.formula,'');
});
test('armor and shields use the equipment schema and enforce source category bounds',()=>{
 const armor=convertAscensionEquipment(source('armor',{category:'heavy',armor:{base:0},properties:['noisy']}),{config});
 assert.equal(armor.type,'equipment');assert.equal(armor.system.type.value,'heavy');assert.equal(armor.system.armor.value,14);assert.equal(armor.system.armor.ability,'');assert(armor.system.properties.includes('stealthDisadvantage'));
 const shield=convertAscensionEquipment(source('weapon',{category:'shieldLight',damage:1}),{config});assert.equal(shield.type,'equipment');assert.equal(shield.system.type.value,'shield');assert.equal(shield.system.armor.value,2);
});
test('consumables convert uses, targets and action costs without bringing foreign effect schemas',()=>{
 const original=source('consumable',{category:'bomb',uses:{max:5,value:3},actions:[{id:'throwBomb',name:'Throw Bomb',description:'<p>@ref[item.name] @Condition[burning] @Rule[action.weakened]</p>',img:'icons/svg/fire.svg',cost:{action:2,focus:0,heroism:0},range:{maximum:20},target:{type:'blast',size:4},tags:['consume']}]});
 const item=convertAscensionEquipment(original,{config});assert.equal(item.system.type.value,'trinket');assert.deepEqual(item.system.uses,{max:'5',spent:2,recovery:[],autoDestroy:true});
 const use=Object.values(item.system.activities)[0];assert.equal(use.type,'utility');assert.equal(use.range.units,'m');assert.equal(use.range.value,20);assert.equal(use.target.template.type,'circle');assert.equal(use.target.template.size,'4');
 assert(use.consumption.targets.some(t=>t.type==='itemUses'&&t.value==='1'));assert(!/@(?:ref|Rule|Condition)\[/.test(use.description.value));assert(use.description.value.includes('Em chamas'));
});
test('accessories keep affix information as native descriptions and remap equipment links',()=>{
 const original=source('accessory',{category:'jewelry',properties:['investment'],description:{public:'<p>@UUID[Compendium.crucible.equipment.Item.lanternOil000000]{Óleo}</p>',private:'Segredo'}});
 original.effects=[{_id:'nimbleness000000',name:'Agilidade',type:'affix',img:'icons/svg/aura.svg',description:'Aumenta Reflexo em 1.',system:{identifier:'nimbleness',tier:{value:1},changes:[]}}];
 const item=convertAscensionEquipment(original,{config,idMap:{lanternOil000000:'targetOil0000000'}});
 assert.equal(item.type,'equipment');assert.equal(item.system.type.value,'wondrous');assert.equal(item.system.attunement,'required');assert(item.system.description.value.includes('Aumenta Reflexo em 1.'));
 assert(item.system.description.value.includes('Compendium.Immortals-system.equipamentos.Item.targetOil0000000'));assert(item.effects.every(e=>e.type!=='affix'));assert(!item.flags.core?.sheetClass);
});

test('converted documents survive JSON serialization even when optional source metadata is absent',()=>{const original=source('loot',{category:'other'});delete original.system.enchantment;delete original.system.quality;const item=convertAscensionEquipment(original,{config});assert.deepEqual(JSON.parse(JSON.stringify(item)),item);});

test('known equipment imports use painted weapon art without changing damage or source data',()=>{const original=source('weapon',{category:'heavy2',damageType:'slashing'});original._id='bastardSword0000';const before=structuredClone(original);const item=convertAscensionEquipment(original,{config});assert.equal(item.img,'systems/Immortals-system/assets/wuxia/armas-pintadas-v1/espada-bastarda.webp');assert.equal(Object.values(item.system.activities)[0].img,item.img);assert.equal(item.system.damage.base.number,null);assert.deepEqual(original,before);const custom=convertAscensionEquipment({...original,img:'custom/sword.webp'},{config});assert.equal(custom.img,'custom/sword.webp');const mapped=convertAscensionEquipment(original,{config,assetMap:{[original.img]:'mapped/sword.webp'}});assert.equal(mapped.img,'mapped/sword.webp');assert.equal(Object.values(mapped.system.activities)[0].img,mapped.img);});
