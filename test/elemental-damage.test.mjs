import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../module/systems/elemental-damage.mjs';
const rule=name=>{assert.equal(typeof rules[name],'function',name+' must be exported');return rules[name];};
globalThis.game={settings:{get:()=> '2.0'}};
globalThis.CONFIG={DND5E:{damageTypes:{slashing:{isPhysical:true},fire:{},soul:{}},healingTypes:{healing:{},temphp:{},maximum:{}}}};
globalThis.Hooks={on(){},call:()=>true,callAll(){}};
globalThis.ChatMessage={create:async()=>{},getSpeaker:()=>({})};
globalThis.ui={notifications:{warn(){},info(){}}};
const {applyDamageToActor}=await import('../module/applications/actor/jj/damage-application.mjs');
const source=(abilities={},state={})=>({type:'character',uuid:'Actor.source',flags:{'Immortals-system':{elementalState:state}},system:{elementAbilities:abilities,conceitos:{},cultivation:{rank:1,soulCultivation:0}}});
const applyUpdates=(a,updates)=>{for(const [path,value]of Object.entries(updates)){const keys=path.split('.'),last=keys.pop(),obj=keys.reduce((target,key)=>target[key]??={},a);if(last.startsWith('-='))delete obj[last.slice(2)];else obj[last]=value;}};
const target=(barrier=37)=>{const a=source();a.uuid='Actor.target';a.name='Alvo';a.flags['Immortals-system'].elementalState.barrier={value:barrier,expires:'turnStart',turn:'combat:1:target',source:'madeira.vitalidadeCrescente'};a.system.legacy2={resistances:{},wounds:{value:0,soul:0}};a.system.attributes={hp:{value:100,max:100,effectiveMax:100,temp:0,tempmax:0}};a.system.armorPoints={value:0};a.getFlag=(scope,key)=>a.flags[scope]?.[key];a.updates=[];a.update=async updates=>{a.updates.push(structuredClone(updates));applyUpdates(a,updates);};return a;};

test('custom damage preserves explicit area and contact evidence while targeted Double body damage stays blocked',async()=>{
 const S='Immortals-system',victim=target(0),attacker=source();attacker.system.conceitos={ilusao:{level:1}};victim.system.conceitos={ilusao:{level:5}};
 victim.flags[S].elementalState.illusionDouble={active:true,useId:'copy',sourceTokenUuid:'Scene.s.Token.body'};
 victim.flags[S].elementalProjections={copy:{id:'copy',kind:'illusionDouble',active:true,registered:true,sourceActorUuid:victim.uuid,sourceTokenUuid:'Scene.s.Token.body',actorUuid:'Actor.copy',tokenUuids:['Scene.s.Token.copy']}};
 globalThis.fromUuidSync=uuid=>uuid==='Scene.s.Token.body'?{uuid,actor:victim,flags:{}}:null;
 assert.equal(await applyDamageToActor(victim,10,{damages:[{type:'fire',value:10}],sourceActor:attacker,targetTokenUuid:'Scene.s.Token.body'}),false);
 assert.equal(victim.system.attributes.hp.value,100);
 await applyDamageToActor(victim,10,{damages:[{type:'fire',value:10}],sourceActor:attacker,targetTokenUuid:'Scene.s.Token.body',areaEffect:true});assert.equal(victim.system.attributes.hp.value,90);
 await applyDamageToActor(victim,10,{damages:[{type:'fire',value:10}],sourceActor:attacker,targetTokenUuid:'Scene.s.Token.body',targeted:false});assert.equal(victim.system.attributes.hp.value,80);
 delete globalThis.fromUuidSync;
});

test('paid damage snapshot preserves selected half conversion and flat bonus after live mode changes',()=>{
 const snapshot=rule('elementalDamageSnapshot'),prepare=rule('prepareElementalDamage');
 const a=source({fogo:{qiFlamejante:1},gelo:{frioCongelante:3}},{damageMode:'fogo'});
 const saved=snapshot(a,{isAttack:true});a.system.elementAbilities.fogo.qiFlamejante=3;a.flags['Immortals-system'].elementalState.damageMode='gelo';
 const output=prepare([{type:'slashing',value:9}],a,{isAttack:true,elementMode:'gelo',elementalSnapshot:saved});
 assert.equal(output.filter(part=>part.type==='slashing').reduce((sum,p)=>sum+p.value,0),5);
 assert.equal(output.filter(part=>part.type==='fire').reduce((sum,p)=>sum+p.value,0),6);
 assert.equal(output.some(part=>part.type==='cold'),false);
 assert.deepEqual(prepare([{type:'slashing',value:9}],a,{profile:saved.profile}),output);
});

