import {configureCompendium, withCompendiumWrite} from './compendium-configuration.mjs';
const PACK_ID = 'Immortals-system.materiais';
const pending = new WeakMap();
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const idOf = document => document?._id ?? document?.id;
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);
const empty = () => ({created: 0, folders: 0});

async function loadCatalogue() {
  const path = 'systems/Immortals-system/json/ore-material-catalogue.json';
  const url = globalThis.foundry?.utils?.getRoute?.(path) ?? path;
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error('Não foi possível ler o catálogo de minérios.');
  return response.json();
}

/** Add only missing stock documents; never replace the GM's existing materials or edits. */
export async function ensureOreMaterialCompendium({game = globalThis.game, Item = globalThis.Item,
  Folder = globalThis.Folder, load = loadCatalogue} = {}) {
  if (!activeGM(game)) return empty();
  const pack = game.packs?.get?.(PACK_ID);
  if (!pack || pack.documentName !== 'Item') return empty();
  if (pending.has(pack)) return pending.get(pack);
  const work = withCompendiumWrite(pack, async () => {
    if (!activeGM(game)) return empty();
    const documents = await load();
    if (!Array.isArray(documents) || documents.some(d => !d?._id
      || (d.type !== 'Item' && (d.type !== 'loot' || d.system?.type?.value !== 'material')))) {
      throw new Error('Catálogo de minérios inválido.');
    }
    const ids = new Set(list(await pack.getIndex()).map(idOf));
    const folderIds = new Set(list(pack.folders).map(idOf));
    const folders = documents.filter(d => d.type === 'Item' && !folderIds.has(d._id));
    const items = documents.filter(d => d.type !== 'Item' && !ids.has(d._id));
    if ((!folders.length && !items.length) || !activeGM(game)) return empty();
    const locked = pack.locked;
    const options = {pack: pack.collection, keepId: true};
    const result = empty();
    try {
      if (locked) await configureCompendium(pack, {locked: false});
      while (folders.length) {
        if (!activeGM(game)) return result;
        const ready = folders.filter(d => !d.folder || folderIds.has(d.folder));
        if (!ready.length) throw new Error('Uma pasta de minérios não possui pasta superior válida.');
        await (Folder?.implementation ?? Folder).createDocuments(ready, options);
        result.folders += ready.length;
        for (const folder of ready) {
          folderIds.add(folder._id);
          folders.splice(folders.findIndex(d => d._id === folder._id), 1);
        }
      }
      for (let offset = 0; offset < items.length; offset += 100) {
        if (!activeGM(game)) break;
        const batch = items.slice(offset, offset + 100);
        await (Item?.implementation ?? Item).createDocuments(batch, options);
        result.created += batch.length;
      }
      return result;
    } finally {
      if (locked) await configureCompendium(pack, {locked: true});
    }
  });
  pending.set(pack, work);
  try { return await work; }
  finally { if (pending.get(pack) === work) pending.delete(pack); }
}

/** Existing installations receive the new ore folder through Foundry's native APIs. */
export function registerOreMaterialCompendium(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== 'function' || registrations.has(hooks)) return;
  registrations.add(hooks);
  hooks.once('ready', async () => {
    try { await ensureOreMaterialCompendium(); }
    catch (error) {
      console.error('Immortals Legacy | Minérios', error);
      globalThis.ui?.notifications?.warn?.('Não foi possível completar o catálogo de Minérios: '
        + (error?.message ?? String(error)));
    }
  });
}
