import {ELEMENT_ABILITIES} from "./elemental-abilities-data.mjs";

const SCOPE = "Immortals-system";
const queues = new WeakMap();
const options = {render: false, isAdvancement: true, keepId: true};
const copy = value => structuredClone(value);
const emptyCounts = () => ({created: 0, updated: 0, deleted: 0});
const eligible = actor => actor && ["character", "npc"].includes(actor.type) && actor.isOwner
  && !actor.pack && !actor.compendium && !String(actor.uuid ?? "").startsWith("Compendium.");
const metadata = item => item.flags?.[SCOPE]?.elementalAbility;
const abilityKey = (elementId, abilityId) => elementId + ":" + abilityId;
const itemKey = item => abilityKey(metadata(item)?.elementId, metadata(item)?.abilityId);
const derivedItems = actor => Array.from(actor.items ?? []).filter(item => item.type === "feat"
  && item.flags?.[SCOPE]?.elementalDerived === true);
const sourceData = item => item.toObject?.() ?? item;
const itemId = item => item.id ?? item._id;

function learnedAbilities(actor) {
  const learned = new Map();
  for (const [elementId, abilities] of Object.entries(ELEMENT_ABILITIES)) {
    for (const ability of abilities) {
      const tier = Math.min(ability.level10 ? 1 : 3,
        Math.trunc(Number(actor.system?.elementAbilities?.[elementId]?.[ability.id]) || 0));
      if (tier > 0) learned.set(abilityKey(elementId, ability.id), {elementId, abilityId: ability.id, tier});
    }
  }
  return learned;
}

/** Hash canonical source content, so edits made between source revisions stay untouched. */
function signature(data) {
  const serialized = JSON.stringify({name: data.name, img: data.img, type: data.type,
    system: data.system, effects: data.effects, flags: data.flags}, (_key, value) => {
    if (!value || Array.isArray(value) || typeof value !== "object") return value;
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
  });
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619);
  return "1:" + (hash >>> 0).toString(16).padStart(8, "0");
}

function managedSource(raw, entry) {
  if (raw?.type !== "feat") throw new TypeError("A habilidade elemental deve gerar uma característica nativa.");
  const data = copy(raw);
  delete data._id; delete data.folder; delete data.ownership;
  const flags = (data.flags ??= {})[SCOPE] ??= {};
  flags.elementalAbility = {...entry};
  flags.elementalManaged = true;
  // These are synchronization markers, never part of the authored content signature.
  delete flags.elementalDerived; delete flags.elementalSync;
  const sync = {signature: signature(data), activityIds: Object.keys(data.system?.activities ?? {}),
    effectIds: (data.effects ?? []).map(effect => effect._id)};
  if (sync.effectIds.some(id => !id)) throw new TypeError("Os efeitos elementais precisam de identificadores estáveis.");
  return {data, sync};
}

function currentItem(actor, key, entry, id) {
  if (!eligible(actor) || learnedAbilities(actor).get(key)?.tier !== entry.tier) return null;
  return derivedItems(actor).find(item => itemKey(item) === key && (id === undefined || itemId(item) === id));
}

/** Use embedded-effect APIs to remove only authored effects that a source revision retired. */
async function syncEffects(actor, key, entry, id, data) {
  let item = currentItem(actor, key, entry, id);
  if (!item) return false;
  const desired = data.effects ?? [], desiredIds = new Set(desired.map(effect => effect._id));
  const existing = sourceData(item).effects ?? [];
  const previousIds = item.flags?.[SCOPE]?.elementalSync?.effectIds ?? [];
  const remove = existing.filter(effect => previousIds.includes(effect._id) && !desiredIds.has(effect._id)).map(effect => effect._id);
  if (remove.length) {
    await item.deleteEmbeddedDocuments("ActiveEffect", remove, options);
    item = currentItem(actor, key, entry, id);
    if (!item) return false;
  }
  for (const effect of desired) {
    item = currentItem(actor, key, entry, id);
    if (!item) return false;
    const exists = (sourceData(item).effects ?? []).some(current => current._id === effect._id);
    if (exists) await item.updateEmbeddedDocuments("ActiveEffect", [copy(effect)], options);
    else await item.createEmbeddedDocuments("ActiveEffect", [copy(effect)], options);
    if (!currentItem(actor, key, entry, id)) return false;
  }
  return true;
}

