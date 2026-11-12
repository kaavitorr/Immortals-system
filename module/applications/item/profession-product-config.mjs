import {nativeMarketPrice} from '../../systems/material-economy.mjs';
import {PROFESSION_PRODUCTS} from "../../systems/profession-products-data.mjs";
import {professionProductDocument,professionProductPricing} from "../../systems/profession-products-content.mjs";
import {CONCEITOS_ELEMENTOS} from "../../systems/elemental-concepts-data.mjs";
import {withElementalActorLock} from "../../systems/elemental-runtime.mjs";

const SCOPE = "Immortals-system";
const idPattern = /^[A-Za-z0-9]{8,32}$/;
const qualities = Object.freeze([
  {value: "inferior", label: "Inferior"}, {value: "common", label: "Comum"},
  {value: "superior", label: "Superior"}, {value: "perfect", label: "Perfeita"}
]);
const elementalPills = new Set(["pilula-da-condensacao-elemental-de-x", "pilula-da-afinidade-elemental", "matriz-de-acumulo-elemental"]);
const registrations = new WeakSet();
const copy = value => structuredClone(value);
const own = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
const sourceOf = item => item.toObject?.() ?? item;
const storedConfig = item => item.flags?.[SCOPE]?.professionProduct;

function requireOwnedItem(item, sheet) {
  const actor = item?.actor, id = item?.id ?? item?._id;
  if (!actor || item.pack || item.isEmbedded === false) throw Error("Configure o produto a partir do inventário da criatura.");
  if (actor.isOwner !== true || item.isOwner !== true || actor.limited || sheet && sheet.isEditable !== true) {
    throw Error("Você não tem permissão para configurar este produto.");
  }
  if (typeof id !== "string" || !idPattern.test(id) || item._id && item._id !== id) throw Error("A identidade do item é inválida.");
  if (!Number.isInteger(item.system?.quantity) || item.system.quantity < 1) throw Error("Não há unidades disponíveis deste produto.");
  return {actor, id};
}
function productFor(item) {
  const stored = storedConfig(item), product = PROFESSION_PRODUCTS.find(entry => entry.id === stored?.id);
  if (!product) throw Error("A identidade deste produto de profissão não é válida.");
  if (!product.levels || product.kind === "tool") throw Error("Esta ferramenta não possui níveis de produto para configurar.");
  return product;
}
function requestedConfiguration(item, product, configuration) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) throw Error("Configuração de produto inválida.");
  const saved = storedConfig(item) ?? {};
  for (const key of ["id", "kind", "profession"]) {
    if (configuration[key] !== undefined && configuration[key] !== (key === "id" ? product.id : product[key])) {
      throw Error("A configuração não pode alterar a identidade do produto.");
    }
  }
  const level = own(configuration, "level") ? configuration.level : saved.level ?? product.levels.min;
  const quality = own(configuration, "quality") ? configuration.quality : saved.quality ?? (product.kind === "pill" ? "inferior" : null);
  if (product.kind === "pill" && !qualities.some(entry => entry.value === quality)) throw Error("Escolha uma das quatro qualidades da pílula.");
  if (product.kind !== "pill" && quality !== null) throw Error("A qualidade de pílula não se aplica a este produto.");
  const result = {level, quality};
  if (elementalPills.has(product.id)) {
    const requested = own(configuration, "element") ? configuration.element : saved.element;
    const element = CONCEITOS_ELEMENTOS.find(entry => [normalize(entry.id), normalize(entry.label)].includes(normalize(requested)));
    if (!element) throw Error("Escolha um elemento entre os treze conceitos existentes.");
    result.element = element.label;
  } else if (configuration.element !== undefined && configuration.element !== "") throw Error("Este produto não exige uma escolha de elemento.");
  return result;
}
function activitiesOf(source) {
  const activities = source.system?.activities ?? {};
  if (Array.isArray(activities)) return activities.map(activity => [activity._id, activity]);
  if (typeof activities.entries === "function") return [...activities.entries()].map(([id, activity]) => [id, activity.toObject?.() ?? activity]);
  return Object.entries(activities);
}

