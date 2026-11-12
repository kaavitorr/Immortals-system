import assert from "node:assert/strict";
import {test} from "node:test";
let training = {};
try { training = await import("../module/systems/elemental-training-time.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const scope = "Immortals-system", jobPath = "flags.Immortals-system.elementalTrainingJobs";
const actor = () => ({flags: {[scope]: {}}, system: {energy: {generated: 200, total: 500}, cultivation: {points: 20, spentTrainingPoints: 7},
  legacy2: {especiaisExtra: 2, pontos: {extra: 40, gastos: 11}}, conceitos: {fogo: {level: 1, unlocked: true, failures: {2: 2}, spentTrainingPoints: 3, lostTrainingPoints: 4, note: "manual"}}, elementAbilities: {fogo: {qiFlamejante: 2}}}});
function apply(target, updates) { for (const [path, value] of Object.entries(updates)) { const parts = path.split("."), last = parts.pop(); let object = target;
  for (const part of parts) object = object[part] ??= {};
  if (last.startsWith("-=")) delete object[last.slice(2)]; else object[last] = structuredClone(value);
} }
const start = (a, id = "fogo", options = {}) => { assert.equal(typeof training.startElementalTrainingJob, "function"); return training.startElementalTrainingJob(a, id,
  {targetLevel: 2, totalDays: 3, qiPerDay: 30, ...options}); };
const advance = (a, days, options) => { assert.equal(typeof training.advanceElementalTrainingDays, "function"); return training.advanceElementalTrainingDays(a, days, options); };
const jobs = a => a.flags[scope].elementalTrainingJobs ?? {};

test("starting after a paid first day records only the remaining days, without charging Qi or PC again", () => {
  const a = actor(), before = structuredClone(a), updates = start(a, "fogo", {worldTime: 100});
  assert.deepEqual(updates[jobPath + ".fogo"], {targetLevel: 2, totalDays: 3, remainingDays: 2, qiPerDay: 30, pool: "generated", startedAt: 100});
  assert.equal(Object.keys(updates).some(key => key.startsWith("system.")), false); assert.deepEqual(a, before);
  assert.deepEqual(start(a, "fogo", {totalDays: 1}), {});
});

test("each additional day pays its full Qi cost and the exact last day grants only level and unlock", () => {
  const a = actor(); apply(a, start(a)); const before = structuredClone(a);
  const first = advance(a, 1); assert.equal(first.daysProgressed, 1); assert.equal(first.qiSpent, 30); assert.deepEqual(first.completed, []);
  assert.deepEqual(a, before); apply(a, first.updates); assert.equal(jobs(a).fogo.remainingDays, 1); assert.equal(a.system.conceitos.fogo.level, 1);
  const final = advance(a, 1); assert.deepEqual(final.completed, ["fogo"]); assert.equal(final.qiSpent, 30); apply(a, final.updates);
  assert.equal(a.system.energy.generated, 140); assert.equal(a.system.energy.total, 500); assert.equal(a.system.cultivation.points, 20); assert.equal(a.system.cultivation.spentTrainingPoints, 7);
  assert.deepEqual(a.system.conceitos.fogo, {...before.system.conceitos.fogo, level: 2, unlocked: true});
  assert.deepEqual(a.system.elementAbilities, before.system.elementAbilities); assert.equal(jobs(a).fogo, undefined);
  assert.deepEqual(advance(a, 10).completed, []);
});

test("insufficient Qi pauses a whole day without partial spending or extra PC cost", () => {
  const a = actor(); a.system.energy.generated = 29; apply(a, start(a));
  const result = advance(a, 1); assert.equal(result.daysProgressed, 0); assert.equal(result.qiSpent, 0); assert.deepEqual(result.completed, []);
  assert(result.paused.some(entry => entry.id === "fogo" && /Qi/.test(entry.reason))); apply(a, result.updates);
  assert.equal(a.system.energy.generated, 29); assert.equal(jobs(a).fogo.remainingDays, 2); assert.equal(jobs(a).fogo.paused, true);
  a.system.energy.generated = 30; const resumed = advance(a, 1); apply(a, resumed.updates);
  assert.equal(a.system.energy.generated, 0); assert.equal(jobs(a).fogo.remainingDays, 1); assert.equal(jobs(a).fogo.paused, false);
});

test("multiple jobs share affordable days without choosing an element priority", () => {
  const a = actor(); a.system.conceitos.agua = {level: 1}; a.system.energy.generated = 69;
  apply(a, start(a, "fogo", {qiPerDay: 30})); apply(a, start(a, "agua", {qiPerDay: 40}));
  const blocked = advance(a, 1); assert.equal(blocked.qiSpent, 0); assert.equal(blocked.daysProgressed, 0);
  assert.deepEqual(blocked.paused.map(entry => entry.id).sort(), ["agua", "fogo"]); apply(a, blocked.updates);
  assert.equal(jobs(a).fogo.remainingDays, 2); assert.equal(jobs(a).agua.remainingDays, 2);
  a.system.energy.generated = 100; const day = advance(a, 3); apply(a, day.updates);
  assert.equal(day.qiSpent, 70); assert.equal(day.daysProgressed, 1); assert.equal(a.system.energy.generated, 30);
  assert.equal(jobs(a).fogo.remainingDays, 1); assert.equal(jobs(a).agua.remainingDays, 1);
});

test("parallel explicit total-Qi and refined-Qi jobs debit separate pools atomically", () => {
  const a = actor(); a.system.conceitos.agua = {level: 1}; a.system.energy.generated = 50; a.system.energy.total = 50;
  apply(a, start(a, "fogo", {qiPerDay: 30})); apply(a, start(a, "agua", {qiPerDay: 40, pool: "total"}));
  const result = advance(a, 2); apply(a, result.updates);
  assert.equal(result.daysProgressed, 1); assert.equal(result.qiSpent, 70); assert.equal(a.system.energy.generated, 20); assert.equal(a.system.energy.total, 10);
});

test("completed parallel jobs stop costing Qi while unfinished jobs continue on later days", () => {
  const a = actor(); a.system.conceitos.agua = {level: 1};
  apply(a, start(a, "fogo", {totalDays: 2, qiPerDay: 30})); apply(a, start(a, "agua", {totalDays: 4, qiPerDay: 40}));
  const result = advance(a, 3); apply(a, result.updates);
  assert.deepEqual(result.completed.sort(), ["agua", "fogo"]); assert.equal(result.qiSpent, 150); assert.equal(result.daysProgressed, 3); assert.equal(a.system.energy.generated, 50);
});

test("stale levels and invalid remaining-day records never earn a free concept level", () => {
  for (const invalid of ["level", "remaining", "target"]) {
    const a = actor(); apply(a, start(a));
    if (invalid === "level") a.system.conceitos.fogo.level = 2;
    if (invalid === "remaining") jobs(a).fogo.remainingDays = 0;
    if (invalid === "target") jobs(a).fogo.targetLevel = 10;
    const before = structuredClone(a), result = advance(a, 99); apply(a, result.updates);
    assert.deepEqual(result.completed, []); assert.equal(result.qiSpent, 0); assert.equal(a.system.conceitos.fogo.level, before.system.conceitos.fogo.level); assert(result.paused.length);
  }
});

test("the same or older world-time receipt cannot credit or charge the same calendar event twice", () => {
  const a = actor(); apply(a, start(a, "fogo", {totalDays: 4, worldTime: 100}));
  const first = advance(a, 1, {worldTime: 200}); apply(a, first.updates); const after = structuredClone(a);
  for (const worldTime of [200,150,100]) { const repeated = advance(a, 1, {worldTime}); assert.deepEqual(repeated.updates, {}); assert.equal(repeated.daysProgressed, 0); assert.deepEqual(a, after); }
  const next = advance(a, 1, {worldTime: 300}); apply(a, next.updates); assert.equal(next.daysProgressed, 1); assert.equal(jobs(a).fogo.remainingDays, 1);
});

test("a paused Qi event remains consumed and cannot be replayed after refilling Qi", () => {
  const a = actor(); a.system.energy.generated = 0; apply(a, start(a, "fogo", {worldTime: 100}));
  const blocked = advance(a, 1, {worldTime: 200}); apply(a, blocked.updates); a.system.energy.generated = 100;
  const replay = advance(a, 1, {worldTime: 200}); assert.equal(replay.daysProgressed, 0); assert.deepEqual(replay.updates, {});
  assert.equal(advance(a, 1, {worldTime: 300}).daysProgressed, 1);
});

test("a job cannot reuse an event at or before its paid first-day starting time", () => {
  const a = actor(); apply(a, start(a, "fogo", {worldTime: 200}));
  const result = advance(a, 1, {worldTime: 200}); assert.equal(result.daysProgressed, 0); assert.equal(result.qiSpent, 0); assert.deepEqual(result.completed, []);
});

test("active general training awards one PC per ten days with remainder and no PP change", () => {
  assert.equal(typeof training.startGeneralTrainingUpdate, "function"); const a = actor();
  apply(a, training.startGeneralTrainingUpdate(a, true)); const beforePP = structuredClone(a.system.legacy2.pontos);
  const first = advance(a, 9); apply(a, first.updates); assert.equal(a.system.cultivation.points, 20); assert.equal(a.flags[scope].generalTraining.days, 9);
  const next = advance(a, 12); apply(a, next.updates); assert.equal(a.system.cultivation.points, 22); assert.equal(a.flags[scope].generalTraining.days, 1); assert.equal(next.qiSpent, 0);
  assert.deepEqual(a.system.legacy2.pontos, beforePP); assert.equal(a.system.cultivation.spentTrainingPoints, 7);
  apply(a, training.startGeneralTrainingUpdate(a, false)); assert.equal(advance(a, 20).daysProgressed, 0);
});

test("general training stays paused throughout an event that includes elemental training", () => {
  const a = actor(); a.flags[scope].generalTraining = {active: true, days: 9, note: "keep"};
  apply(a, start(a, "fogo", {totalDays: 2})); const result = advance(a, 20); apply(a, result.updates);
  assert.deepEqual(result.completed, ["fogo"]); assert.equal(a.system.cultivation.points, 20); assert.equal(a.flags[scope].generalTraining.days, 9);
  assert.equal(a.flags[scope].generalTraining.note, "keep"); assert.equal(a.flags[scope].generalTraining.paused, true);
  const next = advance(a, 1); apply(a, next.updates); assert.equal(a.system.cultivation.points, 21); assert.equal(a.flags[scope].generalTraining.paused, false);
});

test("ten-PC talent exchange debits its own ledger once and preserves independent proficiency balances", () => {
  assert.equal(typeof training.cultivationTalentExchange, "function"); const a = actor(), before = structuredClone(a);
  const updates = training.cultivationTalentExchange(a); assert.deepEqual(a, before); apply(a, updates);
  assert.equal(a.system.cultivation.points, 10); assert.equal(a.system.cultivation.spentTrainingPoints, 17); assert.equal(a.system.legacy2.especiaisExtra, 3);
  assert.deepEqual(a.system.legacy2.pontos, before.system.legacy2.pontos); a.system.cultivation.points = 9;
  assert.throws(() => training.cultivationTalentExchange(a), /Cultivo|PC|pontos/i);
});

test("invalid job starts reject unknown elements, nonsequential levels, invalid pools and free-day costs", () => {
  const a = actor();
  for (const [id, options] of [["unknown",{}],["fogo",{targetLevel:4}],["fogo",{pool:"wrong"}],["fogo",{qiPerDay:0}],["fogo",{totalDays:0}]]) assert.throws(() => start(a,id,options));
  apply(a,start(a)); assert.throws(() => start(a), /andamento|ativo|exist/i);
});

test("calendar days advance the retry epoch even when only attempt receipts remain", () => {
  const a = actor(); a.flags[scope].elementalTrainingDay = 4; a.flags[scope].elementalTrainingAttempts = {fogo: {day: 4, targetLevel: 2}};
  const result = advance(a, 3, {worldTime: 100}); apply(a, result.updates);
  assert.equal(a.flags[scope].elementalTrainingDay, 7); assert.equal(result.qiSpent, 0); assert.deepEqual(a.flags[scope].elementalTrainingAttempts, {fogo: {day: 4, targetLevel: 2}});
  assert.deepEqual(advance(a, 3, {worldTime: 100}).updates, {}); assert.equal(a.flags[scope].elementalTrainingDay, 7);
});
