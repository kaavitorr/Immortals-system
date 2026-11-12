import {dispatchBeastEssenceAction, registerBeastEssenceAuthority, mayExecuteBeastEssence} from "./beast-essence-authority.mjs";
import {beastEssenceFlags, beastEssenceDefinition, essenceState, essenceIntegrationAttempt, essenceIntegrationDC} from "./beast-essence-rules.mjs";
import {buildBeastEssenceGrants} from "./beast-essence-grants.mjs";
import {elementalActionSpendUpdates, elementalRuntimeContext, withElementalActorLock} from "./elemental-runtime.mjs";
import {destinyEssenceAllowed, destinyState} from "./cultivation-destiny.mjs";
const SCOPE="Immortals-system"; const PREFIX=`flags.${SCOPE}.beastEssence.`;
const copy=value => globalThis.foundry?.utils?.deepClone?.(value)??structuredClone(value);
const integer=value => Math.max(0, Math.trunc(Number(value)||0));
const itemsOf=actor => Array.from(actor.items?.values?.()??actor.items??[]);
const grantOf=item => item?.flags?.[SCOPE]?.beastEssenceGrant;
const ownItem=(actor, id) => actor.items?.get?.(id)??itemsOf(actor).find(item => item.id===id);
const requireDestinyEssence=(actor, definition, {powers=true}={}) => {
  if (!destinyEssenceAllowed(actor, definition)) throw Error("Esta essência é incompatível com sua Linhagem Divina.");
  if (powers) {const destiny=destinyState(actor); if (destiny.key==="divine-lineage"&&!destiny.unlocked) throw Error("Os poderes da Linhagem Divina requerem o Reino do Núcleo Rotativo.");}
};
const inactive=() => ({active: false, integrationId: null, mode: null, grantedItemIds: [], tokens: [], prototype: null, tokenTexture: "", lastPaidTurn: null, turnReceipt: null, signature: null});
/**
 *
 * @param actor
 * @param user
 */
function requireOwner(actor, user) {
  if (actor?.type!=="character"||actor.isOwner!==true||actor.limited||actor.canUserModify&&user&&!actor.canUserModify(user, "update")) throw Error("Você não tem permissão para alterar esta ficha.");
}
/**
 *
 * @param actor
 */
function nativeTokens(actor) {
  if (actor.isToken||actor.parent?.documentName==="Token") return [actor.token??actor.parent].filter(Boolean);
  return Array.from(globalThis.game?.scenes??[]).flatMap(scene => Array.from(scene.tokens??[])).filter(token => token.actorLink&&token.actorId===actor.id);
}
/**
 *
 * @param turn
 */
function turnParts(turn) {if (!turn) return null; const parts=String(turn).split(":"); if (parts.length<3) return null; return {combatId: parts.slice(0, -2).join(":"), round: integer(parts.at(-2)), combatantId: parts.at(-1)};}
/**
 *
 * @param form
 * @param turn
 */
function turnReceipt(form, turn) {const value=turnParts(turn); if (!value) return null; return {combatId: value.combatId, rounds: {...(form?.turnReceipt?.combatId===value.combatId?form.turnReceipt.rounds:{}), [value.combatantId]: value.round}};}
/**
 *
 * @param actor
 * @param state
 */
function signature(actor, state) {
  const manual=itemsOf(actor).filter(item => !grantOf(item)).map(item => item._stats?.compendiumSource??item.flags?.core?.sourceId??item.flags?.[SCOPE]?.npcProfileFeature?.source).filter(Boolean).sort();
  const source=JSON.stringify([state.essence, state.mode, state.effectiveLevel, manual]); let hash=2166136261;
  for (let i=0; i<source.length; i++) {hash^=source.charCodeAt(i); hash=Math.imul(hash, 16777619);}
  return (hash>>>0).toString(16);
}
/**
 *
 * @param actor
 * @param flags
 */
function virtualActor(actor, flags) {return {type: actor.type, id: actor.id, uuid: actor.uuid, system: actor.system, items: actor.items, flags: {...actor.flags, [SCOPE]: {...actor.flags?.[SCOPE], beastEssence: flags}}};}
/**
 *
 * @param actor
 */