/**
 * Read-only flat update for this existing owned item. Generated descriptions/formulas are
 * rebuilt from the catalog. Names, quantity, folder, item uses, effects and custom activities
 * are untouched. Only native generated activity paths and their authored item stats change.
 */
export function prepareProfessionProductConfigurationUpdate(item, configuration) {
  const {id} = requireOwnedItem(item), product = productFor(item), original = sourceOf(item);
  const requested = requestedConfiguration(item, product, configuration);
  const generated = professionProductDocument(product.id, requested);
  if (item.type && item.type !== generated.type) throw Error("O tipo do item não corresponde ao produto de profissão.");
  const fresh = generated.flags[SCOPE], config = fresh.professionProduct;
  const update = {_id: id, "system.description.value": generated.system.description.value,
    ["flags." + SCOPE + ".professionProductManaged"]: false,
    ["flags." + SCOPE + ".professionProductsContentVersion"]: fresh.professionProductsContentVersion,
    ["flags." + SCOPE + ".professionProductAutomation"]: copy(fresh.professionProductAutomation)};
  if(fresh.professionRecipeVersion)update['flags.'+SCOPE+'.professionRecipeVersion']=fresh.professionRecipeVersion;
  if(fresh.professionProductPricing)update["flags."+SCOPE+".professionProductPricing"]=copy(fresh.professionProductPricing);
  const oldLevel=storedConfig(item)?.level??product.levels.min;
  if(config.level!==oldLevel||config.element!==storedConfig(item)?.element){
    const previous=Number.isInteger(oldLevel)&&oldLevel>=1&&oldLevel<=10?professionProductPricing(product,oldLevel,storedConfig(item)?.element):null,price=original.system?.price??{},amount=Number(price.value??0);
    const storedQuote=original.flags?.[SCOPE]?.professionProductPricing;
    const oldSale=storedQuote?.sale??previous?.sale;
    const oldPrice=oldSale?nativeMarketPrice(oldSale):null;
    if(amount===0||oldPrice&&price.denomination===oldPrice.denomination&&amount===oldPrice.value){
      update["system.price"]=generated.system.price?copy(generated.system.price):{value:0,denomination:'gp'};
    }
  }
  for (const [key, value] of Object.entries(config)) update["flags." + SCOPE + ".professionProduct." + key] = value;
  if (own(storedConfig(item), "element") && !own(config, "element")) update["flags." + SCOPE + ".professionProduct.-=element"] = null;
  const previous = new Map(activitiesOf(original)), generatedActivities = generated.system.activities ?? {};
  for (const [activityId, activity] of Object.entries(generatedActivities)) {
    const existing = previous.get(activityId);
    if (existing && !existing.flags?.[SCOPE]?.professionProductActivity) {
      throw Error("Uma atividade personalizada usa um identificador reservado do produto. Altere seu identificador antes de reconfigurar.");
    }
    const rebuilt = copy(activity);
    if (existing) {
      rebuilt.uses = {...rebuilt.uses,
        ...(own(existing.uses, "spent") ? {spent: existing.uses.spent} : {}),
        ...(own(existing.uses, "recovery") ? {recovery: copy(existing.uses.recovery)} : {})};
      rebuilt.effects = copy(existing.effects ?? rebuilt.effects);
      rebuilt.flags = {...copy(existing.flags ?? {}), ...rebuilt.flags,
        [SCOPE]: {...copy(existing.flags?.[SCOPE] ?? {}), ...rebuilt.flags[SCOPE]}};
    }
    update["system.activities." + activityId] = rebuilt;
    for (const key of Object.keys(existing?.flags?.[SCOPE]?.professionProductActivity ?? {})) {
      if (own(activity.flags[SCOPE].professionProductActivity, key)) continue;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) throw Error("Uma atividade possui metadados gerados inválidos.");
      update["system.activities." + activityId + ".flags." + SCOPE + ".professionProductActivity.-=" + key] = null;
    }
  }
  for (const [activityId, activity] of previous) {
    if (!activity.flags?.[SCOPE]?.professionProductActivity || own(generatedActivities, activityId)) continue;
    if (!idPattern.test(activityId)) throw Error("Uma atividade gerada possui identidade inválida.");
    update["system.activities.-=" + activityId] = null;
  }
  if (generated.system.hp) {
    const oldHP = original.system?.hp ?? {}, nextMax = generated.system.hp.max;
    const missing = Number.isFinite(oldHP.max) && Number.isFinite(oldHP.value) ? Math.max(0, oldHP.max - oldHP.value) : 0;
    update["system.hp.max"] = nextMax;
    update["system.hp.value"] = Math.max(0, nextMax - missing);
  }
  if (generated.system.refinement) update['system.refinement.rarityLevel']=config.level;
  if (generated.system.armor?.rarityLevel !== undefined) update['system.armor.rarityLevel']=config.level;
  if (generated.system.armor?.value !== undefined) update["system.armor.value"] = generated.system.armor.value;
  return update;
}

