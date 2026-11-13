import assert from "node:assert/strict";
import {test} from "node:test";
let create; try {({createBeastEssenceRuntime: create}=await import("../module/systems/beast-essence-runtime.mjs"));} catch (error) {if (error.code!=="ERR_MODULE_NOT_FOUND") throw error;}
import {buildBeastEssenceGrants} from "../module/systems/beast-essence-grants.mjs";
const scope="Immortals-system";
const def=(id="old") => ({version: 1, id, name: "Lobo", growth: "human", ability: "str", elements: [], features: [], attacks: [], naturalWeapons: [], normalFeatures: [], weakenedFeatures: [], normalAttacks: [], weakenedAttacks: [], tokenTexture: "wolf.webp"});
const set=(object, key, value) => {const parts=key.split("."); let target=object; for (const part of parts.slice(0, -1))target=target[part]??={}; target[parts.at(-1)]=structuredClone(value);};
/**
 *
 * @param root0
 * @param root0.active
 * @param root0.points
 * @param root0.qi
 * @param root0.actions
 * @param root0.rank
 * @param root0.nativeGrants
 */
function fixture({active=false, points=10, qi=10, actions=3, rank=1, nativeGrants=false, isGM=true}={}) {
  assert.equal(typeof create, "function", "runtime factory must exist");
  const essence=def(); const token={id: "t", uuid: "Scene.s.Token.t", texture: {src: active?"wolf.webp":"hero.webp"}, parent: {id: "s"}, canUserModify: () => true};
  const a={id: "a", uuid: "Actor.a", type: "character", isOwner: true, flags: {[scope]: {beastEssence: {version: 1, integrated: essence, pendingItemId: null, transformation: {active, integrationId: essence.id, mode: "normal", grantedItemIds: active?["grant"]:[], tokens: active?[{uuid: token.uuid, src: "hero.webp", applied: "wolf.webp"}]:[], prototype: active?{src: "hero.webp", applied: "wolf.webp"}:null, tokenTexture: "wolf.webp", lastPaidTurn: null}}}}, prototypeToken: {texture: {src: active?"wolf.webp":"hero.webp"}}, system: {cultivation: {rank, stage: 1, points}, energy: {generated: qi}, legacy2: {actions: {value: actions}}, abilities: {str: {value: 4}}, attributes: {hp: {value: 20, max: 20, effectiveMax: 20}}}, items: new Map()};
  a.items.set("loot", {id: "loot", type: "loot", system: {quantity: 2}, flags: {[scope]: {beastEssenceItem: {version: 1, definition: def("new")}}}});
  if (active)a.items.set("grant", {id: "grant", type: "feat", flags: {[scope]: {beastEssenceGrant: {integrationId: "old", key: "x"}}}});
  a.items.set("manual", {id: "manual", name: "Preservar", type: "feat", flags: {}});
  let count=0; let roll=30; let commits=0; let fail=false; let nextCommitGate=null; const updates=[];
  const runtime=create({user: () => ({id: "u", isGM}), mayProcess: () => true, tokenDocuments: () => [token], context: () => ({turn: "Combat.c:1:t"}), idFactory: () => `id${++count}`, buildGrants: nativeGrants?buildBeastEssenceGrants:() => [{_id: "grant-new", name: "Garras", type: "weapon", flags: {[scope]: {beastEssenceGrant: {integrationId: essence.id, key: "claw"}}}}], rollIntegration: async () => roll,
    commit: async (subject, data) => {if (nextCommitGate) {const gate=nextCommitGate; nextCommitGate=null; await gate;} if (fail) throw Error("write failed"); commits++; updates.push(structuredClone({...data, operations: []})); for (const [k, v] of Object.entries(data.actor??{}))set(subject, k, v); for (const id of data.delete??[])subject.items.delete(id); for (const i of data.create??[])subject.items.set(i._id, {...i, id: i._id}); for (const patch of data.item??[]) {const item=subject.items.get(patch._id); for (const [k, v] of Object.entries(patch)) if (k!=="_id")set(item, k, v);} for (const op of data.operations??[]) for (const patch of op.updates??[]) if (patch._id===token.id) for (const [k, v] of Object.entries(patch)) if (k!=="_id")set(token, k, v); return true;}});
  return {a, token, runtime, updates, rest(receipt) {a.flags[scope].beastEssence.completedRest={id: receipt, itemId: a.flags[scope].beastEssence.pendingItemId}; return runtime.completeBeastEssenceIntegration(a, receipt);}, get commits() {return commits;}, setRoll(value) {roll=value;}, holdNextCommit() {let release; nextCommitGate=new Promise(resolve => {release=resolve;}); return release;}, failWrite() {fail=true;}};
}
test("queueing an owned essence does not spend resources or integrate immediately", async () => {const f=fixture(); await f.runtime.queueBeastEssenceIntegration(f.a, "loot"); assert.equal(f.a.flags[scope].beastEssence.pendingItemId, "loot"); assert.equal(f.a.flags[scope].beastEssence.integrated.id, "old"); assert.equal(f.a.system.cultivation.points, 10); await assert.rejects(() => f.runtime.queueBeastEssenceIntegration(f.a, "manual"), /essência/i);});
test("a failed actual rest integration only spends five PC and keeps both essences", async () => {const f=fixture({active: true}); await f.runtime.queueBeastEssenceIntegration(f.a, "loot"); f.setRoll(1); const result=await f.rest("rest1"); assert.equal(result.success, false); assert.equal(f.a.system.cultivation.points, 5); assert.equal(f.a.flags[scope].beastEssence.integrated.id, "old"); assert.equal(f.a.items.get("loot").system.quantity, 2); assert.equal(f.token.texture.src, "wolf.webp"); assert.equal(f.a.flags[scope].beastEssence.pendingItemId, null);});
test("success replaces the old essence, consumes one loot, and clears only its grants", async () => {const f=fixture({active: true}); await f.runtime.queueBeastEssenceIntegration(f.a, "loot"); await f.rest("rest1"); assert.equal(f.a.flags[scope].beastEssence.integrated.id, "new"); assert.equal(f.a.items.get("loot").system.quantity, 1); assert.equal(f.a.items.has("grant"), false); assert.equal(f.a.items.has("manual"), true); assert.equal(f.token.texture.src, "hero.webp"); assert.equal(f.a.flags[scope].beastEssence.transformation.active, false); const spent=f.commits; await f.runtime.completeBeastEssenceIntegration(f.a, "rest1"); assert.equal(f.commits, spent);});
test("activation pays one action and two refined Qi with token and temporary grants together", async () => {const f=fixture(); await f.runtime.activateBeastEssence(f.a); assert.equal(f.a.system.energy.generated, 8); assert.equal(f.a.system.legacy2.actions.value, 2); assert.equal(f.a.flags[scope].beastEssence.transformation.active, true); assert.equal(f.token.texture.src, "wolf.webp"); assert.equal(f.a.prototypeToken.texture.src, "wolf.webp"); assert.equal(f.a.items.has("grant-new"), true); assert.equal(f.a.system.abilities.str.value, 4); assert.equal(f.commits, 1);});
test("ending a form preserves manual token changes and permanent items", async () => {const f=fixture({active: true}); f.token.texture.src="manual.webp"; await f.runtime.deactivateBeastEssence(f.a); assert.equal(f.token.texture.src, "manual.webp"); assert.equal(f.a.prototypeToken.texture.src, "hero.webp"); assert.equal(f.a.items.has("grant"), false); assert.equal(f.a.items.has("manual"), true); assert.equal(f.a.system.energy.generated, 10);});
test("failed writes and insufficient activation resources cannot leave partial form state", async () => {const f=fixture(); f.failWrite(); await assert.rejects(() => f.runtime.activateBeastEssence(f.a), /write/); assert.equal(f.a.flags[scope].beastEssence.transformation.active, false); assert.equal(f.a.system.energy.generated, 10); const low=fixture({qi: 1}); await assert.rejects(() => low.runtime.activateBeastEssence(low.a), /Qi/); assert.equal(low.commits, 0);});
test("own-turn upkeep is idempotent and insufficient Qi ends the form without a negative pool", async () => {const f=fixture({active: true, qi: 3}); const combat={started: true, uuid: "Combat.c", round: 2, combatant: {id: "t", actor: f.a}}; await f.runtime.processBeastEssenceTurn(f.a, combat); assert.equal(f.a.system.energy.generated, 1); const count=f.commits; await f.runtime.processBeastEssenceTurn(f.a, combat); assert.equal(f.commits, count); combat.round=3; await f.runtime.processBeastEssenceTurn(f.a, combat); assert.equal(f.a.flags[scope].beastEssence.transformation.active, false); assert.equal(f.a.system.energy.generated, 1); assert.equal(f.token.texture.src, "hero.webp");});
test("the activation's paid own turn is not billed twice", async () => {const f=fixture(); await f.runtime.activateBeastEssence(f.a); await f.runtime.processBeastEssenceTurn(f.a, {started: true, uuid: "Combat.c", round: 1, combatant: {id: "t", actor: f.a}}); assert.equal(f.a.system.energy.generated, 8); assert.equal(f.commits, 1);});
test("pending integration revalidates permission after the roll and cancellation is free", async () => {const f=fixture(); await f.runtime.queueBeastEssenceIntegration(f.a, "loot"); f.setRoll(null); await f.rest("r"); assert.equal(f.a.system.cultivation.points, 10); f.a.isOwner=false; await assert.rejects(() => f.runtime.activateBeastEssence(f.a), /permissão/);});
test("passing two realms beyond the growth ceiling cleans the active form without new costs", async () => {const f=fixture({active: true, rank: 4}); await f.runtime.synchronizeBeastEssence(f.a); assert.equal(f.a.flags[scope].beastEssence.transformation.active, false); assert.equal(f.a.items.has("grant"), false); assert.equal(f.a.system.energy.generated, 10);});

