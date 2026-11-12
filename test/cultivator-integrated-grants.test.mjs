import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cultivatorClassData,ensureCultivatorClass} from '../module/systems/wuxia-character.mjs';
import {cultivatorFeatureDocuments} from '../module/systems/cultivator-content.mjs';
const scope='Immortals-system',oldGrant='c0171a7a00000001';
globalThis.game={user:{id:'gm',isGM:true},settings:{get:(_s,key)=>key==='rulesetVersion'?'2.0':false}};
function assign(object,path,value){const keys=path.split('.'),key=keys.pop(),parent=keys.reduce((o,k)=>o[k]??={},object);if(key.startsWith('-='))delete parent[key.slice(2)];else parent[key]=structuredClone(value);}
function fixture(){const cls={...cultivatorClassData(),id:'class'},deleted=[],writes=[];cls.flags[scope].cultivatorVersion=2;cls.system.levels=8;cls.flags[scope].legacy2.atributoPrincipal='dex';cls.system.advancement={[oldGrant]:{_id:oldGrant,type:'ItemGrant',configuration:{items:[{uuid:'Compendium.Immortals-system.geral.Item.c0171a7100000001'}]},value:{added:{'auto-resource':'Compendium.Immortals-system.geral.Item.c0171a7100000001'}}},choice:{_id:'choice',type:'ItemChoice',value:{added:{chosen:'Item.manual'}},configuration:{choices:2}}};cls.update=async data=>{writes.push(data);for(const [path,value]of Object.entries(data))assign(cls,path,value);};
 const actor={id:'actor',type:'character',isOwner:true,flags:{},items:[cls],itemTypes:{class:[cls]},system:{details:{level:8},cultivation:{rank:5,bodyCultivation:8,soulCultivation:9},elementAbilities:{}},getFlag(){},async deleteEmbeddedDocuments(type,ids){assert.equal(type,'Item');deleted.push(...ids);this.items=this.items.filter(item=>!ids.includes(item.id));},async createEmbeddedDocuments(){assert.fail('integrated progression must not create feature Items');}};
 return {actor,cls,deleted,writes};}

test('opening a Cultivator migrates only automatic rule grants and never recreates progression feats',async()=>{
 const f=fixture(),base=cultivatorFeatureDocuments()[0];f.actor.items.push({...base,id:'auto-resource',flags:{[scope]:{...base.flags[scope],advancementOrigin:'class.'+oldGrant}}},{id:'body-auto',type:'feat',flags:{[scope]:{cultivatorFeature:'body-4',bodyPath:true,bodyPathManaged:true}}},{id:'soul-auto',type:'feat',flags:{[scope]:{cultivatorFeature:'soul-4',soulPath:true,soulPathManaged:true}}},{id:'rank-auto',type:'feat',flags:{[scope]:{cultivatorFeature:'rank-4',cultivatorRank:4,cultivationRankManaged:true}}},{...base,id:'manual-resource'},{id:'chosen',type:'feat',flags:{[scope]:{cultivatorFeature:'body-4',advancementOrigin:'class.choice'}}},{id:'manual-effects',type:'feat',flags:{}});
 await ensureCultivatorClass(f.actor);assert.deepEqual(new Set(f.deleted),new Set(['auto-resource','body-auto','soul-auto','rank-auto']));assert(f.actor.items.some(i=>i.id==='manual-resource'));assert(f.actor.items.some(i=>i.id==='chosen'));assert(f.actor.items.some(i=>i.id==='manual-effects'));assert.equal(f.cls.system.advancement[oldGrant],undefined);assert.deepEqual(f.cls.system.advancement.choice.value,{added:{chosen:'Item.manual'}});assert.equal(f.cls.system.levels,8);assert.equal(f.cls.flags[scope].legacy2.atributoPrincipal,'dex');
 const count=f.writes.length;await ensureCultivatorClass(f.actor);assert.equal(f.writes.length,count);assert.equal(f.deleted.length,4);
});

test('a customized legacy ItemGrant keeps its external choice while only the integrated entries are retired',async()=>{
 const f=fixture();f.cls.system.advancement[oldGrant].configuration.items.push({uuid:'Item.manual',optional:true});f.cls.system.advancement[oldGrant].value.added.custom='Item.manual';await ensureCultivatorClass(f.actor);const grant=f.cls.system.advancement[oldGrant];assert.deepEqual(grant.configuration.items,[{uuid:'Item.manual',optional:true}]);assert.deepEqual(grant.value.added,{custom:'Item.manual'});
});

test('manual classes and actors outside the owned world boundary are not stripped',async()=>{
 for(const patch of [{isOwner:false},{pack:'world.actors'},{compendium:{}}]){const f=fixture();Object.assign(f.actor,patch);await ensureCultivatorClass(f.actor);assert.deepEqual(f.deleted,[]);assert.deepEqual(f.writes,[]);}
 const f=fixture();delete f.cls.flags[scope].cultivator;await ensureCultivatorClass(f.actor);assert(f.cls.system.advancement[oldGrant]);assert.deepEqual(f.deleted,[]);
});

test('external grant history survives even when its custom configured entry was removed',async()=>{
 const f=fixture();f.cls.system.advancement[oldGrant].value.added.custom='Item.manual';await ensureCultivatorClass(f.actor);
 assert.deepEqual(f.cls.system.advancement[oldGrant].configuration.items,[]);assert.deepEqual(f.cls.system.advancement[oldGrant].value.added,{custom:'Item.manual'});
});
test('a failed automatic-item deletion retains provenance for a safe retry',async()=>{
 const f=fixture(),base=cultivatorFeatureDocuments()[0];f.actor.items.push({...base,id:'auto-resource',flags:{[scope]:{...base.flags[scope],advancementOrigin:'class.'+oldGrant}}});
 const remove=f.actor.deleteEmbeddedDocuments;f.actor.deleteEmbeddedDocuments=async()=>{throw Error('native delete failed');};await assert.rejects(()=>ensureCultivatorClass(f.actor),/native delete failed/);assert(f.cls.system.advancement[oldGrant]);assert.equal(f.writes.length,0);
 f.actor.deleteEmbeddedDocuments=remove;await ensureCultivatorClass(f.actor);assert(!f.actor.items.some(i=>i.id==='auto-resource'));assert.equal(f.cls.system.advancement[oldGrant],undefined);
});
