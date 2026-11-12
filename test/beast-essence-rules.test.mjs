import assert from "node:assert/strict";
import {test} from "node:test";
let rules;
try {rules=await import("../module/systems/beast-essence-rules.mjs");}
catch (error) {if (error.code!=="ERR_MODULE_NOT_FOUND") throw error; rules={};}
const scope="Immortals-system"; const use=name => {assert.equal(typeof rules[name], "function", `${name} must exist`); return rules[name];};
const definition=(growth="human") => ({version: 1, id: "essence000000001", name: "Essência de Lobo", img: "wolf.webp", growth, ability: "str", elements: ["fogo"], normalFeatures: ["a", "b"], weakenedFeatures: ["a"], normalAttacks: ["atk1", "atk2"], weakenedAttacks: ["atk1"], features: [], attacks: [], naturalWeapons: []});
/**
 *
 * @param root0
 * @param root0.rank
 * @param root0.stage
 * @param root0.growth
 * @param root0.active
 * @param root0.str
 * @param root0.points
 */
function actor({rank=1, stage=1, growth="human", active=false, str=4, points=10}={}) {const integrated=definition(growth); return {type: "character", system: {cultivation: {rank, stage, points}, abilities: {str: {value: str}, con: {value: 3}}, energy: {generated: 10}}, flags: {[scope]: {beastEssence: {version: 1, integrated, transformation: {active, integrationId: integrated.id}}}}};}
test("growth degrades after its ceiling and stops transformation two realms later", () => {
  const state=use("essenceGrowthState"); assert.equal(state("human", 2), "normal"); assert.equal(state("human", 3), "weakened"); assert.equal(state("human", 4), "dormant");
  assert.equal(state("earth", 4), "normal"); assert.equal(state("earth", 5), "weakened"); assert.equal(state("earth", 6), "dormant");
  assert.equal(state("heaven", 6), "normal"); assert.equal(state("heaven", 7), "weakened"); assert.equal(state("heaven", 8), "dormant");
  assert.equal(state("sacred", 7), "normal"); assert.equal(state("sacred", 8), "weakened"); assert.equal(state("sacred", 9), "dormant");
  assert.equal(state("divine", 10), "weakened"); assert.equal(state("supreme", 10), "normal");
});
test("inactive or mismatched integrations never expose active transformation benefits", () => {
  const state=use("essenceState"); assert.equal(state(actor()).active, false); const a=actor({active: true}); a.flags[scope].beastEssence.transformation.integrationId="old"; assert.equal(state(a).active, false);
  assert.equal(state(actor({rank: 4, active: true})).active, false);
  assert.equal(state(actor({rank: 3, active: true})).abilityBonus, 1); assert.equal(state(actor({rank: 3, active: true})).abilityCap, 12);
});
test("the temporary attribute bonus never exceeds its form cap or reduces an already higher attribute", () => {
  const adjustment=use("essenceAttributeAdjustment"); assert.deepEqual(adjustment(actor({active: true, str: 14})), {key: "str", before: 14, after: 15, delta: 1, cap: 15});
  assert.deepEqual(adjustment(actor({active: true, str: 17})), {key: "str", before: 17, after: 17, delta: 0, cap: 15});
  assert.equal(adjustment(actor({rank: 3, active: true, str: 12})).delta, 0); assert.equal(adjustment(actor({active: false})).delta, 0);
});
test("element affinity eligibility has the printed five or ten level limit and needs a selected element", () => {
  const discount=use("essenceAffinity"); assert.equal(discount(actor(), "fogo", 5).eligible, true); assert.equal(discount(actor(), "fogo", 6).eligible, false); assert.equal(discount(actor(), "agua", 1).eligible, false);
  assert.equal(discount(actor({growth: "divine"}), "fogo", 10).eligible, true);
});
test("integration failure spends exactly five Cultivation Points and success uses the rarity DC", () => {
  const item={type: "loot", system: {quantity: 1}, flags: {[scope]: {beastEssenceItem: {version: 1, definition: definition("supreme")}}}};
  const attempt=use("essenceIntegrationAttempt"); const a=actor({points: 9}); const original=structuredClone(a);
  const failure=attempt(a, item, {rollTotal: 19}); assert.equal(failure.success, false); assert.equal(failure.dc, 20); assert.equal(failure.pointsRemaining, 4);
  const success=attempt(a, item, {rollTotal: 20}); assert.equal(success.success, true); assert.equal(success.pointsRemaining, 4);
  assert.deepEqual(a, original); assert.throws(() => attempt(actor({points: 4}), item, {rollTotal: 30}), /PC|Cultivo/);
  item.system.quantity=0; assert.throws(() => attempt(a, item, {rollTotal: 30}), /essência|quantidade/i);
});
test("a growth roll maps every printed boundary without accepting missing or out-of-range rolls", () => {
  const growth=use("essenceGrowthFromRoll"); for (const [roll, want] of [[1, "human"], [10, "human"], [11, "earth"], [20, "earth"], [21, "heaven"], [50, "heaven"], [51, "sacred"], [80, "sacred"], [81, "divine"], [99, "divine"], [100, "supreme"]])assert.equal(growth(roll), want);
  for (const roll of [0, 101, NaN, 1.5, undefined])assert.throws(() => growth(roll));
});
test("discovery permits one roll per ten inferior beasts and uses the same/higher/divine thresholds", () => {
  const chance=use("essenceDiscoveryState"); assert.deepEqual(chance(2, 3, {lowerKills: 8}), {eligible: false, threshold: 100, nextLowerKills: 9, kind: "lower"});
  assert.deepEqual(chance(2, 3, {lowerKills: 9}), {eligible: true, threshold: 100, nextLowerKills: 0, kind: "lower"});
  assert.equal(chance(3, 3).threshold, 100); assert.equal(chance(4, 3).threshold, 95); assert.equal(chance(1, 3).eligible, false);
  assert.equal(chance(2, 3, {divineBeast: true}).threshold, 51); assert.equal(chance(null, 3).kind, "unknown");
});

