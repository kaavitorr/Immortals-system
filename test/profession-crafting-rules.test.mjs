import assert from "node:assert/strict";
import {test} from "node:test";
let rules;
try { rules = await import("../module/systems/profession-crafting-rules.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; rules = {}; }
const use = name => { assert.equal(typeof rules[name], "function", name + " must implement profession rules"); return rules[name]; };
const actor = (level = 0, profession = "alchemy") => ({type: "character", flags: {"Immortals-system": {professions: {[profession]: {level}}}}, system: {cultivation: {rank: 1, soulCultivation: 0, points: 100}, skills: {}}});
const pill = {id: "healing", profession: "alchemy", levels: {min: 1, max: 10}, dc: {min: 14, max: 14}};

test("profession levels use independent persisted ledgers and default to zero", () => {
  const a = actor(4), before = structuredClone(a);
  assert.equal(use("professionLevel")(a, "alchemy"), 4);
  assert.equal(rules.professionLevel(a, "matrices"), 0);
  a.flags["Immortals-system"].professions.alchemy.level = 11;
  assert.equal(rules.professionLevel(a, "alchemy"), 0);
  assert.throws(() => rules.professionLevel(before, "constructor"));
});

test("entry has its own Qi control check and costs cultivation PC", () => {
  const a = actor(), before = structuredClone(a);
  const p = use("professionCraftingPlan")(a, {profession: "alchemy", product: pill, level: 1, advancement: true, firstRecipe: true});
  assert.equal(p.entry, true); assert.equal(p.pcCost, 5); assert.equal(p.pcAvailable, 100); assert.equal(p.pcAffordable, true);
  assert.equal(p.pcPath, "system.cultivation.points"); assert.equal(p.dc, 20);
  assert.deepEqual(p.checks.map(c => [c.skill, c.ability]), [["arc", "con"]]);
  assert.ok(p.manualPrerequisites.includes("mentor")); assert.ok(p.manualPrerequisites.includes("studentTalent"));
  assert.equal(p.requiresPrerequisiteConfirmation, true); assert.equal(p.durationHours, 10);
  assert.deepEqual(a, before);
});

test("advancement only accepts the next level, uses three native checks and charges every attempt", () => {
  const a = actor(3), p = use("professionCraftingPlan")(a, {profession: "alchemy", product: pill, level: 4, advancement: true});
  assert.equal(p.pcCost, 20); assert.equal(p.dc, 19); assert.equal(p.targetLevel, 4);
  assert.deepEqual(p.checks.map(c => [c.skill, c.ability]), [["slt", "dex"], ["ani", "wis"], ["arc", "con"]]);
  assert.throws(() => rules.professionCraftingPlan(a, {profession: "alchemy", product: pill, level: 5, advancement: true}), /próximo/i);
  assert.throws(() => rules.professionCraftingPlan(a, {profession: "alchemy", product: pill, level: 4}), /nível/i);
  assert.throws(() => rules.professionCraftingPlan(actor(10), {profession: "alchemy", product: pill, level: 10, advancement: true}));
  a.system.cultivation.points = 2;
  assert.equal(rules.professionCraftingPlan(a, {profession: "alchemy", product: pill, level: 4, advancement: true}).pcAffordable, false);
});

test("professional and cultivation reductions stack while level validation remains strict", () => {
  const a = actor(6); a.system.cultivation.rank = 5; a.system.cultivation.soulCultivation = 8;
  const p = use("professionCraftingPlan")(a, {profession: "alchemy", product: pill, level: 4});
  assert.equal(p.dc, 1); assert.equal(p.levelReduction, 4); assert.equal(p.cultivationReduction, 9); assert.equal(p.pcCost, 0);
  assert.equal(rules.professionCraftingPlan(a, {profession: "alchemy", product: pill, level: 6}).cultivationReduction, 5);
  for (const level of [0, 1.5, 11, NaN, true]) assert.throws(() => rules.professionCraftingPlan(a, {profession: "alchemy", product: pill, level}));
  assert.throws(() => rules.professionCraftingPlan(a, {profession: "alchemy", product: {...pill, profession: "matrices"}, level: 4}));
  assert.throws(() => rules.professionCraftingPlan(a, {profession: "alchemy", product: {...pill, levels: {min: 5, max: 10}}, level: 4}));
});

test("matrix crafting uses only creation and Qi control with the documented duration", () => {
  const p = use("professionCraftingPlan")(actor(4, "matrices"), {profession: "matrices", product: {...pill, profession: "matrices"}, level: 3, firstRecipe: true});
  assert.deepEqual(p.checks.map(c => c.skill), ["ani", "arc"]); assert.equal(p.durationHours, 30);
  const inscription = rules.professionCraftingPlan(actor(2, "inscriptions"), {profession: "inscriptions", product: {...pill, profession: "inscriptions"}, level: 1});
  assert.equal(inscription.durationHours, null);
});

test("variable difficulty requires an explicit value and never invents an artisan DC", () => {
  const a = actor(3), product = {...pill, dc: {min: 14, max: 20}};
  const pending = use("professionCraftingPlan")(a, {profession: "alchemy", product, level: 3});
  assert.equal(pending.dc, null); assert.ok(pending.pending.includes("baseDC"));
  assert.equal(rules.professionCraftingPlan(a, {profession: "alchemy", product, level: 3, baseDC: 18}).dc, 18);
  assert.throws(() => rules.professionCraftingPlan(a, {profession: "alchemy", product, level: 3, baseDC: 21}));
  assert.equal(rules.professionCraftingPlan(actor(2, "artisan"), {profession: "artisan", level: 2}).dc, null);
});

test("quality defaults to the author-confirmed Creation criterion", () => {
  const q = use("qualityResult")([14, 26, 26], 14);
  assert.equal(q.success, true); assert.equal(q.pending, false); assert.equal(q.key, "perfect");
  assert.equal(rules.qualityResult([13, 26, 26], 14, {method: "creation"}).success, false);
  const minimum = rules.qualityResult([14, 26, 26], 14, {method: "minimum"});
  assert.equal(minimum.key, "inferior"); assert.equal(minimum.label, "Inferior"); assert.equal(minimum.baseToxins, 20);
  const creation = rules.qualityResult([14, 26, 26], 14, {method: "creation"});
  assert.equal(creation.key, "perfect"); assert.equal(creation.margin, 12); assert.equal(creation.baseToxins, 2);
});

test("quality thresholds use exact margins and every required check must pass", () => {
  for (const [margin, key, toxins] of [[0,"inferior",20],[2,"inferior",20],[3,"common",8],[7,"common",8],[8,"superior",4],[11,"superior",4],[12,"perfect",2]]) {
    const q = use("qualityResult")([14 + margin, 14 + margin, 14 + margin], 14, {method: "minimum"});
    assert.equal(q.key, key); assert.equal(q.baseToxins, toxins);
  }
  assert.equal(rules.qualityResult([{skill:"slt",total:14},{skill:"ani",total:22},{skill:"arc",total:14}], 14, {method:"creation"}).key, "superior");
  assert.throws(() => rules.qualityResult([], 14)); assert.throws(() => rules.qualityResult([NaN], 14));
});

test("toxin multipliers preserve fractions unless the source explicitly floors them", () => {
  assert.equal(use("pillToxinAmount")("perfect", 0.2), 0.4);
  assert.equal(rules.pillToxinAmount("perfect", 0.2, {floor: true}), 0);
  assert.equal(rules.pillToxinAmount("common", 0.5), 4);
  assert.equal(rules.pillToxinAmount(4, 0.2), 0.8);
  assert.throws(() => rules.pillToxinAmount("unknown", 1)); assert.throws(() => rules.pillToxinAmount("inferior", -1));
});

test("toxicity penalties use completed groups and cultivation remains blocked until fully clear", () => {
  const p = use("toxicityPenalties")(109.5);
  assert.equal(p.rankDC, 10); assert.equal(p.rankPC, 10); assert.equal(p.stagePC, 21); assert.equal(p.blockedUntilClear, true); assert.equal(p.value, 109.5);
  assert.equal(rules.toxicityPenalties(15, {blockedUntilClear: true}).blockedUntilClear, true);
  assert.equal(rules.toxicityPenalties(0, {blockedUntilClear: true}).blockedUntilClear, false);
  assert.equal(rules.toxicityPenalties(100).blockedUntilClear, false);
  assert.throws(() => rules.toxicityPenalties(-1));
});

test("toxin state updates preserve the peak detox rate and block without mutating the actor", () => {
  const a = actor(); a.flags["Immortals-system"].pillToxins = {value: 120, highestValue: 120, blockedUntilClear: true};
  const before = structuredClone(a), next = use("toxinStateUpdate")(a, 12);
  assert.equal(next.state.value, 12); assert.equal(next.state.highestValue, 120); assert.equal(next.state.blockedUntilClear, true);
  assert.deepEqual(next.updates["flags.Immortals-system.pillToxins"], {value:12,highestValue:120,blockedUntilClear:true});
  assert.deepEqual(rules.toxinStateUpdate(a, 0).state, {value:0,highestValue:0,blockedUntilClear:false});
  assert.deepEqual(use("toxinState")(actor()), {value:0,highestValue:0,blockedUntilClear:false}); assert.deepEqual(a, before);
});

test("detox timing retains the reached tier and signals unknown upper and calendar rates", () => {
  assert.equal(use("detoxPeriod")(20).daysPerPoint, 5); assert.equal(rules.detoxPeriod(50).daysPerPoint, 10);
  assert.equal(rules.detoxPeriod(12, {highestValue: 40}).daysPerPoint, 10);
  const month = rules.detoxPeriod(90); assert.equal(month.calendarMonthsPerPoint, 1); assert.equal(month.daysPerPoint, null); assert.equal(month.requiresCalendar, true);
  assert.equal(rules.detoxPeriod(90, {monthDays: 31}).daysPerPoint, 31);
  assert.equal(rules.detoxPeriod(91).pending, true); assert.equal(rules.detoxPeriod(12, {highestValue: 120}).pending, true);
  assert.equal(rules.detoxPeriod(0, {highestValue: 120}).daysPerPoint, 0);
});

test("treasure equivalences preserve the authoritative ten level table", () => {
  const expected = [["human","inferior"],["human","common"],["human","superior"],["earth","common"],["heaven","inferior"],["heaven","superior"],["sacred","inferior"],["sacred","superior"],["divine","unique"],["supreme","unique"]];
  for (let level=1;level<=10;level++) assert.deepEqual([use("treasureProfile")(level).rank, rules.treasureProfile(level).quality], expected[level-1]);
  assert.throws(() => rules.treasureProfile(0)); assert.throws(() => rules.treasureProfile(11));
});

test("treasure effects use rank and cumulative class steps with the stated accessory cap", () => {
  const human = use("treasureProfile")(1), earth = rules.treasureProfile(4), supreme = rules.treasureProfile(10);
  assert.equal(human.armor.resistanceAll, 1); assert.equal(human.weapon.formula, "1d4"); assert.equal(human.accessory.qiLimit, 4); assert.equal(human.flying.cr, 18); assert.equal(human.flying.movement, 21);
  assert.equal(earth.armor.resistanceAll, 2); assert.equal(earth.armor.ignoresCultivationRankAtMost, 2); assert.equal(earth.weapon.offensiveBurstLimitBonus, 2); assert.equal(earth.accessory.qiLimit, 10);
  assert.equal(supreme.armor.resistanceAll, 10); assert.equal(supreme.weapon.formula, "1d12 + 1"); assert.equal(supreme.accessory.qiLimit, 27); assert.equal(supreme.flying.cr, 28); assert.equal(supreme.flying.movement, 60);
  assert.equal(use("treasureCraftingDC")({equipmentLevel:4,equivalentLevel:3}),12);
  assert.throws(() => rules.treasureCraftingDC({equipmentLevel:4}));
});

test("beast taming separates current rank eligibility and duration from maximum rank difficulty", () => {
  const p = use("beastDomesticationPlan")({professionLevel:6,currentRank:4,maxRank:10});
  assert.equal(p.eligible, true); assert.equal(p.durationDays, 8); assert.equal(p.baseDC, 35); assert.equal(p.dc, 31); assert.equal(p.check.skill, "ani");
  assert.equal(rules.beastDomesticationPlan({professionLevel:6,currentRank:4,maxRank:10,failures:3}).permanentFailure,true);
  assert.equal(rules.beastDomesticationPlan({professionLevel:3,currentRank:4,maxRank:4}).eligible,false);
  assert.equal(rules.beastDomesticationPlan({professionLevel:6,currentRank:4,maxRank:4,adult:true}).eligible,false);
  assert.throws(() => rules.beastDomesticationPlan({professionLevel:6,currentRank:4,maxRank:3}));
});

test("beast maximum rank difficulty table and growth multiplier use exact source values", () => {
  assert.deepEqual(Array.from({length:10},(_,i)=>use("beastDomesticationPlan")({professionLevel:i+1,currentRank:i+1,maxRank:i+1}).baseDC), [12,13,15,17,20,23,25,28,32,35]);
  assert.equal(use("beastGrowthMultiplier")(6,4),25); assert.equal(rules.beastGrowthMultiplier(4,4),1); assert.equal(rules.beastGrowthMultiplier(2,4),1);
});

test("financial calculation defaults to materials and preserves currency denominations", () => {
  const quoted = use("professionPrice")(1, {creationPercent:60,salePercent:15}); assert.equal(quoted.pending,false); assert.equal(quoted.creation.amount,300);
  const materials = rules.professionPrice(1, {basis:"materials",creationPercent:60,salePercent:15});
  assert.deepEqual(materials.creation, {amount:300,currency:"gp",rank:null}); assert.equal(materials.sale.amount,45);
  assert.equal(rules.professionPrice(1, {basis:"recipeAndMaterials",creationPercent:60}).creation.amount,2100);
  const crystals = rules.professionPrice(4, {basis:"materials",creationPercent:500,salePercent:200});
  assert.deepEqual(crystals.creation, {amount:500,currency:"spiritualCrystals",rank:"human"}); assert.equal(crystals.sale.amount,1000);
  assert.equal(rules.professionPrice(5, {basis:"materials",creationPercent:100}).creation.rank,"earth");
  assert.equal(rules.professionPrice(6, {basis:"materials",creationPercent:100}).creation.rank,"heaven");
  assert.equal(rules.professionPrice(7, {basis:"materials",creationPercent:100}).marketManual,false);
  assert.throws(() => rules.professionPrice(1, {basis:"guess",creationPercent:100}));
});


test("invalid resource balances cannot make a profession attempt affordable", () => {
  const a = actor();
  for (const value of [Infinity, -5, NaN, true]) {
    a.system.cultivation.points = value;
    const p = use("professionCraftingPlan")(a, {profession:"alchemy",product:pill,level:1,advancement:true});
    assert.equal(p.pcAvailable, 0); assert.equal(p.pcAffordable, false);
  }
});
