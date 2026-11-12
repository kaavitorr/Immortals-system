import assert from "node:assert/strict";
import {test} from "node:test";
import {createBeastEssenceDeathController, isBeastEssenceDead, showBeastEssenceCaptureDialog} from "../module/systems/beast-essence-death.mjs";

const SCOPE = "Immortals-system";
/**
 * Make an in-memory Actor whose update boundary uses native dotted paths.
 * @returns {object}
 * @param {string} id
 * @param {object} root0
 * @param {number} root0.hp
 * @param {string} root0.type
 * @param {number|null} root0.rank
 */
function actor(id, {hp=10, type="npc", rank=2}={}) {
  return {id, uuid: `Actor.${id}`, name: id, type, isOwner: true, visible: true, flags: {[SCOPE]: type==="npc"?{cultivationRank: rank}:{}}, statuses: new Set(), items: [],
    system: {attributes: {hp: {value: hp}}, abilities: {str: {value: 8}, dex: {value: 3}},
      cultivation: {rank, stage: 1}, legacy2: rank===null?{}:{nd:(rank-1)*3+1}},
    async createEmbeddedDocuments(type, rows, options) {
      assert.equal(type, "Item"); assert.equal(options.renderSheet, false);
      return rows.map(data => {const item={...structuredClone(data), id:`loot-${this.items.length}`, uuid:`${this.uuid}.Item.loot-${this.items.length}`};
        this.items.push(item); this.onItemCreated?.(item); return item;});
    },
    async update(changes) {for (const [path, value] of Object.entries(changes)) {const parts=path.split(".");
      let target=this;
      for (const part of parts.slice(0, -1))target=target[part]??={};
      const key=parts.at(-1);
      const merge=(base,patch)=>{if(!patch || typeof patch!=="object" || Array.isArray(patch))return structuredClone(patch);
        const out=base&&typeof base==="object"&&!Array.isArray(base)?structuredClone(base):{};
        for(const [k,v] of Object.entries(patch))out[k]=merge(out[k],v);return out;};
      target[key]=merge(target[key],value);
    } return this;
    }
  };
}
/**
 * Exercise the real controller and builders with in-memory document writes and dice.
 * @returns {object}
 * @param {object} root0
 * @param {Function} root0.dialog
 * @param {number[]} root0.rolls
 * @param {boolean} root0.combat
 */
function harness({dialog=async () => null, rolls=[100], combat=false}={}) {
  const gm={id: "gm", isGM: true};
  const reference=actor("cultivator", {type: "character", rank: 3});
  const game={user: gm, users: {activeGM: gm}, actors: [reference], items: [], folders: []};
  let next=0;
  let dialogs=0;
  let current=0;
  let maximum=0;
  let rolling=0;
  const created=[];
  const errors=[];
  const controller=createBeastEssenceDeathController({game, isCombatActive: () => combat, makeId: () => `episode-${++next}`,
    dialog: async (snapshot, session) => {dialogs++;
      current++;
      maximum=Math.max(maximum, current);
      try {return await dialog(snapshot, session);
      } finally {current--;
      }},
    rollD100: async () => {rolling++;
      return rolls.shift();
    },
    ensureCoreFolder: async () => ({id: "cores-folder"}),
    ensureFolder: async () => ({id: "essences-folder"}), createItem: async data => {const item={...structuredClone(data), id: `loot-${created.length}`};
      created.push(item);
      game.items.push(item);
      return item;
    },
    notify: message => errors.push(message)
  });
  const seed=controller.seed;
  controller.seed=actors=>{for(const actor of actors)actor.onItemCreated=item=>created.push(item);return seed(actors);};
  return {controller, game, reference, created, errors, get dialogs() {return dialogs;
  }, get maximum() {return maximum;
  }, get rolls() {return rolling;
  }, endCombat() {combat=false;
  }};
}
const manual=() => ({mode: "manual", sourceRealm: 2, selection: {growth: "earth", ability: "str", elements: []}});

