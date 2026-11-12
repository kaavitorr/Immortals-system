import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createBeastEssenceDeathController,prepareBeastEssenceCaptureContext} from '../module/systems/beast-essence-death.mjs';
const SCOPE='Immortals-system';
function actor(id,type='npc') {
 const a={id,uuid:'Actor.'+id,name:id,type,isOwner:true,items:[],flags:{[SCOPE]:{cultivationRank:2}},statuses:new Set(),system:{attributes:{hp:{value:10}},abilities:{str:{value:5}},cultivation:{rank:2,stage:1},legacy2:{nd:4}},writes:[],
 async update(patch){for(const [key,value]of Object.entries(patch)){const parts=key.split('.');let target=this;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=structuredClone(value);}return this;},
 async createEmbeddedDocuments(type,rows,options){assert.equal(type,'Item');this.writes.push({rows:structuredClone(rows),options});return rows.map(data=>{const item={...structuredClone(data),id:'loot'+this.items.length,uuid:this.uuid+'.Item.loot'+this.items.length};this.items.push(item);return item;});}};
 return a;
}
function harness(review){const source=actor('besta'),player=actor('jogador','character'),gm={id:'gm',isGM:true},world=[],info=[],errors=[];const game={user:gm,users:{activeGM:gm},actors:[source,player],items:world,folders:[]};const controller=createBeastEssenceDeathController({game,makeId:()=> 'death1',dialog:(snapshot,session)=>review({snapshot,session,source,player,game}),ensureCoreFolder:async()=>({id:'cores'}),ensureFolder:async()=>({id:'essences'}),createItem:async data=>{const item={...structuredClone(data),id:'world'+world.length,uuid:'Item.world'+world.length};world.push(item);return item;},notify:message=>errors.push(message),notifySuccess:message=>info.push(message)});return {source,player,game,world,info,errors,controller,async die(){controller.seed([source]);source.system.attributes.hp.value=0;await controller.observe(source);await controller.drain();}};}
const essence=(recipient)=>({mode:'manual',recipient,sourceRealm:2,selection:{growth:'human',ability:'str',elements:[]}});

test('reviewed core and essence enter the defeated creature inventory by default, including an unlinked token',async()=>{
 const h=harness(async({session,source})=>{assert.equal(session.defaultRecipient,source.uuid);await Promise.all([session.createCore({elementId:'fogo',rank:2}),session.createCore({elementId:'fogo',rank:2})]);return essence();});h.source.uuid='Scene.scene.Token.token.Actor.besta';await h.die();
 assert.deepEqual(h.errors,[]);assert.equal(h.world.length,0);assert.equal(h.source.items.length,2);assert.equal(h.player.items.length,0);
 const [core,spirit]=h.source.items;assert.equal(core.system.type.value,'beastCore');assert.equal(spirit.flags[SCOPE].beastEssenceItem.definition.sourceActorUuid,h.source.uuid);
 for(const item of h.source.items){assert.equal(item.system.quantity,1);assert.equal(item.folder,undefined);assert.equal(item.ownership,undefined);}
 const record=h.source.flags[SCOPE].beastEssenceDeath;assert.equal(record.core.itemUuid,core.uuid);assert.equal(record.core.recipientActorUuid,h.source.uuid);assert.equal(record.itemUuid,spirit.uuid);assert.equal(record.recipientActorUuid,h.source.uuid);
 await h.controller.observe(h.source);assert.equal(h.source.items.length,2);
});

test('choosing a player delivers both physical items directly without integrating the essence or duplicating world items',async()=>{
 const h=harness(async({session,player})=>{await session.createCore({elementId:'agua',rank:2,recipient:player.uuid});return essence(player.uuid);});await h.die();assert.deepEqual(h.errors,[]);assert.equal(h.player.items.length,2);assert.equal(h.source.items.length,0);assert.equal(h.world.length,0);
 assert.equal(h.player.flags[SCOPE].beastEssence,undefined);assert.equal(h.player.system.cultivation.rank,2);assert.equal(h.source.flags[SCOPE].beastEssenceDeath.recipientActorUuid,h.player.uuid);assert.equal(h.info.length,2);assert(h.info.every(message=>message.includes('jogador')));
});

