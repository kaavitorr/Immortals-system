import Ruleset from "./ruleset.mjs";

const SCOPE = "Immortals-system";
const MARKER = "channelingGrant";
const SOURCES = {
  "canalizacao-amplificadora": "Canalização Amplificadora",
  "canalizacao-de-combate": "Canalização de Combate"
};
const slug = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sourceOf = item => item.type === "feat" ? Object.keys(SOURCES).find(key => key === item.flags?.[SCOPE]?.talentoQi?.id
  || key === item.system?.identifier || key === slug(item.name)) : null;
const INTERNAL_EQUIVALENTS = {
  "canalizar-energia": { key: "channel", rule: "channelMovement", type: "utility" },
  "explosao-de-energia": { key: "burst", rule: "channelingBurst", type: "attack" },
  "defesa-solida": { key: "solid-defense", rule: "channelingDefense", type: "reduction" }
};
const sourceData = item => item.toObject?.() ?? item;
const activitiesOf = item => Object.values(sourceData(item).system?.activities ?? {});

/** Native Qi talents own their activities; equivalence is independent of edited display names. */
function hasInternalEquivalent(items, grant) {
  const source = grant.flags?.[SCOPE]?.[MARKER]?.source, expected = INTERNAL_EQUIVALENTS[grant.system?.identifier];
  if (!expected) return false;
  return items.some(item => item.type === "feat" && item.flags?.[SCOPE]?.talentoQi?.id === source && activitiesOf(item).some(activity => {
    const meta = activity.flags?.[SCOPE]?.qiTalentActivity;
    if (meta?.talentId !== source || meta.key !== expected.key || meta.rule !== expected.rule || activity.type !== expected.type) return false;
    if (activity.type === "attack") return !!activity.damage?.parts?.length;
    if (activity.type === "reduction") return !!String(activity.reduction?.formula ?? "").trim();
    return true;
  }));
}

function containsAuthored(actual, expected) {
  if (Array.isArray(expected)) {
    const values = actual instanceof Set ? Array.from(actual) : actual;
    return Array.isArray(values) && values.length === expected.length && expected.every((value, index) => containsAuthored(values[index], value));
  }
  if (expected && typeof expected === "object") return !!actual && Object.entries(expected).every(([key, value]) => containsAuthored(actual[key], value));
  return actual === expected;
}

/** A marker alone is insufficient to delete a copy or overwrite a customized technique. */
function safeLegacyGrant(item) {
  const data = sourceData(item), marker = data.flags?.[SCOPE]?.[MARKER];
  if (data.type !== "spell" || marker?.version !== 1 || !Object.hasOwn(SOURCES, marker.source)
    || data._stats?.duplicateSource || data._stats?.compendiumSource || data.flags?.core?.sourceId || data.flags?.[SCOPE]?.sourceId
    || Array.from(data.effects ?? []).length) return false;
  const original = techniqueData(4).find(entry => entry.system.identifier === data.system?.identifier && entry.flags[SCOPE][MARKER].source === marker.source);
  if (!original || data.name !== original.name || data.system?.description?.value !== original.system.description.value) return false;
  const activities = activitiesOf(item), expected = Object.values(original.system.activities)[0];
  if (activities.length !== 1) return false;
  const activity = activities[0];
  // This cap is the one field maintained automatically as the actor levels up.
  if (expected.jjScale) expected.jjScale.maxPA = activity.jjScale?.maxPA;
  if (!containsAuthored(activity, expected) || Array.from(activity.effects ?? []).length) return false;
  const changed = value => value !== undefined && value !== null && value !== "" && String(value) !== "0";
  if (changed(activity.attack?.bonus) || changed(activity.damage?.critical?.bonus)
    || activity.attack?.critical?.threshold != null && Number(activity.attack.critical.threshold) !== 20) return false;
  return !(activity.damage?.parts ?? []).some(part => changed(part.bonus) || part.custom?.enabled
    || changed(part.custom?.formula) || changed(part.scaling?.mode));
}