function configurationSnapshot(item) {
  const config = storedConfig(item) ?? {}, source = sourceOf(item);
  return JSON.stringify({config: {id: config.id, kind: config.kind, profession: config.profession,
    level: config.level, quality: config.quality, element: config.element},
    stock: {quantity: source.system?.quantity, uses: source.system?.uses}});
}

/** Apply one inventory-only native batch after rechecking the live item inside the actor queue. */
export async function configureProfessionProduct(item, configuration, {
  sheet, requestConfiguration = requestProductConfiguration
} = {}) {
  const {actor, id} = requireOwnedItem(item, sheet);
  productFor(item);
  const before = configurationSnapshot(item);
  const requested = configuration === undefined ? await requestConfiguration(item) : configuration;
  if (requested === null || requested === undefined || requested === false) return null;
  return withElementalActorLock(actor, "profession-item-config:" + id, async () => {
    const live = actor.items?.get?.(id);
    if (!live || live.actor !== actor) throw Error("O item foi removido ou não existe mais neste inventário.");
    requireOwnedItem(live, sheet);
    if (configurationSnapshot(live) !== before) throw Error("O estoque ou a configuração do produto mudou. Reabra a janela antes de salvar.");
    const update = prepareProfessionProductConfigurationUpdate(live, requested);
    if (typeof actor.performBulkUpdate !== "function") throw Error("A atualização nativa do inventário não está disponível.");
    await actor.performBulkUpdate({item: [update]}, {isEnergySystem: true});
    return update;
  });
}

const field = (label, input) => '<label><span>' + escape(label) + '</span>' + input + '</label>';
function select(name, options, selected, {required = false} = {}) {
  return '<select name="' + name + '"' + (required ? ' required' : '') + '>'
    + options.map(option => '<option value="' + escape(option.value) + '"'
      + (String(option.value) === String(selected) ? ' selected' : '') + '>' + escape(option.label) + '</option>').join('') + '</select>';
}