test('explicit world-item delivery keeps the separate loot folders and private ownership',async()=>{
 const h=harness(async({session})=>{await session.createCore({elementId:'neutro',rank:2,recipient:'world'});return essence('world');});await h.die();assert.deepEqual(h.errors,[]);assert.equal(h.source.items.length,0);assert.equal(h.world.length,2);assert.deepEqual(h.world.map(item=>item.folder),['cores','essences']);assert(h.world.every(item=>item.ownership.default===0));
});

test('deleted or inaccessible selected inventories abort delivery instead of silently creating world items',async()=>{
 for(const kind of ['deleted','permission']){const h=harness(async({session,player,game})=>{if(kind==='deleted')game.actors=[h.source];else player.isOwner=false;await assert.rejects(session.createCore({elementId:'metal',rank:2,recipient:player.uuid}),/destino|inventário|permiss/i);return essence(player.uuid);});await h.die();assert.equal(h.world.length,0);assert.equal(h.source.items.length,0);assert.equal(h.player.items.length,0);assert.match(h.errors[0],/destino|inventário|permiss/i);}
});

test('receipts recover already delivered items after a transfer and never mint another core or essence',async()=>{
 const h=harness(async({session,source,player})=>{const episode=session.record().episode;player.items.push({id:'existingCore',uuid:player.uuid+'.Item.existingCore',name:'Núcleo anterior',system:{type:{subtype:'fogo'},beastCore:{rank:4}},flags:{[SCOPE]:{beastCore:{source:{deathEpisode:episode}}}}},{id:'existingEssence',uuid:player.uuid+'.Item.existingEssence',name:'Essência anterior',flags:{[SCOPE]:{beastEssenceItem:{definition:{id:episode}}}}});const record=source.flags[SCOPE].beastEssenceDeath;record.core={status:'creating'};await session.createCore({elementId:'terra',rank:2});return essence();});await h.die();assert.deepEqual(h.errors,[]);assert.equal(h.world.length,0);assert.equal(h.source.items.length,0);assert.equal(h.player.items.length,2);const receipt=h.source.flags[SCOPE].beastEssenceDeath;assert.equal(receipt.core.itemUuid,h.player.items[0].uuid);assert.equal(receipt.core.name,'Núcleo anterior');assert.equal(receipt.core.elementId,'fogo');assert.equal(receipt.core.rank,4);assert.equal(receipt.itemUuid,h.player.items[1].uuid);assert.equal(receipt.recipientActorUuid,h.player.uuid);
});

test('review lists the creature and accessible characters and preserves the chosen inventory between actions',async()=>{
 const h=harness(async({snapshot,session,source,player})=>{const initial=prepareBeastEssenceCaptureContext(snapshot,session);assert.equal(initial.recipients.find(value=>value.selected).value,source.uuid);const next=prepareBeastEssenceCaptureContext(snapshot,session,{recipient:player.uuid});assert.equal(next.recipients.find(value=>value.selected).value,player.uuid);assert(next.recipients.some(value=>value.value==='world'));await session.createCore({elementId:'luz',rank:2,recipient:player.uuid});const done=prepareBeastEssenceCaptureContext(snapshot,session,{recipient:player.uuid});assert.equal(done.core.destination,'Inventário de jogador');return null;});await h.die();assert.deepEqual(h.errors,[]);assert.equal(h.player.items.length,1);
});

test('a failed native inventory write is reported and never marked as delivered',async()=>{
 const h=harness(async({player})=>essence(player.uuid));h.player.createEmbeddedDocuments=async()=>{throw Error('Falha ao criar item no inventário');};await h.die();assert.equal(h.world.length,0);assert.equal(h.player.items.length,0);assert.equal(h.source.flags[SCOPE].beastEssenceDeath.status,'failed');assert.match(h.errors[0],/Falha ao criar/);
});
