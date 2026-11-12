import {backgroundDocuments} from './wuxia-backgrounds.mjs';
import {backgroundAdvancementMigration} from './wuxia-species.mjs';
import {grantCurrencyReceipt, grantHasPendingBenefits} from './advancement-grants.mjs';

const scope = 'Immortals-system';
const prefix = 'Compendium.Immortals-system.geral.Item.';
const definitions = backgroundDocuments().filter(document => document.type === 'background');
const sourceId = item => item.flags?.[scope]?.sourceId ?? item.flags?.JujutsuLegacy?.sourceId
  ?? item._stats?.compendiumSource ?? item.flags?.[scope]?.creation2Source;
const list = actor => Array.from(actor?.items?.values?.() ?? actor?.items ?? []);
const raw = document => structuredClone(document.toObject?.() ?? document);

function definitionFor(source) {
  const key = source.flags?.[scope]?.background?.key;
  return definitions.find(document => document._id === source._id
    || key && document.flags[scope].background.key === key
    || sourceId(source) === prefix + document._id);
}

/** Prepare a native preview only; opening the character sheet never delivers items or currency. */
export function prepareBackgroundBenefits(actor, document) {
  if (document?.type !== 'background') return null;
  const background = raw(document), canonical = definitionFor(background);
  if (!canonical) return null;
  const originalAdvancement = JSON.stringify(background.system?.advancement ?? {});
  const oldVersion = background.flags?.[scope]?.backgroundRuleVersion ?? 0;
  const migration = backgroundAdvancementMigration(background, canonical);
  background.system ??= {};
  background.system.advancement ??= {};
  for (const [path, value] of Object.entries(migration ?? {})) {
    if (path.startsWith('system.advancement.')) background.system.advancement[path.split('.').at(-1)] = value;
  }
  background.flags ??= {};
  (background.flags[scope] ??= {}).backgroundRuleVersion = Math.max(2, oldVersion);

  // The old character creator already deposited its PO before equipment progression existed.
  // Retain that award even if every coin has since been spent; do not infer it from the balance.
  const creation = actor?.flags?.[scope]?.creation2 ?? actor?.getFlag?.(scope, 'creation2');
  const references = new Set([prefix + canonical._id, sourceId(background)]);
  const legacyCreation = oldVersion < 2 && creation?.completed
    && [creation.background, creation.species].some(reference => reference && references.has(reference));
  const nativeGear = Object.values(canonical.system.advancement).find(advance => advance.configuration.currency);
  if (legacyCreation && nativeGear) {
    const gear = background.system.advancement[nativeGear._id];
    gear.value ??= {};
    gear.value.currency ??= grantCurrencyReceipt({gp: background.flags[scope].background?.startingGold
      ?? canonical.flags[scope].background.startingGold});
  }

  const steps = [], currency = {};
  for (const [id, advancement] of Object.entries(background.system.advancement)) {
    const type = advancement.type, configuration = advancement.configuration ?? {};
    const levels = type === 'ItemChoice' ? [0, 1].filter(level => configuration.choices?.[level]?.count > 0)
      : Number(advancement.level ?? 0) <= 1 ? [Number(advancement.level ?? 0)] : [];
    if (!['ItemGrant', 'ItemChoice'].includes(type) || !levels.length) continue;
    advancement.value ??= {};
    const owned = list(actor).filter(item => (item.flags?.[scope]?.advancementOrigin
      ?? item.flags?.JujutsuLegacy?.advancementOrigin) === background._id + '.' + id);
    for (const level of levels) {
      const value = advancement.value;
      const added = type === 'ItemChoice' ? ((value.added ??= {})[level] ??= {}) : (value.added ??= {});
      const pool = new Set((configuration.items ?? configuration.pool ?? []).map(item => item.uuid));
      for (const item of owned) if (pool.has(sourceId(item))) added[item.id ?? item._id] ??= sourceId(item);
      const pending = type === 'ItemChoice' ? Object.keys(added).length < configuration.choices[level].count
        : grantHasPendingBenefits(configuration, value);
      if (pending) steps.push({id, type, level});
    }
    if (type === 'ItemGrant') for (const [key, amount] of Object.entries(grantCurrencyReceipt(configuration.currency))) {
      if (advancement.value.currency?.[key] === undefined) currency[key] = (currency[key] ?? 0) + amount;
    }
  }
  // Recovered receipts must be committed before inventory can later be sold or consumed.
  // Review an already satisfied grant as a no-op, so the native manager can save the repaired record.
  const needsRecording = originalAdvancement !== JSON.stringify(background.system.advancement) || oldVersion < 2;
  if (!steps.length && needsRecording) {
    const review = Object.values(background.system.advancement).find(advance => advance.type === 'ItemGrant'
      && Number(advance.level ?? 0) <= 1);
    if (review) steps.push({id: review._id, type: 'ItemGrant', level: Number(review.level ?? 0)});
  }
  return {background, steps, currency, pending: steps.length > 0, needsRecording};
}

