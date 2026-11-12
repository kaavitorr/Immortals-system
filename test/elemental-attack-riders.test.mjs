import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as riders from '../module/systems/elemental-attack-riders.mjs';
const required=name=>{assert.equal(typeof riders[name],'function',name+' must be exported');return riders[name];};
globalThis.game={user:{isGM:false,targets:new Set()},settings:{get:(scope,key)=>key==='rulesetVersion'?'2.0':false},messages:new Map()};
globalThis.Hooks={on(){},once(){},call:()=>true,callAll(){}};
globalThis.foundry={dice:{terms:{}}};
globalThis.CONST={ACTIVE_EFFECT_MODES:{ADD:2,OVERRIDE:5,MULTIPLY:1}};
globalThis.CONFIG={statusEffects:{'jj-sangramento':{id:'jj-sangramento',name:'Sangramento'},'jj-hipotermico':{id:'jj-hipotermico',name:'Hipotérmico'},'jj-congelando':{id:'jj-congelando',name:'Congelando'}},DND5E:{abilities:{str:{label:'Força'},con:{label:'Constituição'}},damageTypes:{lightning:{},fire:{}},healingTypes:{healing:{},temphp:{},maximum:{}}}};
globalThis.ChatMessage={create:async()=>{},getSpeaker:()=>({})};globalThis.ui={notifications:{warn(){},info(){}}};
const documents=new Map();globalThis.fromUuidSync=uuid=>documents.get(uuid);
const applyUpdates=(a,updates)=>{for(const[path,value]of Object.entries(updates)){const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((v,k)=>v[k]??={},a);if(last.startsWith('-='))delete parent[last.slice(2)];else parent[last]=value;}};
let counter=0;
function actor(abilities={}){const id='rider'+(++counter),a={id,uuid:'Actor.'+id,type:'character',name:id,isOwner:true,flags:{'Immortals-system':{elementalState:{}}},items:[],itemTypes:{class:[],feat:[],race:[]},effects:[],statuses:new Set(),system:{elementAbilities:abilities,conceitos:{vento:{level:8}},cultivation:{rank:1,soulCultivation:0},abilities:{str:{value:5},con:{value:4}},attributes:{hp:{value:100,max:100,effectiveMax:100,temp:0,tempmax:0}},armorPoints:{value:0},legacy2:{resistances:{},wounds:{value:0,soul:0},actions:{value:6,max:6}},energy:{generated:10,total:100}},updates:[],saves:[],saveTotal:1};
 a.getFlag=(scope,key)=>a.flags[scope]?.[key];a.update=async updates=>{a.updates.push(structuredClone(updates));applyUpdates(a,updates);};
 a.rollSavingThrow=async config=>{a.saves.push(structuredClone(config));return[{total:a.saveTotal}];};
 a.createEmbeddedDocuments=async(type,data)=>data.map(entry=>{const effect={...structuredClone(entry),id:'effect'+a.effects.length,statuses:new Set(entry.statuses),getFlag:(scope,key)=>effect.flags?.[scope]?.[key],update:async changes=>applyUpdates(effect,changes)};a.effects.push(effect);for(const status of effect.statuses)a.statuses.add(status);return effect;});documents.set(a.uuid,a);return a;}
const activity=(source,technique=false)=>({id:'ability',type:'attack',item:{id:'item',actor:source,type:technique?'spell':'weapon'},attack:{type:{classification:technique?'spell':'weapon'}},damage:{parts:[{types:new Set(['slashing'])}]}});
const roll=(natural=18,critical=false)=>({total:24,isCritical:critical,dice:[{faces:20,results:[{result:natural,active:true}]}]});
const context=(target,key='ChatMessage.attack')=>({attackKey:key,targets:[{actor:target,isEnemy:true,isMiss:false}]});
const state=a=>a.flags['Immortals-system'].elementalState;

test('Geada uses its raw-die thresholds, works on misses and caps each learned tier',async()=>{
 const apply=required('applyElementalAttackRiders');
 for(const[tier,threshold,cap]of [[1,18,3],[2,16,4],[3,12,5]]){
  const source=actor({gelo:{geada:tier}}),target=actor();
  await apply(activity(source),[roll(threshold-1)],context(target,'low'));assert.equal(state(target).geada,undefined);
  for(let i=0;i<cap+2;i++)await apply(activity(source),[roll(threshold)],{...context(target,'hit'+i),targets:[{actor:target,isEnemy:true,isMiss:true}]});
  assert.equal(state(target).geada.stacks,cap);
  await apply(activity(source),[roll(threshold)],context(target,'hit0'));assert.equal(state(target).geada.stacks,cap);
 }
});

