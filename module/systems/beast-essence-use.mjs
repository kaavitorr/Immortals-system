import {beastEssenceArchetypeFeatures} from "./beast-essence-selections.mjs";
import {beastEssenceFlags, essenceState, BEAST_ESSENCE_POLICY} from "./beast-essence-rules.mjs";
import {elementalActionSpendUpdates, withElementalActorLock} from "./elemental-runtime.mjs";
const SCOPE="Immortals-system";
export const isBeastEssenceActivity=activity => !!activity?.flags?.[SCOPE]?.beastEssenceActivity;
const metadata=activity => activity?.flags?.[SCOPE]?.beastEssenceActivity;
/**
 *
 * @param record
 */
export function beastEssenceAttackCost(record) {
  if (!Number.isInteger(record?.damageInstances)||record.damageInstances<0||!Number.isInteger(record?.effectQi)||record.effectQi<0) return {qi: null, pending: true, reason: "Defina as instâncias de dano e o custo dos efeitos deste ataque com o narrador."};
  const rule=BEAST_ESSENCE_POLICY.attackDamageRule; if (rule===null) return {qi: null, pending: true, reason: "A regra de custo dos ataques da essência ainda aguarda definição do autor."};
  const limit=record.area?4:6;
  if (rule==="cap"&&record.damageInstances>limit) return {qi: null, pending: true, reason: "As instâncias deste ataque excedem o limite da essência."};
  const damage=rule==="minimum"&&record.damageInstances>0?Math.max(limit, record.damageInstances):record.damageInstances;
  return {qi: damage+record.effectQi, pending: false, reason: ""};
}
/**
 *
 * @param state
 * @param grant
 */
function permitted(state, grant) {
  const e=state.essence; const key=grant.key;
  if (grant.kind==="attack") return (state.mode==="normal"?e.normalAttacks:e.weakenedAttacks)?.includes(key);
  if (grant.kind==="naturalWeapon") return e.naturalWeapons?.some(entry => entry.key===key);
  if (grant.kind==="taxonomy") return e.taxonomy?.features?.some(entry => entry.key===key&&entry.level<=state.effectiveLevel);
  if (grant.kind==="archetype") return beastEssenceArchetypeFeatures(e,state.mode,state.effectiveLevel).some(entry=>entry.key===key);
  return (state.mode==="normal"?e.normalFeatures:e.weakenedFeatures)?.includes(key);
}
/**
 * Mandatory costs and current native ownership are rechecked inside the shared actor transaction queue.
 * @param activity
 * @param usageConfig
 * @param options
 */
export function prepareBeastEssenceActivation(activity, usageConfig={}, options={}) {
  const meta=metadata(activity); if (!meta) return null;
  const actor=activity.actor??activity.item?.actor; const item=activity.item; const state=essenceState(actor); const flags=beastEssenceFlags(actor); const grant=item?.flags?.[SCOPE]?.beastEssenceGrant;
  if (actor?.isOwner!==true||item?.isOwner===false) throw Error("Você não tem permissão para usar esta transformação.");
  if (!state.active||meta.integrationId!==state.essence?.id||grant?.integrationId!==state.essence?.id) throw Error("Esta habilidade exige a transformação da essência ativa.");
  const id=item.id??item._id; const live=actor.items?.get?.(id);
  if (!live||item.isEmbedded===false||!flags.transformation?.grantedItemIds?.includes(id)||live.flags?.[SCOPE]?.beastEssenceGrant?.key!==grant.key) throw Error("Esta atividade não pertence à concessão atual da essência.");
  if (!permitted(state, grant)) throw Error("Este ataque ou característica não está disponível na forma atual.");
  const targets=Array.from(activity.consumption?.targets??[]); const enabled=usageConfig.consume;
  if (targets.length&&(enabled===false||targets.some((_target, index) => enabled!==true&&enabled?.resources!==true&&!(Array.isArray(enabled?.resources)&&enabled.resources.includes(index))))) throw Error("O consumo dos recursos da essência deve permanecer ativado.");
  let minimum=0;
  if (grant.kind==="attack") {
    const record=state.essence.attacks?.find(entry => entry.key===grant.key); if (!record) throw Error("O ataque especial não faz parte desta essência.");
    const maximum=state.mode==="normal"?3:6; if (!Number.isInteger(record.actions)||record.actions<1||record.actions>maximum) throw Error("O ataque excede as ações permitidas nesta forma.");
    const cost=beastEssenceAttackCost(record); if (cost.pending) throw Error(cost.reason); minimum=record.actions;
    const qiTargets=targets.filter(target => target.type==="attribute"&&target.target==="energy.generated");
    if (qiTargets.length!==1||Number(qiTargets[0].value)!==cost.qi) throw Error("O custo deste ataque mudou; encerre e ative novamente a transformação.");
  }
  const actions=Math.max(minimum, Math.trunc(Number(options.actionCost??activity.activation?.value)||0));
  return {actor: elementalActionSpendUpdates(actor, actions), meta};
}
/**
 *
 * @param activity
 */
export function refreshBeastEssenceConsumption(activity) {
  if (!isBeastEssenceActivity(activity)) return;
  const item=activity.item; const live=(activity.actor??item?.actor)?.items?.get?.(item.id??item._id); if (!live||live===item) return;
  const spent=live.system?.uses?.spent; if (spent!==undefined&&item.updateSource)item.updateSource({"system.uses.spent": spent});
  const uses=live.system?.activities?.get?.(activity.id??activity._id)?.uses; if (uses&&activity.updateSource)activity.updateSource({"uses.spent": uses.spent});
}
/**
 *
 * @param activity
 * @param callback
 */
export function withBeastEssenceActivationLock(activity, callback) {return withElementalActorLock(activity.actor??activity.item?.actor, `beast-essence-use:${activity.item?.id??activity.item?._id}:${activity.id??activity._id}`, callback);}
