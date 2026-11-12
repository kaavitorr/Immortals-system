import {npcCultivationRank} from './npc-cultivation.mjs';
import {ELEMENT_ABILITIES} from './elemental-abilities-data.mjs';

const scope = 'Immortals-system';
const integer = (value, max = Infinity) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(0, Math.trunc(Number(value)))) : 0;
const stateOf = actor => actor?.flags?.[scope]?.elementalState ?? {};
const nonDamage = new Set(['healing', 'temphp', 'maximum']);
const conversionModes = Object.freeze({
  fogo: {elementId:'fogo', abilityId:'qiFlamejante', type:'fire'},
  relampago: {elementId:'relampago', abilityId:'qiEletrico', type:'lightning'},
  gelo: {elementId:'gelo', abilityId:'frioCongelante', type:'cold'}
});
const modeAliases = Object.freeze({fire:'fogo', lightning:'relampago', cold:'gelo'});

/** A saved progression entry never grants an unknown ability or more than its final tier. */
export function elementalTier(actor, elementId, abilityId) {
  const abilities = ELEMENT_ABILITIES[elementId];
  const ability = Array.isArray(abilities) ? abilities.find(entry => entry.id === abilityId) : null;
  return ability ? integer(actor?.system?.elementAbilities?.[elementId]?.[abilityId], ability.level10 ? 1 : 3) : 0;
}

/** Derived additions only: callers decide where to apply them and never persist them over manual statistics. */
export function elementalPassiveBonuses(actor) {
  const electric = elementalTier(actor,'relampago','qiEletrico');
  const wind = elementalTier(actor,'vento','ofensivaVento');
  const earth = elementalTier(actor,'terra','qiImutavel');
  const bodyFluid = stateOf(actor).bodyFluid;
  const physicalResistance = [0,1,3,5][earth];
  const fireResistance = elementalTier(actor,'fogo','avatarChamas') ? 60 : 0;
  const resistances = {};
  if (physicalResistance) for (const type of ['bludgeoning','piercing','slashing']) resistances[type] = physicalResistance;
  if (fireResistance) resistances.fire = fireResistance;
  return {
    movement: electric * 5 + wind * 3,
    baseHPBonus: elementalTier(actor,'madeira','qiDenso'),
    physicalResistance, fireResistance, resistances,
    protectedResistance: elementalTier(actor,'agua','corpoFluido') && (bodyFluid === true || bodyFluid?.active === true) ? 25 : 0,
    burstExtraDice: elementalTier(actor,'metal','estracalhar') ? Math.floor(integer(actor?.system?.conceitos?.metal?.level,10) / 2) : 0
  };
}

const knownInteger = (value, maximum) => value !== undefined && value !== null && value !== ''
  && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= maximum ? Number(value) : null;
function knownRank(actor) {
  const derived=npcCultivationRank(actor);if(derived!==null)return derived;
  return knownInteger(actor?.type === 'npc' ? actor.flags?.[scope]?.cultivationRank : actor?.system?.cultivation?.rank,10);
}

/** Recognition is information for the target resolver, not an invented unconditional damage immunity. */
function mindBreakRecognition(actor, targetActor) {
  const sourceConcept = knownInteger(actor?.system?.conceitos?.ilusao?.level,10);
  const targetConcept = knownInteger(targetActor?.system?.conceitos?.ilusao?.level,10);
  const sourceRank = knownRank(actor), targetRank = knownRank(targetActor);
  if (sourceConcept !== null && targetConcept !== null && targetConcept >= sourceConcept)
    return {code:'mindBreakRecognition',outcome:'seesThrough',reason:'illusionConcept'};
  if (sourceRank !== null && targetRank !== null && targetRank >= sourceRank + 2)
    return {code:'mindBreakRecognition',outcome:'seesThrough',reason:'cultivationRank'};
  return {code:'mindBreakRecognition',outcome:sourceConcept !== null && targetConcept !== null
    && sourceRank !== null && targetRank !== null ? 'affected' : 'unknown'};
}