test("replayed earlier rounds do not bill the same creature turn twice", async () => {const f=fixture({active: true}); const c={started: true, uuid: "Combat.c", round: 1, combatant: {id: "t", actor: f.a}}; await f.runtime.processBeastEssenceTurn(f.a, c); c.round=2; await f.runtime.processBeastEssenceTurn(f.a, c); c.round=1; await f.runtime.processBeastEssenceTurn(f.a, c); assert.equal(f.a.system.energy.generated, 6);});
test("activity uses survive ending and rebuilding genuine native grants with new IDs", async () => {const f=fixture({nativeGrants: true}); f.a.flags[scope].beastEssence.integrated.naturalWeapons=[{key: "claw", uuid: "Item.claw", data: {type: "weapon", name: "Garras", system: {activities: {bite: {_id: "bite", type: "attack", activation: {value: 1}, uses: {spent: 0, max: "5", recovery: [{period: "lr", type: "recoverAll"}]}}}}}}]; await f.runtime.activateBeastEssence(f.a); const id=f.a.flags[scope].beastEssence.transformation.grantedItemIds[0]; const item=f.a.items.get(id); const activity=Object.values(item.system.activities)[0]; activity.uses.spent=3; await f.runtime.deactivateBeastEssence(f.a); await f.runtime.activateBeastEssence(f.a); const next=f.a.items.get(f.a.flags[scope].beastEssence.transformation.grantedItemIds[0]); assert.notEqual(next._id, id); assert.equal(Object.values(next.system.activities)[0].uses.spent, 3);});

