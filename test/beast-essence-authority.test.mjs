import assert from "node:assert/strict";
import {test} from "node:test";
import {beastEssenceExecutor, mayExecuteBeastEssence, registerBeastEssenceAuthority, dispatchBeastEssenceAction} from "../module/systems/beast-essence-authority.mjs";

const flush=() => new Promise(resolve => setImmediate(resolve));
/**
 * Simulate authenticated native socket delivery between independent client registrations.
 * @returns {object}
 * @param {object} root0
 * @param {string[]} root0.ownerIds
 * @param {Promise|null} root0.resolveDelay
 * @param {Promise|null} root0.handlerDelay
 * @param {number} root0.timeoutMs
 * @param {boolean} root0.dropResponses
 * @param {boolean} root0.dropRequests
 * @param {boolean} root0.throwAction
 */
function harness({ownerIds=["owner"], resolveDelay=null, handlerDelay=null, timeoutMs=250, dropResponses=false, dropRequests=false, throwAction=false}={}) {
  const users=[{id: "owner", active: true, isGM: false}, {id: "second", active: true, isGM: false}, {id: "gm", active: true, isGM: true}, {id: "stranger", active: true, isGM: false}];
  const ownerSet=new Set(ownerIds);
  const actor={uuid: "Actor.character", id: "character", type: "character", system: {writes: 0, lastActor: null}, testUserPermission(user, level) {assert.equal(level, "OWNER");
    return user?.isGM||ownerSet.has(user?.id);
  }};
  const receivers=new Map();
  const messages=[];
  const registrations=[];
  const clients={};
  let ids=0;
  const bus={deliver(sender, payload, recipients) {
    for (const recipient of recipients??users.map(user => user.id)) {
      if (recipient===sender) continue;
      for (const receive of receivers.get(recipient)??[]) {
        queueMicrotask(() => receive(structuredClone(payload), sender));
      }
    }}, messages};
  for (const user of users) {
    const collection=[...users];
    collection.activeGM=users.find(entry => entry.id==="gm");
    collection.get=id => users.find(entry => entry.id===id);
    const socket={on(channel, receive) {assert.equal(channel, "system.Immortals-system");
      const list=receivers.get(user.id)??[];
      list.push(receive);
      receivers.set(user.id, list);
    }, off(_channel, receive) {receivers.set(user.id, (receivers.get(user.id)??[]).filter(fn => fn!==receive));
    }, emit(channel, payload, options) {assert.equal(channel, "system.Immortals-system");
      messages.push({sender: user.id, payload: structuredClone(payload), recipients: options?.recipients});
      if ((dropResponses&&payload.type==="essenceresponse")||(dropRequests&&payload.type==="essencerequest")) return;
      bus.deliver(user.id, payload, options?.recipients);
    }};
    const game={user, users: collection, socket};
    const handlers={};
    for (const action of ["queue", "activate", "deactivate", "setToken", "remove", "completeRest", "sync", "turn"])handlers[action]=async (target, ...args) => {
      if (handlerDelay) await handlerDelay;
      if (throwAction) throw new Error("Qi insuficiente");
      target.system.writes++;
      target.system.lastActor=user.id;
      target.system.lastAction=action;
      target.system.args=args;
      return action==="completeRest"?{success: true, dc: 10, pointsRemaining: 5, definition: {id: "essence-id", private: "private-definition"}, actor: target}:true;
    };
    const authority=registerBeastEssenceAuthority(handlers, {game, timeoutMs, requestIdFactory: () => String(++ids), resolve: async uuid => {if (resolveDelay&&user.id==="owner") await resolveDelay;
      if (uuid===actor.uuid) return actor;
      return null;
    }});
    registrations.push(authority);
    clients[user.id]={game, authority};
  }
  return {actor, users, owners: ownerSet, bus, messages, clients, close() {
    for (const authority of registrations)authority.unregister();
  }};
}

test("the first active player owner is elected before the active Narrator", () => {
  const h=harness({ownerIds: ["second", "owner"]});
  try {assert.equal(beastEssenceExecutor(h.actor, h.clients.gm.game).id, "owner");
    h.users[0].active=false;
    assert.equal(beastEssenceExecutor(h.actor, h.clients.gm.game).id, "second");
    h.users[1].active=false;
    assert.equal(beastEssenceExecutor(h.actor, h.clients.gm.game).id, "gm");
    h.actor.type="npc";
    assert.equal(beastEssenceExecutor(h.actor, h.clients.gm.game), null);
  } finally {h.close();
  }
});

test("global mayExecute and dispatch follow the elected owner without a remote fallback", async () => {
  const h=harness();
  const original=globalThis.game;
  try {globalThis.game=h.clients.gm.game;
    assert.equal(mayExecuteBeastEssence(h.actor), false);
    await dispatchBeastEssenceAction(h.actor, "activate");
    assert.equal(h.actor.system.writes, 1);
    assert.equal(h.actor.system.lastActor, "owner");
    globalThis.game=h.clients.owner.game;
    assert.equal(mayExecuteBeastEssence(h.actor), true);
    await dispatchBeastEssenceAction(h.actor, "deactivate");
    assert.equal(h.actor.system.writes, 2);
    assert.equal(h.messages.filter(message => message.payload.type==="essencerequest").length, 1);
  } finally {globalThis.game=original;
    h.close();
  }
});

