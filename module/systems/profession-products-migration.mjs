import {prepareProfessionRecipeUpdate} from './profession-recipe-migration.mjs';
import {prepareProfessionProductArtUpdate} from "./profession-product-art.mjs";
import {prepareWuxiaAttributeCorrection} from './wuxia-attribute-corrections.mjs';
import {PROFESSION_PRODUCTS} from "./profession-products-data.mjs";
import {professionProductDocument, professionProductPricing} from "./profession-products-content.mjs";
import {professionPrice} from "./profession-crafting-rules.mjs";
import {withElementalActorLock} from "./elemental-runtime.mjs";

const SCOPE = "Immortals-system";
const PREFIX = "flags." + SCOPE + ".";
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const copy = value => structuredClone(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
const OLD_BLOCK = "O texto não define de modo inequívoco o dano em sucesso e falha da salvaguarda; aguarde confirmação autoral.";
const RESOLVED_NOTES = [
  "Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO.",
  "Confirmar se a qualidade da pílula usa a menor margem dos três testes ou apenas a margem do teste de Criação.",
  "Confirmar o texto de sucesso e falha da Salvaguarda de Agilidade: a fonte diz dano total ou metade se falharem.",
  "Talismã Explosivo: confirme todo/metade do dano em sucesso e falha da salvaguarda."
];
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);
const canEditActor = (actor, game) => activeGM(game) && actor?.isOwner === true && actor.limited !== true
  && ["character", "npc"].includes(actor.type)
  && (!actor.canUserModify || actor.canUserModify(game.user, "update"));

function descriptionUpdate(value, product) {
  if (typeof value !== "string") return value;
  let html = value;
  html = html.split("<p><strong>Uso bloqueado — pendente:</strong> " + OLD_BLOCK + "</p>").join("");
  for (const note of RESOLVED_NOTES) html = html.split(note).join("");
  html = html.replace(/<p><strong>Pendente:<\/strong>\s*<\/p>/gu, "");
  if (product.id === "talisma-explosivo") {
    html = html.split("Sofrendo todo dano como dano do tipo Contundente ou metade se falharem.")
      .join("Sofrendo todo dano como dano do tipo Contundente em caso de falha ou metade em caso de sucesso.");
  }
  const notes = [];
  if (Number.isFinite(product.creationPercent)) notes.push("O valor de criação usa somente materiais; o valor de venda é o percentual indicado sobre o valor de criação.");
  if (product.kind === "pill") notes.push("A qualidade da pílula usa apenas o teste de Criação.");
  if (product.id === "talisma-explosivo") notes.push("A explosão causa dano total na falha da Salvaguarda de Agilidade e metade no sucesso, dividido igualmente entre Contundente e Fogo.");
  if (notes.length && !html.includes('data-profession-author-rules="2"')) {
    html += '<p data-profession-author-rules="2"><strong>Regras confirmadas:</strong> ' + notes.join(" ") + "</p>";
  }
  return html;
}
function canRefreshPrice(source, product, level) {
  const price = source.system?.price;
  if (price === undefined || Number(price?.value) === 0) return true;
  const previous = source.flags?.[SCOPE]?.professionProductPricing;
  if (!previous || !["materials", "recipeAndMaterials"].includes(previous.basis)) return false;
  try {
    const expected = professionPrice(level, {basis: previous.basis, creationPercent: product.creationPercent,
      salePercent: product.salePercent});
    return expected.sale?.currency === "gp" && previous.sale?.currency === "gp"
      && previous.sale.amount === expected.sale.amount && price.denomination === "gp"
      && Number(price.value) === expected.sale.amount;
  } catch { return false; }
}

