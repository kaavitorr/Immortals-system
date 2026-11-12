import {lineageDefinition} from './cultivation-destiny.mjs';
import {npcCultivationRank,npcCultivationLevel} from './npc-cultivation.mjs';
import { NPC_ABILITIES, npcProfile } from "./legacy2-npc-profiles.mjs";
import { CONCEITO_POR_ID } from "./elemental-concepts-data.mjs";
import {ESSENCE_GROWTH, essenceGrowthFromRoll} from "./beast-essence-rules.mjs";
import {CULTIVATION_RANKS} from "./cultivation-realms.mjs";

const SCOPE = "Immortals-system";
const GROWTH = Object.fromEntries(Object.entries(ESSENCE_GROWTH).map(([id,data])=>[id,data.label]));
const ABILITIES = { str: "Força", dex: "Agilidade", con: "Constituição", int: "Intelecto", wis: "Sabedoria", cha: "Presença" };
const PRIVATE_KEYS = new Set(["ownership", "folder", "_stats", "_source", "parent", "actor", "items", "advancement", "unidentified", "biography"]);
const MECHANICAL_FLAGS = new Set(["elementalActivity", "elementalAbility", "talentoQi", "bodyPath", "bodyPathLevel", "soulPath", "soulPathLevel", "cultivatorFeature", "featureSection"]);
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const readable = document => {
  if (!document) return false;
  try { return document.testUserPermission?.(globalThis.game?.user, "OBSERVER") ?? document.visible !== false; }
  catch { return false; }
};
const documentSource = document => document?.toObject ? document.toObject() : document;
const sourceUuid = item => [item?.flags?.[SCOPE]?.npcProfileFeature?.source,
  item?.flags?.[SCOPE]?.npcArchetypeEquipment?.source, item?._stats?.compendiumSource,
  item?.flags?.core?.sourceId, item?.uuid, item?.id ? `Item.${item.id}` : ""]
  .find(value => typeof value === "string" && /^(?:Compendium|Actor|Item|Scene)\./.test(value)) ?? "";
const entries = value => Array.isArray(value) ? value.map((entry, index) => [entry?._id ?? String(index), entry])
  : Object.entries(value ?? {});
const offensive = activity => ["attack", "damage", "save"].includes(activity?.type)
  || (activity?.damage?.parts?.length ?? 0) > 0;
const natural = item => item?.type === "weapon" && item.system?.type?.value === "natural";
const privateKey = key => PRIVATE_KEYS.has(key) || /gm.?notes?|secret|^gm$|^private$|^notes$/i.test(key);

/**
 * Remove Foundry secret sections, including nested elements, before a public Item receives its description.
 * @param {string} value
 * @returns {string}
 */
