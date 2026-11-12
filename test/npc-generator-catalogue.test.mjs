import assert from 'node:assert/strict';import {test} from 'node:test';
const api=()=>import('../module/systems/npc-generator-catalogue.mjs');
test('equipment folders follow actual damage instead of misleading labels',async()=>{const {npcGeneratorEquipmentFolder:folder}=await api();
 assert.equal(folder({type:'weapon',name:'Arma de Fogo',system:{activities:{a:{type:'attack',damage:{parts:[{types:['piercing']}]}}}}}),'base');
 assert.equal(folder({type:'weapon',name:'Punho',system:{activities:{a:{type:'attack',damage:{parts:[{types:['fire']}]}}}}}),'fire');
 assert.equal(folder({type:'weapon',flags:{'Immortals-system':{elemento:'void'}}}),'void');
 assert.equal(folder({type:'equipment',system:{type:{value:'heavy'}}}),'armor');
 assert.equal(folder({type:'weapon',system:{activities:{a:{type:'heal',damage:{parts:[{types:['fire']}]}}}}}),'base');
});
test('catalogue filtering ignores accents and preserves independent source and folder filters',async()=>{const {npcGeneratorEquipmentMatches:matches}=await api();const entry={name:'Mordida Cáustica',pack:'Equipamentos de PdN',folder:'acid'};assert(matches(entry,{query:'caustica',folder:'acid',source:'Equipamentos de PdN'}));assert(!matches(entry,{query:'caustica',folder:'fire',source:''}));assert(matches(entry,{query:'mordida',folder:'all',source:''}));assert(!matches(entry,{query:'mordida',folder:'all',source:'Mundo'}));});

test('native world ActivityCollections classify elemental activity damage correctly',async()=>{const {npcGeneratorEquipmentFolder:folder}=await api();const activity={type:'attack',damage:{parts:[{types:new Set(['fire'])}]}};assert.equal(folder({type:'weapon',system:{activities:new Map([['attack',activity]])}}),'fire');});
