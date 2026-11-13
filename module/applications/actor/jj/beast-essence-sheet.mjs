import {requestBeastEssenceSelections} from "../../shared/beast-essence-selection-editor.mjs";
import {beastEssenceArchetypeFeatures,beastEssenceSelectionPending} from "../../../systems/beast-essence-selections.mjs";
import {requestBeastEssenceGrowth} from "../../shared/beast-essence-growth-editor.mjs";
import {essenceState, ESSENCE_GROWTH} from "../../../systems/beast-essence-rules.mjs";
import {queueBeastEssenceIntegration, activateBeastEssence, deactivateBeastEssence, setBeastEssenceToken, removeBeastEssence, setBeastEssenceGrowth, setBeastEssenceSelections} from "../../../systems/beast-essence-runtime.mjs";
import {CULTIVATION_RANKS} from "../../../systems/cultivation-data.mjs";
import {CONCEITO_POR_ID} from "../../../systems/elemental-concepts-data.mjs";

const SCOPE = "Immortals-system";
const FALLBACK_ART = "systems/Immortals-system/assets/wuxia/essencias-pintadas-v1/essencia-de-besta.webp";
const GROWTH_LABELS = Object.fromEntries(Object.entries(ESSENCE_GROWTH).map(([id,value])=>[id,value.label]));
const growthReceiptLabel = definition => definition?.growthOverride ? "Alterado pelo Narrador" : definition?.growthOrigin==="divine" ? "Besta Divina"
  : Number.isInteger(definition?.growthRoll) ? `1d100 · ${definition.growthRoll}` : "Definido pelo Narrador";
const ABILITY_LABELS = {str: "Força", dex: "Agilidade", con: "Constituição", int: "Intelecto", wis: "Sabedoria", cha: "Presença"};
const busy = new Set();
const editable = sheet => !!sheet.isEditable && !!sheet.actor?.isOwner && !sheet.actor.limited;
const visible = actor => !!actor?.isOwner && !actor.limited;
const flags = actor => actor.flags?.[SCOPE]?.beastEssence ?? {};
const tokenTextureValue = (stored, essence, active) => stored.tokenTexture
  ?? (active ? stored.transformation?.tokenTexture : undefined) ?? essence?.tokenTexture ?? "";
const list = value => Array.isArray(value) ? value : [];
const items = actor => Array.from(actor.items?.contents ?? actor.items?.values?.() ?? actor.items ?? []);
const itemId = item => item.id ?? item._id;
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const numberLabel = value => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? "A definir" : String(value);
const rankLabel = value => CULTIVATION_RANKS.find(rank => rank.rank === Number(value))?.name ?? (value === 0 ? "Mortal" : "Não informado");
const nativeLabel = (config, key) => {
  const value = config?.[key];
  const label = typeof value === "string" ? value : value?.label;
  return label ? (globalThis.game?.i18n?.localize?.(label) ?? label) : key;
};
const recordLabel = record => record?.data?.name ?? record?.itemName ?? record?.name ?? "Característica sem nome";
const recordView = record => ({key: record.key, name: recordLabel(record), img: record.data?.img ?? record.img ?? ""});

/** Format stored native values for reading; this never applies or recomputes a rule. */
function nativeSummary(definition) {
  const config = globalThis.CONFIG?.JUJUTSU ?? {};
  const parts = [];
  for (const [key, value] of Object.entries(definition?.resistances ?? {})) {
    const amount = typeof value === "object" ? Number(value?.value)||0 : Number(value)||0;
    if (!amount && !value?.immune) continue;
    parts.push(nativeLabel(globalThis.CONFIG?.DND5E?.damageTypes ?? config.damageTypes, key) + " " + (value?.immune ? "Imune" : (amount>0?"+":"")+amount));
  }
  for (const [key, value] of Object.entries(definition?.movement ?? {})) {
    if (typeof value !== "number" || value <= 0) continue;
    parts.push(nativeLabel(config.movementTypes, key) + " " + String(value));
  }
  for (const [key, value] of Object.entries(definition?.senses ?? {})) {
    if (typeof value !== "number" || value <= 0) continue;
    parts.push(nativeLabel(config.senses, key) + " " + String(value));
  }
  return parts.join(" · ");
}

