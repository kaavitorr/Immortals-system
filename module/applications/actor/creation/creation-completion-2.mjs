import {grantCurrencyReceipt} from "../../../systems/advancement-grants.mjs";
import {backgroundCreationBenefits} from "../../../systems/wuxia-backgrounds.mjs";
import { resolveCultivatorDocument } from "../../../systems/cultivator-content.mjs";
import { CULTIVATOR_UUID, cultivatorDefinition, hasOnlyCultivatorClass } from "../../../systems/wuxia-character.mjs";
import Ruleset from "../../../systems/ruleset.mjs";
import { channelingTechniqueGrants } from "../../../systems/legacy2-channeling-techniques.mjs";
import { alternativeSavesEnabled } from "../../../systems/legacy2-alternative-saves.mjs";
import { collectCreationAdvancements, initialCreationEnergy } from "./creation-advancements-2.mjs";
import { creationActor, validateCreation, rankSpent, ABILITY_KEYS, styleRules, creationPathOptions, creationSpecializationSlots,
  PENALIDADE_VITAL_NOME, penalidadeVitalUuid } from "./creation-model-2.mjs";

const pending = new WeakMap();
const raw = doc => structuredClone(doc.toObject?.() ?? doc);

/** Prefer saved antecedent edits; authored content is a fallback before Geral is populated. */
async function resolveInitialDocument(uuid, resolve) {
  const authored = resolveCultivatorDocument(uuid);
  const flags = authored?.flags?.["Immortals-system"];
  if (!flags?.background && !flags?.backgroundFeature) return authored ?? await resolve(uuid);
  try { return await resolve(uuid) ?? authored; }
  catch { return authored; }
}

