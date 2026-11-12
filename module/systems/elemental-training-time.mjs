import {CONCEITO_POR_ID} from "./elemental-concepts-data.mjs";
import {cultivationPointUpdates} from "./cultivation.mjs";

const scope = "Immortals-system";
const flagPath = "flags." + scope + ".";
const jobsPath = flagPath + "elementalTrainingJobs";
const flags = actor => actor?.flags?.[scope] ?? {};
const integer = value => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
const poolValid = pool => pool === "generated" || pool === "total";
const positiveInteger = value => Number.isInteger(value) && value > 0;
const knownElement = id => Object.hasOwn(CONCEITO_POR_ID, id);
const currentLevel = (actor, id) => Number(actor?.system?.conceitos?.[id]?.level ?? 0);
const generalReason = "Treinamento geral pausado enquanto houver treinamento elemental.";
const changed = (before, after) => JSON.stringify(before) !== JSON.stringify(after);

/** The caller already paid the first day's Qi and initial PC; no resource is charged here. */
export function startElementalTrainingJob(actor, id, {targetLevel, totalDays, qiPerDay, pool = "generated", worldTime = 0} = {}) {
  if (!knownElement(id)) throw Error("Conceito elemental inválido.");
  if (!positiveInteger(targetLevel) || targetLevel > 10 || currentLevel(actor, id) !== targetLevel - 1)
    throw Error("O nível atual não corresponde ao treinamento elemental.");
  if (!positiveInteger(totalDays) || !positiveInteger(qiPerDay) || !poolValid(pool) || !Number.isFinite(worldTime))
    throw Error("Dias, custo de Qi ou reserva do treinamento inválidos.");
  if (Object.hasOwn(flags(actor).elementalTrainingJobs ?? {}, id)) throw Error("Este treinamento elemental já está em andamento.");
  if (totalDays === 1) return {};
  const updates = {[jobsPath + "." + id]: {targetLevel, totalDays, remainingDays: totalDays - 1, qiPerDay, pool, startedAt: worldTime}};
  const general = flags(actor).generalTraining;
  if (general?.active) updates[flagPath + "generalTraining"] = {...structuredClone(general), paused: true, reason: generalReason};
  return updates;
}

function jobProblem(actor, id, job, worldTime) {
  if (!knownElement(id) || !job || !positiveInteger(job.targetLevel) || job.targetLevel > 10
    || !positiveInteger(job.totalDays) || job.totalDays < 2 || !positiveInteger(job.remainingDays)
    || job.remainingDays >= job.totalDays || !positiveInteger(job.qiPerDay) || !poolValid(job.pool)
    || !Number.isFinite(job.startedAt)) return "Treinamento inválido; revise os dias restantes e o custo de Qi.";
  if (currentLevel(actor, id) !== job.targetLevel - 1) return "O nível do conceito mudou desde o início do treinamento.";
  if (worldTime !== undefined && worldTime <= job.startedAt) return "Treinamento aguardando o próximo dia de calendário.";
  return "";
}

/**
 * Advance actual calendar days with one all-or-nothing Qi payment per common day.
 * worldTime is an opaque monotonic receipt; the calendar supplies days without any seconds-per-day assumption.
 */