test("a queued essence cannot integrate against a fabricated rest receipt", async () => {const f=fixture(); await f.runtime.queueBeastEssenceIntegration(f.a, "loot"); await assert.rejects(() => f.runtime.completeBeastEssenceIntegration(f.a, "not-a-rest"), /descanso longo/); assert.equal(f.a.system.cultivation.points, 10);});

test("duplicate own-turn callbacks await the same pending upkeep commit before continuing", async () => {const f=fixture({active: true}); const release=f.holdNextCommit(); const combat={started: true, uuid: "Combat.c", round: 2, combatant: {id: "t", actor: f.a}}; let secondFinished=false; const first=f.runtime.processBeastEssenceTurn(f.a, combat); const second=f.runtime.processBeastEssenceTurn(f.a, combat).then(() => {secondFinished=true;}); await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(secondFinished, false); assert.equal(f.a.system.energy.generated, 10); release(); await Promise.all([first, second]); assert.equal(f.a.system.energy.generated, 8); assert.equal(f.commits, 1);});

test("a queued old turn cannot charge Qi after combat has advanced or stopped", async () => {const f=fixture({active: true}); const release=f.holdNextCommit(); const c={started: true, uuid: "Combat.c", round: 1, combatant: {id: "t", actor: f.a}}; const busy=f.runtime.setBeastEssenceToken(f.a, "new.webp"); await Promise.resolve(); const oldTurn=f.runtime.processBeastEssenceTurn(f.a, c); c.round=2; c.combatant={id: "other", actor: {}}; release(); await busy; assert.equal(await oldTurn, false); assert.equal(f.a.system.energy.generated, 10); assert.equal(f.a.flags[scope].beastEssence.transformation.lastPaidTurn, null);});