function formView(essence, mode, currentMode, effectiveLevel, costsPending) {
  const normal = mode === "normal";
  const featureKeys = new Set(list(normal ? essence.normalFeatures : essence.weakenedFeatures));
  const attackKeys = new Set(list(normal ? essence.normalAttacks : essence.weakenedAttacks));
  const taxonomies = [essence.taxonomy, essence.archetype].filter(Boolean);
  const archetypeFeatures=beastEssenceArchetypeFeatures(essence,mode);
  const traits = [...list(essence.taxonomy?.features),...archetypeFeatures].map(record => ({...recordView(record), level:record.level, locked:Number(record.level)>effectiveLevel}));
  traits.push(...list(essence.features).filter(record => featureKeys.has(record.key)).map(recordView));
  return {
    mode, label: normal ? "Forma normal" : "Forma enfraquecida", current: currentMode === mode,
    archetypeCount:archetypeFeatures.length,archetypeLimit:normal?5:1,
    lineages: taxonomies.map(taxonomy => ({name: taxonomy.name, summary:!normal&&taxonomy===essence.archetype?"":nativeSummary(taxonomy)})),
    traits,
    attacks: list(essence.attacks).filter(record => attackKeys.has(record.key)).map(record => ({
      ...recordView(record), costPending:costsPending || record.effectQi==null, actionsLabel: numberLabel(record.actions), actionsNoun: Number(record.actions) === 1 ? "ação" : "ações", areaLabel: record.area ? "Área" : "Alvo único",
      damageLabel: numberLabel(record.damageInstances), damageNoun: Number(record.damageInstances) === 1 ? "instância" : "instâncias", effectQiLabel: numberLabel(record.effectQi)
    }))
  };
}

