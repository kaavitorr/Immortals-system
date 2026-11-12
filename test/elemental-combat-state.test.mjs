import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {prepareNpcClassificationActions,npcClassificationActionUpdate} from '../module/systems/legacy2-npc-classification.mjs';
let combatState={};try{combatState=await import('../module/systems/elemental-combat-state.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const use=key=>{assert.equal(typeof combatState[key],'function');return combatState[key];};
const scope='Immortals-system';
function assign(object,path,value){const keys=path.split('.'),key=keys.pop(),parent=keys.reduce((o,k)=>o[k]??={},object);if(key.startsWith('-='))delete parent[key.slice(2)];else parent[key]=structuredClone(value);}
function fixture({energy=100,state={}}={}){
 const writes=[];const actor={id:'hero',uuid:'Actor.hero',type:'character',isOwner:true,flags:{[scope]:{elementalState:structuredClone(state)}},system:{energy:{generated:energy,total:1000},legacy2:{actions:{value:8,max:6}}},async update(changes){writes.push(structuredClone(changes));for(const [path,value] of Object.entries(changes))assign(this,path,value);}};
 const combatant={id:'self',actor},combat={id:'fight',uuid:'Combat.fight',started:true,round:2,turn:0,combatant,current:{combatantId:'self',round:2},previous:{combatantId:'other',round:2},combatants:new Map([['self',combatant]])};
 globalThis.game={settings:{get:()=> '2.0'},user:{id:'gm',isGM:true},users:{activeGM:{id:'gm',active:true}},time:{worldTime:1000}};
 return {actor,combat,combatant,writes};
}
const start=(f,options={})=>use('processElementalTurn')(f.actor,f.combat,{combatant:f.combatant,...options});

test('start-of-turn expiry and refined upkeep share one awaited update across duplicate entry paths',async()=>{
 const f=fixture({state:{haste:{remaining:2,turn:'Combat.fight:1:self',expires:'turnStart'},barrier:{value:30,turn:'Combat.fight:1:other',expires:'turnStart'},mindBreak:{tier:2,turn:'Combat.fight:1:self',expires:'turnStart'},bodyFluid:{active:true,upkeepTurn:'Combat.fight:1:self',upkeepQi:15,pool:'generated'}}});
 await Promise.all([start(f),start(f)]);assert.equal(f.writes.length,1);assert.equal(f.actor.system.energy.generated,85);assert.equal(f.actor.system.energy.total,1000);assert.equal(f.actor.system.legacy2.actions.value,6);assert.equal(f.actor.flags[scope].elementalState.haste,undefined);assert.equal(f.actor.flags[scope].elementalState.barrier,undefined);assert.equal(f.actor.flags[scope].elementalState.mindBreak,undefined);assert.equal(f.actor.flags[scope].elementalTurns.start,'Combat.fight:2:self');
 f.combat.turn=4;await start(f);assert.equal(f.writes.length,1);
});

test('initial activation turn is already paid and every subsequent own turn pays once',async()=>{
 const f=fixture({state:{bodyFluid:{active:true,upkeepTurn:'Combat.fight:2:self',upkeepQi:15},illusionDouble:{active:true,upkeepTurn:'Combat.fight:2:self',upkeepQi:30}}});await start(f);assert.equal(f.actor.system.energy.generated,100);
 f.combat.round=3;await start(f);assert.equal(f.actor.system.energy.generated,55);await start(f);assert.equal(f.actor.system.energy.generated,55);
});

test('unaffordable sustained abilities end immediately and illusion cooldown starts at its actual end',async()=>{
 const f=fixture({energy:10,state:{bodyFluid:{active:true,upkeepTurn:'old'},illusionDouble:{active:true,upkeepTurn:'old',cooldownDays:30,source:{elementId:'ilusao',abilityId:'illusionDouble',activityId:'double'}}}});await start(f);assert.equal(f.actor.system.energy.generated,10);assert.equal(f.actor.flags[scope].elementalState.bodyFluid,undefined);assert.equal(f.actor.flags[scope].elementalState.illusionDouble,undefined);assert.equal(f.actor.flags[scope].elementalState.cooldowns['ilusao:illusionDouble:double'].availableAt,1000+30*86400);
});

test('Eternal Prison tracks up to 500 invested Qi then becomes eternal without further drains',async()=>{
 const f=fixture({energy:30,state:{eternalPrison:{active:true,investedQi:480,permanentAtQi:500,upkeepTurn:'old'}}});await start(f);const prison=f.actor.flags[scope].elementalState.eternalPrison;assert.equal(f.actor.system.energy.generated,10);assert.equal(prison.investedQi,500);assert.equal(prison.eternal,true);
 f.combat.round=3;await start(f);assert.equal(f.actor.system.energy.generated,10);
 const poor=fixture({energy:19,state:{eternalPrison:{active:true,investedQi:20,upkeepTurn:'old'}}});await start(poor);assert.equal(poor.actor.flags[scope].elementalState.eternalPrison,undefined);assert.equal(poor.actor.system.energy.generated,19);
});

test('authority chooses the active GM then a deterministic owner fallback and never a bystander',async()=>{
 const f=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old'}}});game.user={id:'other-gm',isGM:true};await start(f);assert.equal(f.writes.length,0);
 game.users.activeGM=null;game.user={id:'player',isGM:false,active:true};f.actor.isOwner=false;await start(f);assert.equal(f.writes.length,0);
 f.actor.isOwner=true;game.users.contents=[{id:'first',active:true,isGM:false},{id:'player',active:true,isGM:false}];f.actor.testUserPermission=()=>true;await start(f);assert.equal(f.writes.length,0);
 game.user.id='first';await start(f);assert.equal(f.writes.length,1);
});

test('phase guards retain expiry until its own turn and allow failed updates to retry',async()=>{
 const f=fixture({state:{haste:{remaining:2,turn:'Combat.fight:2:self',expires:'turnStart'},overlappingSpace:{active:true,turn:'Combat.fight:2:self',expires:'turnEnd'}}});await start(f);assert.equal(f.actor.system.legacy2.actions.value,8);assert(f.actor.flags[scope].elementalState.haste);await start(f,{phase:'end'});assert.equal(f.actor.flags[scope].elementalState.overlappingSpace,undefined);assert(f.actor.flags[scope].elementalState.haste);
 const retry=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old'}}}),original=retry.actor.update;let failed=true;retry.actor.update=async function(changes){if(failed){failed=false;throw Error('write failed');}return original.call(this,changes);};await assert.rejects(()=>start(retry),/write failed/);await start(retry);assert.equal(retry.actor.system.energy.generated,85);
});

test('world-time cleanup expires timestamped effects without draining sustained Qi outside combat',()=>{
 const f=fixture({state:{divineSense:{multiplier:10,expiresAt:999},environmentalBreathing:{active:true,expiresAt:1001},bodyFluid:{active:true,upkeepTurn:'old'}}});const changes=use('elementalWorldTimeUpdates')(f.actor,1000);assert.equal(changes['flags.'+scope+'.elementalState.-=divineSense'],null);assert(!Object.keys(changes).some(key=>key.includes('energy')));assert(!Object.keys(changes).some(key=>key.includes('environmentalBreathing')));
});

test('NPC Haste extends current availability while preserving the normal maximum and spent actions',()=>{
 const system={parent:{flags:{[scope]:{elementalState:{haste:{remaining:3}}}}},_source:{legacy2:{actions:{max:6}}},legacy2:{categoria:'normal',actions:{value:9,max:6}}};prepareNpcClassificationActions(system);assert.equal(system.legacy2.actions.max,6);assert.equal(system.legacy2.actions.value,9);
 system.legacy2.actions.value=20;prepareNpcClassificationActions(system);assert.equal(system.legacy2.actions.value,9);
 const actor={flags:system.parent.flags,system};const changed=npcClassificationActionUpdate(actor,{categoria:'elite'});assert.equal(changed.max,8);assert.equal(changed.value,11);
});

test('native combat and fallback tracker both await the shared elemental turn handler before their resource paths',()=>{
 const combat=readFileSync(new URL('../module/documents/combat.mjs',import.meta.url),'utf8');const begin=combat.match(/async _onStartTurn\(combatant\) \{([\s\S]*?)\n  \}/)[1];assert(begin.indexOf('await processElementalTurn')>=0);assert(begin.indexOf('await processElementalTurn')<begin.indexOf('await super._onStartTurn'));
 const end=combat.match(/async _onEndTurn\(combatant\) \{([\s\S]*?)\n  \}/)[1];assert(end.indexOf('await processElementalTurn')<end.indexOf('await endBodyTurn'));
 const fallback=readFileSync(new URL('../module/systems/acoes-combate.mjs',import.meta.url),'utf8');assert.match(fallback,/await processElementalTurn/);assert.doesNotMatch(fallback,/elementalTurnUpdates\(actor/);
});


test('the updating GM owns both cleanup and resource ordering when another GM is active',async()=>{
 const f=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old'}}});const users=[{id:'gm',isGM:true,active:true},{id:'updater',isGM:true,active:true}];game.users.contents=users;game.users.get=id=>users.find(u=>u.id===id);f.combat._stats={lastModifiedBy:'updater'};
 await start(f);assert.equal(f.writes.length,0);game.user=users[1];await start(f);assert.equal(f.writes.length,1);assert.equal(f.actor.system.energy.generated,85);
 const g=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old'}}});game.users.contents=users;game.users.get=id=>users.find(u=>u.id===id);game.user=users[1];await start(g,{userId:'updater'});assert.equal(g.actor.system.energy.generated,85);
});

test('the actual native callback awaits upkeep before superclass resources and shares the fallback receipt',async()=>{
 const source=readFileSync(new URL('../module/documents/combat.mjs',import.meta.url),'utf8'),body=source.match(/async _onStartTurn\(combatant\) \{([\s\S]*?)\n  \}/)[1];
 const f=fixture({state:{haste:{remaining:2,turn:'old',expires:'turnStart'},bodyFluid:{active:true,upkeepTurn:'old'}}});f.actor.type='npc';const trace=[];let release;const wait=new Promise(resolve=>release=resolve),original=f.actor.update;f.actor.update=async function(update,options){trace.push('update');await wait;return original.call(this,update,options);};
 class Base{async _onStartTurn(){trace.push('super');assert.equal(f.actor.system.energy.generated,85);assert.equal(f.actor.system.legacy2.actions.value,6);}}
 const Native=new Function('Base','processElementalTurn','resetarUsoReversaNoTurno','Ruleset','processBodyTurnStart','EnergySystem','EnergyGenerationDialog','game','return class extends Base { _recoverUses(){} async _onStartTurn(combatant){'+body+'}}')(Base,use('processElementalTurn'),async()=>{}, {isRestringido:()=>false},async()=>trace.push('body'),{},{},game);
 const native=Object.assign(new Native(),f.combat);const operation=native._onStartTurn(f.combatant);await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(trace,['update']);const fallback=start(f);release();await Promise.all([operation,fallback]);assert.equal(f.writes.length,1);assert.deepEqual(trace,['update','super','body']);
});


test('stopped combats never drain Qi and the authoritative GM may update an actor without player ownership',async()=>{
 const f=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old'}}});f.combat.started=false;await start(f);assert.equal(f.writes.length,0);f.combat.started=true;f.actor.isOwner=false;await start(f);assert.equal(f.actor.system.energy.generated,85);
 const unlearned=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old',source:{elementId:'agua',abilityId:'corpoFluido'}}}});unlearned.actor.system.elementAbilities={};await start(unlearned);assert.equal(unlearned.actor.system.energy.generated,100);assert.equal(unlearned.actor.flags[scope].elementalState.bodyFluid,undefined);
});


test('turn upkeep shares the activation lock so an in-flight paid use cannot overwrite its Qi debit',async()=>{
 const {withElementalActivationLock}=await import('../module/systems/elemental-runtime.mjs');const f=fixture({state:{bodyFluid:{active:true,upkeepTurn:'old'}}});let release;const wait=new Promise(resolve=>release=resolve);
 const activity={id:'paid',actor:f.actor,item:{id:'item',actor:f.actor},flags:{[scope]:{elementalActivity:{}}}};
 const paid=withElementalActivationLock(activity,async()=>{await wait;await f.actor.update({'system.energy.generated':85});});await Promise.resolve();const turn=start(f);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.writes.length,0);release();await Promise.all([paid,turn]);assert.equal(f.actor.system.energy.generated,70);
});

test('Mind Break maintenance costs two refined Qi per new own turn at every tier',async()=>{for(const tier of [1,2,3]){const f=fixture({energy:5,state:{mindBreak:{active:true,tier,upkeepQi:2,upkeepTurn:'Combat.fight:1:self'}}});await start(f);assert.equal(f.actor.system.energy.generated,3);assert.equal(f.actor.flags[scope].elementalState.mindBreak.active,true);await start(f);assert.equal(f.actor.system.energy.generated,3);f.combat.round=3;await start(f);assert.equal(f.actor.system.energy.generated,1);f.combat.round=4;await start(f);assert.equal(f.actor.flags[scope].elementalState.mindBreak,undefined);assert.equal(f.actor.system.energy.generated,1);}});

test('ending combat removes only its temporary turn effects and unused action grants',()=>{const f=fixture({state:{haste:{remaining:2,turn:'Combat.fight:1:self',expires:'turnStart'},barrier:{value:20,turn:'Combat.fight:1:self',expires:'turnStart'},divineSense:{multiplier:2,expiresAt:2000},bodyFluid:{active:true,upkeepQi:15},other:{value:4,turn:'Combat.other:1:self',expires:'turnStart'}}});assert.equal(typeof combatState.elementalCombatEndUpdates,'function');const updates=combatState.elementalCombatEndUpdates(f.actor,f.combat);assert.equal(updates['system.legacy2.actions.value'],6);assert.equal(updates['flags.'+scope+'.elementalState.-=barrier'],null);assert.equal(updates['flags.'+scope+'.elementalState.-=haste'],null);assert.equal(updates['flags.'+scope+'.elementalState.-=divineSense'],undefined);assert.equal(updates['flags.'+scope+'.elementalState.-=bodyFluid'],undefined);assert.equal(updates['flags.'+scope+'.elementalState.-=other'],undefined);});