test("loading dead NPCs and non-NPC damage never opens a death review", async () => {
  const h=harness({dialog: manual});
  const dead=actor("old", {hp: 0});
  const character=actor("pc", {type: "character", hp: 0});
  h.controller.seed([dead, character]);
  await h.controller.observe(dead);
  await h.controller.observe(character);
  await h.controller.drain();
  assert.equal(h.dialogs, 0);
  assert.equal(h.created.length, 0);
});

test("one real death episode creates one reviewed essence despite concurrent death observations", async () => {
  const h=harness({dialog: manual});
  const source=actor("tiger");
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await Promise.all([h.controller.observe(source), h.controller.observe(source), h.controller.observe(source)]);
  await h.controller.drain();
  assert.equal(h.dialogs, 1);
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0].folder, undefined);
  assert.equal(source.items[0],h.created[0]);
  assert.equal(h.created[0].flags[SCOPE].beastEssenceItem.definition.sourceActorUuid, "Actor.tiger");
  assert.equal(source.flags[SCOPE].beastEssenceDeath.status, "created");
  const reloaded=harness({dialog: manual});
  reloaded.controller.seed([source]);
  await reloaded.controller.observe(source);
  await reloaded.controller.drain();
  assert.equal(reloaded.dialogs, 0);
});

test("cancel is durable for that episode and healing permits one new episode", async () => {
  const h=harness();
  const source=actor("wolf");
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.dialogs, 1);
  assert.equal(h.created.length, 0);
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.dialogs, 1);
  const first=source.flags[SCOPE].beastEssenceDeath.episode;
  source.system.attributes.hp.value=4;
  await h.controller.observe(source);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.dialogs, 2);
  assert.notEqual(source.flags[SCOPE].beastEssenceDeath.episode, first);
  assert.equal(h.created.length, 0);
});

test("only the active Narrator can claim a death and permissions are checked again after review", async () => {
  const h=harness({dialog: async () => {h.game.user={id: "player", isGM: false};
    return manual();
  }});
  const source=actor("serpent");
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.dialogs, 1);
  assert.equal(h.created.length, 0);
  const inactive=harness({dialog: manual});
  const other=actor("other");
  inactive.controller.seed([other]);
  inactive.game.users.activeGM={id: "other-gm", isGM: true};
  other.system.attributes.hp.value=0;
  await inactive.controller.observe(other);
  await inactive.controller.drain();
  assert.equal(inactive.dialogs, 0);
});

test("combat deaths open immediately in one queue and healed pending creatures are discarded", async () => {
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const h=harness({combat:true,dialog:async()=>{await gate;return manual();}});
  const first=actor("first"),second=actor("second"),healed=actor("healed");
  h.controller.seed([first,second,healed]);
  first.system.attributes.hp.value=0;const firstDeath=h.controller.observe(first);
  await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.dialogs,1);
  second.system.attributes.hp.value=0;const secondDeath=h.controller.observe(second);
  healed.system.attributes.hp.value=0;const thirdDeath=h.controller.observe(healed);
  await new Promise(resolve=>setTimeout(resolve,0));healed.system.attributes.hp.value=3;await h.controller.observe(healed);
  release();await Promise.all([firstDeath,secondDeath,thirdDeath]);await h.controller.drain();
  assert.equal(h.dialogs,2);assert.equal(h.maximum,1);assert.equal(h.created.length,2);
});

test("dead status is a real death even above zero HP and removing it resets the episode", async () => {
  const source=actor("status");
  const h=harness();
  h.controller.seed([source]);
  source.statuses.add("dead");
  assert.equal(isBeastEssenceDead(source), true);
  await h.controller.observe(source);
  await h.controller.drain();
  source.statuses.delete("dead");
  await h.controller.observe(source);
  assert.equal(isBeastEssenceDead(source), false);
  source.statuses.add("dead");
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.dialogs, 2);
});