test('Geada penalizes attacks and Agility/Reflexo saves only, and removal spends refined Qi atomically',async()=>{
 const apply=required('applyElementalAttackRiders'),remove=required('removeElementalFrost');const source=actor({gelo:{geada:3}}),target=actor();
 for(let i=0;i<4;i++)await apply(activity(source),[roll(12)],context(target,'frost'+i));
 const {conditionRollAdvantages}=await import('../module/systems/legacy2-condition-rolls.mjs');
 assert.equal(conditionRollAdvantages(target,{kind:'attack'}).desvantagens,4);assert.equal(conditionRollAdvantages(target,{kind:'save',ability:'dex'}).desvantagens,4);
 assert.equal(conditionRollAdvantages(target,{kind:'save',ability:'reflexo'}).desvantagens,4);assert.equal(conditionRollAdvantages(target,{kind:'check',ability:'dex'}).desvantagens,0);assert.equal(conditionRollAdvantages(target,{kind:'save',ability:'con'}).desvantagens,0);
 target.updates=[];const removed=await remove(target,2);assert.equal(removed.removed,2);assert.equal(target.system.energy.generated,8);assert.equal(state(target).geada.stacks,2);assert.equal(target.updates.length,1);
 target.system.energy.generated=0;const before=structuredClone(target.flags);await assert.rejects(()=>remove(target,1),/Qi/);assert.deepEqual(target.flags,before);
});

test('Qi Afiado uses actual or effective criticals and failed Fortitude saves, with one/five/eight bleed caps',async()=>{
 const apply=required('applyElementalAttackRiders');
 for(const[tier,cap]of [[1,1],[2,5],[3,8]]){const source=actor({metal:{qiAfiado:tier}}),target=actor();
  for(let i=0;i<cap+1;i++)await apply(activity(source),[roll(13)],{...context(target,'bleed'+i),isCritical:true});
  assert.equal(state(target).bleeding.stacks,cap);assert(target.statuses.has('jj-sangramento'));assert.equal(target.saves[0].ability,'str');assert.equal(target.saves[0].target,15);
 }
 const source=actor({metal:{qiAfiado:3}}),target=actor();target.saveTotal=20;await apply(activity(source),[roll(20,true)],context(target));assert.equal(state(target).bleeding,undefined);
});

test('Frio Congelante requires a technique critical and its perfect condition save gains three DC',async()=>{
 const apply=required('applyElementalAttackRiders'),source=actor({gelo:{frioCongelante:3}}),target=actor();
 await apply(activity(source),[roll(20,true)],context(target,'weapon'));assert.equal(target.effects.length,0);
 await apply(activity(source,true),[roll(13)],{...context(target,'technique'),isCritical:true});assert(target.statuses.has('jj-congelando'));assert(target.statuses.has('jj-lento'));assert.equal(state(target).freezing.primary,5);assert.equal(state(target).freezing.remainingTurns,1);assert.equal(target.effects[0].duration.expiry,'targetEnd');assert(target.effects[0].changes.some(c=>c.key==='system.attributes.movement.walk'&&Number(c.value)===-10));assert.equal(target.saves[0].ability,'con');assert.equal(target.saves[0].target,18);
 const lower=actor({gelo:{frioCongelante:2}}),second=actor();await apply(activity(lower,true),[roll(20,true)],context(second,'lower'));assert(second.statuses.has('jj-hipotermico'));assert.equal(second.saves[0].target,15);
});

test('Punição applies typed miss damage once and never repeats its already-shared on-hit bonus',async()=>{
 const apply=required('applyElementalAttackRiders');
 for(const[tier,want]of [[1,98],[2,95],[3,95]]){const source=actor({relampago:{punicaoTrovao:tier},fogo:{qiFlamejante:3}}),target=actor(),ctx={...context(target,'miss'),targets:[{actor:target,isEnemy:true,isMiss:true}]};
  await apply(activity(source),[roll(2)],ctx);assert.equal(target.system.attributes.hp.value,want);await apply(activity(source),[roll(2)],ctx);assert.equal(target.system.attributes.hp.value,want);
 }
 const source=actor({relampago:{punicaoTrovao:3}}),target=actor();await apply(activity(source),[roll(15)],context(target,'hit'));assert.equal(target.system.attributes.hp.value,100);
});

