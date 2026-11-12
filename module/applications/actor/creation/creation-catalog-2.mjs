import {backgroundDocuments} from "../../../systems/wuxia-backgrounds.mjs";
import {resolveCultivatorDocument} from "../../../systems/cultivator-content.mjs";
import { cultivatorDefinition, CULTIVATOR_UUID } from "../../../systems/wuxia-character.mjs";
import { carregarGrafo } from "../../../systems/especializacoes-2.mjs";
import { CUSTOMIZATION_SECTIONS, isCustomizationCategory } from "../jj/legacy2-customization.mjs";

const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const categories = { defeitos: "jj-flaws", defeito: "jj-flaws", flaws: "jj-flaws" };

export function creationCustomizationCategory(doc, folderName = "") {
  if (doc.type !== "feat") return null;
  const explicit = doc.getFlag?.("Immortals-system", "featureSection") ?? doc.flags?.["Immortals-system"]?.featureSection;
  if (explicit) return isCustomizationCategory(explicit) ? explicit : null;
  const labels = [doc.folder?.name, folderName, doc.flags?.["custom-character-sheet-sections"]?.sectionName,
    doc.flags?.["Immortals-system"]?.bioKind, doc.system?.type?.value];
  return labels.map(label => categories[normalize(label)]).find(Boolean) ?? null;
}

/** Actual available content only. Empty customization categories remain ready for future feats. */
export async function loadCreationCatalog() {
  const pack = game.packs.get("jujutsu-compendium.geral-2-0");
  const docs = pack && pack.visible !== false ? await pack.getDocuments() : [];
  const all = [...docs, ...Array.from(game.items ?? []).filter(doc => !doc.testUserPermission || doc.testUserPermission(game.user, "OBSERVER"))];
  const backgrounds = all.filter(doc => doc.type === "background");
  for (const source of game.packs.values?.() ?? []) {
    if (source === pack || source.visible === false || source.documentName !== "Item") continue;
    const index = await source.getIndex({ fields: ["type"] });
    for (const entry of index) {
      if (entry.type !== "background") continue;
      const doc = await source.getDocument(entry._id);
      if (doc && !backgrounds.some(item => item.uuid === doc.uuid)) backgrounds.push(doc);
    }
  }
  // Authored backgrounds stay available even before the GM has populated Geral.
  for (const data of backgroundDocuments().filter(doc => doc.type === "background")) {
    const uuid = `Compendium.Immortals-system.geral.Item.${data._id}`;
    if (!backgrounds.some(doc => doc.uuid === uuid)) backgrounds.push({ ...data, uuid });
  }
  const customization = Object.fromEntries(CUSTOMIZATION_SECTIONS.map(section => [section.id, []]));
  for (const doc of all) {
    const category = creationCustomizationCategory(doc, pack?.folders?.get?.(doc.folder)?.name);
    if (category && !customization[category].some(item => item.uuid === doc.uuid)) customization[category].push(doc);
  }
  const sort = list => list.sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
  return { wuxia: true, species: [], backgrounds: sort(backgrounds), styles: [cultivatorDefinition()], customization,
    graph: await carregarGrafo() };
}

/** Legacy origin grants sometimes point to older pack IDs; resolve the actual copied item when necessary. */
export async function resolveCreationDocument(uuid) {
  if (uuid === CULTIVATOR_UUID) return cultivatorDefinition();
  let doc;
  try { doc = await fromUuid(uuid); }
  catch (error) {
    // Foundry may throw for a removed legacy pack instead of returning null.
    if (!/^Compendium\.[^.]+\.[^.]+\.Item\.[^.]+$/.test(uuid ?? "")) throw error;
  }
  if (doc) return doc;
  const authored = resolveCultivatorDocument(uuid);
  if (authored) return authored;
  if (!/^Compendium\.[^.]+\.[^.]+\.Item\.[^.]+$/.test(uuid ?? "")) return doc;
  const id = uuid.split(".").at(-1);
  return fromUuid(`Compendium.jujutsu-compendium.geral-2-0.Item.${id}`);
}