function publicHtml(value) {
  const html = String(value ?? "");
  const tokens = /<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)\b[^>]*>/gi;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const blocked = new Set(["script", "style", "iframe", "object", "embed"]);
  let result = "";
  let last = 0;
  let match;
  const hidden = [];
  while ((match = tokens.exec(html))) {
    if (!hidden.length) result += html.slice(last, match.index);
    const token = match[0];
    const tag = match[1]?.toLowerCase();
    const closing = /^<\//.test(token);
    const isVoid = voidTags.has(tag) || /\/\s*>$/.test(token);
    if (hidden.length) {
      if (closing) {
        const index = hidden.lastIndexOf(tag);
        if (index >= 0) hidden.splice(index);
      } else if (tag && !isVoid) hidden.push(tag);
    } else if (tag && !closing && (blocked.has(tag)
      || /\bclass\s*=\s*(?:"[^"]*\bsecret\b|'[^']*\bsecret\b|secret(?:\s|>))/i.test(token)
      || /\bdata-(?:secret|visibility)\s*=\s*["'](?:true|gm)["']/i.test(token))) {
      if (!isVoid) hidden.push(tag);
    } else if (!token.startsWith("<!--")) {
      result += token.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/\s+(?:href|src)\s*=\s*(["'])\s*(?:javascript|vbscript):[^"']*\1/gi, "");
    }
    last = tokens.lastIndex;
  }
  if (!hidden.length) result += html.slice(last);
  return result;
}

/**
 * Copy JSON only; document internals, GM fields and arbitrary module metadata never cross the boundary.
 * @param {*} value
 * @param {string} key
 * @returns {*}
 */
function clean(value, key = "") {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return publicHtml(value);
  if (value instanceof Set) return Array.from(value, entry => clean(entry));
  if (Array.isArray(value)) return value.map(entry => clean(entry)).filter(entry => entry !== undefined);
  if (!value || typeof value !== "object") return undefined;
  if (key === "flags") {
    const source = value[SCOPE] ?? {};
    const flags = {};
    for (const name of MECHANICAL_FLAGS) if (source[name] !== undefined) flags[name] = clean(source[name]);
    if (source.elementalAutomation?.rules) {
      flags.elementalAutomation = { rules: clean(source.elementalAutomation.rules) };
    }
    return Object.keys(flags).length ? { [SCOPE]: flags } : {};
  }
  const data = {};
  for (const [name, entry] of Object.entries(value)) {
    if (privateKey(name) || ["__proto__", "prototype", "constructor"].includes(name)) continue;
    const copied = clean(entry, name);
    if (copied !== undefined) data[name] = copied;
  }
  return data;
}

/**
 * Extract the native playable fields without document ownership or private metadata.
 * @param {object} item
 * @returns {object}
 */
function nativeItem(item) {
  const source = documentSource(item) ?? {};
  return { name: String(source.name ?? item.name ?? "Característica"), type: source.type ?? item.type,
    img: String(source.img ?? item.img ?? ""), system: clean(source.system ?? {}),
    effects: (source.effects ?? []).filter(effect => effect.visible !== false).map(effect => clean(effect)),
    flags: clean(source.flags ?? {}, "flags") };
}

/**
 * Collect effects referenced by the selected native activities.
 * @param {object[]} activities
 * @returns {Set<string>}
 */
function effectIds(activities) {
  const ids = activities.flatMap(activity => (activity.effects ?? []).map(effect => effect._id ?? effect.id));
  return new Set(ids.filter(Boolean));
}

/**
 * A feat cannot smuggle a second offensive activity through a passive grant.
 * @param {object} item
 * @returns {object|null}
 */
function passiveItem(item) {
  const data = nativeItem(item);
  const all = Object.values(data.system.activities ?? {});
  const attacks = all.filter(offensive);
  const allowed = all.filter(activity => !offensive(activity));
  if (attacks.length) {
    const attackEffects = effectIds(attacks);
    const passiveEffects = effectIds(allowed);
    data.system.activities = Object.fromEntries(
      entries(data.system.activities).filter(([, activity]) => !offensive(activity))
    );
    data.effects = data.effects.filter(effect => !attackEffects.has(effect._id) || passiveEffects.has(effect._id));
    if (!allowed.length && !data.effects.length) return null;
  }
  return data;
}

/**
 * Split eligible special attacks into independently selectable native Items.
 * @param {object} item
 * @param {string} uuid
 * @param {string[]} warnings
 * @returns {object[]}
 */
function specialAttacks(item, uuid, warnings) {
  const source = nativeItem(item);
  const candidates = [];
  for (const [id, activity] of entries(source.system.activities)) {
    if (!offensive(activity)) continue;
    const own = activity.activation;
    const inherited = own?.override === false || ((!own || own.value === null || own.value === undefined || own.value === "") && own?.override !== true);
    const activation = inherited ? source.system.activation ?? own : own;
    const actions = Number(activation?.value ?? activation?.cost);
    if (!["action", "bonus", "reaction", "power"].includes(activation?.type) || !Number.isInteger(actions) || actions < 1 || actions > 6) {
      warnings.push(`Ataque especial indisponível: ${source.name} — ${String(activity.name ?? id)}. A ativação não possui de 1 a 6 ações utilizáveis.`);
      continue;
    }
    const data = clean(source);
    const activityId = String(activity._id ?? id);
    const selected = clean(activity);
    selected.activation = { ...clean(activation), value: actions, override: true };
    data.system.activities = { [activityId]: selected };
    // Preserve the selected activity's linked effects, never unrelated Item grants.
    const linked = effectIds([activity]);
    data.effects = data.effects.filter(effect => linked.has(effect._id));
    if (activity.description?.value) data.system.description = { value: activity.description.value, chat: "" };
    const costs = (activity.consumption?.targets ?? []).filter(target => target.type === "attribute"
      && /^energy\.(?:generated|total)$/.test(target.target ?? ""));
    const known = costs.every(target => target.value !== ""
      && Number.isFinite(Number(target.value)) && Number(target.value) >= 0);
    candidates.push({ key: `${uuid}:${activityId}`, uuid, itemName: source.name, activityId, actions,
      area: Boolean(activity.target?.template?.type || source.system.target?.template?.type),
      damageInstances: (activity.damage?.parts ?? []).length
        + (activity.damage?.includeBase && source.system.damage?.base ? 1 : 0),
      effectQi: known ? costs.reduce((sum, target) => sum + Number(target.value), 0) : null, data });
  }
  return candidates;
}

/**
 * Use the modern NPC cultivation level, or an explicit realm on a legacy document.
 * @param {object} actor
 * @returns {number|null}
 */
function realmOf(actor) {
  const derived=npcCultivationRank(actor);if(derived!==null)return derived;
  const value = actor.flags?.[SCOPE]?.cultivationRank;
  return value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value))
    && Number(value) >= 0 && Number(value) <= 10 ? Number(value) : null;
}