test("inferior kills persist once per episode, roll only on the tenth kill, and cannot reroll", async () => {
  let results=[];
  const h=harness({dialog: async (_snapshot, session) => {const a=await session.discover({sourceRealm: 2, referenceId: "cultivator"});
    const b=await session.discover({sourceRealm: 2, referenceId: "cultivator"});
    results.push(a, b);
    return null;
  }});
  h.reference.flags[SCOPE].beastEssenceDiscovery={version: 1, counters: {2: 8}, receipts: []};
  const a=actor("ninth");
  const b=actor("tenth");
  h.controller.seed([a, b]);
  for (const source of [a, b]) {source.system.attributes.hp.value=0;
    await h.controller.observe(source);
    await h.controller.drain();
  }
  assert.equal(results[0].eligible, false);
  assert.equal(results[0].nextLowerKills, 9);
  assert.equal(results[2].success, true);
  assert.equal(results[2].roll, 100);
  assert.equal(h.rolls, 1);
  assert.equal(h.reference.flags[SCOPE].beastEssenceDiscovery.counters[2], 0);
  assert.equal(h.created.length, 0);
});

test("chance creation needs a successful discovery and one growth roll, with no private snapshot in loot", async () => {
  const h=harness({combat:true, rolls: [100, 42], dialog: async (_snapshot, session) => {await session.discover({sourceRealm: 2, referenceId: "cultivator"});
    const growth=await session.rollGrowth();
    const again=await session.rollGrowth();
    assert.equal(growth.id, again.id);
    return {mode: "chance", sourceRealm: 2, selection: {growth: growth.id, ability: "str", elements: []}};
  }});
  h.reference.system.cultivation.rank=2;
  const source=actor("rare");
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.rolls, 2);
  assert.equal(h.created.length, 1);
  const definition=h.created[0].flags[SCOPE].beastEssenceItem.definition;
  assert.equal(definition.growth, "heaven");
  assert.equal(definition.growthRoll,42); assert.equal(definition.growthOrigin,"rolled");
  assert.equal(definition.highestAbilities, undefined);
  assert.equal(definition.system, undefined);
});

test("a legacy source with no cultivation level remains unknown and healing during review cancels creation", async () => {
  const h=harness({dialog: async snapshot => {assert.equal(snapshot.sourceRealm, null);
    source.system.attributes.hp.value=1;
    return manual();
  }});
  const source=actor("unknown", {rank: null});
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.created.length, 0);
});


test("simultaneous chance and growth requests share a single durable die result", async () => {
  const h=harness({rolls: [100, 42], dialog: async (_snapshot, session) => {
    const found=await Promise.all([session.discover({sourceRealm: 2, referenceId: "cultivator"}), session.discover({sourceRealm: 2, referenceId: "cultivator"})]);
    assert.equal(found[0].roll, found[1].roll);
    const growth=await Promise.all([session.rollGrowth(), session.rollGrowth()]);
    assert.equal(growth[0].id, growth[1].id);
    return null;
  }});
  h.reference.system.cultivation.rank=2;
  const source=actor("parallel");
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.deepEqual(h.errors, []);
  assert.equal(h.rolls, 2);
  assert.equal(h.dialogs, 1);
});

test("chance verification cannot be reused with a different explicitly selected source realm", async () => {
  const h=harness({rolls: [100, 42], dialog: async (_snapshot, session) => {
    await session.discover({sourceRealm: 2, referenceId: "cultivator"});
    const growth=await session.rollGrowth();
    return {mode: "chance", sourceRealm: 4, selection: {growth: growth.id, ability: "str", elements: []}};
  }});
  h.reference.system.cultivation.rank=2;
  const source=actor("realm-change", {rank: null});
  h.controller.seed([source]);
  source.system.attributes.hp.value=0;
  await h.controller.observe(source);
  await h.controller.drain();
  assert.equal(h.created.length, 0);
});