/** Only presentation is assembled here. Runtime owns every document/resource mutation. */
export function prepareBeastEssenceContext(context, _options) {
  if (!visible(this.actor)) {
    context.beastEssence = {hidden: true, editable: false, essence: null, ownedEssences: [], grantedItems: [], forms: []};
    return context;
  }
  const actor = this.actor;
  const state = essenceState(actor);
  const stored = flags(actor);
  const essence = state.essence;
  const owned = items(actor);
  const grantedIds = new Set(list(stored.transformation?.grantedItemIds));
  const ownedEssences = owned.flatMap(item => {
    const definition = item.flags?.[SCOPE]?.beastEssenceItem?.definition;
    if (!definition || typeof definition !== "object") return [];
    return [{id: itemId(item), name: definition.name ?? item.name, img: definition.img || item.img || FALLBACK_ART,
      growthLabel: GROWTH_LABELS[definition.growth] ?? "Não informado", sourceRankLabel: rankLabel(definition.sourceRealm),
      limitRankLabel: rankLabel(ESSENCE_GROWTH[definition.growth]?.limitRank), growthReceiptLabel: growthReceiptLabel(definition),
      pending: itemId(item) === stored.pendingItemId}];
  });
  const grantedItems = owned.filter(item => grantedIds.has(itemId(item))).map(item => ({
    id: itemId(item), name: item.name, img: item.img, type: item.type === "weapon" ? "Arma natural" : "Característica / habilidade"
  }));
  const pendingEssence = ownedEssences.find(item => item.pending);
  const modeLabel = {normal: "Forma normal", weakened: "Forma enfraquecida", dormant: "Essência inativa", none: "Sem essência"}[state.mode] ?? "Sem essência";
  const abilityLabel = globalThis.CONFIG?.JUJUTSU?.abilities?.[state.ability]
    ? nativeLabel(globalThis.CONFIG.JUJUTSU.abilities, state.ability)
    : ABILITY_LABELS[state.ability] ?? "Atributo não informado";
  context.beastEssence = {
    ...state, hidden: false, editable: editable(this), canEditGrowth: editable(this) && globalThis.game?.user?.isGM===true, canEditSelections:editable(this)&&globalThis.game?.user?.isGM===true, archetypeSelectionPending:beastEssenceSelectionPending(essence), hasEssence: !!essence, modeLabel,
    dormantDescription: state.rank<1 ? "Alcance Condensação de Qi para despertar os benefícios desta essência." : "Seu cultivo está dois reinos acima do limite desta essência. A transformação e todos os benefícios estão suspensos.",
    activeLabel: state.mode==="dormant" ? "Essência inativa" : state.active ? "Transformação ativa" : "Transformação encerrada", dormant: state.mode === "dormant",
    canActivate: editable(this) && !!essence && !state.active && ["normal", "weakened"].includes(state.mode),
    canDeactivate: editable(this) && !!state.active,
    name: essence?.name ?? "Nenhuma essência integrada", img: essence?.img || FALLBACK_ART,
    growthLabel: GROWTH_LABELS[essence?.growth] ?? "Não informado", rankLabel: rankLabel(state.rank),
    sourceRankLabel: rankLabel(essence?.sourceRealm), limitRankLabel: rankLabel(state.limitRank),
    effectiveLevelLabel: numberLabel(state.effectiveLevel), qiBonusLabel: numberLabel(state.qiBonus),
    effectiveCultivationLabel: state.effectiveLevel>0 ? `${rankLabel(Math.ceil(state.effectiveLevel/3))} · ${1+(state.effectiveLevel-1)%3}/3` : "Condensação de Qi · 1/3",
    growthReceiptLabel: growthReceiptLabel(essence),
    growthStages: essence ? [
      {mode:"normal",label:"Forma normal",realm:`Até ${rankLabel(state.limitRank)}`},
      ...(state.limitRank<10?[{mode:"weakened",label:"Enfraquecida",realm:rankLabel(state.limitRank+1)}]:[]),
      ...(state.limitRank+2<=10?[{mode:"dormant",label:"Inativa",realm:`A partir de ${rankLabel(state.limitRank+2)}`}]:[])
    ].map(step=>({...step,current:state.rank>=1 && step.mode===state.mode})) : [],
    growthTable: Object.entries(ESSENCE_GROWTH).map(([id,value])=>({id,label:value.label,
      range:value.rollMin===value.rollMax?String(value.rollMin):`${value.rollMin}–${value.rollMax}`,limit:rankLabel(value.limitRank),selected:essence?.growth===id})),
    qiBonusPending: !!essence && (state.qiBonus === null || state.qiBonus === undefined),
    upkeepQiLabel: numberLabel(state.upkeepQi), abilityLabel,
    abilityBonusLabel: numberLabel(state.formAbilityBonus ?? state.abilityBonus), abilityCapLabel: numberLabel(state.abilityCap),
    affinityLevelLabel: numberLabel(state.affinityLevelLimit),
    elements: list(state.mode==="dormant" ? essence?.elements : state.elements).map(element => ({id: typeof element === "string" ? element : element.id,
      label: typeof element === "string" ? CONCEITO_POR_ID[element]?.label ?? element : element.label ?? CONCEITO_POR_ID[element.id]?.label ?? element.id})),
    naturalWeapons: list(essence?.naturalWeapons).map(recordView),
    forms: essence ? [formView(essence, "normal", state.mode, state.effectiveLevel, state.attackCostsPending), formView(essence, "weakened", state.mode, state.effectiveLevel)] : [],
    tokenTexture: tokenTextureValue(stored, essence, state.active),
    tokenPreview: tokenTextureValue(stored, essence, state.active) || essence?.tokenTexture || essence?.img || FALLBACK_ART,
    ownedEssences, pendingEssence, pendingMissing: !!stored.pendingItemId && !pendingEssence,
    grantedItems, hasGrantedItems: grantedItems.length > 0
  };
  return context;
}

async function write(sheet, task) {
  const key = sheet.actor?.uuid ?? sheet.actor;
  if (!editable(sheet) || busy.has(key)) return;
  busy.add(key);
  try { return await task(); }
  catch (error) { globalThis.ui?.notifications?.warn?.(error.message); }
  finally { busy.delete(key); }
}

function ownedItem(sheet, id) {
  if (!visible(sheet.actor)) return null;
  const item = sheet.actor.items?.get?.(id) ?? items(sheet.actor).find(item => itemId(item) === id);
  return item && item.visible !== false && item.limited !== true ? item : null;
}

async function prepareIntegration(sheet, target) {
  return write(sheet, async () => {
    const id = target.dataset.itemId;
    const item = ownedItem(sheet, id);
    if (!item?.flags?.[SCOPE]?.beastEssenceItem?.definition) return;
    if (flags(sheet.actor).integrated) {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        classes: ["iw-dialog"], window: {title: "Preparar nova integração"},
        content: "<p>Preparar <strong>" + escape(item.name) + "</strong> para o próximo descanso longo?</p><p>Se a integração tiver sucesso, ela substituirá a essência integrada e seus benefícios.</p>",
        yes: {label: "Preparar integração", icon: ""}, no: {label: "Manter essência atual", icon: ""}, rejectClose: false
      });
      if (!confirmed || !editable(sheet)) return;
    }
    return queueBeastEssenceIntegration(sheet.actor, id);
  });
}

