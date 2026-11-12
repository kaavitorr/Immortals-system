import {essenceState} from "./beast-essence-rules.mjs";
import {npcFeatureRollData} from "./legacy2-npc-features.mjs";

const SCOPE = "Immortals-system";
const list = value => Array.isArray(value) ? value : [];
const ownedItems = actor => Array.from(actor?.items?.contents ?? actor?.items?.values?.() ?? actor?.items ?? []);
const sourceUuid = item => item?._stats?.compendiumSource ?? item?.flags?.core?.sourceId
  ?? item?.flags?.[SCOPE]?.npcProfileFeature?.source ?? item?.flags?.[SCOPE]?.npcArchetypeEquipment?.source;
const sourceKey = record => String(record?.uuid || record?.key || "");
const activityEntries = activities => Array.isArray(activities)
  ? activities.map((activity, index) => [activity?._id ?? String(index), activity]) : Object.entries(activities ?? {});
const qiTarget = target => target?.type === "attribute" && /^energy\.(generated|total)$/.test(target.target ?? "");
const clone = value => structuredClone(value);

/**
 *
 * @param record
 */
function nativeItemSource(record) {
  const raw = record?.data;
  if (!raw || !["feat", "weapon"].includes(raw.type)) {
    throw new TypeError("Uma concessão temporária de essência precisa ser um Item nativo feat ou weapon.");
  }
  const data = {name: String(raw.name ?? record.itemName ?? "Essência de Besta"), type: raw.type,
    img: String(raw.img ?? ""), system: clone(raw.system ?? {}), effects: clone(raw.effects ?? []), flags: clone(raw.flags ?? {})};
  delete data.system.advancement;
  data.system.container = null;
  if (data.system.uses && typeof data.system.uses === "object") data.system.uses.spent = 0;
  // Do not enroll a temporary copy into a second source's synchronization lifecycle.
  const scopeFlags = data.flags[SCOPE] ??= {};
  delete scopeFlags.npcProfileFeature;
  delete scopeFlags.npcArchetypeEquipment;
  delete scopeFlags.elementalDerived;
  delete scopeFlags.elementalManaged;
  delete scopeFlags.elementalSync;
  if (record.uuid) data._stats = {compendiumSource: record.uuid};
  return data;
}

/**
 * Plan native temporary Item sources; actor and captured native sources remain untouched.
 * @param actor
 * @param root0
 * @param root0.idFactory
 */