test("the native DialogV2 cancel action closes review without reopening it", async () => {
  const original=globalThis.foundry;
  let opens=0;
  globalThis.foundry={applications: {handlebars: {renderTemplate: async () => "<div>Prévia</div>"}, api: {DialogV2: {wait: async () => ++opens===1?"cancel":null}}}};
  const snapshot={name: "Besta", sourceRealm: 2, highestAbilities: ["str"], elements: [], naturalWeapons: [], features: [], attacks: [], taxonomy: null, archetype: null};
  try {const result=await showBeastEssenceCaptureDialog(snapshot, {record: () => ({}), references: []});
    assert.equal(result, null);
    assert.equal(opens, 1);
  } finally {globalThis.foundry=original;
  }
});


test("manual formation may roll growth once without a discovery roll and stores its receipt",async()=>{
 const h=harness({combat:true,rolls:[81],dialog:async(_snapshot,session)=>{
  const [a,b]=await Promise.all([session.rollGrowth({mode:"manual"}),session.rollGrowth({mode:"manual"})]);
  assert.deepEqual(a,b);return {mode:"manual",sourceRealm:2,selection:{growth:a.id,ability:"str",elements:[]}};
 }});const source=actor("manual-roll");h.controller.seed([source]);source.system.attributes.hp.value=0;
 await h.controller.observe(source);await h.controller.drain();assert.deepEqual(h.errors,[]);
 assert.equal(h.rolls,1);assert.equal(h.created.length,1);
 const d=h.created[0].flags[SCOPE].beastEssenceItem.definition;assert.equal(d.growth,"divine");assert.equal(d.growthRoll,81);assert.equal(d.growthOrigin,"rolled");
});

test("a recorded growth result cannot be changed by switching to manual creation",async()=>{
 const h=harness({rolls:[21],dialog:async(_snapshot,session)=>{await session.rollGrowth({mode:"manual"});return manual();}});
 const source=actor("override-roll");h.controller.seed([source]);source.system.attributes.hp.value=0;
 await h.controller.observe(source);await h.controller.drain();assert.equal(h.created.length,0);assert.match(h.errors[0],/crescimento.*rolagem/i);
});

test("a divine beast formed manually has Supreme growth without spending a die",async()=>{
 const h=harness({dialog:async(_snapshot,session)=>{const result=await session.rollGrowth({mode:"manual",divineBeast:true});
 assert.equal(result.id,"supreme");return {mode:"manual",sourceRealm:2,selection:{growth:result.id,ability:"str"}};}});
 const source=actor("divine-manual");h.controller.seed([source]);source.system.attributes.hp.value=0;
 await h.controller.observe(source);await h.controller.drain();assert.deepEqual(h.errors,[]);assert.equal(h.rolls,0);
 assert.equal(h.created[0].flags[SCOPE].beastEssenceItem.definition.growthOrigin,"divine");
});


test("the active Narrator sees a player-caused death on an unlinked token during combat",async()=>{
 const {registerBeastEssenceDeathHooks}=await import("../module/systems/beast-essence-death.mjs");
 const h=harness({dialog:manual}),source=actor("token");source.uuid="Scene.scene.Token.token.Actor.creature";
 h.game.ready=true;h.game.scenes=[{tokens:[{actor:source}]}];h.game.combats=[{started:true,combatants:[{actor:source}]}];
 const events=new Map(),hooks={on:(name,fn)=>{events.set(name,fn);return name;},off(){}};
 registerBeastEssenceDeathHooks(hooks,{game:h.game,controller:h.controller});
 try{source.system.attributes.hp.value=0;await events.get("updateActor")(source,{system:{attributes:{hp:{value:0}}}},{},"player-who-attacked");
 await h.controller.drain();assert.equal(h.dialogs,1);assert.equal(h.created.length,1);
 await events.get("updateActor")(source,{flags:{}},{},"gm");assert.equal(h.dialogs,1);
 assert.equal(h.created[0].flags[SCOPE].beastEssenceItem.definition.sourceActorUuid,source.uuid);
 }finally{h.controller.unregister();}
});


