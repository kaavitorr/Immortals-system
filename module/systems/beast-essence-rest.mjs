import {beastEssenceFlags, essenceState} from "./beast-essence-rules.mjs";
import {buildBeastEssenceGrants, beastEssenceItemRollData} from "./beast-essence-grants.mjs";

const SCOPE = "Immortals-system";
const clone = value => structuredClone(value);
const list = value => Array.isArray(value) ? value : [];
const activities = system => Array.isArray(system?.activities) ? system.activities : Object.values(system?.activities ?? {});
const activityKey = activity => activity.flags?.[SCOPE]?.beastEssenceActivity?.sourceActivityId ?? activity._id;
const stable = value => JSON.stringify(value, (_key, current) => current && typeof current === "object" && !Array.isArray(current)
  ? Object.fromEntries(Object.keys(current).sort().map(key => [key, current[key]])) : current);
const nativeItemFactory = (source, options) => {
  const ItemClass = globalThis.CONFIG?.Item?.documentClass;
  if (!ItemClass) throw new Error("O documento nativo de Item não está disponível para recuperar os usos da essência.");
  return new ItemClass(source, options);
};

/**
 *
 * @param actor
 * @param stored
 */
function virtualActiveActor(actor, stored) {
  return {type: actor.type, id: actor.id, uuid: actor.uuid, system: actor.system, items: actor.items,
    flags: {...actor.flags, [SCOPE]: {...actor.flags?.[SCOPE], beastEssence: {...stored,
      transformation: {...stored.transformation, active: true, integrationId: stored.integrated.id}}}}};
}

/**
 * Only spent counters cross back into new sources; the current definition owns maxima and recovery profiles.
 * @param source
 * @param cached
 */
function restoreCachedSpent(source, cached) {
  if (source.system?.uses && cached.uses?.spent !== undefined) source.system.uses.spent = cached.uses.spent;
  const saved = new Map(list(cached.activities).map(entry => [entry.id, entry]));
  for (const activity of activities(source.system)) {
    const previous = saved.get(activityKey(activity));
    if (activity.uses && previous?.uses?.spent !== undefined) activity.uses.spent = previous.uses.spent;
  }
}

/**
 *
 * @param cached
 * @param source
 */
function recoveredCacheEntry(cached, source) {
  const entry = clone(cached);
  if (source.system?.uses) entry.uses = clone(source.system.uses);
  entry.activities ??= [];
  for (const activity of activities(source.system)) {
    if (!activity.uses) continue;
    const id = activityKey(activity); const index = entry.activities.findIndex(current => current.id === id);
    if (index >= 0) entry.activities[index] = {...entry.activities[index], uses: clone(activity.uses)};
    else entry.activities.push({id, uses: clone(activity.uses)});
  }
  return entry;
}

/**
 * Recover cached uses with the native Item recovery planner, without creating or updating any database document.
 * The caller adds the returned cache and rolls to the existing native rest batch.
 * @param actor
 * @param recovery
 * @param root0
 * @param root0.itemFactory
 * @param root0.idFactory
 */
export async function recoverInactiveBeastEssenceUses(actor, recovery, {
  itemFactory = nativeItemFactory, idFactory = globalThis.foundry?.utils?.randomID
} = {}) {
  const stored = beastEssenceFlags(actor); const state = essenceState(actor); const cached = list(stored.uses);
  // Actual embedded grants are already handled by the native rest loop, even while a form awaits cleanup.
  if (stored.transformation?.active === true || state.active || !state.essence || !cached.length) return null;
  const virtual = virtualActiveActor(actor, stored);
  const grants = buildBeastEssenceGrants(virtual, {idFactory});
  const uses = clone(cached); const rolls = []; const indices = new Map(uses.map((entry, index) => [entry.key, index]));
  const owned = Array.from(actor.items?.contents ?? actor.items?.values?.() ?? actor.items ?? []);
  for (const source of grants) {
    const index = indices.get(source.flags?.[SCOPE]?.beastEssenceGrant?.key);
    if (index === undefined) continue;
    restoreCachedSpent(source, uses[index]);
    const item = await itemFactory(source, {parent: actor});
    if (!item || owned.includes(item)) throw new Error("A recuperação da essência exige um Item privado criado somente em memória.");
    const originalRollData = item.getRollData?.bind(item) ?? (options => actor.getRollData?.(options) ?? {});
    const aliases = beastEssenceItemRollData({flags: source.flags, actor: virtual});
    item.getRollData = options => ({...originalRollData(options), ...aliases});
    await item.prepareData?.();
    if (typeof item.system?.recoverUses !== "function" || item.isHidden) continue;
    const result = await item.system.recoverUses(recovery);
    if (result?.updates && Object.keys(result.updates).length) {
      if (typeof item.updateSource !== "function") throw new Error("O Item privado não permite atualizar seus usos em memória.");
      item.updateSource(result.updates);
      await item.prepareData?.();
    }
    rolls.push(...list(result?.rolls));
    const recovered = item.toObject?.() ?? item._source;
    if (!recovered?.system) throw new Error("Não foi possível ler os usos recuperados da essência.");
    uses[index] = recoveredCacheEntry(uses[index], recovered);
  }
  return {uses, rolls, changed: stable(uses) !== stable(cached)};
}