function saveUses(actor) {
  const old=beastEssenceFlags(actor); const cache=new Map((old.uses??[]).map(entry => [entry.key, entry]));
  for (const item of itemsOf(actor)) {
    const grant=grantOf(item); if (!grant||grant.integrationId!==old.integrated?.id) continue;
    const source=item.toObject?.()??item; const activities=Object.values(source.system?.activities??{});
    cache.set(grant.key, {key: grant.key, uses: copy(source.system?.uses??{}), activities: activities.filter(entry => entry.uses).map(entry => ({id: entry.flags?.[SCOPE]?.beastEssenceActivity?.sourceActivityId??entry._id, uses: copy(entry.uses)}))});
  }
  return [...cache.values()];
}
/**
 *
 * @param grants
 * @param uses
 */
function restoreUses(grants, uses) {
  const cache=new Map((uses??[]).map(entry => [entry.key, entry]));
  for (const item of grants) {const saved=cache.get(grantOf(item)?.key); if (!saved) continue;
    if (item.system?.uses&&saved.uses?.spent!==undefined)item.system.uses.spent=saved.uses.spent;
    for (const activity of Object.values(item.system?.activities??{})) {const entry=saved.activities?.find(value => value.id===(activity.flags?.[SCOPE]?.beastEssenceActivity?.sourceActivityId??activity._id)); if (activity.uses&&entry?.uses?.spent!==undefined)activity.uses.spent=entry.uses.spent;}
  }
  return grants;
}
/**
 * Controllers accept native boundaries for isolated tests; exported user actions use the native defaults.
 * @param root0
 * @param root0.user
 * @param root0.mayProcess
 * @param root0.tokenDocuments
 * @param root0.context
 * @param root0.idFactory
 * @param root0.buildGrants
 * @param root0.rollIntegration
 * @param root0.commit
 */
