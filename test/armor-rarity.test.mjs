import * as inventoryPresentation from "../module/applications/actor/jj/inventory-presentation.mjs";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import * as rules from "../module/systems/legacy2-armor.mjs";
const equipmentSource=readFileSync(new URL("../module/data/item/equipment.mjs",import.meta.url),"utf8");
const expected=[[1,"Humano","Inferior"],[2,"Humano","Comum"],[3,"Humano","Superior"],[4,"Terra","Comum"],[5,"Céu","Inferior"],[6,"Céu","Superior"],[7,"Sagrado","Inferior"],[8,"Sagrado","Superior"],[9,"Divino","Única"],[10,"Supremo","Única"]];
function equipment({level=0,base=6,type="medium",legacy=false}={}) {
 const item={id:"armor",name:"Armadura",type:"equipment",flags:legacy?{"Immortals-system":{cr:{base,atributo:"dex"}}}:{},system:{type:{value:type},equipped:true,armor:{value:legacy?0:base,ability:legacy?null:"dex",dex:8,rarityLevel:level},_source:{armor:{value:legacy?null:base,rarityLevel:level}}}};
 return item;
}
function actor(item,type="character") {return {type,items:[item],itemTypes:{equipment:[item]},system:{abilities:{dex:{value:10}},attributes:{ac:{bonus:0,override:null}}}};}
function basePrepare(item) {
 const body=equipmentSource.match(/  prepareBaseData\(\) \{([\s\S]*?)\r?\n  \}/)[1];
 class Boundary {prepareBaseData(){}}
 const Model=new Function("Boundary","Ruleset","armor2Configuration", "return class extends Boundary {prepareBaseData(){"+body+"}}")(Boundary,{isV2:()=>true},rules.armor2Configuration);
 const model=Object.assign(new Model(),item.system,{parent:item});item.system=model;model.prepareBaseData();return model;
}
test("armor treasure rarity follows the ten authored levels and leaves dashed combinations out",()=>{
 assert(Array.isArray(rules.ARMOR_RARITIES_2));
 assert.deepEqual(rules.ARMOR_RARITIES_2.filter(r=>r.value>0).map(r=>[r.value,r.rank,r.quality]),expected);
});
test("each rarity level adds exactly its value to armor CR for players and NPCs",()=>{
 for(const type of ["character","npc"])for(const [level]of expected){const item=equipment({level}),a=actor(item,type);rules.prepareLegacy2ArmorClass(a,99);assert.equal(a.system.attributes.ac.value,6+level+8);assert.equal(rules.armor2Configuration(item).base,6);}
});
test("native base preparation and repeated actor preparation never add rarity twice",()=>{
 for(const legacy of [false,true]){const item=equipment({level:4,legacy}),source=structuredClone(item.system._source);const model=basePrepare(item),a=actor(item);assert.equal(model.armor.value,10);model.armor.value+=2;for(let n=0;n<3;n++){rules.prepareLegacy2ArmorClass(a,99);assert.equal(a.system.attributes.ac.value,20);}model.prepareBaseData();assert.equal(model.armor.value,10);rules.prepareLegacy2ArmorClass(a,99);assert.equal(a.system.attributes.ac.value,18);assert.deepEqual(model._source,source);}
});
test("no selected rarity preserves existing armor, and unequipping restores unarmored CR",()=>{
 const item=equipment(),a=actor(item);rules.prepareLegacy2ArmorClass(a,17);assert.equal(a.system.attributes.ac.value,14);item.system.armor.rarityLevel=5;item.system._source.armor.rarityLevel=5;rules.prepareLegacy2ArmorClass(a,17);assert.equal(a.system.attributes.ac.value,19);item.system.equipped=false;rules.prepareLegacy2ArmorClass(a,17);assert.equal(a.system.attributes.ac.value,17);
});
test("rarity, shields, magical bonuses and explicit overrides remain independent",()=>{
 const item=equipment({level:3}),shield=equipment({level:2,base:2,type:"shield"}),a=actor(item);a.itemTypes.equipment.push(shield);a.items.push(shield);a.system.attributes.ac.bonus=-1;rules.prepareLegacy2ArmorClass(a,99,{bonus:-1});assert.equal(a.system.attributes.ac.value,20);a.system.attributes.ac.override=0;rules.prepareLegacy2ArmorClass(a,99);assert.equal(a.system.attributes.ac.value,0);
});
test("invalid imported rarity values do not silently grant a CR bonus",()=>{
 for(const level of [-1,11,2.5,"bad",Infinity]){const a=actor(equipment({level}));rules.prepareLegacy2ArmorClass(a,99);assert.equal(a.system.attributes.ac.value,14);}
});

test("the rarity subtitle keeps the identification gate of the original physical item field",async()=>{
 const item=equipment({level:9});
 Object.assign(item.system,{parent:item,isArmor:true,type:{value:"medium",label:"Armadura Média"},physicalItemSheetFields:[{label:"Antiga",classes:"item-rarity",requiresIdentification:true}]});
 globalThis.CONFIG={DND5E:{miscEquipmentTypes:{},armorTypes:{medium:"Armadura Média"}}};
 globalThis.dnd5e={utils:{formatModifier:String}};
 const body=equipmentSource.match(/async getSheetData\(context\) \{([\s\S]*?)\r?\n  \}/)[1];
 const context={properties:{active:[{}]}};
 await new Function("Ruleset","armor2Configuration","return async function(context){"+body+"}")({isV2:()=>true},rules.armor2Configuration).call(item.system,context);
 const rarity=context.subtitles.find(entry=>entry.label.includes("Divino"));
 assert.equal(rarity.requiresIdentification,true);
 assert.equal(context.subtitles.some(entry=>entry.label==="Antiga"),false);
});

test('inventory rarity respects identification and never reveals hidden armor details to a player',()=>{const item=equipment({level:9});item.system.isArmor=true;item.system.identified=false;assert.equal(typeof inventoryPresentation.armorInventoryRarity,'function');assert.equal(inventoryPresentation.armorInventoryRarity(item,{isGM:false}),null);assert.equal(inventoryPresentation.armorInventoryRarity(item,{isGM:true}).label,'Divino · Única');item.system.identified=true;assert.equal(inventoryPresentation.armorInventoryRarity(item,{isGM:false}).label,'Divino · Única');});
test('inventory tag distinguishes an unassigned rarity without assigning a level or changing CR',()=>{const item=equipment();item.system.isArmor=true;const before=structuredClone(item);const tag=inventoryPresentation.armorInventoryRarity(item);assert.equal(tag.level,0);assert.equal(tag.label,'Raridade não definida');assert.deepEqual(item,before);item.system.isArmor=false;assert.equal(inventoryPresentation.armorInventoryRarity(item),null);});