test("requests and responses contain only identifiers, primitive arguments and a bounded result receipt", async () => {
  const h=harness();
  try {const result=await h.clients.gm.authority.dispatch(h.actor, "completeRest", ["long-rest:one"]);
    assert.equal(result.success, true);
    assert.equal(result.dc, 10);
    assert.equal(result.definition, undefined);
    assert.equal(result.actor, undefined);
    const request=h.messages.find(message => message.payload.type==="essencerequest");
    assert.equal(request.payload.actorUuid, "Actor.character");
    assert.deepEqual(request.payload.args, ["long-rest:one"]);
    assert.deepEqual(request.recipients, ["owner"]);
    assert(!JSON.stringify(h.messages).includes("private-definition"));
    assert(!JSON.stringify(request.payload).includes("system"));
  } finally {h.close();
  }
});

test("a replayed request returns its recorded result and never repeats the native action", async () => {
  const h=harness();
  try {await h.clients.gm.authority.dispatch(h.actor, "activate");
    const request=h.messages.find(message => message.payload.type==="essencerequest").payload;
    h.bus.deliver("gm", request, ["owner"]);
    await flush();
    assert.equal(h.actor.system.writes, 1);
    assert.equal(h.messages.filter(message => message.payload.type==="essenceresponse").length, 2);
    h.bus.deliver("gm", {...request, action: "remove"}, ["owner"]);
    await flush();
    assert.equal(h.actor.system.writes, 1);
  } finally {h.close();
  }
});

test("socket sender identity is mandatory and cannot be replaced with a claimed requesterId", async () => {
  const h=harness();
  try {const payload={type: "essencerequest", version: 1, requestId: "gm:forged", requesterId: "gm", executorId: "owner", actorUuid: h.actor.uuid, action: "remove", args: []};
    h.bus.deliver("stranger", payload, ["owner"]);
    await flush();
    assert.equal(h.actor.system.writes, 0);
    h.bus.deliver("stranger", {...payload, requestId: "stranger:own", requesterId: "stranger"}, ["owner"]);
    await flush();
    assert.equal(h.actor.system.writes, 0);
  } finally {h.close();
  }
});

test("a foreign response cannot satisfy another client's pending request", async () => {
  let release;
  const delay=new Promise(resolve => release=resolve);
  const h=harness({resolveDelay: delay});
  try {const promise=h.clients.gm.authority.dispatch(h.actor, "activate");
    await flush();
    const request=h.messages.find(message => message.payload.type==="essencerequest").payload;
    h.bus.deliver("stranger", {type: "essenceresponse", version: 1, requestId: request.requestId, requesterId: "gm", executorId: "owner", actorUuid: h.actor.uuid, action: "activate", ok: true, result: "forged"}, ["gm"]);
    release();
    assert.equal(await promise, true);
    assert.equal(h.actor.system.writes, 1);
  } finally {h.close();
  }
});

test("permission loss while resolving the actor prevents the native command", async () => {
  let release;
  const delay=new Promise(resolve => release=resolve);
  const h=harness({ownerIds: ["owner", "second"], resolveDelay: delay});
  try {const promise=h.clients.second.authority.dispatch(h.actor, "activate");
    await flush();
    h.owners.delete("second");
    release();
    await assert.rejects(promise, /permiss|propriet|OWNER/i);
    assert.equal(h.actor.system.writes, 0);
  } finally {h.close();
  }
});

test("a changed executor is rejected instead of executing on either client", async () => {
  let release;
  const delay=new Promise(resolve => release=resolve);
  const h=harness({ownerIds: ["owner", "second"], resolveDelay: delay});
  try {const promise=h.clients.second.authority.dispatch(h.actor, "activate");
    await flush();
    h.users[0].active=false;
    release();
    await assert.rejects(promise, /executor|responsável|mudou/i);
    assert.equal(h.actor.system.writes, 0);
  } finally {h.close();
  }
});

test("unavailable executors time out and never invoke a local action", async () => {
  const h=harness({timeoutMs: 10, dropRequests: true});
  try {await assert.rejects(h.clients.gm.authority.dispatch(h.actor, "activate"), /tempo|respondeu/i);
    assert.equal(h.actor.system.writes, 0);
    assert.equal(h.messages.filter(message => message.payload.type==="essencerequest").length, 1);
  } finally {h.close();
  }
});

test("a lost response does not cause a second local execution", async () => {
  const h=harness({timeoutMs: 10, dropResponses: true});
  try {await assert.rejects(h.clients.gm.authority.dispatch(h.actor, "activate"), /tempo|respondeu/i);
    assert.equal(h.actor.system.writes, 1);
    assert.equal(h.actor.system.lastActor, "owner");
  } finally {h.close();
  }
});