export function createBeastEssenceRuntime({
  user=() => globalThis.game?.user, mayProcess=mayExecuteBeastEssence, tokenDocuments=nativeTokens,
  context=() => elementalRuntimeContext(), idFactory=() => globalThis.foundry.utils.randomID(), buildGrants=buildBeastEssenceGrants,
  rollIntegration=async (actor, dc) => {const rolls=await actor.rollSkill({skill: "arc", ability: "con", target: dc}, {options: {window: {title: "Integração de Essência — Controle de Qi"}}}); return (Array.isArray(rolls)?rolls[0]:rolls)?.total??null;},
  commit=(actor, updates) => actor.performBulkUpdate(updates, {isEnergySystem: true, beastEssenceUpdate: true})
}={}) {
  const turnTasks = new Map();
  const allowed=actor => {requireOwner(actor, user()); if (!mayProcess(actor)) throw Error("O responsável por esta ficha mudou. Aguarde a sincronização e tente novamente.");};
  const locked=(actor, key, fn) => withElementalActorLock(actor, `beast-essence:${key}`, async () => {allowed(actor); return fn();});
  /**
   *
   * @param actor
   * @param changes
   */
  function tokenOperations(actor, changes) {
    const grouped=new Map(); for (const {token, src} of changes) {if (!src||token.texture?.src===src) continue;
      if (token.canUserModify&&user()&&!token.canUserModify(user(), "update")) throw Error("Você não tem permissão para trocar a imagem de um dos tokens deste personagem.");
      if (!token.parent) continue; const entries=grouped.get(token.parent)??[]; entries.push({_id: token.id, "texture.src": src}); grouped.set(token.parent, entries);
    }
    return [...grouped].map(([parent, updates]) => ({action: "update", documentName: "Token", parent, updates}));
  }
  /**
   *
   * @param actor
   * @param root0
   * @param root0.clear
   */
  async function stopPlan(actor, {clear=false}={}) {
    const flags=beastEssenceFlags(actor); const form=flags.transformation??{}; const tokens=await tokenDocuments(actor); const changes=[];
    for (const token of tokens) {const saved=form.tokens?.find(entry => entry.uuid===token.uuid); const applied=saved?.applied??form.tokenTexture;
      const original=saved?.src??form.prototype?.src; if (applied&&token.texture?.src===applied&&original)changes.push({token, src: original});
    }
    const ids=itemsOf(actor).filter(item => grantOf(item)&&(!form.integrationId||grantOf(item).integrationId===form.integrationId)).map(item => item.id??item._id);
    const actorUpdates={[`${PREFIX}transformation`]: inactive(), [`${PREFIX}uses`]: clear?[]:saveUses(actor)};
    if (form.prototype?.applied&&actor.prototypeToken?.texture?.src===form.prototype.applied&&form.prototype.src)actorUpdates["prototypeToken.texture.src"]=form.prototype.src;
    if (clear) {actorUpdates[`${PREFIX}integrated`]=null; actorUpdates[`${PREFIX}pendingItemId`]=null;}
    return {actor: actorUpdates, delete: ids, operations: tokenOperations(actor, changes)};
  }
  /**
   * A private clone computes the post-form HP ceiling, preventing hidden overheal in saved HP.
   * @param actor
   * @param updates
   */
  function clampAfterForm(actor, updates) {
    if (typeof actor.clone!=="function") return;
    const flags=copy(actor.flags??{}); flags[SCOPE]??={}; flags[SCOPE].beastEssence={...copy(beastEssenceFlags(actor)), transformation: copy(updates.actor[`${PREFIX}transformation`]??beastEssenceFlags(actor).transformation)};
    if (`${PREFIX}integrated` in updates.actor)flags[SCOPE].beastEssence.integrated=copy(updates.actor[`${PREFIX}integrated`]);
    const removed=new Set(updates.delete??[]); const items=itemsOf(actor).filter(item => !removed.has(item.id)).map(item => item.toObject()).concat(updates.create??[]);
    const preview=actor.clone({flags, items}, {keepId: true});
    const max=Number(preview.system?.attributes?.hp?.effectiveMax??preview.system?.attributes?.hp?.max);
    const value=Number(actor._source?.system?.attributes?.hp?.value??actor.system?.attributes?.hp?.value);
    if (Number.isFinite(max)&&Number.isFinite(value)&&value>max)updates.actor["system.attributes.hp.value"]=Math.max(0, max);
  }
  /**
   *
   * @param actor
   * @param updates
   * @param root0
   * @param root0.clamp
   */
  async function apply(actor, updates, {clamp=false}={}) {allowed(actor); if (clamp)clampAfterForm(actor, updates); await commit(actor, updates); return updates;}
  return {
    queueBeastEssenceIntegration(actor, itemId) {return locked(actor, "queue", async () => {const item=ownItem(actor, itemId); const definition=beastEssenceDefinition(item);
      if (!definition||integer(item?.system?.quantity)<1) throw Error("Escolha uma essência disponível no inventário desta ficha.");
      requireDestinyEssence(actor, definition, {powers: false});
      essenceIntegrationDC(definition); await apply(actor, {actor: {[`${PREFIX}version`]: 1, [`${PREFIX}pendingItemId`]: itemId, [`${PREFIX}completedRest`]: null}}); return true;
    });},
    completeBeastEssenceIntegration(actor, receipt) {return locked(actor, "integration", async () => {
      if (!receipt) throw Error("A integração deve ocorrer após um descanso longo concluído.");
      const flags=beastEssenceFlags(actor); if (!flags.pendingItemId||flags.lastIntegrationRest===receipt) return false;
      if (flags.completedRest?.id!==receipt||flags.completedRest.itemId!==flags.pendingItemId) throw Error("Conclua um descanso longo com esta essência preparada antes de integrar.");
      const itemId=flags.pendingItemId; const item=ownItem(actor, itemId); const definition=beastEssenceDefinition(item); const previous=flags.integrated?.id;
      essenceIntegrationAttempt(actor, item, {rollTotal: 0}); const dc=essenceIntegrationDC(definition); const total=await rollIntegration(actor, dc);
      if (total===null||total===undefined||total===false) {await apply(actor, {actor: {[`${PREFIX}completedRest`]: null, [`${PREFIX}lastIntegrationRest`]: receipt}}); return {cancelled: true, success: false};}
      allowed(actor); const fresh=beastEssenceFlags(actor); const live=ownItem(actor, itemId);
      if (fresh.pendingItemId!==itemId||fresh.integrated?.id!==previous||beastEssenceDefinition(live)?.id!==definition.id) throw Error("A essência mudou durante o teste; prepare novamente a integração.");
      const attempt=essenceIntegrationAttempt(actor, live, {rollTotal: total});
      const updates=attempt.success?await stopPlan(actor, {clear: true}):{actor: {}, item: []};
      Object.assign(updates.actor, {"system.cultivation.points": attempt.pointsRemaining,
        "system.cultivation.spentTrainingPoints": integer(actor.system?.cultivation?.spentTrainingPoints)+5,
        [`${PREFIX}pendingItemId`]: null, [`${PREFIX}completedRest`]: null, [`${PREFIX}lastIntegrationRest`]: receipt,
        [`${PREFIX}lastIntegration`]: {success: attempt.success, dc, total: Number(total), essenceId: definition.id}});
      if (attempt.success) {updates.actor[`${PREFIX}integrated`]=copy(attempt.definition); updates.actor[`${PREFIX}tokenTexture`]=definition.tokenTexture??""; updates.item=[{_id: itemId, "system.quantity": integer(live.system.quantity)-1}];}
      await apply(actor, updates, {clamp: attempt.success}); return {...attempt, definition: copy(attempt.definition)};
    });},
    activateBeastEssence(actor) {return locked(actor, "activate", async () => {
      const flags=beastEssenceFlags(actor); const state=essenceState(actor);
      requireDestinyEssence(actor, state.essence); if (state.active) return false;
      if (!state.essence||!["normal", "weakened"].includes(state.mode)) throw Error("Esta essência não pode se transformar no reino de cultivo atual.");
      const qi=integer(actor.system?.energy?.generated); if (qi<state.upkeepQi) throw Error("Qi Refinado insuficiente para a transformação.");
      const actorUpdates=elementalActionSpendUpdates(actor, 1); const tokens=await tokenDocuments(actor); const src=flags.tokenTexture||state.essence.tokenTexture||"";
      requireDestinyEssence(actor, state.essence);
      const turn=context().turn; const form={active: true, integrationId: state.essence.id, mode: state.mode, grantedItemIds: [], tokens: src?tokens.map(token => ({uuid: token.uuid, src: token.texture?.src??"", applied: src})):[], prototype: src?{src: actor.prototypeToken?.texture?.src??"", applied: src}:null, tokenTexture: src, lastPaidTurn: turn??null, turnReceipt: turnReceipt(null, turn)};
      const virtual=virtualActor(actor, {...flags, transformation: form}); const grants=restoreUses(await buildGrants(virtual, {idFactory}), flags.uses);
      requireDestinyEssence(actor, state.essence);
      form.grantedItemIds=grants.map(item => item._id); form.signature=signature(actor, state);
      Object.assign(actorUpdates, {[`${PREFIX}transformation`]: form, "system.energy.generated": qi-state.upkeepQi});
      if (src)actorUpdates["prototypeToken.texture.src"]=src;
      const stray=itemsOf(actor).filter(item => grantOf(item)).map(item => item.id);
      await apply(actor, {actor: actorUpdates, create: grants, delete: stray, operations: tokenOperations(actor, tokens.map(token => ({token, src}))) }); return true;
    });},
    deactivateBeastEssence(actor) {return locked(actor, "deactivate", async () => {const flags=beastEssenceFlags(actor); if (!flags.transformation?.active&&!itemsOf(actor).some(grantOf)) return false; await apply(actor, await stopPlan(actor), {clamp: true}); return true;});},
    removeBeastEssence(actor) {return locked(actor, "remove", async () => {await apply(actor, await stopPlan(actor, {clear: true}), {clamp: true}); return true;});},
    setBeastEssenceToken(actor, src) {return locked(actor, "token", async () => {
      src=String(src??"").trim(); if (src&&!/^(?:(?:https?:|data:image\/)|[^:]+$)/i.test(src)) throw Error("Escolha um arquivo de imagem válido para o token.");
      const flags=beastEssenceFlags(actor); const state=essenceState(actor); const form=copy(flags.transformation??inactive()); const actorUpdates={[`${PREFIX}tokenTexture`]: src}; const operations=[];
      if (state.active) {const tokens=await tokenDocuments(actor); const previous=form.tokenTexture; const changes=[];
        for (const token of tokens) {if (previous&&token.texture?.src!==previous) continue; let record=form.tokens?.find(entry => entry.uuid===token.uuid);
          if (!record) {record={uuid: token.uuid, src: form.prototype?.src??token.texture?.src??"", applied: src}; (form.tokens??=[]).push(record);}record.applied=src; changes.push({token, src: src||record.src});}
        if (!form.prototype)form.prototype={src: actor.prototypeToken?.texture?.src??"", applied: src};
        if (!previous||actor.prototypeToken?.texture?.src===previous) {actorUpdates["prototypeToken.texture.src"]=src||form.prototype.src; form.prototype.applied=src;}
        form.tokenTexture=src; actorUpdates[`${PREFIX}transformation`]=form; operations.push(...tokenOperations(actor, changes));
      }
      await apply(actor, {actor: actorUpdates, operations}); return true;
    });},
    processBeastEssenceTurn(actor, combat, {combatant, userId, phase="start"}={}) {
      if (phase!=="start"||!combat?.started||!beastEssenceFlags(actor).transformation?.active||!mayProcess(actor, combat, userId)) return Promise.resolve(false);
      combatant??=combat.combatant??combat.combatants?.get?.(combat.current?.combatantId);
      if (!combatant?.id||combatant.actor&&combatant.actor!==actor) return Promise.resolve(false);
      const round=integer(combat.round); const combatId=combat.uuid??combat.id; const combatantId=combatant.id;
      const turn=`${combatId}:${round}:${combatantId}`;
      const taskKey = `${actor.uuid??actor.id}:${turn}`;
      if (turnTasks.has(taskKey)) return turnTasks.get(taskKey);
      const task = locked(actor, `turn:${turn}`, async () => {
        const currentId=combat.combatant?.id??combat.current?.combatantId;
        if (!combat.started||integer(combat.round)!==round||currentId&&currentId!==combatantId) return false;
        const flags=beastEssenceFlags(actor); const form=flags.transformation; if (!form?.active||form.lastPaidTurn===turn) return false;
        const prior=form.turnReceipt; if (prior?.combatId===combatId&&integer(prior.rounds?.[combatantId])>=round) return false;
        const state=essenceState(actor); const qi=integer(actor.system?.energy?.generated);
        if (!state.active||qi<state.upkeepQi) {await apply(actor, await stopPlan(actor), {clamp: true}); return {ended: true};}
        await apply(actor, {actor: {"system.energy.generated": qi-state.upkeepQi, [`${PREFIX}transformation.lastPaidTurn`]: turn, [`${PREFIX}transformation.turnReceipt`]: turnReceipt(form, turn)}}); return {paid: state.upkeepQi};
      }).finally(() => turnTasks.delete(taskKey));
      turnTasks.set(taskKey, task);
      return task;
    },
    synchronizeBeastEssence(actor) {return locked(actor, "synchronize", async () => {
      const flags=beastEssenceFlags(actor); const form=flags.transformation; const state=essenceState(actor); const existing=itemsOf(actor).filter(grantOf);
      if (!state.active) {if (form?.active||existing.length) await apply(actor, await stopPlan(actor), {clamp: true}); return false;}
      const wanted=signature(actor, state); if (form.signature===wanted&&form.grantedItemIds?.length===existing.length&&form.grantedItemIds.every(id => ownItem(actor, id)&&grantOf(ownItem(actor, id))?.integrationId===state.essence.id)) return false;
      const grants=restoreUses(await buildGrants(actor, {idFactory}), saveUses(actor));
      await apply(actor, {actor: {[`${PREFIX}transformation`]: {...copy(form), mode: state.mode, grantedItemIds: grants.map(item => item._id), signature: wanted}, [`${PREFIX}uses`]: saveUses(actor)}, create: grants, delete: existing.map(item => item.id)}, {clamp: true}); return true;
    });}
  };
}
const native=createBeastEssenceRuntime();
export const queueBeastEssenceIntegration=(actor, id) => dispatchBeastEssenceAction(actor, "queue", [id]);
export const completeBeastEssenceIntegration=(actor, receipt) => dispatchBeastEssenceAction(actor, "completeRest", [receipt]);
export const activateBeastEssence=actor => dispatchBeastEssenceAction(actor, "activate");
export const deactivateBeastEssence=actor => dispatchBeastEssenceAction(actor, "deactivate");
export const setBeastEssenceToken=(actor, src) => dispatchBeastEssenceAction(actor, "setToken", [src]);
export const removeBeastEssence=actor => dispatchBeastEssenceAction(actor, "remove");
export const processBeastEssenceTurn=(actor, combat, {combatant, phase="start"}={}) => {
  if (phase!=="start"||!combat?.started||actor?.isOwner!==true||!beastEssenceFlags(actor).transformation?.active) return Promise.resolve(false);
  combatant??=combat.combatant??combat.combatants?.get?.(combat.current?.combatantId);
  if (!combatant?.id||combatant.actor?.uuid!==actor.uuid) return Promise.resolve(false);
  return dispatchBeastEssenceAction(actor, "turn", [combat.uuid??(`Combat.${combat.id}`), combatant.id, String(combat.round)]);
};
export const synchronizeBeastEssence=actor => dispatchBeastEssenceAction(actor, "sync");
const registered=new WeakSet();
/**
 * Native rests and document changes reconcile on the same elected owner as explicit sheet commands.
 * @param hooks
 */