/**
 * Capture readable native sources in memory without serializing the source Actor or writing documents.
 * @param {object} actor
 * @param {object} options
 * @param {Function} [options.resolve]
 * @param {object} [options.config]
 * @returns {Promise<object>}
 */
export async function buildBeastEssenceSnapshot(actor, {
  resolve = globalThis.fromUuid, config = globalThis.CONFIG?.JUJUTSU ?? {}
} = {}) {
  if (actor?.type !== "npc") throw new RangeError("A Essência de Besta deve partir de uma criatura NPC.");
  if (!readable(actor)) throw new Error("Sem permissão de acesso à criatura de origem.");
  const items = Array.from(actor.items ?? []).filter(readable);
  const cache = new Map();
  const lookup = async uuid => {
    if (!uuid) return null;
    const owned = items.find(item => sourceUuid(item) === uuid || item.uuid === uuid);
    if (owned) return owned;
    if (!cache.has(uuid)) {
      cache.set(uuid, Promise.resolve().then(() => resolve?.(uuid)).catch(() => null)
        .then(item => readable(item) ? item : null));
    }
    return cache.get(uuid);
  };
  const profileActor = { system: actor.system, items };
  const profiles = ["taxonomy", "archetype"].map(type => npcProfile(profileActor, type, config));
  const excluded = actor.flags?.[SCOPE]?.npcGenerator ?? {};
  const excludedFeatures = new Set(excluded.excludedFeatures ?? []);
  const excludedEquipment = new Set(excluded.excludedEquipment ?? []);
  const profileFeatures = new Set();
  const attackItems = new Map();
  const naturalWeapons = new Map();
  const capturedProfiles = [];
  const nd = npcCultivationLevel(actor.system?.legacy2?.nd);
  for (let index = 0; index < profiles.length; index++) {
    const profile = profiles[index];
    if (!profile) {
      capturedProfiles.push(index === 0
        ? { name: "Taxonomia", img: "", resistances: {}, movement: {}, senses: {}, features: [] } : null);
      continue;
    }
    const captured = { name: String(profile.item?.name ?? profile.label ?? profile.name ?? "Perfil"), img: String(profile.item?.img ?? profile.img ?? ""),
      resistances: clean(profile.resistencias ?? profile.resistances ?? {}),
      movement: clean(profile.movimento ?? profile.movement ?? {}),
      senses: clean(profile.sentidos ?? profile.senses ?? {}), features: [] };
    for (const grant of profile.habilidades ?? []) {
      const level = Number(grant.nd);
      if (!grant.uuid || !Number.isInteger(level) || level < 0 || level > 30) continue;
      profileFeatures.add(grant.uuid);
      if (excludedFeatures.has(grant.uuid)) continue;
      const item = await lookup(grant.uuid);
      if (item?.type !== "feat") continue;
      const data = passiveItem(item);
      if (data && !captured.features.some(entry => entry.uuid === grant.uuid)) {
        captured.features.push({ key: grant.uuid, uuid: grant.uuid, level, data });
      }
      if (level <= nd) attackItems.set(grant.uuid, item);
    }
    for (const uuid of profile.equipamentos?.armas ?? []) {
      if (excludedEquipment.has(uuid)) continue;
      const item = await lookup(uuid);
      if (natural(item)) naturalWeapons.set(uuid, { key: uuid, uuid, data: nativeItem(item) });
    }
    capturedProfiles.push(captured);
  }
  const features = [];
  const warnings = [];
  for (const item of items) {
    const uuid = sourceUuid(item);
    if (!uuid) continue;
    if (item.type === "feat" && excludedFeatures.has(uuid) || item.type === "weapon" && excludedEquipment.has(uuid)) continue;
    if (natural(item)) {
      if (!naturalWeapons.has(uuid)) naturalWeapons.set(uuid, { key: uuid, uuid, data: nativeItem(item) });
      continue;
    }
    if (item.type !== "feat") continue;
    if (profileFeatures.has(uuid)) continue;
    const data = passiveItem(item);
    if (data && !features.some(entry => entry.key === uuid)) features.push({ key: uuid, uuid, data });
    attackItems.set(uuid, item);
  }
  const values = NPC_ABILITIES.map(key => Number(actor.system?.abilities?.[key]?.value) || 0);
  const maximum = Math.max(...values);
  return { version: 1, name: String(actor.name ?? "Criatura"), img: String(actor.img ?? ""), sourceActorUuid: String(actor.uuid ?? ""), sourceRealm: realmOf(actor),
    tokenTexture: String(actor.prototypeToken?.texture?.src ?? actor.token?.texture?.src ?? ""),
    highestAbilities: NPC_ABILITIES.filter((key, index) => values[index] === maximum),
    elements: Object.entries(actor.system?.conceitos ?? {})
      .filter(([id, data]) => CONCEITO_POR_ID[id] && (data?.unlocked === true || Number(data?.level) > 0))
      .map(([id]) => id),
    taxonomy: capturedProfiles[0], archetype: capturedProfiles[1],
    naturalWeapons: [...naturalWeapons.values()], features,
    attacks: [...attackItems].flatMap(([uuid, item]) => specialAttacks(item, uuid, warnings)), warnings };
}