/** Patch only the three resolved author decisions in a known v1 source; never regenerate the item. */
function prepareAuthorRulesUpdate(item) {
  if (!item || item.isOwner === false || item.limited === true) return null;
  const owner = item.actor ?? (["character", "npc"].includes(item.parent?.type) ? item.parent : null);
  if (owner && (owner.limited === true || owner.isOwner !== true)) return null;
  const source = item.toObject?.() ?? item;
  const flags = source.flags?.[SCOPE], config = flags?.professionProduct;
  if (flags?.professionProductsContentVersion !== 1) return null;
  const ownedCopy = flags.professionProductManaged === false && owner?.isOwner === true;
  if (flags.professionProductManaged !== true && !ownedCopy) return null;
  const product = PROFESSION_PRODUCTS.find(entry => entry.id === config?.id);
  const id = source._id ?? item.id;
  if (!product || !id || config.kind !== product.kind || config.profession !== product.profession) return null;
  let canonical;
  try { canonical = professionProductDocument(product.id, {level: config.level, quality: config.quality,
    ...(config.element === undefined ? {} : {element: config.element})}); }
  catch { return null; }
  if (source.type !== canonical.type) return null;
  if (ownedCopy) {
    const expected = canonical.flags[SCOPE].professionProduct;
    if (Object.keys(config).length !== Object.keys(expected).length
      || Object.keys(expected).some(key => config[key] !== expected[key])) return null;
  }
  const updates = {_id: id, [PREFIX + "professionProductsContentVersion"]: 2};
  const pending = flags.professionProductAutomation?.pending;
  if (Array.isArray(pending)) {
    const remaining = pending.filter(note => !RESOLVED_NOTES.includes(note));
    if (remaining.length !== pending.length) updates[PREFIX + "professionProductAutomation.pending"] = remaining;
  }
  if (Number.isFinite(product.creationPercent)) {
    const quote = professionProductPricing(product, config.level, config.element);
    updates[PREFIX + "professionProductPricing"] = copy(quote);
    if (quote?.sale?.currency === "gp" && Number.isFinite(quote.sale.amount) && canRefreshPrice(source, product, config.level)) {
      updates["system.price"] = {value: quote.sale.amount, denomination: "gp"};
    }
  }
  const description = source.system?.description?.value;
  const corrected = descriptionUpdate(description, product);
  if (corrected !== description) updates["system.description.value"] = corrected;
  const canonicalActivities = Object.values(canonical.system?.activities ?? {});
  for (const [key, activity] of Object.entries(source.system?.activities ?? {})) {
    if (!/^[A-Za-z0-9]{1,64}$/u.test(key) || ["constructor", "prototype"].includes(key)) continue;
    const meta = activity.flags?.[SCOPE]?.professionProductActivity;
    if (meta?.productId !== product.id) continue;
    const reference = canonicalActivities.find(entry => entry.flags?.[SCOPE]?.professionProductActivity?.key === meta.key);
    if (!reference) continue;
    const path = "system.activities." + key + ".";
    const text = activity.description?.value, revised = descriptionUpdate(text, product);
    if (revised !== text) updates[path + "description.value"] = revised;
    if (product.id !== "talisma-explosivo" || meta.key !== "release") continue;
    updates[path + "type"] = "save";
    updates[path + "damage.onSave"] = "half";
    if (!own(activity, "save")) updates[path + "save"] = copy(reference.save);
    if (!own(activity, "conditions")) updates[path + "conditions"] = copy(reference.conditions ?? []);
    if (activity.damage?.critical?.allow === false && Object.keys(activity.damage.critical).length === 1) {
      updates[path + "damage.-=critical"] = null;
    }
    if (meta.pendingResolution === OLD_BLOCK) updates[path + "flags." + SCOPE + ".professionProductActivity.-=pendingResolution"] = null;
    if (activity.name === "Liberar explosão (resultado pendente)") updates[path + "name"] = reference.name;
  }
  return updates;
}

/** Apply authored rule and artwork updates independently, preserving personal overrides. */
export function prepareProfessionProductAuthorUpdate(item) {
  const rules = prepareAuthorRulesUpdate(item), art = prepareProfessionProductArtUpdate(item);
  const attributes=prepareWuxiaAttributeCorrection(item,{...rules,...art});
  const recipes=prepareProfessionRecipeUpdate(item,{...rules,...art,...attributes});
  return rules || art || attributes || recipes ? {...rules, ...art,...attributes,...recipes} : null;
}

/** Serialize with native uses/crafting and re-read ownership and v1 sources after acquiring the actor lock. */
export async function migrateProfessionProductItems(actor, {game = globalThis.game} = {}) {
  if (!canEditActor(actor, game) || typeof actor.performBulkUpdate !== "function") return 0;
  const result = await withElementalActorLock(actor, "profession-products-author-v2", async () => {
    if (!canEditActor(actor, game)) return 0;
    const updates = list(actor.items).map(prepareProfessionProductAuthorUpdate).filter(Boolean);
    if (!updates.length || !canEditActor(actor, game)) return 0;
    await actor.performBulkUpdate({item: updates});
    return updates.length;
  });
  return result || 0;
}

/** Refresh stock tool, inscription, matrix and treasure portraits without migrating rules or embedded items. */
export async function migrateWorldProfessionProductArt(item, {game = globalThis.game} = {}) {
  if (!activeGM(game) || !item || item.actor || item.parent || item.pack || item.isOwner !== true
    || item.limited === true || typeof item.update !== "function"
    || (item.canUserModify && !item.canUserModify(game.user, "update"))) return 0;
  const source = item.toObject?.() ?? item;
  if (!["tool", "inscription", "matrix", "treasure"].includes(source.flags?.[SCOPE]?.professionProduct?.kind)) return 0;
  const update = prepareProfessionProductArtUpdate(item);
  if (!update) return 0;
  await item.update(update);
  return 1;
}

/** Update eligible old imports at ready and when an actor/item is subsequently imported. */
export function registerProfessionProductMigrations(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== "function" || registrations.has(hooks)) return;
  registrations.add(hooks);
  const migrate = async actor => {
    try { return await migrateProfessionProductItems(actor); }
    catch (error) {
      console.error("Immortals Legacy | Atualização de produtos de profissões", error);
      globalThis.ui?.notifications?.warn?.("Não foi possível atualizar as regras confirmadas dos produtos de profissões: " + error.message);
      return 0;
    }
  };
  const migrateLooseProductArt = async item => {
    try { return await migrateWorldProfessionProductArt(item); }
    catch (error) {
      console.error("Immortals Legacy | Atualização das imagens de produtos de profissões", error);
      globalThis.ui?.notifications?.warn?.("Não foi possível atualizar a imagem de um produto de profissão: " + error.message);
      return 0;
    }
  };
  hooks.once("ready", async () => {
    if (!activeGM(globalThis.game)) return;
    for (const actor of list(globalThis.game.actors)) await migrate(actor);
    for (const item of list(globalThis.game.items)) await migrateLooseProductArt(item);
  });
  hooks.on?.("createActor", actor => migrate(actor));
  hooks.on?.("createItem", item => item?.actor || item?.parent
    ? migrate(item.actor ?? item.parent) : migrateLooseProductArt(item));
}