export function registerBeastEssenceRuntimeHooks(hooks=globalThis.Hooks) {
  if (registered.has(hooks)) return; registered.add(hooks);
  const warn=error => {console.error("Immortals: Essência de Besta", error); globalThis.ui?.notifications?.warn?.(error.message);};
  const reconcile=actor => {if (actor?.type!=="character"||!mayExecuteBeastEssence(actor)||!beastEssenceFlags(actor).integrated&&!beastEssenceFlags(actor).transformation?.active&&!itemsOf(actor).some(grantOf)) return; return native.synchronizeBeastEssence(actor).catch(warn);};
  hooks.on("ready", async () => {
    registerBeastEssenceAuthority({queue: native.queueBeastEssenceIntegration, activate: native.activateBeastEssence, deactivate: native.deactivateBeastEssence, setToken: native.setBeastEssenceToken, remove: native.removeBeastEssence, completeRest: native.completeBeastEssenceIntegration, sync: native.synchronizeBeastEssence,
      turn: async (actor, uuid, combatantId, round) => {const combat=await globalThis.fromUuid(uuid); const combatant=combat?.combatants?.get?.(combatantId)??combat?.combatant; if (!combat?.started||Number(combat.round)!==Number(round)||combat.combatant?.id!==combatantId||combatant?.actor?.uuid!==actor.uuid) return false; return native.processBeastEssenceTurn(actor, combat, {combatant});}});
    for (const actor of globalThis.game?.actors??[]) if (beastEssenceFlags(actor).integrated||beastEssenceFlags(actor).transformation?.active) await reconcile(actor);
  });
  hooks.on("dnd5e.restCompleted", async (actor, result, config) => {
    if (actor?.type!=="character"||!actor.isOwner||!(result?.longRest||result?.type==="long"||config?.type==="long")||!beastEssenceFlags(actor).pendingItemId) return;
    const receipt=result?.beastEssenceRestReceipt;
    if (!receipt||beastEssenceFlags(actor).completedRest?.id!==receipt) return;
    try {const attempt=await completeBeastEssenceIntegration(actor, receipt); if (attempt?.success)globalThis.ui?.notifications?.info?.("Essência de Besta integrada."); else if (attempt?.success===false&&!attempt.cancelled)globalThis.ui?.notifications?.info?.("A integração falhou. Foram gastos 5 PC; a essência continua no inventário.");} catch (error) {warn(error);}
  });
  hooks.on("updateActor", (actor, _changes, options) => {if (options?.beastEssenceUpdate) return; return reconcile(actor);});
  for (const event of ["createItem", "deleteItem"])hooks.on(event, (item, options) => {if (options?.beastEssenceUpdate||!item.parent?.flags?.[SCOPE]?.beastEssence?.integrated) return; return reconcile(item.parent);});
}