test("a recorded Divine Beast cannot be downgraded by unchecking its source and switching manual",async()=>{
 const h=harness({rolls:[51],dialog:async(_snapshot,session)=>{await session.discover({referenceId:"cultivator",divineBeast:true});
 return {mode:"manual",sourceRealm:2,divineBeast:false,selection:{growth:"human",ability:"str"}};}});
 const source=actor("divine-bypass");h.controller.seed([source]);source.system.attributes.hp.value=0;
 await h.controller.observe(source);await h.controller.drain();assert.equal(h.created.length,0);assert.equal(h.rolls,1);
 assert.match(h.errors[0],/crescimento.*rolagem|Divina/i);
});


test("native recursive flag merges cannot reuse growth or discovery after healing and a new death",async()=>{
 const h=harness({rolls:[100,11,100,99],dialog:async(_snapshot,session)=>{await session.discover({referenceId:"cultivator"});
 const growth=await session.rollGrowth();return {mode:"chance",sourceRealm:2,selection:{growth:growth.id,ability:"str"}};}});
 h.reference.system.cultivation.rank=2;const source=actor("revived");h.controller.seed([source]);
 source.system.attributes.hp.value=0;await h.controller.observe(source);
 source.system.attributes.hp.value=2;await h.controller.observe(source);
 source.system.attributes.hp.value=0;await h.controller.observe(source);await h.controller.drain();
 assert.deepEqual(h.errors,[]);assert.equal(h.created.length,2);assert.equal(h.rolls,4);
 const definitions=h.created.map(item=>item.flags[SCOPE].beastEssenceItem.definition);
 assert.notEqual(definitions[0].id,definitions[1].id);assert.deepEqual(definitions.map(d=>d.growthRoll),[11,99]);
});


test("reload recovers a known queued death once without reviewing unrelated or copied corpses",async()=>{
 const h=harness({dialog:manual}),queued=actor("queued",{hp:0}),copied=actor("copied",{hp:0}),old=actor("unrelated-corpse",{hp:0});
 queued.flags[SCOPE].beastEssenceDeath={version:1,episode:queued.uuid+".pending",status:"queued"};
 copied.flags[SCOPE].beastEssenceDeath={version:1,episode:"Actor.another.pending",status:"queued"};
 await h.controller.seed([queued,copied,old]);await h.controller.drain();
 assert.equal(h.dialogs,1);assert.equal(h.created.length,1);assert.equal(h.created[0].flags[SCOPE].beastEssenceItem.definition.id,queued.uuid+".pending");
 await h.controller.seed([queued,copied,old]);await h.controller.drain();assert.equal(h.dialogs,1);
});


test("system hooks registered before Game exists still review a later token death", async () => {
  const {registerBeastEssenceDeathHooks}=await import("../module/systems/beast-essence-death.mjs");
  const previous={game:globalThis.game,Item:globalThis.Item,Folder:globalThis.Folder};
  const events=new Map(),hooks={on:(name,fn)=>{events.set(name,fn);return name;},off(){}};
  const source=actor("startup-token"),reference=actor("startup-cultivator",{type:"character",rank:2});
  source.uuid="Scene.scene.Token.startup-token.Actor.creature";
  const created=[],folders=[],rolls=[100,42],errors=[];let reviews=0;
  source.onItemCreated=item=>created.push(item);
  let controller;
  try {
    // Foundry loads system modules before creating the global Game at DOMContentLoaded.
    delete globalThis.game;
    controller=registerBeastEssenceDeathHooks(hooks,{makeId:()=>"startup-death",notify:message=>errors.push(message),
      rollD100:async()=>rolls.shift(),dialog:async(snapshot,session)=>{
        reviews++;assert.equal(snapshot.name,"startup-token");assert.equal(session.references.length,1);
        await session.discover({referenceId:"startup-cultivator"});
        const growth=await session.rollGrowth();
        return {mode:"chance",sourceRealm:2,selection:{growth:growth.id,ability:"str",elements:[]}};
      }});
    const gm={id:"gm",isGM:true};
    globalThis.game={ready:true,user:gm,users:{activeGM:gm},actors:[reference],scenes:[{tokens:[{actor:source}]}],items:created,folders};
    globalThis.Folder={create:async data=>{const folder={...data,id:"essences"};folders.push(folder);return folder;}};
    globalThis.Item={create:async(data,options)=>{assert.equal(options.renderSheet,false);const item={...data,id:"essence"};created.push(item);return item;}};
    await events.get("ready")();
    source.system.attributes.hp.value=0;
    await events.get("updateActor")(source,{system:{attributes:{hp:{value:0}}}},{},"player");
    await controller.drain();
    assert.equal(reviews,1,"the active GM must receive the review after world startup");
    assert.deepEqual(errors,[]);
    assert.equal(created.length,1);
    assert.equal(created[0].folder,undefined);
    assert.equal(source.items[0],created[0]);
    assert.equal(created[0].flags[SCOPE].beastEssenceItem.definition.growth,"heaven");
    assert.equal(source.flags[SCOPE].beastEssenceDeath.status,"created");
    await events.get("updateActor")(source,{flags:{}},{},"gm");
    assert.equal(reviews,1);
  } finally {controller?.unregister();Object.assign(globalThis,previous);}
});