/** A new acquisition gets a fresh native receipt, even when dragged from an older owned/world copy. */
export function backgroundAcquisitionData(source) {
  const result = prepareBackgroundBenefits(null, source);
  if (!result) return source;
  for (const advancement of Object.values(result.background.system.advancement)) advancement.value = {};
  return result.background;
}

const open = new WeakMap();
function requireOwner(actor) {
  if (actor?.type !== 'character' || actor.isOwner !== true || actor.limited
    || actor.canUserModify && !actor.canUserModify(globalThis.game?.user, 'update')) {
    throw Error('Você não tem permissão para receber os benefícios deste antecedente.');
  }
}

/** Resume only unfinished flows; the real actor is written once by the native manager after confirmation. */
export async function openBackgroundBenefits(actor, itemId, {Manager} = {}) {
  requireOwner(actor);
  if (open.has(actor)) return open.get(actor);
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  open.set(actor, waiting);
  try {
    Manager ??= (await import('../applications/advancement/advancement-manager.mjs')).default;
    requireOwner(actor);
    const document = actor.items.get(itemId);
    const plan = prepareBackgroundBenefits(actor, document);
    if (!plan?.pending) { open.delete(actor); release(null); return null; }
    const snapshot = JSON.stringify(actor.toObject());
    class BenefitsManager extends Manager {
      async _complete(event) {
        try {
          requireOwner(actor);
          if (JSON.stringify(actor.toObject()) !== snapshot) {
            throw Error('A ficha mudou durante a entrega. Abra os benefícios novamente para usar os valores atuais.');
          }
        } catch (error) {
          globalThis.ui?.notifications?.warn?.(error.message);
          await this.close({skipConfirmation: true});
          return null;
        }
        return super._complete(event);
      }
      _onClose(options) {
        try { return super._onClose(options); }
        finally { open.delete(actor); }
      }
    }
    const manager = new BenefitsManager(actor, {automaticApplication: false,
      classes: ['iw-dialog', 'iw-background-benefits-manager'],
      window: {title: 'Benefícios do antecedente — ' + document.name}});
    manager.clone.items.get(itemId).updateSource({
      'system.advancement': plan.background.system.advancement,
      ['flags.' + scope + '.backgroundRuleVersion']: plan.background.flags[scope].backgroundRuleVersion
    });
    manager.clone.reset();
    const item = manager.clone.items.get(itemId);
    manager.steps = plan.steps.flatMap(step => manager.constructor.flowsForLevel(item, step.level)
      .filter(flow => flow.advancement.id === step.id).map(flow => ({type: 'forward', flow, level: step.level})));
    if (manager.steps.length !== plan.steps.length) throw Error('Não foi possível preparar a progressão do antecedente.');
    await manager.render({force: true});
    release(manager);
    return manager;
  } catch (error) {
    open.delete(actor); release(null); throw error;
  }
}