/**
 * Validate a mode selection against the captured candidates and its grant budget.
 * @param {object} selection
 * @param {string} name
 * @param {object[]} candidates
 * @param {number} maximum
 * @param {Function} predicate
 * @returns {string[]}
 */
function selectedKeys(selection, name, candidates, maximum, predicate = () => true) {
  const keys = selection[name] ?? [];
  if (!Array.isArray(keys) || keys.length > maximum || new Set(keys).size !== keys.length
    || keys.some(key => typeof key !== "string" || !candidates.some(entry => entry.key === key && predicate(entry)))) throw new RangeError(`Seleção inválida de ${name}.`);
  return [...keys];
}
const nonnegativeInteger = (value, name) => {
  if (value === null || value === "" || typeof value === "boolean" || !Number.isInteger(Number(value)) || Number(value) < 0) throw new RangeError(`Custo inválido: ${name}.`);
  return Number(value);
};

/**
 * Build a single public loot source. Only the selected union is persisted; the candidate snapshot stays private.
 * @param {object} snapshot
 * @param {object} selection
 * @returns {object}
 */
export function createBeastEssenceItemData(snapshot, selection = {}) {
  if (!snapshot || snapshot.version !== 1) throw new RangeError("Captura de Essência de Besta inválida.");
  const growth = selection.growth;
  const ability = selection.ability ?? (snapshot.highestAbilities?.length === 1 ? snapshot.highestAbilities[0] : null);
  if (!Object.hasOwn(GROWTH, growth)) throw new RangeError("Nível de crescimento inválido.");
  const growthOrigin=selection.growthOrigin??"manual", growthRoll=selection.growthRoll??null;
  if (!["manual","rolled","divine"].includes(growthOrigin)
    || growthOrigin==="rolled" && essenceGrowthFromRoll(growthRoll)!==growth
    || growthOrigin!=="rolled" && growthRoll!==null
    || growthOrigin==="divine" && growth!=="supreme") throw new RangeError("Resultado de crescimento incompatível com a essência.");
  if (!NPC_ABILITIES.includes(ability) || !snapshot.highestAbilities?.includes(ability)) throw new RangeError("Escolha um dos maiores atributos da criatura.");
  const elements = selection.elements ?? [];
  if (!Array.isArray(elements) || elements.length > 2 || new Set(elements).size !== elements.length
    || elements.some(id => !CONCEITO_POR_ID[id] || !snapshot.elements?.includes(id))) throw new RangeError("Escolha até dois elementos disponíveis da criatura.");
  const features = snapshot.features ?? [];
  const attacks = snapshot.attacks ?? [];
  const normalFeatures = selectedKeys(selection, "normalFeatures", features, 2);
  const weakenedFeatures = selectedKeys(selection, "weakenedFeatures", features, 1);
  const normalAttacks = selectedKeys(selection, "normalAttacks", attacks, 2, entry => entry.actions >= 1 && entry.actions <= 3);
  const weakenedAttacks = selectedKeys(selection, "weakenedAttacks", attacks, 1, entry => entry.actions >= 1 && entry.actions <= 6);
  const featureKeys = new Set([...normalFeatures, ...weakenedFeatures]);
  const attackKeys = new Set([...normalAttacks, ...weakenedAttacks]);
  const chosenAttacks = attacks.filter(entry => attackKeys.has(entry.key)).map(entry => {
    const selected = clean(entry);
    const costs = selection.attackCosts?.[entry.key];
    for (const name of ["damageInstances", "effectQi"]) {
      if (costs?.[name] !== undefined) selected[name] = nonnegativeInteger(costs[name], name);
    }
    return selected;
  });
  const id = selection.id ?? globalThis.foundry?.utils?.randomID?.() ?? globalThis.crypto?.randomUUID?.();
  if (typeof id !== "string" || !id.trim()) throw new RangeError("Identificador de essência inválido.");
  const lineage=selection.lineageId==null||selection.lineageId===''?null:lineageDefinition(selection.lineageId);if(selection.lineageId&& !lineage)throw Error('Identifique uma linhagem de Besta Divina válida.');
  const definition = { ...(lineage?{lineageId:lineage.id}:{}),version: 1, id, name: String(snapshot.name), img: String(snapshot.img ?? ""),
    sourceActorUuid: String(snapshot.sourceActorUuid ?? ""), sourceRealm: snapshot.sourceRealm ?? null, growth, growthOrigin, growthRoll, ability, elements: [...elements],
    tokenTexture: String(selection.tokenTexture ?? snapshot.tokenTexture ?? ""), taxonomy: clean(snapshot.taxonomy), archetype: clean(snapshot.archetype),
    naturalWeapons: clean(snapshot.naturalWeapons ?? []),
    features: features.filter(entry => featureKeys.has(entry.key)).map(entry => clean(entry)),
    attacks: chosenAttacks, normalFeatures, weakenedFeatures, normalAttacks, weakenedAttacks };
  const growthRule=ESSENCE_GROWTH[growth];
  const rankName=rank=>CULTIVATION_RANKS.find(entry=>entry.rank===rank)?.name;
  const growthDescription=`<p><strong>Origem do crescimento:</strong> ${growthOrigin==="rolled"?`1d100: ${growthRoll}`:growthOrigin==="divine"?"Besta Divina — crescimento Supremo":"Definido pelo Narrador"}.</p>
    <p>Antes da integração: Condensação de Qi. Após a integração, acompanha seu cultivo até <strong>${rankName(growthRule.limitRank)}</strong>.${growthRule.limitRank<10?` Forma enfraquecida em ${rankName(growthRule.limitRank+1)}.`:""}${growthRule.limitRank+2<=10?` Todos os benefícios cessam a partir de ${rankName(growthRule.limitRank+2)}.`:""}</p>`;
  const description = `<p>Essência de Besta de <strong>${escape(definition.name)}</strong>.</p><p><strong>Crescimento:</strong> ${GROWTH[growth]
  }. <strong>Atributo:</strong> ${ABILITIES[ability]}.</p>${growthDescription}${
    elements.length ? `<p><strong>Afinidades:</strong> ${elements.map(id => escape(CONCEITO_POR_ID[id].label)).join(", ")}.</p>` : ""
  }<p>A integração ocorre ao fim de um descanso longo e substitui a essência anterior. A transformação concede as características e os ataques selecionados.</p>`;
  return { name: `Essência de Besta — ${definition.name}`, type: "loot", img: definition.img,
    system: { type: { value: "material" }, quantity: 1, description: { value: description, chat: "" } },
    flags: { [SCOPE]: { beastEssenceItem: { version: 1, definition } } } };
}
