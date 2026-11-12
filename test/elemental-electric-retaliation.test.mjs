import assert from 'node:assert/strict';
import {test} from 'node:test';
let api = {};
try { api = await import('../module/systems/elemental-electric-retaliation.mjs'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const S = 'Immortals-system';
function fixture(tier = 2) {
  const documents = new Map(), gm = {id: 'gm', isGM: true}, user = {id: 'owner', isGM: false};
  const defender = {uuid: 'Actor.defender', type: 'character', flags: {}, itemTypes: {class: []}, system: {
    cultivation: {rank: 4, stage: 1}, elementAbilities: {relampago: {qiEletrico: 3, punicaoTrovao: tier}},
    legacy2: {principalEscolhido: 'str'}, abilities: {str: {value: 7}}, energy: {generated: 10, total: 20}}};
  const attacker = {uuid: 'Actor.attacker', type: 'npc', flags: {}, system: {energy: {generated: 20}}, damage: []};
  attacker.applyDamage = async (parts, options) => {
    attacker.damage.push({parts, options});
    attacker.flags[S] ??= {};
    (attacker.flags[S].elementalDamageReceipts ??= []).push({id: options.receipt, status: 'complete'});
  };
  const activity = {id: 'reaction', uuid: attacker.uuid + '.Item.weapon.Activity.reaction', actor: attacker,
    item: {id: 'weapon', uuid: attacker.uuid + '.Item.weapon', actor: attacker}, activation: {type: 'reaction'}};
  const token = {uuid: 'Scene.s.Token.defender', actor: defender};
  const event = {uuid: 'ChatMessage.movement', author: gm, flags: {[S]: {elementalMovementEvent: {
    version: 1, actorUuid: defender.uuid, tokenUuid: token.uuid, worldTime: 100,
    turn: 'Combat.c:1:defender', qiElectricTier: 3, id: 'move', noMovementReactions: false
  }}}};
  const attack = {uuid: 'ChatMessage.attack', type: 'attack', rolls: [{total: 1}], flags: {[S]: {
    elementalMovementReaction: {eventUuid: event.uuid, kind: 'exceptionalMovement',
      targetTokenUuid: token.uuid, sourceActorUuid: attacker.uuid, activityId: activity.id,
      acceptedAt: 100, acceptedTurn: 'Combat.c:1:defender'}
  }}, system: {targets: [{token: token.uuid, actor: defender.uuid}]},
  getAssociatedActor: () => attacker, getAssociatedActivity: () => activity};
  for (const doc of [defender, attacker, token, event, attack]) documents.set(doc.uuid, doc);
  globalThis.game = {user: gm, users: {activeGM: gm}, time: {worldTime: 100}, settings: {get: () => '2.0'}};
  globalThis.fromUuid = async uuid => documents.get(uuid);
  return {defender, attacker, activity, token, event, attack, gm, user, documents};
}
async function snapshot(f) {
  assert.equal(typeof api.elementalMovementRetaliationSnapshot, 'function');
  f.event.flags[S].elementalMovementEvent.retaliation = await api.elementalMovementRetaliationSnapshot(f.defender);
}
function execute(f) {
  assert.equal(typeof api.executeElementalMovementRetaliation, 'function');
  return api.executeElementalMovementRetaliation({actor: f.attacker, activity: f.activity, originMessage: f.attack,
    context: {originEventId: f.attack.uuid, sourceActorUuid: f.attacker.uuid}, user: f.gm});
}
for (const [tier, damage] of [[0, 0], [1, 3], [2, 7], [3, 7]]) test('electric movement retaliation uses learned Punishment tier ' + tier, async () => {
  const f = fixture(tier); await snapshot(f);
  const result = await execute(f);
  assert.equal(result.pending.length, 0);
  assert.equal(f.attacker.damage.length, damage ? 1 : 0);
  if (damage) { assert.equal(f.attacker.damage[0].parts[0].value, damage); assert.equal(f.attacker.damage[0].parts[0].type, 'lightning'); }
  assert.equal(f.defender.system.energy.generated, 10); assert.equal(f.attacker.system.energy.generated, 20);
});
test('a duplicate completion, delayed resolution or simultaneous request cannot repeat the retaliation', async () => {
  const f = fixture(); await snapshot(f); game.time.worldTime = 2000;
  await Promise.all([execute(f), execute(f)]); await execute(f);
  assert.equal(f.attacker.damage.length, 1);
});
test('the recorded movement fixes damage before later attribute or ability changes', async () => {
  const f = fixture(1); await snapshot(f);
  f.defender.system.abilities.str.value = 15; f.defender.system.elementAbilities.relampago.punicaoTrovao = 3;
  await execute(f); assert.equal(f.attacker.damage[0].parts[0].value, 3);
});
test('ordinary reactions, mismatched token, forged movement author and a different attacker cannot apply this damage', async () => {
  for (const kind of ['ordinary', 'token', 'author', 'attacker']) {
    const f = fixture(); await snapshot(f);
    if (kind === 'ordinary') f.attack.flags[S].elementalMovementReaction.kind = 'movement';
    if (kind === 'token') f.attack.system.targets[0].token = 'Scene.s.Token.other';
    if (kind === 'author') f.event.author = f.user;
    if (kind === 'attacker') f.attack.getAssociatedActor = () => f.defender;
    const result = await execute(f); assert.equal(f.attacker.damage.length, 0); assert(result.pending.length || result.skipped?.length);
  }
});
test('a cancelled damage application remains resumable with the same receipt', async () => {
  const f = fixture(); await snapshot(f); const apply = f.attacker.applyDamage;
  f.attacker.applyDamage = async () => {};
  assert((await execute(f)).pending.length);
  f.attacker.applyDamage = apply;
  assert.equal((await execute(f)).pending.length, 0); assert.equal(f.attacker.damage.length, 1);
});
test('non-active masters cannot apply movement retaliation', async () => {
  const f = fixture(); await snapshot(f);
  game.users.activeGM = {id: 'another', isGM: true};
  assert((await execute(f)).pending.length); assert.equal(f.attacker.damage.length, 0);
});
test('the native post-attack queue records one private GM request and the registered executor resolves it once',async()=>{
 const f=fixture(2);await snapshot(f);f.attack.flags[S].elementalMovementReaction.pendingRetaliation=true;
 f.attacker.id='attacker';f.activity.item.system={activities:new Map([[f.activity.id,f.activity]])};f.attacker.items=new Map([[f.activity.item.id,f.activity.item]]);
 f.documents.set(f.activity.item.uuid,f.activity.item);const users=new Map([[f.gm.id,f.gm],[f.user.id,f.user]]);users.activeGM=f.gm;game.users=users;game.messages=new Map();
 globalThis.Hooks={on(){}};game.socket={on(){}};const created=[];
 globalThis.ChatMessage={create:async data=>{
  created.push(data);const message={...data,id:data._id,uuid:'ChatMessage.'+data._id,author:f.gm,_stats:{createdBy:f.gm.id},update:async updates=>{for(const[path,value]of Object.entries(updates)){const keys=path.split('.'),last=keys.pop(),parent=keys.reduce((v,k)=>v[k]??={},message);parent[last]=value;}}};
  f.documents.set(message.uuid,message);game.messages.set(message.id,message);return message;
 }};
 const {registerElementalExecutionHooks}=await import('../module/systems/elemental-execution.mjs');registerElementalExecutionHooks();
 await Promise.all([api.queueElementalMovementRetaliation(f.activity,f.attack),api.queueElementalMovementRetaliation(f.activity,f.attack)]);
 await api.queueElementalMovementRetaliation(f.activity,f.attack);
 assert.equal(created.length,1);assert.deepEqual(created[0].whisper,['gm']);assert.equal(created[0].flags[S].elementalRequest.kind,'movementRetaliation');
 assert.equal(f.attacker.damage.length,1);assert.equal(f.attacker.damage[0].parts[0].value,7);
 assert.equal([...game.messages.values()][0].flags[S].elementalExecution.status,'complete');
});