/** Escaped editor for native inventory products, with catalog-defined level limits. */
export function professionProductConfigurationDialogContent(item) {
  requireOwnedItem(item);
  const product = productFor(item), saved = storedConfig(item) ?? {};
  const levels = Array.from({length: product.levels.max - product.levels.min + 1}, (_, index) => {
    const level = product.levels.min + index; return {value: level, label: "Nível " + level};
  });
  let html = '<div class="iw-profession-editor"><p class="iw-profession-editor-wide"><strong>' + escape(item.name)
    + '</strong><br>A configuração vale para todas as ' + item.system.quantity + ' unidades desta pilha.</p>'
    + field("Nível do produto", select("product-level", levels, saved.level ?? product.levels.min));
  if (product.kind === "pill") html += field("Qualidade da pílula", select("product-quality", qualities, saved.quality ?? "inferior"));
  if (elementalPills.has(product.id)) {
    const selected = CONCEITOS_ELEMENTOS.find(entry => [normalize(entry.id), normalize(entry.label)].includes(normalize(saved.element)))?.label ?? "";
    html += field("Elemento", select("product-element", [{value: "", label: "Escolha um elemento"},
      ...CONCEITOS_ELEMENTOS.map(element => ({value: element.label, label: element.label}))], selected, {required: true}));
  }
  return html + '<p class="iw-profession-editor-wide">A descrição e as atividades geradas serão recalculadas para o nível e a qualidade escolhidos. Nome, quantidade, efeitos e atividades pessoais serão preservados.</p></div>';
}
async function requestProductConfiguration(item) {
  const product = productFor(item);
  return foundry.applications.api.DialogV2.wait({
    classes: ["iw-dialog", "iw-profession-dialog", "iw-profession-product-dialog"], position: {width: 500},
    window: {title: "Configurar produto"}, modal: true,
    content: professionProductConfigurationDialogContent(item),
    render: (_event, dialog) => {
      const element = dialog.element.querySelector('[name="product-element"]');
      const save = dialog.element.querySelector('[data-action="save"]');
      if (!element || !save) return;
      save.addEventListener("click", event => {
        if (element.reportValidity()) return;
        event.preventDefault(); event.stopPropagation();
      }, {capture: true});
    },
    buttons: [{action: "save", label: "Salvar configuração", default: true, callback: (_event, _button, dialog) => ({
      level: Number(dialog.element.querySelector('[name="product-level"]').value),
      quality: product.kind === "pill" ? dialog.element.querySelector('[name="product-quality"]').value : null,
      ...(elementalPills.has(product.id) ? {element: dialog.element.querySelector('[name="product-element"]').value} : {})
    })}, {action: "cancel", label: "Cancelar", type: "button", callback: () => null}],
    rejectClose: false, close: () => null
  });
}

/** Add one owned-inventory control to the native ApplicationV2 ItemSheet5e header. */
export function registerProfessionProductConfiguration(Hooks) {
  if (!Hooks || typeof Hooks.on !== "function" || registrations.has(Hooks)) return false;
  registrations.add(Hooks);
  Hooks.on("renderItemSheet5e", (sheet, element) => {
    const item = sheet.document ?? sheet.item, root = sheet.element ?? element;
    let allowed = false;
    try { requireOwnedItem(item, sheet); productFor(item); allowed = true; } catch { /* Not an editable inventory product. */ }
    if (!allowed) { root?.querySelector?.(".iw-profession-product-config")?.remove(); return false; }
    const header = root?.querySelector?.(".window-header");
    if (!header || header.querySelector(".iw-profession-product-config")) return false;
    const document = root.ownerDocument ?? globalThis.document;
    if (!document?.createElement) return false;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "header-control iw-profession-product-config always-interactive";
    button.title = "Configurar nível, qualidade e elemento do produto";
    button.setAttribute("aria-label", "Configurar produto de profissão");
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3"/></svg><span>Produto</span>';
    for (const eventName of ["pointerdown", "dblclick"]) button.addEventListener(eventName, event => event.stopPropagation());
    button.addEventListener("click", async event => {
      event.preventDefault(); event.stopPropagation();
      try { await configureProfessionProduct(item, undefined, {sheet}); }
      catch (error) { globalThis.ui?.notifications?.warn(error.message ?? String(error)); }
    });
    const close = header.querySelector('[data-action="close"]');
    if (close?.parentElement === header) header.insertBefore(button, close);
    else header.append(button);
    return true;
  });
  return true;
}