/** Native usable items, using the rules authored in the channeling specializations. */
function techniqueData(level) {
  const build = (name, source, type, actions, img, description, extra = {}) => {
    const activation = { type: "action", value: actions, condition: name === "Explosão de Energia" ? "" : "Reação" };
    const activity = { _id: "jj2channelact001", type, name, activation: { ...activation, override: true },
      consumption: { spellSlot: false, targets: [{ type: "attribute", target: "energy.generated", value: "4", scaling: { mode: "" } }] },
      duration: { units: "inst", override: true }, range: { units: "self", override: true }, ...extra };
    return { name, type: "spell", img, system: { identifier: slug(name), level: 0, method: "innate", prepared: 1,
      activation, duration: { units: "inst" }, range: { units: "self" }, description: { value: description },
      activities: { [activity._id]: activity } }, flags: { [SCOPE]: { [MARKER]: { source, version: 1 } } } };
  };
  const scale = { enabled: true, formula: "1d8", cost: 1, maxPA: Math.max(4, Math.floor(Number(level) || 1)) };
  return [
    build("Canalizar Energia", "canalizacao-amplificadora", "utility", 1, "icons/magic/light/beam-deflect-path-yellow.webp",
      "<p>Aumente seu deslocamento ou altura de pulo em 4 metros, mais 2 metros por PA adicional. Pode ativar ambos com o mesmo custo base de 4 PA; os aumentos adicionais são pagos individualmente.</p><p>1 Ponto de Ação · Reação · Pessoal · Instantâneo.</p>",
      { jjScale: { enabled: true, formula: "2", cost: 1, maxPA: 0 } }),
    build("Explosão de Energia", "canalizacao-de-combate", "attack", 3, "icons/magic/fire/explosion-flame-blue.webp",
      "<p>Envolva seus membros ou arma com energia e desfira um golpe: 4d8 de dano Contundente, Cortante ou Perfurante. A partir do nível 5, cada PA adicional acrescenta 1d8, até um total de dados igual ao nível.</p><p>4 PA de energia refinada · 3 Pontos de Ação · Pessoal · Instantâneo.</p>",
      { attack: { type: { value: "melee", classification: "spell" } }, damage: { includeBase: false,
        parts: [{ number: 4, denomination: 8, types: ["bludgeoning", "slashing", "piercing"] }] }, jjScale: { ...scale } }),
    build("Defesa Sólida", "canalizacao-de-combate", "reduction", 2, "icons/magic/defensive/shield-barrier-flaming-pentagon-red.webp",
      "<p>Ao ser alvo de um ataque comum ou de técnica, envolva seu corpo em energia para reduzir 4d8 de dano. A partir do nível 5, cada PA adicional acrescenta 1d8, até um total de dados igual ao nível.</p><p>4 PA de energia refinada · 2 Pontos de Ação · Reação · Pessoal · Instantâneo.</p>",
      { reduction: { formula: "4d8" }, jjScale: { ...scale } })
  ];
}

export function channelingTechniqueGrants(items, level) {
  const existing = Array.from(items ?? []), sources = new Set(existing.map(sourceOf).filter(Boolean));
  return techniqueData(level).filter(data => sources.has(data.flags[SCOPE][MARKER].source)
    && !hasInternalEquivalent(existing, data)
    && !existing.some(item => ["spell", "feat"].includes(item.type) && (item.system?.identifier === data.system.identifier || slug(item.name) === data.system.identifier)));
}

const pending = new WeakMap();
export function syncChannelingTechniques(actor) {
  if (!Ruleset.isV2() || !actor?.isOwner || !["character", "npc"].includes(actor.type)) return Promise.resolve();
  if (pending.has(actor)) { pending.get(actor).again = true; return pending.get(actor).promise; }
  const state = { again: false };
  state.promise = (async () => {
    do {
      state.again = false;
      const items = Array.from(actor.items), level = Ruleset.nivel(actor), sources = new Set(items.map(sourceOf).filter(Boolean));
      const managed = items.filter(safeLegacyGrant);
      const removed = managed.filter(item => !sources.has(item.flags[SCOPE][MARKER].source) || hasInternalEquivalent(items, item));
      if (removed.length) await actor.deleteEmbeddedDocuments("Item", removed.map(item => item.id));
      const grants = channelingTechniqueGrants(actor.items, level);
      if (grants.length) await actor.createEmbeddedDocuments("Item", grants);
      const updates = [];
      for (const item of managed.filter(item => !removed.includes(item))) {
        for (const activity of Object.values(item.toObject?.().system?.activities ?? item.system?.activities ?? {})) {
          if (!["attack", "reduction"].includes(activity.type)) continue;
          const maxPA = Math.max(4, Math.floor(Number(level) || 1));
          if (activity.jjScale?.maxPA !== maxPA) updates.push({ _id: item.id, [`system.activities.${activity._id}.jjScale.maxPA`]: maxPA });
        }
      }
      if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
    } while (state.again);
  })().finally(() => pending.delete(actor));
  pending.set(actor, state);
  return state.promise;
}

/** Repair existing sheets and keep grants in step with dropped/deleted specializations. */
export function registerChannelingTechniques(hooks = Hooks) {
  const canAct = actor => actor?.isOwner && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
  const sync = actor => { if (canAct(actor)) return syncChannelingTechniques(actor).catch(error => {
    console.error("Jujutsu: falha ao conceder técnicas de Canalização.", error);
    ui.notifications.warn("Não foi possível sincronizar as técnicas de Canalização. Reabra a ficha para tentar novamente.");
  }); };
  hooks.once("dnd5e.ready", async () => {
    const actors = new Set([...(game.actors ?? []), ...(game.scenes ?? []).flatMap(scene => Array.from(scene.tokens ?? [], token => token.actor)).filter(Boolean)]);
    for (const actor of actors) await sync(actor);
  });
  for (const event of ["createItem", "deleteItem", "updateItem"]) hooks.on(event, item => {
    if (item.parent?.documentName === "Actor" && (sourceOf(item) || item.type === "class")) return sync(item.parent);
  });
  hooks.on("updateActor", (actor, changes) => {
    if (Object.keys(changes).some(key => key === "system" || key.startsWith("system.details") || key.startsWith("system.legacy2"))) return sync(actor);
  });
  hooks.on("renderActorSheetV2", sheet => sync(sheet.actor));
}