async function pickToken(sheet) {
  if (!editable(sheet)) return;
  const Picker = globalThis.foundry?.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
  if (!Picker) return globalThis.ui?.notifications?.warn?.("O seletor de arquivos não está disponível. Informe o caminho da imagem no campo de token.");
  const stored = flags(sheet.actor), state = essenceState(sheet.actor);
  const current = tokenTextureValue(stored, state.essence, state.active);
  try {
    return await new Picker({type: "image", current, callback: src => write(sheet, () => setBeastEssenceToken(sheet.actor, src))}).browse();
  } catch (error) { globalThis.ui?.notifications?.warn?.(error.message); }
}

async function remove(sheet) {
  return write(sheet, async () => {
    if (!flags(sheet.actor).integrated) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      classes: ["iw-dialog"], window: {title: "Remover essência integrada"},
      content: "<p>Remover a essência integrada? A transformação será encerrada, e os benefícios e itens temporários dela serão removidos.</p><p>A essência consumida na integração não volta ao inventário.</p>",
      yes: {label: "Remover essência", icon: ""}, no: {label: "Manter essência", icon: ""}, rejectClose: false
    });
    if (!confirmed || !editable(sheet)) return;
    return removeBeastEssence(sheet.actor);
  });
}

async function editGrowth(sheet,target) {
  if(globalThis.game?.user?.isGM!==true)return;
  return write(sheet,async()=>{
    const itemId=target?.dataset?.itemId??"";
    const definition=itemId?ownedItem(sheet,itemId)?.flags?.[SCOPE]?.beastEssenceItem?.definition:flags(sheet.actor).integrated;
    if(!definition)return;
    const expectedId=definition.id,growth=await requestBeastEssenceGrowth(definition);
    if(growth===null||growth===undefined||growth===false||!editable(sheet)||globalThis.game?.user?.isGM!==true)return;
    return setBeastEssenceGrowth(sheet.actor,growth,itemId,expectedId);
  });
}

async function editSelections(sheet,target) {
  if(globalThis.game?.user?.isGM!==true)return;
  return write(sheet,async()=>{
    const itemId=target?.dataset?.itemId??"",definition=itemId?ownedItem(sheet,itemId)?.flags?.[SCOPE]?.beastEssenceItem?.definition:flags(sheet.actor).integrated;
    if(!definition)return;
    const expectedId=definition.id,selection=await requestBeastEssenceSelections(definition);
    if(!selection||!editable(sheet)||globalThis.game?.user?.isGM!==true)return;
    return setBeastEssenceSelections(sheet.actor,selection,itemId,expectedId);
  });
}

export const beastEssenceActions = {
  beastEssenceEditSelections: function(_event,target) {return editSelections(this,target);},
  beastEssenceEditGrowth: function(_event,target) { return editGrowth(this,target); },
  beastEssencePrepareIntegration: function(_event, target) { return prepareIntegration(this, target); },
  beastEssenceActivate: function() { return write(this, () => activateBeastEssence(this.actor)); },
  beastEssenceDeactivate: function() { return write(this, () => deactivateBeastEssence(this.actor)); },
  beastEssencePickToken: function() { return pickToken(this); },
  beastEssenceSaveToken: function(_event, target) {
    const input = target.closest?.(".iw-essence-token")?.querySelector("[data-beast-essence-token]");
    if (input) return write(this, () => setBeastEssenceToken(this.actor, input.value.trim()));
  },
  beastEssenceOpenItem: function(_event, target) { return ownedItem(this, target.dataset.itemId)?.sheet?.render(true); },
  beastEssenceRemove: function() { return remove(this); }
};

/** The token field is an independent draft, with no name in the actor-wide form. */
export function bindBeastEssenceSheet(element = this.element) {
  const root = element?.matches?.(".iw-beast-essence") ? element : element?.querySelector?.(".iw-beast-essence");
  if (!root) return;
  const input = root.querySelector("[data-beast-essence-token]");
  if (!input) return;
  input.disabled = !editable(this);
  if (input.dataset.beastEssenceBound) return;
  input.dataset.beastEssenceBound = "1";
  input.addEventListener("change", event => event.stopPropagation());
  input.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault(); event.stopPropagation();
    return write(this, () => setBeastEssenceToken(this.actor, input.value.trim()));
  });
}