/** Resolve optional player choices and active paid state without spending resources or knowing hidden targets. */
export function elementalDamageProfile(actor, {isAttack = false, isTechnique = false, elementMode = null, targetActor} = {}) {
  const state = stateOf(actor), attackBonuses = [], notes = [];
  const selected = elementMode ?? state.damageMode;
  const mode = conversionModes[modeAliases[selected] ?? selected];
  const tier = mode ? elementalTier(actor,mode.elementId,mode.abilityId) : 0;
  let conversion = tier ? {elementId:mode.elementId,type:mode.type,fraction:tier === 1 ? 0.5 : 1} : null;
  const mindState = state.mindBreak;
  const mindTier = mindState && mindState.active !== false && mindState.enabled !== false
    ? Math.min(elementalTier(actor,'ilusao','mindBreak'),integer(mindState.tier,3)) : 0;
  if (mindTier) {
    conversion = {elementId:'ilusao',type:'psychic',fraction:mindTier === 1 ? 0.5 : 1};
    notes.push(mindBreakRecognition(actor,targetActor));
  }
  if (isAttack) {
    const fireTier = elementalTier(actor,'fogo','qiFlamejante');
    if (fireTier) attackBonuses.push({source:'fogo.qiFlamejante',type:'fire',value:[0,2,3,5][fireTier]});
    if (elementalTier(actor,'relampago','punicaoTrovao') === 3)
      attackBonuses.push({source:'relampago.punicaoTrovao',type:'lightning',value:6});
    if (mindTier >= 2) attackBonuses.push({source:'ilusao.mindBreak',type:'psychic',value:3});
  }
  return {conversion,attackBonuses,burstExtraDice:elementalPassiveBonuses(actor).burstExtraDice,
    burstBonusPerPair: isAttack || isTechnique ? elementalTier(actor,'metal','estracalhar') : 0,notes};
}

const damaging = part => Number.isFinite(part.value) && part.value > 0 && !nonDamage.has(part.type);
const marker = part => part.active?.elemental;
function mark(part, data = {}) {
  part.active ??= {};
  part.active.elemental = {...part.active.elemental,processed:true,...data};
  return part;
}

/**
 * Transform already evaluated typed parts. Half conversion rounds only its combined converted share down,
 * retaining every remaining point in its original type. Parts, Sets, metadata and bonuses are fresh copies.
 * Serializable active.elemental receipts prevent repeated conversion or repeated bonus appends after reload.
 * Recognition notes from elementalDamageProfile are left to the caller's target/outcome resolution.
 */
export function elementalDamageParts(parts, actor, context = {}) {
  const output = structuredClone(parts ?? []);
  if (context.direct || context.healing) return output;
  const eligible = output.filter(damaging);
  if (!eligible.length) return output;
  const profile = context.profile ?? elementalDamageProfile(actor,context);
  const pending = eligible.filter(part => !marker(part)?.processed);
  const converted = [];
  if (profile.conversion && pending.length) {
    const {type,fraction} = profile.conversion;
    const shares = pending.map((part,index) => ({part,index,exact:part.value * fraction,
      value:fraction === 1 ? part.value : Math.floor(part.value * fraction)}));
    if (fraction !== 1) {
      let remaining = Math.floor(pending.reduce((sum,part) => sum + part.value,0) * fraction)
        - shares.reduce((sum,share) => sum + share.value,0);
      for (const share of [...shares].sort((a,b) => (b.exact % 1) - (a.exact % 1) || a.index - b.index)) {
        if (remaining <= 0) break;
        share.value++;remaining--;
      }
    }
    for (const share of shares) {
      const {part,value} = share;
      mark(part,{conversion:{...profile.conversion}});
      if (part.type === type) continue;
      if (fraction === 1) part.type = type;
      else if (value > 0) {
        const split = structuredClone(part);
        split.type = type;split.value = value;part.value -= value;converted.push(split);
      }
    }
  } else for (const part of pending) mark(part);
  const result = output.concat(converted);
  const append = bonus => {
    if (!(bonus.value > 0) || result.some(part => marker(part)?.bonusSource === bonus.source)) return;
    result.push(mark({type:bonus.type,value:bonus.value},{bonusSource:bonus.source}));
  };
  for (const bonus of profile.attackBonuses) append(bonus);
  const burstBonus = Math.floor(integer(context.burstDice) / 2) * profile.burstBonusPerPair;
  append({source:'metal.estracalhar',type:context.burstType === 'piercing' ? 'piercing' : 'slashing',value:burstBonus});
  return result;
}