test("growth unlocks native lineage traits, weakens at the next realm and removes them two realms above",async()=>{
 const f=fixture({nativeGrants:true}),e=f.a.flags[scope].beastEssence.integrated;
 const feature=(key,level)=>({key,uuid:"Item."+key,level,data:{name:key,type:"feat",system:{activities:{}}}});
 e.taxonomy={features:[feature("early",1),feature("later",4),feature("above-cap",7)]};
 e.archetype={features:[feature("archetype",1)]};e.normalArchetypeFeatures=["archetype"];e.weakenedArchetypeFeatures=[];e.features=[feature("full",0),feature("weak",0)];
 e.normalFeatures=["full"];e.weakenedFeatures=["weak"];
 const grants=()=>[...f.a.items.values()].filter(i=>i.flags?.[scope]?.beastEssenceGrant).map(i=>i.flags[scope].beastEssenceGrant.key).sort();
 await f.runtime.activateBeastEssence(f.a);assert.deepEqual(grants(),["archetype","early","full"]);
 f.a.system.cultivation.rank=2;f.a.system.cultivation.stage=3;await f.runtime.synchronizeBeastEssence(f.a);
 assert.deepEqual(grants(),["archetype","early","full","later"]);
 f.a.system.cultivation.rank=3;await f.runtime.synchronizeBeastEssence(f.a);
 assert.deepEqual(grants(),["early","later","weak"]);assert.equal(f.a.flags[scope].beastEssence.transformation.mode,"weakened");
 assert.equal(f.a.system.energy.generated,8);
 f.a.system.cultivation.rank=4;await f.runtime.synchronizeBeastEssence(f.a);
 assert.deepEqual(grants(),[]);assert.equal(f.a.flags[scope].beastEssence.transformation.active,false);
 assert.equal(f.token.texture.src,"hero.webp");assert.equal(f.a.items.has("manual"),true);assert.equal(f.a.system.energy.generated,8);
});


