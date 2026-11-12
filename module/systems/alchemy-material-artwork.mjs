import {configureCompendium, withCompendiumWrite} from "./compendium-configuration.mjs";
const PACK_ID = 'Immortals-system.materiais';
const SCOPE = 'Immortals-system';
const pending = new WeakMap();
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);

async function loadArtwork() {
  const path = 'systems/Immortals-system/json/alchemy-material-artwork.json';
  const url = globalThis.foundry?.utils?.getRoute?.(path) ?? path;
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error('Não foi possível ler as imagens de materiais.');
  return response.json();
}

/** Only known stock alchemy materials receive new artwork; mechanics and player items are untouched. */
export function prepareAlchemyMaterialArtworkUpdate(item, reference) {
  const source = item?.toObject?.() ?? item;
  const id = source?._id ?? source?.id;
  if (!id || id !== reference?._id || source.type !== 'loot' || source.system?.type?.value !== 'material'
    || !source.flags?.[SCOPE]?.alchemyMaterial || source.img === reference.img) return null;
  const prefix = 'systems/Immortals-system/assets/wuxia/materiais-pintados-v1/';
  if (!reference.img?.startsWith(prefix) || !reference.img.endsWith('/' + id + '.webp')
    || reference.img.includes('..')) return null;
  return {_id: id, img: reference.img};
}

/** Update installed compendiums with native APIs, preserving lock state and deduplicating concurrent refreshes. */
export async function ensureAlchemyMaterialArtwork({game = globalThis.game, Item = globalThis.Item,
  load = loadArtwork} = {}) {
  if (!activeGM(game)) return {updated: 0};
  const pack = game.packs?.get?.(PACK_ID);
  if (!pack || pack.documentName !== 'Item') return {updated: 0};
  if (pending.has(pack)) return pending.get(pack);
  const work = withCompendiumWrite(pack, async () => {
    const catalogue = await load();
    const artwork = new Map((catalogue.entries ?? []).map(entry => [entry._id, entry]));
    const index = list(await pack.getIndex({fields: ['type', 'system.type.value', 'flags.' + SCOPE + '.alchemyMaterial']}));
    const updates = index.map(item => prepareAlchemyMaterialArtworkUpdate(item, artwork.get(item._id ?? item.id))).filter(Boolean);
    if (!updates.length || !activeGM(game)) return {updated: 0};
    const locked = pack.locked;
    let updated = 0;
    try {
      if (locked) await configureCompendium(pack, {locked: false});
      for (let offset = 0; offset < updates.length; offset += 200) {
        if (!activeGM(game)) break;
        const batch = updates.slice(offset, offset + 200);
        await (Item?.implementation ?? Item).updateDocuments(batch, {pack: pack.collection});
        updated += batch.length;
      }
      return {updated};
    } finally {
      if (locked) await configureCompendium(pack, {locked: true});
    }
  });
  pending.set(pack, work);
  try { return await work; }
  finally { if (pending.get(pack) === work) pending.delete(pack); }
}

export function registerAlchemyMaterialArtwork(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== 'function' || registrations.has(hooks)) return;
  registrations.add(hooks);
  hooks.once('ready', async () => {
    try { await ensureAlchemyMaterialArtwork(); }
    catch (error) {
      console.error('Immortals Legacy | Imagens de Materiais', error);
      globalThis.ui?.notifications?.warn?.('Não foi possível atualizar as imagens de Materiais: '
        + (error?.message ?? String(error)));
    }
  });
}