test('damage helper retains typed receipts and never applies the source bonus twice',()=>{
 const prepare=rule('prepareElementalDamage'),a=source({fogo:{qiFlamejante:3}});
 const input=[{type:'slashing',value:10,properties:new Set(['mgc'])}],before=structuredClone(input);
 const output=prepare(input,a,{isAttack:true});assert.equal(output.reduce((sum,p)=>sum+p.value,0),15);
 assert.deepEqual(prepare(output,a,{isAttack:true}),output);assert.deepEqual(input,before);
});

test('an ordinary or missing source cannot receive a fabricated elemental damage bonus',()=>{
 const prepare=rule('prepareElementalDamage'),input=[{type:'slashing',value:10}];
 for(const a of [undefined,source()])assert.equal(prepare(input,a,{isAttack:true}).reduce((sum,p)=>sum+p.value,0),10);
});

test('finite rolled barrier pool is consumed one for one over successive hits without writing actor state',()=>{
 const absorb=rule('elementalBarrierAbsorption'),a=target(),before=structuredClone(a.flags);
 const first=absorb(a,12);assert.equal(first.absorbed,12);assert.equal(first.remaining,0);assert.equal(first.value,25);
 assert.deepEqual(a.flags,before);assert.equal(a.updates.length,0);applyUpdates(a,first.updates);
 const next=absorb(a,35);assert.equal(next.absorbed,25);assert.equal(next.remaining,10);assert.equal(next.value,0);
 applyUpdates(a,next.updates);assert.deepEqual(absorb(a,8).updates,{});
});

test('mixed typed damage spends the barrier only on ordinary damage and preserves Soul and healing parts',()=>{
 const absorb=rule('elementalBarrierAbsorption'),a=target(18);
 const input=[{type:'fire',value:10},{type:'slashing',value:15},{type:'soul',value:40},{type:'healing',value:10},{type:'temphp',value:5},{type:'maximum',value:2}];
 const before=structuredClone(input),result=absorb(a,input);
 assert.equal(result.absorbed,18);assert.equal(result.remaining,47);assert.equal(result.normalRemaining,7);assert.equal(result.value,0);
 assert.equal(result.parts.find(p=>p.type==='soul').value,40);assert.equal(result.parts.find(p=>p.type==='healing').value,10);assert.deepEqual(input,before);
});

test('direct costs, healing, absent and zero barriers return no resource updates',()=>{
 const absorb=rule('elementalBarrierAbsorption'),a=target(),input=[{type:'fire',value:10}];
 for(const options of [{direct:true},{healing:true}]){const result=absorb(a,input,options);assert.equal(result.absorbed,0);assert.deepEqual(result.updates,{});assert.deepEqual(result.parts,input);}
 assert.deepEqual(absorb(target(0),10).updates,{});assert.deepEqual(absorb(source(),10).updates,{});
 assert.deepEqual(absorb(a,[{type:'soul',value:40}],{ignoreHealing:true}).updates,{});
});

test('barrier typed markers and optional application receipts prevent a second drain',()=>{
 const absorb=rule('elementalBarrierAbsorption'),a=target(20);
 const first=absorb(a,[{type:'fire',value:30}],{receipt:'ChatMessage.hit'});
 const repeated=absorb(a,first.parts,{receipt:'ChatMessage.hit'});assert.equal(repeated.absorbed,0);assert.equal(repeated.remaining,10);assert.deepEqual(repeated.updates,{});
 applyUpdates(a,first.updates);const sameReceipt=absorb(a,30,{receipt:'ChatMessage.hit'});assert.equal(sameReceipt.alreadyApplied,true);assert.equal(sameReceipt.absorbed,0);assert.deepEqual(sameReceipt.updates,{});
});

