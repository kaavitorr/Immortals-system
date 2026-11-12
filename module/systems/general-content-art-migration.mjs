import {prepareGeneralContentArtUpdate} from "./general-content-art.mjs";
import {withElementalActorLock} from "./elemental-runtime.mjs";
const registrations = new WeakSet();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);
const canEdit = (actor, game) => activeGM(game) && actor?.isOwner === true && !actor.limited
  && ["character", "npc"].includes(actor.type)
  && (!actor.canUserModify || actor.canUserModify(game.user, "update"));

/** Share the native actor queue with crafting and uses; re-read artwork and permissions inside it. */
export async function migrateGeneralContentArt(actor, {game = globalThis.game} = {}) {
  if (!canEdit(actor, game) || typeof actor.performBulkUpdate !== "function") return 0;
  const result = await withElementalActorLock(actor, "general-content-art", async () => {
    if (!canEdit(actor, game)) return 0;
    const processed = new Set();
    let updated = 0;
    while (canEdit(actor, game)) {
      const patches = list(actor.items).map(prepareGeneralContentArtUpdate)
        .filter(patch => patch && !processed.has(patch._id));
      if (!patches.length || !canEdit(actor, game)) break;
      for (const patch of patches) processed.add(patch._id);
      await actor.performBulkUpdate({item: patches});
      updated += patches.length;
    }
    return updated;
  });
  return result || 0;
}

const pendingWorld = new WeakMap();
/** Refresh loose world Items too, so future imports and the creation catalogue share the new art. */
export async function migrateWorldGeneralContentArt({game = globalThis.game, Item = globalThis.Item} = {}) {
  const api = Item?.implementation ?? Item;
  if (!activeGM(game) || typeof api?.updateDocuments !== "function") return 0;
  if (pendingWorld.has(game)) return pendingWorld.get(game);
  const work = (async () => {
    const processed = new Set();
    let updated = 0;
    while (activeGM(game)) {
      const patches = list(game.items).filter(item => !item.actor && !["character","npc"].includes(item.parent?.type)
        && (!item.canUserModify || item.canUserModify(game.user, "update")))
        .map(prepareGeneralContentArtUpdate).filter(patch => patch && !processed.has(patch._id));
      if (!patches.length || !activeGM(game)) break;
      for (const patch of patches) processed.add(patch._id);
      await api.updateDocuments(patches);
      updated += patches.length;
    }
    return updated;
  })();
  pendingWorld.set(game, work);
  try { return await work; }
  finally { if (pendingWorld.get(game) === work) pendingWorld.delete(game); }
}

export function registerGeneralContentArtMigration(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== "function" || registrations.has(hooks)) return;
  registrations.add(hooks);
  const migrate = async actor => {
    try { return await migrateGeneralContentArt(actor); }
    catch (error) {
      console.error("Immortals Legacy | Ícones de antecedentes e talentos", error);
      globalThis.ui?.notifications?.warn?.("Não foi possível atualizar os ícones de antecedentes e talentos: " + error.message);
      return 0;
    }
  };
  hooks.once("ready", async () => {
    if (!activeGM(globalThis.game)) return;
    try { await migrateWorldGeneralContentArt(); }
    catch (error) {
      console.error("Immortals Legacy | Ícones dos itens do mundo", error);
      globalThis.ui?.notifications?.warn?.("Não foi possível atualizar os ícones dos itens do mundo: " + error.message);
    }
    for (const actor of list(globalThis.game.actors)) await migrate(actor);
  });
  hooks.on?.("createActor", actor => migrate(actor));
  hooks.on?.("createItem", item => {
    const actor = item?.actor ?? item?.parent;
    if (["character", "npc"].includes(actor?.type)) return migrate(actor);
    if (globalThis.game?.items?.get?.(item?.id) === item) {
      return migrateWorldGeneralContentArt().catch(error => console.error("Immortals Legacy | Ícone de item importado", error));
    }
  });
}