test("an unresolved affinity discount is marked instead of silently charging the full cost", () => {const a=actor(); const original={qi: 15, pt: 1, dias: 1}; const result=use("essenceAffinityCost")(a, "fogo", 1, original); assert.equal(result.essenceAffinityPending, true); assert.deepEqual(original, {qi: 15, pt: 1, dias: 1}); assert.equal(use("essenceAffinityCost")(a, "agua", 1, original), original);});


test("dormant growth suspends every benefit and affinity instead of keeping permanent bonuses", () => {
  const a=actor({rank:4, active:true}); const state=use("essenceState")(a);
  assert.equal(state.active,false); assert.equal(state.qiBonus,0); assert.equal(state.formAbilityBonus,0);
  assert.equal(state.affinityPending,false); assert.equal(state.affinityLevelLimit,0); assert.deepEqual(state.elements,[]);
  const cost={qi:15,pt:3,dias:2}; assert.equal(use("essenceAffinityCost")(a,"fogo",2,cost),cost);
  a.system.cultivation.rank=2; const restored=use("essenceState")(a);
  assert.equal(restored.mode,"normal"); assert.equal(restored.formAbilityBonus,2); assert.deepEqual(restored.elements,["fogo"]);
});

test("growth keeps every cultivation stage within the ceiling for all six rarities", () => {
  for (const [growth,limit] of [["human",2],["earth",4],["heaven",6],["sacred",7],["divine",9],["supreme",10]]) {
    assert.equal(rules.ESSENCE_GROWTH[growth].limitRank,limit);
    for(let rank=1;rank<=10;rank++)for(let stage=1;stage<=3;stage++){
      const state=use("essenceState")(actor({growth,rank,stage,active:true}));
      assert.equal(state.effectiveLevel,Math.min((rank-1)*3+stage,limit*3));
      assert.equal(state.mode,rank<=limit?"normal":rank===limit+1?"weakened":"dormant");
    }
  }
});