export function advanceElementalTrainingDays(actor, days, {worldTime} = {}) {
  const result = {updates: {}, completed: [], daysProgressed: 0, qiSpent: 0, paused: []};
  const count = integer(days), saved = flags(actor), initialJobs = saved.elementalTrainingJobs ?? {};
  const hasJobs = Object.keys(initialJobs).length > 0, general = saved.generalTraining;
  const hasAttempts = Object.keys(saved.elementalTrainingAttempts ?? {}).length > 0;
  if (!count || (!hasJobs && !general?.active && !hasAttempts)) return result;
  if (worldTime !== undefined && !Number.isFinite(worldTime)) throw Error("Tempo do calendário inválido.");
  if (worldTime !== undefined && Number.isFinite(saved.trainingLastWorldTime) && worldTime <= saved.trainingLastWorldTime) return result;
  if (worldTime !== undefined) result.updates[flagPath + "trainingLastWorldTime"] = worldTime;
  const nextDay = integer(saved.elementalTrainingDay) + count;
  result.updates[flagPath + "elementalTrainingDay"] = nextDay;
  // A calendar batch already in flight cannot grant a retry to a later attempt.
  if (worldTime !== undefined) for (const [id, attempt] of Object.entries(saved.elementalTrainingAttempts ?? {})) {
    if (Number.isFinite(attempt.worldTime) && attempt.worldTime >= worldTime)
      result.updates[flagPath + "elementalTrainingAttempts." + id + ".day"] = nextDay;
  }
  const paused = new Map(), jobs = structuredClone(initialJobs);
  const balances = Object.fromEntries(["generated", "total"].map(pool => [pool,
    Number.isFinite(Number(actor.system?.energy?.[pool])) ? Math.max(0, Number(actor.system.energy[pool])) : 0]));
  const initialBalances = {...balances};
  for (const [id, job] of Object.entries(jobs)) {
    const reason = jobProblem(actor, id, job, worldTime);
    if (reason) { jobs[id] = {...job, paused: true, reason}; paused.set(id, reason); }
    else jobs[id] = {...job, paused: false, reason: ""};
  }
  for (let day = 0; day < count; day++) {
    const active = Object.entries(jobs).filter(([id]) => !paused.has(id));
    if (!active.length) break;
    const cost = {generated: 0, total: 0};
    for (const [, job] of active) cost[job.pool] += job.qiPerDay;
    if (Object.keys(cost).some(pool => cost[pool] > balances[pool])) {
      for (const [id, job] of active) {
        const reason = "Qi insuficiente para todos os treinamentos deste dia.";
        jobs[id] = {...job, paused: true, reason}; paused.set(id, reason);
      }
      break;
    }
    for (const pool of Object.keys(cost)) { balances[pool] -= cost[pool]; result.qiSpent += cost[pool]; }
    result.daysProgressed++;
    for (const [id, job] of active) {
      job.remainingDays--;
      if (job.remainingDays > 0) continue;
      result.completed.push(id);
      result.updates["system.conceitos." + id + ".level"] = job.targetLevel;
      result.updates["system.conceitos." + id + ".unlocked"] = true;
      delete jobs[id];
    }
  }
  for (const id of Object.keys(initialJobs)) {
    if (!Object.hasOwn(jobs, id)) result.updates[jobsPath + ".-=" + id] = null;
    else if (changed(initialJobs[id], jobs[id])) result.updates[jobsPath + "." + id] = jobs[id];
  }
  for (const pool of Object.keys(balances)) if (balances[pool] !== initialBalances[pool]) result.updates["system.energy." + pool] = balances[pool];
  if (general?.active && !(Number.isFinite(general.startedAt) && worldTime !== undefined && worldTime <= general.startedAt)) {
    if (hasJobs) {
      result.updates[flagPath + "generalTraining"] = {...structuredClone(general), paused: true, reason: generalReason};
      paused.set("general", generalReason);
    } else {
      const accumulated = integer(general.days) + count, earned = Math.floor(accumulated / 10);
      result.updates[flagPath + "generalTraining"] = {...structuredClone(general), days: accumulated % 10, paused: false, reason: ""};
      if (earned) result.updates["system.cultivation.points"] = integer(actor.system?.cultivation?.points) + earned;
      result.daysProgressed = count;
    }
  }
  result.paused = Array.from(paused, ([id, reason]) => ({id, reason}));
  return result;
}

/** Preserve accumulated general-training days when pausing or resuming the activity. */
export function startGeneralTrainingUpdate(actor, active, {worldTime} = {}) {
  if (typeof active !== "boolean") throw Error("Estado do treinamento geral inválido.");
  const current = flags(actor).generalTraining ?? {}, blocked = active && Object.keys(flags(actor).elementalTrainingJobs ?? {}).length > 0;
  return {[flagPath + "generalTraining"]: {...structuredClone(current), active, days: integer(current.days),
    ...(active && !current.active && Number.isFinite(worldTime) ? {startedAt: worldTime} : {}),
    paused: blocked, reason: blocked ? generalReason : ""}};
}

/** Spend the cultivation pool once, keeping proficiency points and their ledger independent. */
export function cultivationTalentExchange(actor) {
  return {...cultivationPointUpdates(actor, 10), "system.legacy2.especiaisExtra": integer(actor.system?.legacy2?.especiaisExtra) + 1};
}
