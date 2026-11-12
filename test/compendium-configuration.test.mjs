import assert from 'node:assert/strict';
import {test} from 'node:test';

test('simultaneous stock publishers preserve the global pack configuration and native write permissions',async()=>{
 const {ensureAlchemyMaterialArtwork}=await import('../module/systems/alchemy-material-artwork.mjs');
 const {ensureNpcEquipmentCompendium}=await import('../module/systems/npc-equipment-compendium.mjs');
 let config={},active=0,maxActive=0,firstStarted,release;const started=new Promise(resolve=>{firstStarted=resolve;});const gate=new Promise(resolve=>{release=resolve;});
 const packs=new Map();
 const makePack=(collection,items)=>{config[collection]={locked:true};const pack={collection,documentName:'Item',folders:[],get locked(){return config[collection].locked;},async getIndex(){return items;},async getDocuments(){return items;},async configure(change){const snapshot=structuredClone(config);active++;maxActive=Math.max(maxActive,active);firstStarted();await gate;snapshot[collection]={...snapshot[collection],...change};config=snapshot;active--;}};packs.set(collection,pack);return pack;};
 const material={_id:'material00000001',type:'loot',img:'old.webp',system:{type:{value:'material'}},flags:{'Immortals-system':{alchemyMaterial:{element:'fogo',level:1}}}};
 const weapon={_id:'weapon0000000001',type:'weapon',img:'old.webp'};
 const a=makePack('Immortals-system.materiais',[material]),b=makePack('Immortals-system.equipamentos-pdn',[weapon]);
 const game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},packs};
 const Item={async updateDocuments(rows,{pack}){assert.equal(packs.get(pack).locked,false,'publisher lost its native write permission');const target=pack===a.collection?material:weapon;Object.assign(target,rows[0]);}};
 const work=Promise.allSettled([ensureAlchemyMaterialArtwork({game,Item,load:async()=>({entries:[{_id:material._id,img:'systems/Immortals-system/assets/wuxia/materiais-pintados-v1/fogo/'+material._id+'.webp'}]})}),ensureNpcEquipmentCompendium({game,Item,load:async()=>[{...weapon,img:'new-weapon.webp'}]})]);
 await started;await new Promise(setImmediate);release();const results=await work;
 assert.equal(maxActive,1,'native configure calls must not overlap because each writes a global snapshot');
 assert(results.every(r=>r.status==='fulfilled'),JSON.stringify(results));assert.equal(a.locked,true);assert.equal(b.locked,true);assert.notEqual(material.img,'old.webp');assert.equal(weapon.img,'new-weapon.webp');
});

test('a rejected native configuration does not block the next queued pack',async()=>{const {configureCompendium}=await import('../module/systems/compendium-configuration.mjs');const bad={async configure(){throw Error('unavailable');}},good={async configure(change){return change;}};const a=configureCompendium(bad,{locked:false}),b=configureCompendium(good,{locked:true});await assert.rejects(a,/unavailable/);assert.deepEqual(await b,{locked:true});});
