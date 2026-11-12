import {BEAST_CORE_TYPE,beastCoreSubtypes,beastCoreConfiguration,beastCoreRealms} from "../module/systems/beast-cores.mjs";
import {essenceCrystalSubtypes,ESSENCE_CRYSTAL_TYPE,crystalConsumableDefinition,ESSENCE_CRYSTAL_BY_ID} from '../module/systems/essence-crystal-data.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('module/data/item/consumable.mjs'),template=read('templates/items/details/details-consumable.hbs'),language=JSON.parse(read('lang/en.json'));
const types=new Function('essenceCrystalSubtypes','beastCoreSubtypes','return ('+read('module/config.mjs').match(/DND5E.consumableTypes = (\{[\s\S]*?\r?\n\});/)[1]+')')(essenceCrystalSubtypes,beastCoreSubtypes);
function localize(path){const parts=path.split('.');for(let n=parts.length;n>0;n--){const key=parts.slice(0,n).join('.');if(key in language)return parts.slice(n).reduce((v,k)=>v?.[k],language[key]);}return path;}
for(const type of Object.values(types)){type.label=localize(type.label);for(const [k,v]of Object.entries(type.subtypes??{}))type.subtypes[k]=localize(v);}
let category;try{category=await import('../module/systems/wuxia-consumable-types.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;category={};}
const expectedKeys=['potion','scroll','food','ammo','poison','trinket','essenceCrystal','beastCore'];
async function prepare(current,subtype='humano-inferior'){const previousConfig=globalThis.CONFIG;globalThis.CONFIG={DND5E:{consumableTypes:types,damageTypes:{},dieSteps:[]}};const model={type:{value:current,label:types[current]?.label??'Consumível'},uses:{spent:1,value:9},parent:{type:'consumable',system:{type:{value:current,subtype}}},physicalItemSheetFields:[],_source:{type:{value:current,subtype},quantity:7,uses:{max:'3',spent:1}}},before=structuredClone(model._source),context={source:{damage:{base:{types:[]}}}};try{const body=source.match(/async getSheetData\(context\) \{([\s\S]*?)\r?\n  \}/)[1];await new Function('consumableTypeChoices','ESSENCE_CRYSTAL_TYPE','crystalConsumableDefinition','BEAST_CORE_TYPE','beastCoreConfiguration','beastCoreRealms','return async function(context){'+body+'}')(category.consumableTypeChoices,ESSENCE_CRYSTAL_TYPE,crystalConsumableDefinition,BEAST_CORE_TYPE,beastCoreConfiguration,beastCoreRealms).call(model,context);assert.deepEqual(model._source,before);return context;}finally{if(previousConfig===undefined)delete globalThis.CONFIG;else globalThis.CONFIG=previousConfig;}}
test('consumable details offer the eight Immortals categories with the authored pills and talismans first',async()=>{
 const context=await prepare('potion');assert(context.consumableTypes);assert.deepEqual(Object.keys(context.consumableTypes),expectedKeys);assert.deepEqual(Object.values(context.consumableTypes).map(t=>t.label),['Pílulas e Elixires','Talismãs','Alimentos','Munições','Venenos','Consumíveis Gerais','Cristal de Essência','Núcleo de Besta']);assert.match(template,/choices=consumableTypes\s+labelAttr="label"/);assert.doesNotMatch(template,/choices=CONFIG.consumableTypes/);
});
test('existing legacy or custom category stays selectable without mutating saved item data',async()=>{
 for(const value of ['wand','rod','wondrous','module-powder']){const context=await prepare(value);assert(context.consumableTypes);assert(context.consumableTypes[value]);assert.equal(context.consumableTypes[value].label,types[value]?.label??value);assert.deepEqual(Object.keys(context.consumableTypes),[...expectedKeys,value]);}
});
test('consumable subtype configuration and shared labels survive filtering and no extra types appear for a new item',async()=>{
 const ammo=await prepare('ammo');assert(ammo.consumableTypes);assert.deepEqual(ammo.itemSubtypes,types.ammo.subtypes);const poison=await prepare('poison');assert.deepEqual(poison.itemSubtypes,types.poison.subtypes);assert.deepEqual(Object.keys((await prepare('')).consumableTypes),expectedKeys);const before=structuredClone(types);assert.equal(typeof category.consumableTypeChoices,'function');category.consumableTypeChoices(types,'wand');assert.deepEqual(types,before);
});

test('the shared native category registry still recognizes legacy enchantment restrictions',()=>{
 const body=source.match(/static get itemCategories\(\) \{([\s\S]*?)\r?\n  \}/)[1];const categories=new Function('CONFIG','consumableTypeChoices',body)({DND5E:{consumableTypes:types}},category.consumableTypeChoices);assert.deepEqual(Object.keys(categories),Object.keys(types));for(const key of ['wand','rod','wondrous'])assert(categories[key]);
});


test('crystal type exposes all sixteen classifications and its dedicated reserve settings',async()=>{
 const context=await prepare('essenceCrystal');assert.equal(Object.keys(context.itemSubtypes).length,16);
 assert.equal(context.crystalConsumable.capacity,10);assert.equal(context.crystalConsumable.remaining,9);assert.equal(context.crystalConsumable.spent,1);
 assert.deepEqual(context.parts,['dnd5e.details-consumable']);assert.match(template,/name="system.uses.spent"/);assert.match(template,/name="system.equipped"/);
});

test('beast cores expose fourteen elements and ten realms without crystal PEQ reserve settings',async()=>{const context=await prepare('beastCore','fogo');assert.equal(Object.keys(context.itemSubtypes).length,14);assert.equal(context.beastCoreConsumable.valid,true);assert.equal(context.beastCoreConsumable.definition.id,'fogo');assert.equal(context.beastCoreConsumable.realms.length,10);assert.equal(context.crystalConsumable,null);assert.deepEqual(context.parts,['dnd5e.details-consumable']);assert(template.includes('name="system.beastCore.rank"'));});
