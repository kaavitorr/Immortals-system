import {prepareWeaponRarityArtworkUpdate} from './weapon-rarity-artwork.mjs';
import {prepareWeaponArtworkUpdate} from './weapon-artwork.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const activeGM = game => game?.user?.isGM === true && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);
const canEdit = (document, game) => document?.isOwner === true && document.limited !== true
  && (!document.canUserModify || document.canUserModify(game.user, 'update'));

/** Refresh inventory images under the same transaction queue as native item activations. */
export async function migrateWeaponActorArt(actor, {game = globalThis.game} = {}) {
  const allowed = () => activeGM(game) && ['character', 'npc'].includes(actor?.type) && canEdit(actor, game)
    && typeof actor.performBulkUpdate === 'function';
  if (!allowed()) return 0;
  return await withElementalActorLock(actor, 'weapon-artwork-v1', async () => {
    if (!allowed()) return 0;
    const updates = list(actor.items).map(item=>prepareWeaponRarityArtworkUpdate(item)??prepareWeaponArtworkUpdate(item)).filter(Boolean);
    if (!updates.length || !allowed()) return 0;
    await actor.performBulkUpdate({item: updates});
    return updates.length;
  }) || 0;
}

/** Only loose world items belong here; packed documents use the shared equipment publisher. */
export async function migrateWorldWeaponArt(item, {game = globalThis.game} = {}) {
  if (!activeGM(game) || !item || item.actor || item.parent || item.pack || !canEdit(item, game)
    || typeof item.update !== 'function') return 0;
  const patch = prepareWeaponRarityArtworkUpdate(item)??prepareWeaponArtworkUpdate(item);
  if (!patch) return 0;
  await item.update(patch);
  return 1;
}

export function registerWeaponArtworkMigrations(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== 'function' || registrations.has(hooks)) return;
  registrations.add(hooks);
  const safely = async (operation, document) => {
    try { return await operation(document); }
    catch (error) {
      console.error('Immortals Legacy | Imagens das armas', error);
      globalThis.ui?.notifications?.warn?.('Não foi possível atualizar uma imagem de arma: ' + (error?.message ?? String(error)));
      return 0;
    }
  };
  hooks.once('ready', async () => {
    if (!activeGM(globalThis.game)) return;
    for (const actor of list(globalThis.game.actors)) await safely(migrateWeaponActorArt, actor);
    for (const item of list(globalThis.game.items)) await safely(migrateWorldWeaponArt, item);
  });
  hooks.on?.('createActor', actor => safely(migrateWeaponActorArt, actor));
  hooks.on?.('createItem', item => item?.actor || item?.parent
    ? safely(migrateWeaponActorArt, item.actor ?? item.parent) : safely(migrateWorldWeaponArt, item));
}