test('remaining Wind clones decrease only on a recorded successful incoming attack',async()=>{
 const apply=required('applyElementalAttackRiders'),source=actor(),target=actor({vento:{controleVento:1}});state(target).windClones={remaining:3,maximumArmorClass:30};
 await apply(activity(source),[roll(10)],context(target,'hit'));assert.equal(state(target).windClones.remaining,2);
 await apply(activity(source),[roll(10)],context(target,'hit'));assert.equal(state(target).windClones.remaining,2);
 await apply(activity(source),[roll(2)],{...context(target,'miss'),targets:[{actor:target,isMiss:true}]});assert.equal(state(target).windClones.remaining,2);
 const result=await apply(activity(source),[roll(2)],{...context(target,'unknown'),targets:[{actor:target}]});assert.equal(state(target).windClones.remaining,2);assert(result.pending.some(row=>row.rider==='windClones'&&row.reason==='unknownOutcome'));
});

test('unknown outcomes, missing stable identities and missing permissions return manual descriptors without guessing',async()=>{
 const apply=required('applyElementalAttackRiders'),source=actor({metal:{qiAfiado:1},gelo:{frioCongelante:1},relampago:{punicaoTrovao:1}}),target=actor();
 let result=await apply(activity(source,true),[roll(20,true)],{attackKey:'known',targets:[{actor:target,isEnemy:true}]});assert.equal(target.effects.length,0);assert.equal(target.system.attributes.hp.value,100);assert(result.pending.some(row=>row.reason==='unknownOutcome'));
 result=await apply(activity(source),[roll(20,true)],{targets:[{actor:target,isEnemy:true,isMiss:false}]});assert(result.pending.some(row=>row.reason==='missingAttackIdentity'));
 target.isOwner=false;result=await apply(activity(source),[roll(20,true)],context(target));assert(result.pending.some(row=>row.reason==='permission'));assert.equal(target.effects.length,0);
});

test('Geada requires known enemy identity but not a hit outcome',async()=>{
 const apply=required('applyElementalAttackRiders'),source=actor({gelo:{geada:1}}),target=actor();
 const pending=await apply(activity(source),[roll(18)],{attackKey:'enemyUnknown',targets:[{actor:target,isMiss:false}]});assert.equal(state(target).geada,undefined);assert(pending.pending.some(row=>row.reason==='unknownEnemy'));
 await apply(activity(source),[roll(18)],{attackKey:'enemyKnown',targets:[{actor:target,isEnemy:true}]});assert.equal(state(target).geada.stacks,1);
});

test('persisted receipts and concurrent repeats prevent repeated stacks, saves and damage',async()=>{
 const apply=required('applyElementalAttackRiders'),source=actor({gelo:{geada:1},metal:{qiAfiado:2}}),target=actor(),ctx=context(target,'ChatMessage.same');
 await Promise.all([apply(activity(source),[roll(18,true)],ctx),apply(activity(source),[roll(18,true)],ctx)]);assert.equal(state(target).geada.stacks,1);assert.equal(state(target).bleeding.stacks,1);assert.equal(target.saves.length,1);
 await apply(activity(source),[JSON.parse(JSON.stringify(roll(18,true)))],ctx);assert.equal(state(target).geada.stacks,1);assert.equal(target.saves.length,1);
});

test('a missing canonical freezing status is reported for manual completion instead of guessed',async()=>{
 const apply=required('applyElementalAttackRiders'),source=actor({gelo:{frioCongelante:3}}),target=actor(),saved=CONFIG.statusEffects['jj-congelando'];delete CONFIG.statusEffects['jj-congelando'];
 try{const result=await apply(activity(source,true),[roll(20,true)],context(target));assert(result.pending.some(row=>row.reason==='missingCondition'));assert.equal(target.effects.length,0);}finally{CONFIG.statusEffects['jj-congelando']=saved;}
});

test('the awaited native callback uses recorded targets rather than a later current target selection',async()=>{
 const source=actor({gelo:{geada:1}}),target=actor(),decoy=actor();decoy.system.attributes.ac={value:100};game.user.targets=new Set([{actor:decoy}]);
 const r=roll(18);r.parent={uuid:'ChatMessage.native',system:{evaluatedTargets:[{actor:target,isEnemy:true,isMiss:false,ac:10}]}};
 const {postJJAttackRoll}=await import('../module/applications/actor/jj/native-cards.mjs');const result=await postJJAttackRoll(activity(source),[r]);
 assert.equal(state(target).geada?.stacks,1);assert.equal(state(decoy).geada,undefined);assert.equal(result.applied[0].rider,'geada');game.user.targets=new Set();
});

test('native Geada reads the remaining active d20 rather than a superseded reroll result',async()=>{
 const source=actor({gelo:{geada:1}}),target=actor(),r=roll(2);
 r.dice[0].results=[{result:20,rerolled:true},{result:2,active:true}];r.parent={uuid:'ChatMessage.rerolled',system:{evaluatedTargets:[{actor:target,isEnemy:true,isMiss:false,ac:10}]}};
 const {postJJAttackRoll}=await import('../module/applications/actor/jj/native-cards.mjs');await postJJAttackRoll(activity(source),[r]);assert.equal(state(target).geada,undefined);
});