test("Narrator growth edits awaken an existing essence without reintegration or resource spending",async()=>{
 const f=fixture({rank:4}),before=structuredClone(f.a.flags[scope].beastEssence.integrated);
 before.growthOrigin="rolled";before.growthRoll=9;f.a.flags[scope].beastEssence.integrated=before;
 await f.runtime.setBeastEssenceGrowth(f.a,"heaven","",before.id);
 const current=f.a.flags[scope].beastEssence.integrated;
 assert.equal(current.growth,"heaven");assert.equal(current.growthOverride,true);
 assert.deepEqual({...current,growth:before.growth,growthOverride:undefined},{...before,growthOverride:undefined});
 const {essenceState}=await import("../module/systems/beast-essence-rules.mjs");
 assert.equal(essenceState(f.a).mode,"normal");assert.equal(essenceState(f.a).limitRank,6);
 assert.equal(f.a.flags[scope].beastEssence.transformation.active,false);
 assert.equal(f.a.system.cultivation.points,10);assert.equal(f.a.system.energy.generated,10);assert.equal(f.a.system.legacy2.actions.value,3);
 assert.equal(f.a.items.get("loot").system.quantity,2);
});
test("Narrator growth edits rebuild an active weakened form and retain spent native uses",async()=>{
 const f=fixture({active:true,rank:3,nativeGrants:true}),e=f.a.flags[scope].beastEssence.integrated;
 e.taxonomy={features:[{key:"new-trait",level:7,data:{name:"New trait",type:"feat",system:{activities:{}}}}]};
 e.archetype={features:[{key:"archetype",level:1,data:{name:"Archetype",type:"feat",system:{activities:{}}}}]};e.normalArchetypeFeatures=["archetype"];e.weakenedArchetypeFeatures=[];
 e.naturalWeapons=[{key:"claw",data:{name:"Garras",type:"weapon",system:{uses:{spent:0,max:5},activities:{}}}}];
 await f.runtime.synchronizeBeastEssence(f.a);
 const weapon=[...f.a.items.values()].find(i=>i.type==="weapon");weapon.system.uses.spent=3;
 await f.runtime.setBeastEssenceGrowth(f.a,"earth","",e.id);
 const form=f.a.flags[scope].beastEssence.transformation;
 assert.equal(form.active,true);assert.equal(form.mode,"normal");
 assert.equal([...f.a.items.values()].find(i=>i.type==="weapon").system.uses.spent,3);
 const keys=[...f.a.items.values()].map(i=>i.flags?.[scope]?.beastEssenceGrant?.key);
 assert(keys.includes("new-trait"));assert(keys.includes("archetype"));assert(f.a.items.has("manual"));
 assert.equal(f.a.system.energy.generated,10);assert.equal(f.a.system.legacy2.actions.value,3);assert.equal(f.token.texture.src,"wolf.webp");
 const count=f.commits;await f.runtime.synchronizeBeastEssence(f.a);assert.equal(f.commits,count);
});
test("lowering an active essence Rank ends unavailable forms and restores the token",async()=>{
 const f=fixture({active:true,rank:4});f.a.flags[scope].beastEssence.integrated.growth="heaven";
 await f.runtime.setBeastEssenceGrowth(f.a,"human","","old");
 assert.equal(f.a.flags[scope].beastEssence.integrated.growth,"human");assert.equal(f.a.flags[scope].beastEssence.transformation.active,false);
 assert.equal(f.token.texture.src,"hero.webp");assert.equal(f.a.items.has("grant"),false);assert(f.a.items.has("manual"));assert.equal(f.a.system.energy.generated,10);
});
test("editing inventory essence Rank changes future integration rather than a separately integrated essence",async()=>{
 const f=fixture();await f.runtime.queueBeastEssenceIntegration(f.a,"loot");
 await f.runtime.setBeastEssenceGrowth(f.a,"divine","loot","new");
 assert.equal(f.a.items.get("loot").flags[scope].beastEssenceItem.definition.growth,"divine");
 assert.equal(f.a.items.get("loot").system.quantity,2);assert.equal(f.a.flags[scope].beastEssence.integrated.growth,"human");
 const result=await f.rest("changed-growth");assert.equal(result.dc,18);assert.equal(result.success,true);assert.equal(f.a.flags[scope].beastEssence.integrated.growth,"divine");
});
test("essence Rank edits reject players, invalid growth, missing targets and replaced integration",async()=>{
 const player=fixture({isGM:false});await assert.rejects(()=>player.runtime.setBeastEssenceGrowth(player.a,"earth","","old"),/Narrador/);assert.equal(player.commits,0);
 const f=fixture();for(const growth of ["",null,"invalid","constructor",1])await assert.rejects(()=>f.runtime.setBeastEssenceGrowth(f.a,growth,"","old"),/crescimento|Rank/);
 await assert.rejects(()=>f.runtime.setBeastEssenceGrowth(f.a,"earth","manual","old"),/essência/);
 await assert.rejects(()=>f.runtime.setBeastEssenceGrowth(f.a,"earth","","replaced"),/mudou|substituída/);
 assert.equal(f.commits,0);
});
test("failed essence Rank edits cannot partially change form grants or growth",async()=>{
 const f=fixture({active:true}),before=structuredClone({flags:f.a.flags,items:[...f.a.items],token:f.token.texture});f.failWrite();
 await assert.rejects(()=>f.runtime.setBeastEssenceGrowth(f.a,"earth","","old"),/write failed/);
 assert.deepEqual({flags:f.a.flags,items:[...f.a.items],token:f.token.texture},before);
});


