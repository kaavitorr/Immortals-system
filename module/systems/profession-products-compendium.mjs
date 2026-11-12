import {configureCompendium} from "./compendium-configuration.mjs";
import {prepareWeaponRarityArtworkUpdate} from './weapon-rarity-artwork.mjs';
import {beastCoreCompendiumDocuments} from "./beast-cores.mjs";
import {prepareRefinedTreasureUpdate} from './refined-equipment-migration.mjs';
import {essenceCrystalCompendiumDocuments} from "./essence-crystals.mjs";
import {chineseWeaponCompendiumDocuments, prepareChineseWeaponCategoryUpdate} from './chinese-weapons.mjs';
import {WEAPON_ARTWORK, prepareWeaponArtworkUpdate} from './weapon-artwork.mjs';
import {ARMOR_ARTWORK, prepareArmorArtworkUpdate} from "./armor-artwork.mjs";
import {FLEXIBLE_ARMOR_PRESETS, prepareFlexibleArmorUpdate} from "./flexible-armors.mjs";
import {professionProductCompendiumDocuments} from "./profession-products-content.mjs";
import {prepareProfessionProductAuthorUpdate} from "./profession-products-migration.mjs";

const PACK_ID = "Immortals-system.equipamentos";
const pending = new WeakMap();
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const idOf = document => document?._id ?? document?.id;
const empty = () => ({created: 0, folders: 0});

/** Publish missing profession products and Chinese weapons, and refresh known stock artwork through native APIs. */
export async function ensureProfessionProductsCompendium({game = globalThis.game, Item = globalThis.Item,
  Folder = globalThis.Folder} = {}) {
  if (!game?.user?.isGM) return empty();
  if (game.users?.activeGM && (game.users.activeGM.id !== game.user.id)) return empty();
  const pack = game.packs?.get?.(PACK_ID);
  if (!pack || (pack.documentName !== "Item")) return empty();
  if (pending.has(pack)) return pending.get(pack);

  const work = (async () => {
    const documents = [...professionProductCompendiumDocuments(), ...chineseWeaponCompendiumDocuments(), ...essenceCrystalCompendiumDocuments(), ...beastCoreCompendiumDocuments()];
    const index = list(await pack.getIndex());
    const ids = new Set(index.map(idOf));
    const folderIds = new Set(list(pack.folders).map(idOf));
    const missing = documents.filter(document => (document.type !== "Item") && !ids.has(document._id));
    const folders = documents.filter(document => (document.type === "Item") && !folderIds.has(document._id));
    const knownIds = [...new Set([...documents.filter(document => document.type !== "Item").map(idOf),
      ...FLEXIBLE_ARMOR_PRESETS.map(preset => preset.id), ...ARMOR_ARTWORK.map(entry => entry.id), ...WEAPON_ARTWORK.map(entry => entry.id)])].filter(id => ids.has(id));
    let existing = [];
    if (knownIds.length && typeof pack.getDocuments === "function") existing = list(await pack.getDocuments({_id__in: knownIds}));
    else if (knownIds.length && typeof pack.getDocument === "function") existing = await Promise.all(knownIds.map(id => pack.getDocument(id)));
    const known = new Set(knownIds);
    // Public reads use source data: a locked compendium can expose read-only document permissions.
    const migrations = existing.filter(document => known.has(idOf(document)))
      .map(document => document.toObject?.() ?? document)
      .filter(source => known.has(idOf(source)))
      .map(source => {
        const update=prepareProfessionProductAuthorUpdate(source) ?? prepareFlexibleArmorUpdate(source);
        const artwork=prepareArmorArtworkUpdate(source) ?? prepareWeaponRarityArtworkUpdate(source) ?? prepareWeaponArtworkUpdate(source);
        const category=prepareChineseWeaponCategoryUpdate(source);
        const refinement=prepareRefinedTreasureUpdate(source);
        return update || artwork || category || refinement ? {...update,...artwork,...category,...refinement} : null;
      }).filter(Boolean);
    if (!missing.length && !folders.length && !migrations.length) return empty();
    if (!game.user.isGM || game.users?.activeGM && game.users.activeGM.id !== game.user.id) return empty();

    const locked = pack.locked;
    const options = {pack: pack.collection, keepId: true};
    const itemApi = Item?.implementation ?? Item;
    const folderApi = Folder?.implementation ?? Folder;
    const folderCount = folders.length;
    try {
      if (locked) await configureCompendium(pack, {locked: false});
      while (folders.length) {
        const ready = folders.filter(document => !document.folder || folderIds.has(document.folder));
        if (!ready.length) throw new Error("Há uma pasta de equipamentos sem pasta superior válida.");
        await folderApi.createDocuments(ready, options);
        for (const folder of ready) {
          folderIds.add(folder._id);
          folders.splice(folders.findIndex(document => document._id === folder._id), 1);
        }
      }
      if (migrations.length) await itemApi.updateDocuments(migrations, {pack: pack.collection});
      if (missing.length) await itemApi.createDocuments(missing, options);
      return {created: missing.length, folders: folderCount};
    } finally {
      if (locked) await configureCompendium(pack, {locked: true});
    }
  })();
  pending.set(pack, work);
  try {
    return await work;
  } finally {
    if (pending.get(pack) === work) pending.delete(pack);
  }
}

/** Publish once on ready; failures remain visible without interrupting the rest of system startup. */
export function registerProfessionProductsCompendium(hooks = globalThis.Hooks) {
  if ((typeof hooks?.once !== "function") || registrations.has(hooks)) return;
  registrations.add(hooks);
  hooks.once("ready", async () => {
    try {
      await ensureProfessionProductsCompendium();
    } catch (error) {
      console.error("Immortals Legacy | Catálogo de Equipamentos", error);
      globalThis.ui?.notifications?.warn?.("Não foi possível atualizar o catálogo de Equipamentos: "
        + (error?.message ?? String(error)));
    }
  });
}