function refreshPatch(item, data, sync) {
  const current = sourceData(item), patch = {_id: itemId(item), name: data.name, img: data.img};
  for (const [key, value] of Object.entries(data.system ?? {})) {
    if (key === "activities") continue;
    const next = copy(value);
    if (key === "uses" && next && current.system?.uses && "spent" in current.system.uses) {
      const previous = current.system.uses, capacity = Number(next.max), oldCapacity = Number(previous.max);
      // Authored empty pools (such as paid Light Orbs) keep their inventory, rather than granting free uses on a tier change.
      if (capacity > 0 && Number.isFinite(capacity) && Number.isFinite(oldCapacity)
        && Number(next.spent) === capacity && !next.recovery?.length) {
        const available = Math.max(0, oldCapacity - (Number(previous.spent) || 0));
        next.spent = Math.max(0, capacity - available);
      } else next.spent = previous.spent;
    }
    patch["system." + key] = next;
  }
  const activities = data.system?.activities ?? {};
  for (const [id, activity] of Object.entries(activities)) {
    const next = copy(activity), previous = current.system?.activities?.[id];
    if (next.uses && previous?.uses && "spent" in previous.uses) next.uses.spent = previous.uses.spent;
    patch["system.activities." + id] = next;
  }
  for (const id of item.flags?.[SCOPE]?.elementalSync?.activityIds ?? []) {
    if (!(id in activities)) patch["system.activities.-=" + id] = null;
  }
  for (const [scope, flags] of Object.entries(data.flags ?? {})) {
    for (const [key, value] of Object.entries(flags)) patch["flags." + scope + "." + key] = copy(value);
  }
  patch["flags." + SCOPE + ".elementalDerived"] = true;
  patch["flags." + SCOPE + ".elementalSync"] = sync;
  return patch;
}

async function reconcile(actor, {factory, qiPool = "generated"}) {
  const counts = emptyCounts();
  if (!eligible(actor)) return counts;
  factory ??= (await import("./elemental-content.mjs")).elementalFeatureDocument;
  // Every asynchronous boundary can change learned tiers or owned documents. Re-read both before writing.
  reconcile: while (eligible(actor)) {
    const learned = learnedAbilities(actor);
    const obsolete = derivedItems(actor).filter(item => !learned.has(itemKey(item))).map(itemId);
    if (obsolete.length) {
      await actor.deleteEmbeddedDocuments("Item", obsolete, options);
      counts.deleted += obsolete.length;
      continue;
    }
    for (const [key, entry] of learned) {
      const authored = await factory(entry.elementId, entry.abilityId, entry.tier, {qiPool});
      if (!eligible(actor)) return counts;
      const latestLearned = learnedAbilities(actor);
      if (latestLearned.size !== learned.size
        || Array.from(learned).some(([id, current]) => latestLearned.get(id)?.tier !== current.tier)) continue reconcile;
      const {data, sync} = managedSource(authored, entry);
      const item = currentItem(actor, key, entry);
      if (!item) {
        data.flags[SCOPE].elementalDerived = true;
        data.flags[SCOPE].elementalSync = sync;
        await actor.createEmbeddedDocuments("Item", [data], options);
        counts.created++;
        continue reconcile;
      }
      if (item.flags?.[SCOPE]?.elementalSync?.signature === sync.signature) continue;
      if (!await syncEffects(actor, key, entry, itemId(item), data)) continue reconcile;
      const latest = currentItem(actor, key, entry, itemId(item));
      if (!latest) continue reconcile;
      await actor.updateEmbeddedDocuments("Item", [refreshPatch(latest, data, sync)], options);
      counts.updated++;
      continue reconcile;
    }
    const latestItems = derivedItems(actor);
    if (latestItems.some(item => !learned.has(itemKey(item)))
      || Array.from(learned.keys()).some(key => !latestItems.some(item => itemKey(item) === key))) continue;
    return counts;
  }
  return counts;
}

/** Keep learned elemental grants current while leaving manual/reference feats under player control. */
export async function syncElementalFeatures(actor, settings = {}) {
  if (!eligible(actor)) return emptyCounts();
  const operation = (queues.get(actor) ?? Promise.resolve()).catch(() => {}).then(() => reconcile(actor, settings));
  queues.set(actor, operation);
  try { return await operation; }
  finally { if (queues.get(actor) === operation) queues.delete(actor); }
}