test("editing integrated skill selections reconciles active grants without refilling uses or spending resources",async()=>{
 const f=fixture({nativeGrants:true}),e=f.a.flags[scope].beastEssence.integrated;
 const skill=key=>({key,level:1,data:{name:key,type:"feat",system:{uses:{spent:0,max:5},activities:{}}}});
 e.archetype={features:[skill("a"),skill("b"),skill("c")]};e.normalArchetypeFeatures=["a","b"];e.weakenedArchetypeFeatures=["b"];
 await f.runtime.activateBeastEssence(f.a);const first=[...f.a.items.values()].find(i=>i.name==="a");first.system.uses.spent=3;
 const before={qi:f.a.system.energy.generated,actions:f.a.system.legacy2.actions.value,points:f.a.system.cultivation.points};
 await f.runtime.setBeastEssenceSelections(f.a,{normalArchetypeFeatures:["a","c"],weakenedArchetypeFeatures:["c"]},"",e.id);
 assert.deepEqual([...f.a.items.values()].filter(i=>i.flags?.[scope]?.beastEssenceGrant?.kind==="archetype").map(i=>i.name),["a","c"]);
 assert.equal([...f.a.items.values()].find(i=>i.name==="a").system.uses.spent,3);assert.deepEqual({qi:f.a.system.energy.generated,actions:f.a.system.legacy2.actions.value,points:f.a.system.cultivation.points},before);
 assert.equal(f.a.flags[scope].beastEssence.transformation.active,true);assert.equal(f.token.texture.src,"wolf.webp");assert(f.a.items.has("manual"));
});
test("inventory skill choices persist without integrating and invalid choices cannot mutate an essence",async()=>{
 const f=fixture(),e=f.a.items.get("loot").flags[scope].beastEssenceItem.definition;
 e.archetype={features:[{key:"pick",level:1,data:{name:"pick",type:"feat",system:{activities:{}}}}]};
 await f.runtime.setBeastEssenceSelections(f.a,{normalArchetypeFeatures:["pick"],weakenedArchetypeFeatures:["pick"]},"loot",e.id);
 assert.deepEqual(f.a.items.get("loot").flags[scope].beastEssenceItem.definition.normalArchetypeFeatures,["pick"]);assert.equal(f.a.items.get("loot").system.quantity,2);assert.equal(f.a.flags[scope].beastEssence.integrated.id,"old");
 const before=f.commits;await assert.rejects(()=>f.runtime.setBeastEssenceSelections(f.a,{normalArchetypeFeatures:["foreign"]},"loot",e.id),/Seleção/);assert.equal(f.commits,before);
 const player=fixture({isGM:false});await assert.rejects(()=>player.runtime.setBeastEssenceSelections(player.a,{},"","old"),/Narrador/);
});
test("reconciliation removes stale automatic archetype grants even when the old signature is still current",async()=>{
 const f=fixture({nativeGrants:true});await f.runtime.activateBeastEssence(f.a);const form=f.a.flags[scope].beastEssence.transformation;
 const old={id:"stale",type:"feat",name:"old",flags:{[scope]:{beastEssenceGrant:{integrationId:"old",key:"old-skill",kind:"archetype"}}}};
 f.a.items.set(old.id,old);form.grantedItemIds.push(old.id);
 await f.runtime.synchronizeBeastEssence(f.a);assert.equal(f.a.items.has(old.id),false);assert(f.a.items.has("manual"));
});
