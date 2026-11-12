import {elementalDamageParts, elementalDamageProfile} from './elemental-rules.mjs';

const scope = 'Immortals-system';
const nonDamage = new Set(['healing','temphp','maximum']);
const positive = value => Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
const damaging = part => Number.isFinite(part.value) && part.value > 0 && !nonDamage.has(part.type);
const ordinary = part => damaging(part) && part.type !== 'soul';
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child);Object.freeze(value); }
  return value;
}

/** Capture paid conversion/bonus choices before later actor edits or mode changes can affect this damage. */
export function elementalDamageSnapshot(sourceActor, context = {}) {
  const profile=structuredClone(context.profile ?? elementalDamageProfile(sourceActor,context));
  if(context.attackModifiers?.lethargy)profile.conversion={type:'void',fraction:1,elementId:'escuridao'};
  return freeze({
    ...(context.attackModifiers?{attackModifiers:structuredClone({...context.attackModifiers,updates:undefined})}:{}),
    profile,
    ...(context.riders?{riders:structuredClone(context.riders)}:{}),
    burstDice:Math.trunc(positive(context.burstDice)),
    burstType:context.burstType === 'piercing' ? 'piercing' : 'slashing'
  });
}

/** Pure outgoing preparation; existing typed receipts survive and all elemental logic runs in one shared pass. */
export function prepareElementalDamage(parts, sourceActor, context = {}) {
  const snapshot = context.elementalSnapshot;
  const profile = context.profile ?? snapshot?.profile;
  const resolved = {...context,
    ...(snapshot ? {burstDice:snapshot.burstDice,burstType:snapshot.burstType} : {}),
    ...(profile ? {profile} : {})};
  const prepared=elementalDamageParts(parts,sourceActor,resolved);
  const finalBonus=Math.trunc(positive(snapshot?.attackModifiers?.finalDamageBonus));
  if(finalBonus&&prepared.some(damaging)&&!context.direct&&!context.healing&&!prepared.some(p=>p.active?.elemental?.bonusSource==='metal.qiDilacerador')){
    prepared.push({type:'force',value:finalBonus,active:{elemental:{processed:true,bonusSource:'metal.qiDilacerador',pure:true}}});
  }
  return prepared;
}

/**
 * Plan finite one-for-one barrier absorption at FINAL application only, never during a preview.
 * A number is already-partitioned ordinary damage; typed input excludes Soul and all healing parts.
 * Return updates to merge with armor/HP/wound writes, without updating the actor here.
 * Optional receipt and typed active.elementalBarrier markers guard repeated processing, not all HP application.
 * Expiry/removal belongs to the activation/turn controller that owns elementalState.
 */
export function elementalBarrierAbsorption(actor, damage, {direct = false, healing = false, receipt = null} = {}) {
  const parts = Array.isArray(damage) ? structuredClone(damage) : null;
  const barrier = actor?.flags?.[scope]?.elementalState?.barrier;
  const current = positive(barrier?.value);
  const eligible = parts?.filter(ordinary);
  const normal = parts ? eligible.reduce((sum,part) => sum + part.value,0) : positive(damage);
  const total = parts ? parts.filter(damaging).reduce((sum,part) => sum + part.value,0) : normal;
  const id = typeof receipt === 'string' && receipt ? receipt : null;
  const alreadyApplied = !!(id && barrier?.lastReceipt === id)
    || !!(eligible?.length && eligible.every(part => part.active?.elementalBarrier?.processed));
  const result = {parts,absorbed:0,remaining:total,normalRemaining:normal,value:current,updates:{},alreadyApplied};
  if (direct || healing || alreadyApplied || !current || !normal || barrier?.active === false || barrier?.enabled === false) return result;
  const pending = parts ? eligible.filter(part => !part.active?.elementalBarrier?.processed) : null;
  const available = parts ? pending.reduce((sum,part) => sum + part.value,0) : normal;
  const absorbed = Math.min(current,available);
  if (!absorbed) return result;
  if (parts) {
    let left = absorbed;
    for (const part of pending) {
      const spent = Math.min(left,part.value);
      part.value -= spent;left -= spent;
      part.active ??= {};
      part.active.elementalBarrier = {processed:true,...(id ? {receipt:id} : {})};
    }
  }
  result.absorbed = absorbed;result.remaining -= absorbed;result.normalRemaining -= absorbed;result.value -= absorbed;
  result.updates['flags.' + scope + '.elementalState.barrier.value'] = result.value;
  if (id) result.updates['flags.' + scope + '.elementalState.barrier.lastReceipt'] = id;
  return result;
}
