import {constitutionModifiers} from './constitution-rules.mjs';
import {REFINED_EQUIPMENT_ROWS} from './refined-equipment.mjs';
import {professionProductImage} from "./profession-product-art.mjs";
import {PROFESSION_GUIDES, PROFESSION_PRODUCTS} from "./profession-products-data.mjs";
import {getProfessionDefinition} from "./wuxia-professions.mjs";
import {CULTIVATION_RANKS} from "./cultivation-data.mjs";
import {professionLevel, toxinState, toxicityPenalties, detoxPeriod} from "./profession-crafting-rules.mjs";

const GROUPS = Object.freeze([
  {kind: "pill", label: "Pílulas"}, {kind: "inscription", label: "Inscrições"},
  {kind: "talisman", label: "Talismãs"}, {kind: "matrix", label: "Matrizes"},
  {kind: "treasure", label: "Tesouros"}
]);
const format = value => new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 10}).format(value);
const searchText = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
const productImage = professionProductImage;
function productSummary(product) {
  const paragraph = product.descriptionHTML?.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const text = paragraph.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 144 ? text.slice(0, 140).replace(/\s+\S*$/, "") + "…" : text;
}
function validRange(range) {
  return Number.isInteger(range?.min) && Number.isInteger(range?.max) && range.min >= 1 && range.max <= 10 && range.max >= range.min;
}
function catalogProduct(product, level) {
  const levels = validRange(product.levels), dc = product.dc;
  const craftable = product.kind !== "tool" && levels && Number.isFinite(dc?.min) && Number.isFinite(dc?.max) && dc.max >= dc.min;
  const eligibleLevels = craftable ? Array.from({length: 10}, (_, index) => index + 1)
    .filter(candidate => candidate >= product.levels.min && candidate <= product.levels.max && candidate <= level + 1) : [];
  const eligible = eligibleLevels.length > 0;
  return {
    id: product.id, name: product.name, kind: product.kind, profession: product.profession,
    image: productImage(product), summary: productSummary(product),
    levels: levels ? {...product.levels} : null, dc: dc ? {...dc} : null,
    dcLabel: dc ? "CD " + dc.min + (dc.max !== dc.min ? "–" + dc.max : "") : "CD a definir",
    levelRangeLabel: levels ? product.levels.min === product.levels.max ? "Nível " + product.levels.min
      : "Níveis " + product.levels.min + "–" + product.levels.max : "Sem nível de criação",
    toxinLabel: product.toxinMultiplier === undefined ? null : "Toxina ×" + format(product.toxinMultiplier),
    hasPendingEffect: /efeito pendente/i.test(product.sourceText ?? ""),
    craftable, eligible, canCraft: craftable && eligible, eligibleLevels,
    eligibilityLabel: !craftable ? "Consultar com o mestre" : eligible ? "Disponível"
      : "A partir do nível " + product.levels.min,
    searchText: searchText(product.name + " " + (GROUPS.find(group => group.kind === product.kind)?.label ?? ""))
  };
}

/** Public catalog presentation enriched with this actor's private level, never persisted. */
export function prepareProfessionProductContext(actor, professionKey) {
  getProfessionDefinition(professionKey);
  if (actor?.limited) return {hidden: true, level: null, levelLabel: "", rankLabel: "", guideHTML: "",
    productGroups: [], products: [], tools: [], levelGallery: [], hasProducts: false};
  const guide = PROFESSION_GUIDES[professionKey], level = professionLevel(actor, professionKey);
  const items = PROFESSION_PRODUCTS.filter(product => product.profession === professionKey);
  const productGroups = GROUPS.map(group => ({...group,
    items: items.filter(product => product.kind === group.kind).map(product => catalogProduct(product, level))
  })).filter(group => group.items.length).map(group => ({...group, count: group.items.length}));
  const tools = guide.tools.map(id => {
    const product = items.find(product => product.id === id);
    if (!product) return null;
    const starting = guide.startingTools.find(tool => tool.id === id);
    return {...catalogProduct(product, level), quantity: starting?.quantity ?? null,
      quantityLabel: starting ? starting.quantity + " ×" : "Consulta", starting: Boolean(starting)};
  }).filter(Boolean);
  return {
    hidden: false, level, levelLabel: level ? "Nível " + level : "Não iniciado",
    rankLabel: level ? CULTIVATION_RANKS[level - 1].name : "Ingresso pendente",
    ...(professionKey==='artisan'?{refinedEquipment:REFINED_EQUIPMENT_ROWS}:{}),
    guideHTML: guide.descriptionHTML, guideSummary: guide.summary,
    requiredTalent: guide.requiredTalent, extraRequirements: [...guide.extraRequirements],
    requirements: [...guide.requirements], tools, toolCount: tools.length,
    productGroups, products: productGroups, productCount: productGroups.reduce((sum, group) => sum + group.count, 0),
    hasProducts: productGroups.length > 0, isBeasts: professionKey === "beasts", isAlchemy: professionKey === "alchemy",
    levelGallery: CULTIVATION_RANKS.map(rank => ({level: rank.rank, rankLabel: rank.name,
      current: rank.rank === level, attained: rank.rank <= level, next: level < 10 && rank.rank === level + 1})),
    creationCheckLabels: guide.creationChecks.map(check => check.label),
    searchPlaceholder: "Buscar " + (productGroups.length === 1 ? productGroups[0].label.toLocaleLowerCase("pt-BR") : "produtos")
  };
}

/** Read toxicity and its persistent detox tier without changing or clamping the ledger. */
export function prepareProfessionToxinContext(actor) {
  if (actor?.limited) return {hidden: true, value: null, toxins: null, displayLabel: "", penalties: null,
    meterPercent: 0, detoxLabel: "", statusLabel: "", pending: false};
  const state = toxinState(actor),constitution=constitutionModifiers(actor), penalties = toxicityPenalties(constitution.toxinImmune?0:state.value,constitution.toxinImmune?{}:state);
  const period = detoxPeriod(state.value, {highestValue: state.highestValue});
  const detoxLabel = !state.value ? "Nenhuma remoção necessária"
    : period.pending ? "Taxa de remoção acima de 90 toxinas pendente"
      : period.calendarMonthsPerPoint ? "1 mês de cultivo por ponto"
        : period.daysPerPoint + " dias de cultivo por ponto";
  return {...state, hidden: false, toxins: state.value, displayLabel: format(state.value),
    penalties, period, detoxLabel, pending: period.pending, meterPercent: Math.min(100, state.value),
    statusLabel: constitution.toxinImmune ? "Imune às toxinas; registro preservado" : state.blockedUntilClear ? "Cultivo bloqueado até zerar" : state.value ? "Toxinas acumuladas" : "Sem toxinas"};
}
