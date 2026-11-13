import assert from "node:assert/strict"; import {test} from "node:test"; let prepare; try {({prepareBeastEssenceActivation: prepare}=await import("../module/systems/beast-essence-use.mjs"));} catch (e) {if (e.code!=="ERR_MODULE_NOT_FOUND") throw e;} const s="Immortals-system";
/**
 *
 * @param kind
 */
function fixture(kind="naturalWeapon") {const e={version: 1, id: "e", growth: "human", ability: "str", elements: [], naturalWeapons: [{key: "claw"}], taxonomy: {features: []}, normalFeatures: [], weakenedFeatures: [], normalAttacks: ["attack"], weakenedAttacks: [], attacks: [{key: "attack", actions: 2, damageInstances: 2, effectQi: 0, area: false}]}; const key=kind==="attack"?"attack":"claw"; const a={type: "character", isOwner: true, system: {cultivation: {rank: 1, stage: 1}, legacy2: {actions: {value: 3}}}, flags: {[s]: {beastEssence: {integrated: e, transformation: {active: true, integrationId: "e", grantedItemIds: ["i"]}}}}}; const item={id: "i", isEmbedded: true, isOwner: true, actor: a, flags: {[s]: {beastEssenceGrant: {integrationId: "e", key, kind}}}}; a.items=new Map([["i", item]]); return {a, item, activity: {id: "act", item, actor: a, activation: {value: kind==="attack"?2:1}, consumption: {targets: []}, flags: {[s]: {beastEssenceActivity: {integrationId: "e", key, kind}}}}};}
test("natural attacks charge native actions only while the actual granted Item is active", () => {assert.equal(typeof prepare, "function"); const f=fixture(); assert.equal(prepare(f.activity, {consume: true}).actor["system.legacy2.actions.value"], 2); f.a.flags[s].beastEssence.transformation.active=false; assert.throws(() => prepare(f.activity, {consume: true}), /transformação|forma/i);});
test("copied metadata outside the managed grant list cannot authorize a use", () => {const f=fixture(); f.a.flags[s].beastEssence.transformation.grantedItemIds=[]; assert.throws(() => prepare(f.activity, {consume: true}), /concessão|essência|pertenc/i);});
test("weakened form cannot retain a normal special attack or archetype activity", () => {const f=fixture("attack"); f.a.system.cultivation.rank=3; assert.throws(() => prepare(f.activity, {consume: true}), /forma|ataque/i);});
test("mandatory native resources cannot be disabled and pending special cost is explicit", () => {const f=fixture(); f.activity.consumption.targets=[{type: "attribute", target: "energy.generated", value: "2"}]; assert.throws(() => prepare(f.activity, {consume: false}), /consumo|recursos/); const attack=fixture("attack"); assert.throws(() => prepare(attack.activity, {consume: true}), /custo|definição|regra/);});


test("the single archetype skill chosen for weakened form can be used and unselected skills cannot",()=>{
 const f=fixture("archetype"),e=f.a.flags[s].beastEssence.integrated;e.archetype={features:[{key:"claw",level:1}]};e.normalArchetypeFeatures=[];e.weakenedArchetypeFeatures=["claw"];f.a.system.cultivation.rank=3;
 assert.equal(prepare(f.activity,{consume:true}).actor["system.legacy2.actions.value"],2);
 e.weakenedArchetypeFeatures=[];assert.throws(()=>prepare(f.activity,{consume:true}),/forma|disponível/);
});