test('custom damage merges finite barrier and every defense debit into one update in the existing order',async()=>{
 const a=target(15);a.flags['Immortals-system'].explosaoDefensivaPendente={reducao:3};a.flags['Immortals-system'].reducaoDano={valor:2,persistente:false};a.system.armorPoints.value=2;a.system.attributes.hp.temp=3;
 const result=await applyDamageToActor(a,30,{damages:[{type:'slashing',value:30}]});
 assert.equal(a.updates.length,1);assert.equal(a.flags['Immortals-system'].elementalState.barrier.value,0);
 assert.equal(a.system.armorPoints.value,0);assert.equal(a.system.attributes.hp.temp,0);assert.equal(a.system.attributes.hp.value,97);
 assert.equal(result.reducao,5);assert.equal(result.barrier,15);assert.equal(result.armor,4);assert.equal(result.hp,3);
});

test('custom Soul damage bypasses common barrier and armor after its own ward',async()=>{
 const a=target();a.system.cultivation.soulCultivation=3;a.system.armorPoints.value=2;a.system.attributes.hp.temp=3;
 const result=await applyDamageToActor(a,50,{damages:[{type:'soul',value:40},{type:'fire',value:10}]});
 assert.equal(a.updates.length,1);assert.equal(a.flags['Immortals-system'].soulBarrierSpent,30);assert.equal(a.system.legacy2.wounds.soul,10);
 assert.equal(a.flags['Immortals-system'].elementalState.barrier.value,27);assert.equal(a.system.armorPoints.value,2);assert.equal(a.system.attributes.hp.temp,3);assert.equal(result.barrier,10);
});

test('custom outgoing damage uses the rolled profile and preserves already-transformed receipts',async()=>{
 const snapshot=rule('elementalDamageSnapshot'),prepare=rule('prepareElementalDamage');
 const a=source({fogo:{qiFlamejante:1},gelo:{frioCongelante:3}},{damageMode:'fogo'}),saved=snapshot(a,{isAttack:true});
 const rolled=prepare([{type:'slashing',value:9}],a,{elementalSnapshot:saved});a.system.elementAbilities.fogo.qiFlamejante=3;a.flags['Immortals-system'].elementalState.damageMode='gelo';
 const t=target(0);t.system.legacy2.resistances.fire={value:1};
 await applyDamageToActor(t,11,{damages:rolled,sourceActor:a,isAttack:true,elementalSnapshot:saved});
 assert.equal(t.system.attributes.hp.value,90);assert.equal(t.updates.length,1);
});

test('custom direct damage leaves the finite barrier intact',async()=>{
 const a=target();const result=await applyDamageToActor(a,6,{diretoNaVida:true});assert.equal(result.barrier,0);assert.equal(a.system.attributes.hp.value,94);assert.equal(a.flags['Immortals-system'].elementalState.barrier.value,37);assert.equal(a.updates.length,1);
});

test('custom NPC Soul retains its existing armor treatment while bypassing the new common barrier',async()=>{
 const a=target();a.type='npc';a.system.armorPoints.value=2;
 await applyDamageToActor(a,10,{damages:[{type:'soul',value:10}]});
 assert.equal(a.flags['Immortals-system'].elementalState.barrier.value,37);assert.equal(a.system.armorPoints.value,0);assert.equal(a.system.legacy2.wounds.soul,0);
});

test('paid Qi Dilacerador adds final pure damage once, bypasses ordinary resistance and still spends shield and temporary HP',async()=>{const attacker=source(),victim=target(0);victim.system.legacy2.resistances.slashing={value:50};victim.system.armorPoints.value=2;victim.system.attributes.hp.temp=2;const snapshot=rules.elementalDamageSnapshot(attacker,{isAttack:true,attackModifiers:{finalDamageBonus:9}});const prepared=rules.prepareElementalDamage([{type:'slashing',value:20}],attacker,{isAttack:true,elementalSnapshot:snapshot});assert.equal(prepared.reduce((s,p)=>s+p.value,0),29);assert.equal(rules.prepareElementalDamage(prepared,attacker,{isAttack:true,elementalSnapshot:snapshot}).reduce((s,p)=>s+p.value,0),29);const log=await applyDamageToActor(victim,20,{damages:[{type:'slashing',value:20}],sourceActor:attacker,isAttack:true,elementalSnapshot:snapshot});assert.equal(victim.system.armorPoints.value,0);assert.equal(victim.system.attributes.hp.temp,0);assert.equal(victim.system.attributes.hp.value,97);assert.equal(log.hp,3);});