test('Narrator may generate one core without finding or rolling a beast essence',async()=>{
 const h=harness({dialog:async(snapshot,session)=>{assert.equal(snapshot.sourceRealm,2);await Promise.all([session.createCore({elementId:'fogo',rank:2}),session.createCore({elementId:'fogo',rank:2})]);return null;}});
 const source=actor('core-only');h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);await h.controller.drain();
 assert.deepEqual(h.errors,[]);assert.equal(h.created.length,1);assert.equal(h.rolls,0);assert.equal(h.created[0].system.type.value,'beastCore');assert.equal(h.created[0].folder,undefined);assert.equal(source.items[0],h.created[0]);assert.equal(source.flags[SCOPE].beastEssenceDeath.core.status,'created');assert.equal(source.flags[SCOPE].beastEssenceDeath.discovery,null);
});
test('core and essence decisions are independent within the same reviewed death',async()=>{
 const h=harness({dialog:async(_snapshot,session)=>{await session.createCore({elementId:'neutro',rank:2});return manual();}});
 const source=actor('both-loot');h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.deepEqual(h.errors,[]);assert.equal(h.created.length,2);assert.equal(h.created[0].system.type.value,'beastCore');assert.ok(h.created[1].flags[SCOPE].beastEssenceItem);assert.equal(source.flags[SCOPE].beastEssenceDeath.core.status,'created');
});
test('healing cancels core creation and a new death receives a new core receipt',async()=>{
 let source,count=0;const h=harness({dialog:async(_snapshot,session)=>{count++;if(count===1){source.system.attributes.hp.value=10;await h.controller.observe(source);await assert.rejects(session.createCore({elementId:'terra',rank:2}));}else await session.createCore({elementId:'terra',rank:2});return null;}});
 source=actor('core-revived');h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.equal(h.created.length,0);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.equal(h.created.length,1);assert.equal(source.flags[SCOPE].beastEssenceDeath.core.status,'created');
 source.system.attributes.hp.value=10;await h.controller.observe(source);assert.equal(source.flags[SCOPE].beastEssenceDeath.core,null);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.equal(h.created.length,2);
});
test('a core request validates the element and rank before creating a folder or item',async()=>{
 const h=harness({dialog:async(_snapshot,session)=>{await assert.rejects(session.createCore({elementId:'inexistente',rank:2}),/elemento/i);await assert.rejects(session.createCore({elementId:'fogo',rank:0}),/reino/i);return null;}});const source=actor('invalid-core');h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.deepEqual(h.errors,[]);assert.equal(h.created.length,0);
});