function speciesHP(species) {
  const rules = species?.getFlag?.("Immortals-system", "legacy2") ?? species?.flags?.["Immortals-system"]?.legacy2 ?? {};
  if (Number.isFinite(Number(rules.pvEspecie ?? rules.vidaBase))) return Number(rules.pvEspecie ?? rules.vidaBase);
  const text = (species?.system?.description?.value ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ");
  const match = /(?:Pontos de Vida Base|Vida Base)\s*:\s*([+-]?\d+)/i.exec(text);
  return Number(match?.[1] ?? 0);
}

function speciesEnergy(species) {
  const rules = species?.getFlag?.("Immortals-system", "legacy2") ?? species?.flags?.["Immortals-system"]?.legacy2 ?? {};
  if (Number.isFinite(Number(rules.energiaEspecie))) return Number(rules.energiaEspecie);
  const text = (species?.system?.description?.value ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ");
  const match = /Energia Base\s*:\s*([+-]?\d+)/i.exec(text);
  return Number(match?.[1] ?? 0);
}

/** Resolve and validate every choice before producing a single native actor/item batch. */
export async function prepareCreationCompletion(actor, draft, catalog, {
  resolve = globalThis.fromUuid, idFactory = () => foundry.utils.randomID()
} = {}) {
  if (!actor.isOwner || actor.type !== "character" || actor.getFlag?.("Immortals-system", "creation2")?.completed)
    throw new Error("A criação deste personagem não está disponível.");
  if (!hasOnlyCultivatorClass(actor)) throw new Error("A ficha já possui itens. Reabra a ficha para conferir as alterações.");
  const originUuid = catalog.wuxia ? draft.background : draft.species;
  const species = originUuid ? await resolveInitialDocument(originUuid, resolve) : null;
  const style = catalog.wuxia && draft.style === CULTIVATOR_UUID ? cultivatorDefinition() : await resolve(draft.style);
  if ((catalog.wuxia ? (originUuid && species?.type !== "background") : species?.type !== "race") || style?.type !== "class")
    throw new Error("Confira o Antecedente e a classe Cultivador.");
  const fresh = { ...catalog, species: species ? [species] : [], backgrounds: species ? [species] : [], styles: [style] };
  const ownedClass = catalog.wuxia ? Array.from(actor.items ?? []).find(item => item.type === "class") : null;
  const errors = validateCreation(draft, fresh);
  if (errors.length) throw new Error(errors[0].message);

  const create = [], updateItems = [], seen = new Map(), resolving = new Set();
  async function addDocument(uuid, tag = {}, depth = 0) {
    if (resolving.has(uuid)) throw new Error("Há um vínculo circular nos benefícios da Origem ou do Estilo de Combate.");
    if (seen.has(uuid)) {
      const data = seen.get(uuid);
      if (Object.keys(tag).length && data.type !== "feat") throw new Error("Uma habilidade escolhida deixou de ser uma característica.");
      Object.assign(data.flags["Immortals-system"], tag);
      return data;
    }
    if (depth > 8) throw new Error("Não foi possível concluir os benefícios vinculados à Origem.");
    const doc = uuid === originUuid ? species : uuid === draft.style ? style : await resolveInitialDocument(uuid, resolve);
    if (!doc) throw new Error("Uma das opções escolhidas não está mais disponível. Confira suas escolhas.");
    if (Object.keys(tag).length && doc.type !== "feat") throw new Error("Uma habilidade escolhida deixou de ser uma característica.");
    const source = doc.uuid ?? uuid;
    if (resolving.has(source)) throw new Error("Há um vínculo circular nos benefícios da Origem ou do Estilo de Combate.");
    if (seen.has(source)) {
      const data = seen.get(source);
      Object.assign(data.flags["Immortals-system"], tag); seen.set(uuid, data);
      return data;
    }
    const data = raw(doc);
    data._id = (uuid === draft.style && ownedClass) ? (ownedClass.id ?? ownedClass._id) : idFactory(); data.folder = null;
    delete data.uuid;
    data._stats = { ...data._stats, compendiumSource: source.startsWith("Compendium.") ? source : data._stats?.compendiumSource ?? null };
    data.flags ??= {}; data.flags["Immortals-system"] = { ...data.flags["Immortals-system"], ...tag,
      creation2Source: source };
    for (const scope of ["Immortals-system", "JujutsuLegacy"]) {
      const flags = data.flags[scope] ??= {};
      delete flags.advancementOrigin;delete flags.advancementRoot;
      flags.sourceId = source;
    }
    // A penalidade de Vida/Energia traz os dois efeitos; no ator entra só o
    // lado escolhido na criação (a escolha fica registrada na flag).
    if ( doc?.type === "feat" && doc.name === PENALIDADE_VITAL_NOME ) {
      data.flags["Immortals-system"].penalidadeVital = draft.penalidadeVital;
      const manter = draft.penalidadeVital === "vida" ? "Penalidade: Vida" : "Penalidade: Energia";
      data.effects = (data.effects ?? []).filter(efeito => efeito.name === manter);
    }
    if (data.type === "class") data.system.levels = 1;
    if (uuid === draft.style && ownedClass) updateItems.push(data);
    else create.push(data);
    seen.set(uuid, data);
    seen.set(source, data);
    resolving.add(source);
    for (const [key, advancement] of Object.entries(data.system?.advancement ?? {})) {
      // Source items can be copies of an owned item. Never retain another actor's grants.
      if (advancement.type === "ItemGrant") advancement.value = {};
      if (advancement.type === "ItemChoice") advancement.value = { added: {}, replaced: {} };
      if (advancement.type !== "ItemGrant" || Number(advancement.level ?? 0) > 1) continue;
      advancement._id ??= key;
      advancement.value.added = {};
      if (data.type === "class" && advancement.classRestriction === "secondary") continue;
      if (advancement.configuration?.optional) continue;
      for (const grant of advancement.configuration?.items ?? []) {
        if (grant.optional || !grant.uuid) continue;
        const granted = await addDocument(grant.uuid, {}, depth + 1);
        if (["consumable","container","equipment","loot","tool","weapon"].includes(granted.type)) granted.system.quantity=Math.max(1,Math.floor(Number(grant.quantity)||1));
        const spellConfig = doc.advancement?.byId?.[advancement._id]?.configuration?.spell;
        if (granted.type === "spell" && spellConfig) {
          const ability = Array.from(spellConfig.ability ?? [])[0];
          spellConfig.applySpellChanges(granted, { ability });
          if (ability) advancement.value.ability = ability;
        }
        grant.uuid = granted.flags["Immortals-system"].creation2Source;
        advancement.value.added[granted._id] = grant.uuid;
        const origin = `${data._id}.${advancement._id}`;
        const root = data.flags["Immortals-system"].advancementRoot ?? origin;
        for (const scope of ["Immortals-system", "JujutsuLegacy"]) {
          const flags = granted.flags[scope] ??= {};
          flags.sourceId ??= grant.uuid;
          flags.advancementOrigin ??= origin;
          flags.advancementRoot ??= root;
        }
        // Nested grants were resolved before the parent's ownership was known.
        for (const child of create) for (const scope of ["Immortals-system", "JujutsuLegacy"]) {
          const flags = child.flags?.[scope];
          if (flags?.advancementRoot?.startsWith(`${granted._id}.`)) flags.advancementRoot = root;
        }
      }
    }
    resolving.delete(source);
    return data;
  }
  if (originUuid) await addDocument(originUuid);
  await addDocument(draft.style);
  for (const name of draft.specializations) {
    const node = catalog.graph.porNome.get(name);
    await addDocument(node.uuid, { especializacaoAdquirida: true, featureSection: node.qiTalent?"jj-talents":"jj-combat",...(node.qiTalent?{qiTalentManaged:true,qiTalentId:node.id}:{}) });
  }
  for (const [category, uuids] of Object.entries(draft.customization)) {
    for (const uuid of uuids) await addDocument(uuid, { featureSection: category });
  }
  create.push(...channelingTechniqueGrants(create, 1).map(item => ({ ...item, _id: idFactory() })));
  const preview = creationActor(draft, style);
  const backgroundBenefits = catalog.wuxia ? backgroundCreationBenefits(actor, species) : { actor: {}, cultivation: null };
  // The creator includes the award in its atomic plan; record the same native receipt.
  if(catalog.wuxia)for(const item of create.filter(d=>d.type==="background"))for(const advance of Object.values(item.system.advancement??{})){
    if(advance.configuration?.currency)advance.value.currency=grantCurrencyReceipt(advance.configuration.currency);
  }
  if (catalog.wuxia) preview.system.cultivation = backgroundBenefits.cultivation ?? structuredClone(actor.system?.cultivation ?? {});
  const pvEspecie = catalog.wuxia ? 0 : speciesHP(species);
  preview.system.legacy2.pvEspecie = pvEspecie;
  const energiaEspecie = catalog.wuxia ? 0 : speciesEnergy(species);
  preview.system.legacy2.energiaEspecie = energiaEspecie;
  // Bônus de PV/Energia da Origem entram no cálculo inicial; o valor armazenado
  // segue só com a base (o maxHitPoints/maxEnergy lêem o bônus do item depois).
  const pvAdicional = catalog.wuxia ? 0 : Number(species?.getFlag?.("Immortals-system", "pvAdicional")
    ?? species?.flags?.["Immortals-system"]?.pvAdicional ?? 0);
  preview.system.legacy2.pvBonusOrigem = pvAdicional;
  const energiaAdicional = catalog.wuxia ? 0 : Number(species?.getFlag?.("Immortals-system", "energiaAdicional")
    ?? species?.flags?.["Immortals-system"]?.energiaAdicional ?? 0);
  preview.system.legacy2.energiaBonusOrigem = energiaAdicional;
  // Penalidade variante de Vida/Energia: o lado escolhido entra no preview
  // para PV/Energia iniciais já reduzidos (no ator, o efeito transferido do
  // item mantém a redução no valor preparado).
  const penalidadeVital = draft.customization["jj-variant-penalties"]?.includes(penalidadeVitalUuid(catalog))
    ? draft.penalidadeVital : null;
  if ( penalidadeVital === "vida" ) preview.system.legacy2.pvEspecie -= 2;
  if ( penalidadeVital === "energia" ) preview.system.legacy2.energiaEspecie -= 4;
  const hp = Ruleset.maxHitPoints(preview), energy = Ruleset.maxEnergy(preview);
  const initialEnergy = initialCreationEnergy(preview, energy);
  const caminhoInfo = creationPathOptions(style).find(caminho => caminho.id === draft.caminho) ?? null;
  const slotsExtras = Math.max(0, creationSpecializationSlots(style, draft.caminho).total - Number(styleRules(style).espIniciais ?? 0));
  const updates = { name: draft.name.trim(), img: draft.img || actor.img,
    "system.details.originalClass": seen.get(draft.style)._id,
    "prototypeToken.texture.src": draft.tokenImg || draft.img || actor.prototypeToken?.texture?.src,
    "prototypeToken.name": draft.name.trim(), "system.legacy2.principalEscolhido": draft.primary,
    "system.legacy2.pvEspecie": pvEspecie, "system.legacy2.energiaEspecie": energiaEspecie,
    "system.attributes.hp.value": hp,
    "system.energy.total": initialEnergy.total, "system.energy.generated": initialEnergy.generated,
    "system.legacy2.wounds.value": 0, "system.legacy2.actions.value": 6,
    "system.legacy2.pontos.gastos": Object.values(draft.proficiencies).reduce((sum, ranks) => sum + rankSpent(ranks), 0),
    "flags.Immortals-system.especializacoes": [...draft.specializations],
    "flags.Immortals-system.caminhoEstilo": (caminhoInfo || slotsExtras > 0)
      ? { id: caminhoInfo?.id ?? null, label: caminhoInfo?.label ?? null, estilo: style.name, slotsExtras } : null,
    "flags.Immortals-system.creation2": { completed: true, completedAt: Date.now(), species: draft.species,
      style: draft.style, primary: draft.primary, caminho: draft.caminho, specializations: [...draft.specializations] } };
  if (catalog.wuxia && originUuid) updates["system.details.background"] = seen.get(originUuid)._id;
  if (catalog.wuxia) updates["flags.Immortals-system.creation2"].background = draft.background;
  for (const key of ABILITY_KEYS) updates[`system.abilities.${key}.value`] = draft.abilities[key];
  for (const [category, ranks] of Object.entries(draft.proficiencies)) {
    const field = category === "saves" && alternativeSavesEnabled() ? "alternativeSaves" : category;
    updates[`system.legacy2.${field}`] = { ...ranks };
  }
  for (const [key, value] of Object.entries(draft.physical)) updates[`system.details.${key}`] = String(value ?? "");
  Object.assign(updates, backgroundBenefits.actor);
  return { actor: updates, create, ...(updateItems.length?{item:updateItems}:{}) };
}

/** Keep the guard across resolution and the native batch; failed creation can be retried. */
export function commitCreation(actor, draft, catalog, { advance = collectCreationAdvancements, ...options } = {}) {
  if (pending.has(actor)) return pending.get(actor);
  const originalItems = Array.from(actor.items ?? []).map(item => item.id ?? item._id);
  const run = (async () => {
    let plan = await prepareCreationCompletion(actor, draft, catalog, options);
    plan = await advance(actor, plan, options);
    if (!plan) return null;
    // Choices may keep the preview open for a while; reject concurrent sheet edits.
    if (!hasOnlyCultivatorClass(actor) || Array.from(actor.items ?? []).some((item,index) => (item.id ?? item._id) !== originalItems[index])
      || (actor.items?.size ?? actor.items?.length ?? 0) !== originalItems.length || actor.getFlag?.("Immortals-system", "creation2")?.completed)
      throw new Error("A ficha foi alterada durante a criação. Confira as alterações antes de continuar.");
    await actor.performBulkUpdate(plan, { isAdvancement: true });
    return plan;
  })();
  pending.set(actor, run);
  run.finally(() => { if (pending.get(actor) === run) pending.delete(actor); }).catch(() => {});
  return run;
}