test('simultaneous final damage serializes all HP, barrier and shield writes',async()=>{const victim=target(10);victim.system.armorPoints.value=10;const update=victim.update;victim.update=async changes=>{await new Promise(resolve=>setTimeout(resolve,5));return update(changes);};await Promise.all([applyDamageToActor(victim,30,{damages:[{type:'slashing',value:30}],receipt:'one'}),applyDamageToActor(victim,30,{damages:[{type:'slashing',value:30}],receipt:'two'})]);assert.equal(victim.flags['Immortals-system'].elementalState.barrier.value,0);assert.equal(victim.system.armorPoints.value,0);assert.equal(victim.system.attributes.hp.value,70);});
test('replaying a completed final damage receipt never reapplies the HP loss',async()=>{const victim=target(0);const context={damages:[{type:'slashing',value:20}],receipt:'recorded-damage'};await applyDamageToActor(victim,20,context);await applyDamageToActor(victim,20,context);assert.equal(victim.system.attributes.hp.value,80);assert.equal(victim.updates.length,1);});

test('custom damage spends bubble integrity before recipient resistance in the same final write',async()=>{const victim=target(0);victim.flags['Immortals-system'].elementalConstructs={bubble:{version:1,id:'bubble',kind:'bubble',active:true,hp:{value:25,max:25},expiresAt:null,receipts:[]}};victim.system.legacy2.resistances={fire:{value:10}};await applyDamageToActor(victim,40,{damages:[{type:'fire',value:40}],receipt:'bubble-hit'});assert.equal(victim.system.attributes.hp.value,95);assert.equal(victim.flags['Immortals-system'].elementalConstructs.bubble.hp.value,0);assert.equal(victim.updates.length,1);});

test('Avatar event avoidance cancels damage before shields, temporary HP and finite barrier',async()=>{const victim=target(20);victim.system.armorPoints.value=5;victim.system.attributes.hp.temp=3;victim.flags['Immortals-system'].elementalAvoidedEvents={escape:{originEventId:'ChatMessage.incoming',targetTokenUuid:'Scene.s.Token.self',teleported:true}};await applyDamageToActor(victim,20,{damages:[{type:'slashing',value:20}],sourceEventUuid:'ChatMessage.incoming',targetTokenUuid:'Scene.s.Token.self',receipt:'avoided'});assert.equal(victim.system.attributes.hp.value,100);assert.equal(victim.system.attributes.hp.temp,3);assert.equal(victim.system.armorPoints.value,5);assert.equal(victim.flags['Immortals-system'].elementalState.barrier.value,20);});
test('custom damage cannot cross a shared ice prison in either direction',async()=>{const scope='Immortals-system',owner={uuid:'Actor.jailer',flags:{[scope]:{elementalConstructs:{p:{id:'p',kind:'icePrison',active:true,geometryOnly:true,hp:{value:2000,max:2000},expiresAt:null,targetUuids:['Actor.captive'],blocksExternalAttacks:true,blocksOutgoing:true,receipts:[]}}}}};globalThis.fromUuidSync=id=>id===owner.uuid?owner:null;const captive=target(0);captive.uuid='Actor.captive';captive.flags[scope].elementalConstructRefs={p:{id:'p',kind:'icePrison',ownerActorUuid:owner.uuid,recordId:'p'}};const outside=target(0);outside.uuid='Actor.outside';await applyDamageToActor(captive,30,{damages:[{type:'fire',value:30}],sourceActor:outside});assert.equal(captive.system.attributes.hp.value,100);await applyDamageToActor(outside,30,{damages:[{type:'fire',value:30}],sourceActor:captive});assert.equal(outside.system.attributes.hp.value,100);});