test('recorded per-target criticals cannot bleed another target or an unbought Chasing critical',async()=>{const source=actor({metal:{qiAfiado:1}}),one=actor(),two=actor();const r=roll(20,true);const message={uuid:'ChatMessage.chasing',flags:{['Immortals-system']:{elementalAttack:{automaticHit:true,criticalOnly:false}}},system:{evaluatedTargets:[{actor:one,isEnemy:true,isMiss:false,isCritical:false,ac:12}]}};await riders.applyElementalAttackRiders(activity(source),[r],{message});assert.equal(one.effects.length,0);await riders.applyElementalAttackRiders(activity(source),[roll(15)],{attackKey:'per-target',targets:[{actor:one,isEnemy:true,isMiss:false,isCritical:true,ac:10},{actor:two,isEnemy:true,isMiss:false,isCritical:false,ac:20}]});assert.equal(one.effects.length,1);assert.equal(two.effects.length,0);});

test('elemental bleeding never overwrites an independently acquired bleeding effect origin',async()=>{const source=actor({metal:{qiAfiado:2}}),target=actor(),foreign={id:'foreign',origin:'Item.other',statuses:new Set(['jj-sangramento']),async update(changes){Object.assign(this,changes);}};target.effects.push(foreign);target.statuses.add('jj-sangramento');await riders.applyElementalAttackRiders(activity(source),[roll(20,true)],context(target,'new-bleed'));assert.equal(foreign.origin,'Item.other');assert.equal(foreign.flags,undefined);assert.equal(target.effects.filter(e=>e.flags?.['Immortals-system']?.elementalBleeding).length,1);});

test('reaction riders on a spatial copy never frost or consume clones on the original body',async()=>{const source=actor({gelo:{geada:3}}),target=actor({vento:{controleVento:1}});state(target).windClones={remaining:3};const token={uuid:'Scene.s.Token.copy',actor:target,flags:{'Immortals-system':{elementalProjection:{id:'copy',sourceActorUuid:target.uuid,kind:'overlappingSpace'}}}};target.flags['Immortals-system'].elementalProjections={copy:{id:'copy',active:true,kind:'overlappingSpace',tokenUuids:[token.uuid]}};documents.set(token.uuid,token);const message={uuid:'ChatMessage.copyReaction',getAssociatedActivity:()=>({activation:{type:'reaction'}}),system:{evaluatedTargets:[{actor:target,token:token.uuid,isEnemy:true,isMiss:false}]}};const r=await riders.applyElementalAttackRiders(activity(source),[roll(20,true)],{message});assert.equal(state(target).geada,undefined);assert.equal(state(target).windClones.remaining,3);assert.equal(target.updates.length,0);assert.equal(r.pending.length,0);});
test('a deferred rider keeps its accepted tier, DC and primary after source upgrades',async()=>{assert.equal(typeof riders.elementalRiderSnapshot,'function');const source=actor({metal:{qiAfiado:1},gelo:{frioCongelante:3}}),target=actor(),a=activity(source,true),snapshot=riders.elementalRiderSnapshot(a,{criticalMargin:10});source.system.elementAbilities.metal.qiAfiado=3;source.system.abilities.str.value=20;const message={uuid:'ChatMessage.snapshotRiders',type:'attack',flags:{'Immortals-system':{elementalSnapshot:{riders:snapshot}}},system:{evaluatedTargets:[{actor:target,isEnemy:true,isMiss:false,ac:12}]}};await riders.applyElementalAttackRiders(a,[{...roll(15),total:22}],{message});assert.equal(state(target).bleeding.primary,5);assert.equal(state(target).bleeding.maximum,1);assert.equal(state(target).freezing.primary,5);assert.equal(target.saves[0].target,15);assert.equal(target.saves[1].target,18);});

test('canceled Punishment damage stays pending and can resume on a final native receipt',async()=>{const source=actor({relampago:{punicaoTrovao:2}}),target=actor();target.applyDamage=async function(_parts,options){if(this.commit)this.flags['Immortals-system'].elementalDamageReceipts=[{id:options.receipt,status:'complete'}];return this;};const ctx={...context(target,'canceledPunishment'),targets:[{actor:target,isEnemy:true,isMiss:true}]},a=activity(source);let r=await riders.applyElementalAttackRiders(a,[roll(2)],ctx);assert(r.pending.length);assert(!r.applied.length);target.commit=true;r=await riders.applyElementalAttackRiders(a,[roll(2)],ctx);assert(!r.pending.length);assert.equal(r.applied[0].damage,5);});