test("handler errors are correlated and replayed without exposing a stack or document", async () => {
  const h=harness({throwAction: true});
  try {await assert.rejects(h.clients.gm.authority.dispatch(h.actor, "activate"), /Qi insuficiente/);
    const response=h.messages.find(message => message.payload.type==="essenceresponse").payload;
    assert.equal(response.ok, false);
    assert.equal(response.stack, undefined);
    assert.equal(response.actor, undefined);
    assert.equal(h.actor.system.writes, 0);
  } finally {h.close();
  }
});

test("the action list and primitive argument limits reject arbitrary remote operations", async () => {
  const h=harness();
  try {for (const [action, args] of [["create", []], ["activate", [{arbitrary: "update"}]], ["queue", ["../foreign"]], ["setToken", [["javascript", "alert(1)"].join(":")]], ["completeRest", ["x".repeat(513)]]]) await assert.rejects(h.clients.gm.authority.dispatch(h.actor, action, args));
    assert.equal(h.messages.length, 0);
    h.actor.type="npc";
    await assert.rejects(h.clients.gm.authority.dispatch(h.actor, "activate"));
    assert.equal(h.actor.system.writes, 0);
  } finally {h.close();
  }
});


test("replayed results are reauthorized when the requester loses ownership", async () => {
  const h=harness();
  try {await h.clients.gm.authority.dispatch(h.actor, "activate");
    const request=h.messages.find(message => message.payload.type==="essencerequest").payload;
    h.users.find(user => user.id==="gm").isGM=false;
    h.bus.deliver("gm", request, ["owner"]);
    await flush();
    const response=h.messages.filter(message => message.payload.type==="essenceresponse").at(-1).payload;
    assert.equal(response.ok, false);
    assert.match(response.error, /permiss|propriet/i);
    assert.equal(h.actor.system.writes, 1);
  } finally {h.close();
  }
});

test("messages without the server's authenticated sender never execute", async () => {
  const h=harness();
  try {h.bus.deliver(undefined, {type: "essencerequest", version: 1, requestId: "gm:missing-sender", requesterId: "gm", executorId: "owner", actorUuid: h.actor.uuid, action: "remove", args: []}, ["owner"]);
    await flush();
    assert.equal(h.actor.system.writes, 0);
    assert.equal(h.messages.length, 0);
  } finally {h.close();
  }
});


test("requests replayed while a native action is waiting share the same pending execution", async () => {
  let release; const delay=new Promise(resolve => release=resolve); const h=harness({handlerDelay: delay});
  try {const promise=h.clients.gm.authority.dispatch(h.actor, "activate"); await flush(); const request=h.messages.find(message => message.payload.type==="essencerequest").payload; h.bus.deliver("gm", request, ["owner"]); h.bus.deliver("gm", request, ["owner"]); await flush(); assert.equal(h.actor.system.writes, 0); release(); assert.equal(await promise, true); await flush(); assert.equal(h.actor.system.writes, 1); assert.equal(h.messages.filter(message => message.payload.type==="essenceresponse").length, 3);} finally {h.close();}
});


test("turn requests carry only the exact combat identity and round primitives to the executor", async () => {
  const h=harness();
  try {
    const result=await h.clients.gm.authority.dispatch(h.actor, "turn", ["Combat.active", "combatant_01", "1"]);
    assert.equal(result, true);
    assert.equal(h.actor.system.writes, 1);
    assert.equal(h.actor.system.lastActor, "owner");
    assert.equal(h.actor.system.lastAction, "turn");
    assert.deepEqual(h.actor.system.args, ["Combat.active", "combatant_01", "1"]);
    await h.clients.gm.authority.dispatch(h.actor, "turn", ["Combat.active", "combatant_01", "1000000"]);
    assert.equal(h.actor.system.writes, 2);
  } finally {h.close();}
});

test("turn requests reject malformed combats, foreign operations, nested data and out-of-range rounds", async () => {
  const h=harness();
  try {
    for (const args of [[], ["Combat.active", "combatant_01"], ["Combat.active", "combatant_01", "1", "extra"],
      ["Actor.character", "combatant_01", "1"], ["Combat.active.Item.item", "combatant_01", "1"],
      ["Combat.active", "../combatant", "1"], ["Combat.active", "x".repeat(65), "1"],
      ["Combat.active", "combatant_01", "0"], ["Combat.active", "combatant_01", "-1"],
      ["Combat.active", "combatant_01", "1000001"], ["Combat.active", "combatant_01", "1.5"],
      ["Combat.active", "combatant_01", "1e3"], ["Combat.active", "combatant_01", 1],
      ["Combat.active", {action: "update"}, "1"], ["Combat.active", "combatant_01", {round: 1}]]) await assert.rejects(h.clients.gm.authority.dispatch(h.actor, "turn", args));
    assert.equal(h.messages.length, 0);
    assert.equal(h.actor.system.writes, 0);
  } finally {h.close();}
});
