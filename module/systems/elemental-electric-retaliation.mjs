import {elementalTier} from './elemental-rules.mjs';
import {elementalDamageCommitted} from './elemental-transactions.mjs';
import {elementalStableId} from './elemental-activity-data.mjs';
import {createElementalUseContext} from './elemental-execution.mjs';

const S = 'Immortals-system', queues = new Map(), notices = new Map();

/** The GM's movement record freezes the learned Punishment grade and current primary attribute. */
export async function elementalMovementRetaliationSnapshot(actor) {
  const tier = elementalTier(actor, 'relampago', 'punicaoTrovao');
  const {default: Ruleset} = await import('./ruleset.mjs');
  const primary = actor?.type === 'npc' ? Ruleset.npcPrincipal(actor) : Ruleset.atributoPrincipal(actor);
  const value = Number(actor?.system?.abilities?.[primary]?.value);
  return {version: 1, sourceActorUuid: actor.uuid, tier,
    damage: !tier ? 0 : Number.isFinite(value) ? Math.max(0, tier === 1 ? Math.floor(value / 2) : value) : null};
}

/** Resolve only the exceptional movement attack accepted against that exact recorded token. */
export async function executeElementalMovementRetaliation({actor, activity, originMessage, context, user}) {
  const pending = reason => ({applied: [], pending: [{reason}], skipped: []});
  const game = globalThis.game;
  if (!user?.isGM || game?.users?.activeGM && game.users.activeGM.id !== user.id) return pending('Aguardando o narrador ativo.');
  const origin = originMessage ?? await globalThis.fromUuid?.(context?.originEventId);
  const reaction = origin?.flags?.[S]?.elementalMovementReaction;
  if (origin?.type !== 'attack' || !origin.rolls?.length || origin.uuid !== context?.originEventId
    || origin.getAssociatedActor?.()?.uuid !== actor?.uuid || context.sourceActorUuid !== actor.uuid
    || origin.getAssociatedActivity?.()?.uuid !== activity?.uuid || reaction?.kind !== 'exceptionalMovement'
    || reaction.sourceActorUuid !== actor.uuid || reaction.activityId !== activity.id) return pending('O ataque excepcional precisa de conferência.');
  const event = await globalThis.fromUuid?.(reaction.eventUuid);
  const author = event?.author ?? game?.users?.get?.(event?._stats?.createdBy);
  const movement = event?.flags?.[S]?.elementalMovementEvent, snapshot = movement?.retaliation;
  if (!author?.isGM || movement?.qiElectricTier !== 3 || movement.noMovementReactions
    || reaction.targetTokenUuid !== movement.tokenUuid
    || !Array.from(origin.system?.targets ?? []).some(target => target.token === movement.tokenUuid)
    || movement.actorUuid === actor.uuid) return pending('O movimento e o alvo registrados não conferem.');
  const accepted = movement.turn ? reaction.acceptedTurn === movement.turn
    : Number.isFinite(reaction.acceptedAt) && reaction.acceptedAt >= movement.worldTime && reaction.acceptedAt - movement.worldTime <= 120;
  if (!accepted || snapshot?.version !== 1 || snapshot.sourceActorUuid !== movement.actorUuid
    || !Number.isInteger(snapshot.tier) || snapshot.tier < 0 || snapshot.tier > 3
    || !Number.isFinite(snapshot.damage) || snapshot.damage < 0) return pending('O movimento não possui um perfil de retaliação confirmado.');
  if (!snapshot.tier || !snapshot.damage) return {applied: [], pending: [], skipped: [{reason: 'Punição do Trovão não concede dano nesta ativação.'}]};
  const token = await globalThis.fromUuid?.(movement.tokenUuid), source = token?.actor;
  if (source?.uuid !== movement.actorUuid || typeof actor.applyDamage !== 'function') return pending('Uma criatura desta retaliação não está disponível.');
  const receipt = 'elemental-movement-retaliation:' + origin.uuid;
  const previous = queues.get(receipt) ?? Promise.resolve();
  const operation = previous.catch(() => {}).then(async () => {
    if (elementalDamageCommitted(actor, receipt)) return {applied: [], pending: [], skipped: [{reason: 'alreadyResolved'}]};
    const part = {type: 'lightning', value: snapshot.damage,
      active: {elemental: {processed: true, bonusSource: 'relampago.qiEletrico.retaliation'}}};
    const sourceTokenUuid = origin.flags?.[S]?.elementalActionSourceTokenUuid
      ?? origin.getOriginatingMessage?.()?.flags?.[S]?.elementalActionSourceTokenUuid;
    await actor.applyDamage([part], {receipt, sourceActor: source, targetTokenUuid: sourceTokenUuid,
      isAttack: false, elementalReaction: true, sourceEventUuid: origin.uuid});
    if (!elementalDamageCommitted(actor, receipt)) return pending('A aplicação final do dano aguarda confirmação; retome este mesmo ataque.');
    return {applied: [{target: actor.uuid, damage: snapshot.damage, type: 'lightning'}], pending: [], skipped: []};
  });
  queues.set(receipt, operation);
  try { return await operation; } finally { if (queues.get(receipt) === operation) queues.delete(receipt); }
}

/** The private recorded request lets the active GM finish it after a reload or cancelled damage dialog. */
export async function queueElementalMovementRetaliation(activity, attack) {
  const reaction = attack?.flags?.[S]?.elementalMovementReaction;
  if (attack?.type !== 'attack' || !attack.uuid || !reaction?.pendingRetaliation || reaction.kind !== 'exceptionalMovement') return;
  const id = elementalStableId('electric-retaliation:' + attack.uuid);
  if (notices.has(id)) return notices.get(id);
  const work = (async () => {
    let message = globalThis.game?.messages?.get?.(id);
    if (!message) {
      const context = createElementalUseContext(activity, {}, {requestId: id, originEventId: attack.uuid, targets: [reaction.targetTokenUuid]});
      const users = Array.from(globalThis.game?.users?.values?.() ?? globalThis.game?.users ?? []);
      message = await globalThis.ChatMessage.create({_id: id, type: 'generic', speaker: attack.speaker,
        whisper: users.filter(user => user.isGM).map(user => user.id),
        content: '<p><strong>Retaliação de Qi Elétrico</strong></p><p>Concluir o dano de Punição do Trovão referente à reação de movimento registrada.</p><button type="button" data-action="completeElementalRequest">Concluir retaliação · Narrador</button>',
        flags: {[S]: {elementalRequest: {version: 1, kind: 'movementRetaliation', context}}}}, {keepId: true});
    }
    if (globalThis.game?.user?.isGM) {
      const {executeElementalRequest} = await import('./elemental-execution.mjs');
      await executeElementalRequest({messageUuid: message.uuid});
    } else globalThis.game?.socket?.emit?.('system.Immortals-system', {action: 'elementalCompletion', messageUuid: message.uuid});
    return message;
  })();
  notices.set(id, work);
  try { return await work; } finally { if (notices.get(id) === work) notices.delete(id); }
}
