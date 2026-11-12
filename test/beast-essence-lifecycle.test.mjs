import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {registerBeastEssenceRuntimeHooks} from "../module/systems/beast-essence-runtime.mjs";
import {registerBeastEssenceAuthority} from "../module/systems/beast-essence-authority.mjs";
import {registerBeastEssenceDeathHooks} from "../module/systems/beast-essence-death.mjs";
const scope="Immortals-system";
test("the native start-turn callback waits for essence upkeep before later resources", async () => {
  const source=await readFile(new URL("../module/documents/combat.mjs", import.meta.url), "utf8"); const body=source.match(/async _onStartTurn\(combatant\) \{([\s\S]*?)\n {2}\}/)[1];
  const trace=[]; let release; const gate=new Promise(resolve => {release=resolve;});
  class Base {async _onStartTurn() {trace.push("super");}}
  const C=new Function("Base", "processBeastEssenceTurn", "processElementalTurn", "resetarUsoReversaNoTurno", "processBodyTurnStart", "Ruleset", "EnergySystem", "EnergyGenerationDialog", "game",
    `return class extends Base{_recoverUses(){} async _onStartTurn(combatant){${body}}}`)(Base, async () => {trace.push("essence"); await gate; trace.push("paid");}, async () => {}, async () => {}, async () => {}, {isRestringido: () => false}, {}, {}, {users: {find: () => null}});
  const actor={type: "character", system: {energy: {}}, flags: {[scope]: {beastEssence: {transformation: {active: true}}}}}; const operation=new C()._onStartTurn({actor}); await Promise.resolve(); assert.deepEqual(trace, ["essence"]); release(); await operation; assert.deepEqual(trace, ["essence", "paid", "super"]);
});
test("a completed native long rest uses its recorded receipt, CON skill and only one PC payment", async () => {
  const old={game: globalThis.game, foundry: globalThis.foundry, ui: globalThis.ui}; const callbacks=new Map(); const hooks={on: (name, fn) => {callbacks.set(name, fn); return name;}};
  const player={id: "p", active: true, isGM: false}; const users=[player]; users.get=id => users.find(user => user.id===id);
  const e={version: 1, id: "essence", growth: "earth", name: "Qilin", ability: "str", elements: [], features: [], attacks: [], naturalWeapons: [], normalFeatures: [], weakenedFeatures: [], normalAttacks: [], weakenedAttacks: []};
  const loot={id: "loot", system: {quantity: 1}, flags: {[scope]: {beastEssenceItem: {version: 1, definition: e}}}};
  const actor={id: "a", uuid: "Actor.a", type: "character", isOwner: true, testUserPermission: () => true, flags: {[scope]: {beastEssence: {pendingItemId: "loot", completedRest: {id: "actual-rest", itemId: "loot"}}}}, items: new Map([["loot", loot]]), system: {cultivation: {rank: 1, stage: 1, points: 10}, abilities: {con: {value: 4}}}, prototypeToken: {texture: {src: "hero.webp"}}, async rollSkill(config) {assert.equal(config.skill, "arc"); assert.equal(config.ability, "con"); assert.equal(config.target, 12); return [{total: 20}];}, async performBulkUpdate(updates) {for (const [k, v] of Object.entries(updates.actor??{})) {const keys=k.split("."); let o=this; for (const key of keys.slice(0, -1))o=o[key]??={}; o[keys.at(-1)]=structuredClone(v);} for (const update of updates.item??[]) if (update._id==="loot")loot.system.quantity=update["system.quantity"];}};
  const game={user: player, users, actors: [], scenes: [], socket: {on() {}, off() {}, emit() {throw Error("local executor must not route");}}}; globalThis.game=game; globalThis.foundry={utils: {randomID: () => "unused"}}; globalThis.ui={notifications: {info() {}, warn() {}}};
  try {registerBeastEssenceRuntimeHooks(hooks); await callbacks.get("ready")(); const rest={longRest: true, type: "long", beastEssenceRestReceipt: "actual-rest"}; await callbacks.get("dnd5e.restCompleted")(actor, rest, {type: "long"}); await callbacks.get("dnd5e.restCompleted")(actor, rest, {type: "long"}); assert.equal(actor.system.cultivation.points, 5); assert.equal(actor.flags[scope].beastEssence.integrated.id, "essence"); assert.equal(loot.system.quantity, 0); registerBeastEssenceAuthority({}).unregister();} finally {Object.assign(globalThis, old);}
});
test("death hooks seed and track unlinked token actors as well as world actors", () => {
  const events=new Map(); const seeded=[]; const tracked=[]; const hooks={on: (name, fn) => {events.set(name, fn); return name;}, off() {}};
  const creature={type: "npc", uuid: "Scene.s.Token.t.Actor.a"}; const game={actors: [], scenes: [{tokens: [{actor: creature}]}]}; const controller={seed: actors => seeded.push(...actors), track: actor => tracked.push(actor), observe: async () => {}, drain: async () => {}};
  registerBeastEssenceDeathHooks(hooks, {game, controller}); events.get("ready")(); assert.equal(seeded[0], creature); events.get("createToken")({actor: creature}); assert.equal(tracked[0], creature); controller.unregister();
});