test('a GM handoff during review forbids generating core loot',async()=>{
 let h;h=harness({dialog:async(_snapshot,session)=>{h.game.users.activeGM={id:'another'};await assert.rejects(session.createCore({elementId:'fogo',rank:2}));return null;}});const source=actor('core-gm-handoff');h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.equal(h.created.length,0);
});
test('a recovered native world core receipt prevents duplicate loot even after a failed local receipt',async()=>{
 const h=harness({dialog:async(_snapshot,session)=>{const state=session.record();h.game.items.push({id:'existing-core',name:'Núcleo existente',system:{type:{subtype:'fogo'},beastCore:{rank:2}},flags:{[SCOPE]:{beastCore:{source:{deathEpisode:state.episode}}}}});await session.createCore({elementId:'fogo',rank:2});return null;}});const source=actor('core-receipt');h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.equal(h.created.length,0);assert.equal(source.flags[SCOPE].beastEssenceDeath.core.itemId,'existing-core');assert.deepEqual(h.errors,[]);
});
test('the death dialog creates a core before essence validation and then removes the duplicate core action',async()=>{
 const before=globalThis.foundry;let open=0,core=null;const snapshot={name:'Besta',sourceRealm:3,highestAbilities:['str'],elements:['fogo'],naturalWeapons:[],features:[],attacks:[],taxonomy:null,archetype:null};
 const session={references:[],record:()=>({core}),createCore:async input=>{assert.deepEqual(input,{elementId:'agua',rank:3,recipient:'Actor.player'});core={status:'created',elementId:'agua',name:'Núcleo de Água'};}};
 globalThis.foundry={applications:{handlebars:{renderTemplate:async(_path,context)=>{assert.equal(context.core.created,open>0);return 'review';}},api:{DialogV2:{wait:async config=>{open++;assert.match(config.window.title,/Núcleo e Essência/);if(open===1){assert(config.buttons.some(b=>b.action==='core'));return {action:'core',form:{recipient:'Actor.player',core:{elementId:'agua',rank:3},mode:'chance',sourceRealm:3,selection:{}}};}assert(!config.buttons.some(b=>b.action==='core'));return 'cancel';}}}}};
 try{assert.equal(await showBeastEssenceCaptureDialog(snapshot,session),null);assert.equal(open,2);}finally{globalThis.foundry=before;}
});

test('generated NPCs marked with no loot never open a death review',async()=>{const h=harness({dialog:manual}),source=actor('no-loot');source.flags[SCOPE].beastLoot={configured:true,essence:false,core:false,guaranteed:true};h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.equal(h.dialogs,0);assert.equal(h.created.length,0);});
test('guaranteed generated essence skips discovery but retains one growth roll',async()=>{const h=harness({rolls:[42],dialog:async(_snapshot,session)=>{assert.equal(session.loot.guaranteed,true);const growth=await session.rollGrowth({mode:'manual'});return {mode:'manual',sourceRealm:2,selection:{growth:growth.id,ability:'str',elements:[]}};}}),source=actor('guaranteed');source.flags[SCOPE].beastLoot={configured:true,essence:true,core:false,guaranteed:true};h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.deepEqual(h.errors,[]);assert.equal(h.rolls,1);assert.equal(h.created.length,1);assert.equal(source.flags[SCOPE].beastEssenceDeath.discovery,null);});
test('core-only generated NPC reviews do not permit creating an unmarked essence',async()=>{const h=harness({dialog:async(_snapshot,session)=>{assert.equal(session.loot.essence,false);await session.createCore({elementId:'gelo',rank:2});return null;}}),source=actor('only-core');source.flags[SCOPE].beastLoot={configured:true,essence:false,core:true,guaranteed:true,elementId:'gelo'};h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.deepEqual(h.errors,[]);assert.equal(h.rolls,0);assert.equal(h.created.length,1);assert.equal(h.created[0].system.type.value,'beastCore');});

test('guaranteed essence still permits the Narrator to choose growth manually',async()=>{const h=harness({dialog:manual}),source=actor('guaranteed-manual');source.flags[SCOPE].beastLoot={configured:true,essence:true,core:false,guaranteed:true};h.controller.seed([source]);source.system.attributes.hp.value=0;await h.controller.observe(source);assert.deepEqual(h.errors,[]);assert.equal(h.created.length,1);assert.equal(h.rolls,0);assert.equal(h.created[0].flags[SCOPE].beastEssenceItem.definition.growthOrigin,'manual');});
