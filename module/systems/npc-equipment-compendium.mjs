import {configureCompendium} from "./compendium-configuration.mjs";
const PACK_ID = 'Immortals-system.equipamentos-pdn';
const pending = new WeakMap();
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const idOf = document => document?._id ?? document?.id;
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);
const empty = () => ({created: 0, folders: 0, updated: 0});

async function loadCatalogue() {
  const path = 'systems/Immortals-system/json/npc-equipment-catalogue.json';
  const url = globalThis.foundry?.utils?.getRoute?.(path) ?? path;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível ler o catálogo de equipamentos de PdN.');
  return response.json();
}

/** Match stable catalogue IDs and patch only equipment and activity artwork. */
export function prepareNpcEquipmentArtworkUpdate(item, reference) {
  const source = item?.toObject?.() ?? item;
  if (!source || !reference || idOf(source) !== reference._id || source.type !== reference.type
    || !['weapon', 'equipment'].includes(source.type)) return null;
  const update = {_id: idOf(source)};
  if (reference.img && source.img !== reference.img) update.img = reference.img;
  for (const [id, activity] of Object.entries(source.system?.activities ?? {})) {
    const image = reference.system?.activities?.[id]?.img;
    if (image && activity.img !== image) update['system.activities.' + id + '.img'] = image;
  }
  return Object.keys(update).length > 1 ? update : null;
}

/** Complete the stock catalogue and refresh only the artwork of its existing equipment. */
export async function ensureNpcEquipmentCompendium({game = globalThis.game, Item = globalThis.Item,
  Folder = globalThis.Folder, load = loadCatalogue} = {}) {
  if (!activeGM(game)) return empty();
  const pack = game.packs?.get?.(PACK_ID);
  if (!pack || pack.documentName !== 'Item') return empty();
  if (pending.has(pack)) return pending.get(pack);
  const work = (async () => {
    const documents = await load();
    const index = list(await pack.getIndex());
    const ids = new Set(index.map(idOf));
    const folderIds = new Set(list(pack.folders).map(idOf));
    const items = documents.filter(document => document.type !== 'Item' && !ids.has(document._id));
    const folders = documents.filter(document => document.type === 'Item' && !folderIds.has(document._id));
    const catalogue = new Map(documents.filter(document => document.type !== 'Item').map(document => [document._id, document]));
    const knownIds = [...catalogue.keys()].filter(id => ids.has(id));
    const existing = knownIds.length && typeof pack.getDocuments === 'function'
      ? list(await pack.getDocuments({_id__in: knownIds})) : index;
    const artwork = existing.map(item => prepareNpcEquipmentArtworkUpdate(item, catalogue.get(idOf(item)))).filter(Boolean);
    if ((!items.length && !folders.length && !artwork.length) || !activeGM(game)) return empty();
    const locked = pack.locked;
    const options = {pack: pack.collection, keepId: true};
    const itemApi = Item?.implementation ?? Item;
    const folderApi = Folder?.implementation ?? Folder;
    const folderCount = folders.length;
    try {
      if (locked) await configureCompendium(pack, {locked: false});
      while (folders.length) {
        if (!activeGM(game)) return empty();
        const ready = folders.filter(document => !document.folder || folderIds.has(document.folder));
        if (!ready.length) throw new Error('Uma pasta de equipamentos de PdN não possui pasta superior válida.');
        await folderApi.createDocuments(ready, options);
        for (const folder of ready) {
          folderIds.add(folder._id);
          folders.splice(folders.findIndex(document => document._id === folder._id), 1);
        }
      }
      if (artwork.length && activeGM(game)) await itemApi.updateDocuments(artwork, {pack: pack.collection});
      else if (artwork.length) return empty();
      if (items.length && activeGM(game)) await itemApi.createDocuments(items, options);
      else if (items.length) return empty();
      return {created: items.length, folders: folderCount, updated: artwork.length};
    } finally {
      if (locked) await configureCompendium(pack, {locked: true});
    }
  })();
  pending.set(pack, work);
  try { return await work; }
  finally { if (pending.get(pack) === work) pending.delete(pack); }
}

/** Older installed packs receive the same complete catalogue when an active GM opens the world. */
export function registerNpcEquipmentCompendium(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== 'function' || registrations.has(hooks)) return;
  registrations.add(hooks);
  hooks.once('ready', async () => {
    try { await ensureNpcEquipmentCompendium(); }
    catch (error) {
      console.error('Immortals Legacy | Equipamentos de PdN', error);
      globalThis.ui?.notifications?.warn?.('Não foi possível completar o catálogo de Equipamentos de PdN: '
        + (error?.message ?? String(error)));
    }
  });
}