export function buildBeastEssenceGrants(actor, {idFactory = globalThis.foundry?.utils?.randomID} = {}) {
  const state = essenceState(actor);
  if (!state.active || !state.essence || !["normal", "weakened"].includes(state.mode)) return [];
  if (typeof idFactory !== "function") throw new TypeError("A criação de concessões temporárias exige uma fábrica de identificadores.");
  const actorUuid = actor.uuid ?? (actor.id ? `Actor.${actor.id}` : null);
  if (!actorUuid) throw new TypeError("O personagem precisa de um identificador para receber concessões temporárias.");
  const usedIds = new Set(ownedItems(actor).map(item => item.id ?? item._id).filter(Boolean));
  const allocate = oldId => {
    const id = idFactory();
    if (typeof id !== "string" || !id || id === oldId || usedIds.has(id)) throw new TypeError("Identificador temporário inválido ou repetido.");
    usedIds.add(id);
    return id;
  };
  const permanentSources = new Set(ownedItems(actor).filter(item => !item.flags?.[SCOPE]?.beastEssenceGrant)
    .map(sourceUuid).filter(Boolean));
  const essence = state.essence; const normal = state.mode === "normal";
  const planned = []; const retainedPassives = new Set(); const retainedPassiveKeys = new Set(); const retainedAttacks = new Set();
  const add = (record, kind) => {
    if (!record || !record.key) return;
    const identity = kind === "attack" ? String(record.key) : sourceKey(record);
    const retained = kind === "attack" ? retainedAttacks : retainedPassives;
    if (!identity || retained.has(identity) || (kind !== "attack" && (retainedPassiveKeys.has(String(record.key)) || permanentSources.has(sourceKey(record))))) return;
    retained.add(identity);
    if (kind !== "attack") retainedPassiveKeys.add(String(record.key));
    const data = nativeItemSource(record);
    data._id = allocate(record.data._id);
    const itemUuid = `${actorUuid}.Item.${data._id}`;
    const metadata = {integrationId: essence.id, key: record.key, kind, mode: state.mode, level: state.effectiveLevel};
    data.flags[SCOPE].beastEssenceGrant = metadata;
    if (kind === "naturalWeapon") data.system.equipped = true;
    const effects = list(data.effects); const effectIds = new Map();
    for (const effect of effects) {
      const old = effect._id;
      effect._id = allocate(old);
      if (old) effectIds.set(old, effect._id);
      delete effect.ownership; delete effect.folder; delete effect._stats;
    }
    const activities = activityEntries(data.system.activities); const activityIds = new Map(); const sourceActivityIds = new Map();
    if (kind === "attack" && activities.length !== 1) throw new TypeError("Um ataque especial de essência precisa conter uma única atividade nativa.");
    for (const [key, activity] of activities) {
      const sourceActivityId = activity._id ?? key;
      const id = allocate(sourceActivityId);
      sourceActivityIds.set(id, sourceActivityId);
      activityIds.set(key, id);
      if (activity._id) activityIds.set(activity._id, id);
      activity._id = id;
      if (activity.uses && typeof activity.uses === "object") activity.uses.spent = 0;
    }
    data.system.activities = Object.fromEntries(activities.map(([_oldId, activity]) => {
      const flags = (activity.flags ??= {})[SCOPE] ??= {};
      for (const conflict of ["elementalActivity", "qiTalentActivity", "professionProductActivity"]) delete flags[conflict];
      const activityMeta = {...metadata, sourceActivityId: sourceActivityIds.get(activity._id),
        kind: kind === "attack" ? "attack" : kind === "naturalWeapon" ? "naturalWeapon" : "feature"};
      if (kind === "attack") {
        Object.assign(activityMeta, {actions: record.actions, damageInstances: record.damageInstances,
          effectQi: record.effectQi ?? null, area: !!record.area, costPending: true});
        activity.activation = {...activity.activation, type: activity.activation?.type ?? "action", value: record.actions, override: true};
        activity.consumption = {...activity.consumption, spellSlot: false,
          targets: [...list(activity.consumption?.targets).filter(target => !qiTarget(target)),
            {type: "attribute", target: "energy.generated", value: "0"}]};
      }
      flags.beastEssenceActivity = activityMeta;
      if (activity.effects) activity.effects = list(activity.effects).flatMap(reference => {
        const id = effectIds.get(reference._id ?? reference.id);
        if (!id) return [];
        const result = {...reference, _id: id};
        delete result.id;
        return [result];
      });
      for (const target of list(activity.consumption?.targets)) {
        if (target.type === "activityUses" && activityIds.has(target.target)) target.target = activityIds.get(target.target);
        if (target.type === "itemUses" && target.target === record.data._id) target.target = data._id;
      }
      return [activity._id, activity];
    }));
    for (const effect of effects) {
      const previous = effect.system?.origin?.activity;
      const previousId = typeof previous === "string" ? previous.split(".Activity.").at(-1) : null;
      effect.origin = itemUuid;
      effect.system ??= {};
      effect.system.origin = {actor: actorUuid, item: itemUuid};
      if (activityIds.has(previousId)) effect.system.origin.activity = `${itemUuid}.Activity.${activityIds.get(previousId)}`;
      if (effect.flags?.core) delete effect.flags.core.originText;
    }
    data.effects = effects;
    planned.push(data);
  };
  for (const record of list(essence.taxonomy?.features)) {
    if (Number.isFinite(Number(record.level)) && Number(record.level) >= 0 && Number(record.level) <= state.effectiveLevel) add(record, "taxonomy");
  }
  if (normal) for (const record of list(essence.archetype?.features)) {
    if (Number.isFinite(Number(record.level)) && Number(record.level) <= state.effectiveLevel) add(record, "archetype");
  }
  const features = new Set(list(normal ? essence.normalFeatures : essence.weakenedFeatures));
  for (const record of list(essence.features)) if (features.has(record.key)) add(record, "feature");
  for (const record of list(essence.naturalWeapons)) add(record, "naturalWeapon");
  const attacks = new Set(list(normal ? essence.normalAttacks : essence.weakenedAttacks));
  for (const record of list(essence.attacks)) if (attacks.has(record.key)) add(record, "attack");
  return planned;
}

/**
 * Resolve NPC-authored formula aliases against this character's live essence form.
 * @param item
 */
export function beastEssenceItemRollData(item) {
  const grant = item?.flags?.[SCOPE]?.beastEssenceGrant;
  const actor = item?.actor ?? item?.parent;
  if (!grant || !actor) return {};
  const state = essenceState(actor);
  if (!state.active || grant.integrationId !== state.essence?.id) return {};
  const virtual = {system: {...actor.system, legacy2: {...actor.system?.legacy2, nd: state.effectiveLevel}}};
  return {...npcFeatureRollData(virtual, state.ability), nd: state.effectiveLevel, legacy2: {...actor.system?.legacy2, nd: state.effectiveLevel}};
}
