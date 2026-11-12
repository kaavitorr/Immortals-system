import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile, readdir} from 'node:fs/promises';
import {load} from 'js-yaml';
import {backgroundDocuments} from '../module/systems/wuxia-backgrounds.mjs';
import {professionProductCompendiumDocuments} from '../module/systems/profession-products-content.mjs';
import {openBackgroundBenefits, prepareBackgroundBenefits, backgroundAcquisitionData} from '../module/systems/background-benefits.mjs';
import * as grants from '../module/systems/advancement-grants.mjs';
import {isCultivator, cultivatorProgression} from '../module/systems/cultivator-rules.mjs';
import Ruleset from '../module/systems/ruleset.mjs';

const scope = 'Immortals-system', deleted = Symbol('deleted'), copy = value => structuredClone(value);
const documents = new Map();
for (const doc of backgroundDocuments()) if (doc.type !== 'Item') documents.set('Compendium.Immortals-system.geral.Item.' + doc._id, doc);
for (const doc of professionProductCompendiumDocuments()) if (doc.type !== 'Item') documents.set('Compendium.Immortals-system.equipamentos.Item.' + doc._id, doc);
for (const file of await readdir(new URL('../packs/_source/equipamentos/', import.meta.url))) {
  if (!/\.(yml|json)$/.test(file)) continue;
  const text = await readFile(new URL('../packs/_source/equipamentos/' + file, import.meta.url), 'utf8');
  const doc = file.endsWith('.json') ? JSON.parse(text) : load(text);
  if (doc.type !== 'Item') documents.set('Compendium.Immortals-system.equipamentos.Item.' + doc._id, doc);
}
function merge(target, patch) {
  for (const [path, value] of Object.entries(patch)) {
    const keys = path.split('.'), last = keys.pop();
    let parent = target;
    for (const key of keys) parent = parent[key] ??= {};
    if (value === deleted) delete parent[last];
    else if (value && typeof value === 'object' && !Array.isArray(value)) merge(parent[last] ??= {}, value);
    else parent[last] = typeof value === 'function' ? value : copy(value);
  }
  return target;
}
const messages = [];
globalThis.game = {user: {id: 'owner'}, settings: {get: (_scope, key) => key === 'rulesetVersion' ? '2.0' : false}};
globalThis.ui = {notifications: {error: message => messages.push(message), warn: message => messages.push(message)}};
globalThis.Hooks = {call: () => true, callAll() {}};
globalThis._loc = key => key;
globalThis.CONFIG = {Item: {typeLabels: {}}, DND5E: {featureTypes: {}, abilities: {}}};
globalThis.fromUuid = async uuid => documents.get(uuid);
globalThis.fromUuidSync = uuid => documents.get(uuid);
globalThis.foundry = {utils: {mergeObject: merge, isEmpty: value => !Object.keys(value ?? {}).length,
  getProperty: (object, path) => path.split('.').reduce((value, key) => value?.[key], object)}};
Array.fromRange ??= (length, start = 0) => Array.from({length}, (_, index) => start + index);
Object.defineProperty(Array.prototype, 'findSplice', {configurable: true, value(predicate) {
  const index = this.findIndex(predicate);
  return index < 0 ? undefined : this.splice(index, 1)[0];
}});

class ApplicationBoundary {
  constructor(options = {}) { this.options = options; this.element = {querySelector: () => null}; }
  async render() { this.rendered = true; return this; }
  async close(options = {}) { this.rendered = false; this._onClose(options); }
  _onClose() {}
}
class FlowBoundary extends ApplicationBoundary {
  constructor({document, level}) { super(); this.advancement = document; this.item = document.item; this.level = level; }
  getAutomaticApplicationValue() { return this.advancement.automaticApplicationValue(this.level); }
  async submit() { await this.advancement.apply(this.level, this.selection ?? {}); }
  async retainData(data) { this.retainedData = data; }
}
globalThis.Application = class {};
globalThis.dnd5e = {applications: {advancement: {AdvancementFlowV2: FlowBoundary}}};
let serial = 0;
class AdvancementBoundary {
  static metadata = {};
  static ERROR = class extends Error {};
  constructor(actor, item, data) { this.actor = actor; this.item = item; this.data = data; }
  get id() { return this.data._id; }
  get type() { return this.data.type; }
  get configuration() { return this.data.configuration; }
  get value() { return this.data.value ??= {}; }
  get levels() { return [this.data.level ?? 0]; }
  get appliesToClass() { return true; }
  updateSource(patch) { merge(this.data, patch); }
  toObject() { return copy(this.data); }
  async createItemData(uuid) {
    const source = documents.get(uuid);
    if (!source) return null;
    const data = copy(source);
    data._id = 'awarded-' + (++serial);
    data.flags ??= {};
    for (const key of [scope, 'JujutsuLegacy']) Object.assign(data.flags[key] ??= {}, {
      sourceId: uuid, advancementOrigin: this.item.id + '.' + this.id, advancementRoot: this.item.id + '.' + this.id
    });
    return data;
  }
}
const strip = source => source.replace(/^import .*;\r?\n/gm, '');
const grantSource = strip(await readFile(new URL('../module/documents/advancement/item-grant.mjs', import.meta.url), 'utf8'));
const NativeGrant = new Function('Advancement', 'ItemGrantConfig', 'ItemGrantFlow', 'ItemGrantConfigurationData', '_del', ...Object.keys(grants),
  grantSource.replace('export default class', 'return class'))(AdvancementBoundary, {}, FlowBoundary, {}, deleted, ...Object.values(grants));
const choiceSource = strip(await readFile(new URL('../module/documents/advancement/item-choice.mjs', import.meta.url), 'utf8'));
const NativeChoice = new Function('ItemGrantAdvancement', 'ItemChoiceConfig', 'ItemChoiceFlow', 'ItemChoiceConfigurationData', 'ItemChoiceValueData',
  'Ruleset', 'speciesTalentAllowed', 'revalidateSpeciesTalentGrants', '_del', choiceSource.replace('export default class', 'return class'))
  (NativeGrant, {}, FlowBoundary, {}, {}, Ruleset, () => true, async () => {}, deleted);
const managerSource = strip(await readFile(new URL('../module/applications/advancement/advancement-manager.mjs', import.meta.url), 'utf8'));
const NativeManager = new Function('Advancement', 'Application5e', 'log', 'advancementCompletionError', 'advancementCleanupLevel', 'isCultivator', 'cultivatorProgression',
  managerSource.replace('export default class AdvancementManager', 'class AdvancementManager') + '\nreturn AdvancementManager;')
  (AdvancementBoundary, ApplicationBoundary, () => {}, grants.advancementCompletionError, grants.advancementCleanupLevel, isCultivator, cultivatorProgression);

class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  map(fn) { return [...this.values()].map(fn); }
  delete(id) { this.actor.data.items = this.actor.data.items.filter(item => item._id !== id); return super.delete(id); }
}
class ActorBoundary {
  constructor(data) { this.data = copy(data); this.isOwner = true; this.writes = 0; this.reset(); }
  get type() { return this.data.type; }
  get flags() { return this.data.flags; }
  clone() { return new ActorBoundary(this.data); }
  toObject() { return copy(this.data); }
  reset() {
    this.system = this.data.system;
    this.items = new Items(); this.items.actor = this;
    for (const source of this.data.items) {
      const item = {id: source._id, type: source.type, name: source.name, flags: source.flags, system: source.system,
        actor: this, toObject: () => copy(source), advancement: {byId: {}, byLevel: {}},
        updateSource: patch => { merge(source, patch); this.reset(); }};
      for (const data of Object.values(source.system?.advancement ?? {})) {
        data.value ??= {};
        if (data.type === 'ItemChoice') { data.value.added ??= {}; data.value.replaced ??= {}; }
        const advance = new (data.type === 'ItemChoice' ? NativeChoice : NativeGrant)(this, item, data);
        item.advancement.byId[advance.id] = advance;
        for (const level of advance.levels) (item.advancement.byLevel[level] ??= []).push(advance);
      }
      item.hasAdvancement = Object.keys(item.advancement.byId).length > 0;
      this.items.set(item.id, item);
    }
  }
  updateSource({items, ...patch}) {
    merge(this.data, patch);
    for (const source of items ?? []) {
      const current = this.data.items.find(item => item._id === source._id);
      if (current) merge(current, source); else this.data.items.push(copy(source));
    }
    this.reset();
  }
  async performBulkUpdate({actor, create, item, delete: remove}) {
    this.writes++;
    const existing = new Map(this.data.items.map(source => [source._id, source]));
    for (const id of remove ?? []) existing.delete(id);
    for (const source of [...create ?? [], ...item ?? []]) existing.set(source._id, copy(source));
    this.data = {...copy(actor), items: [...existing.values()]}; this.reset();
  }
}
function fixture(key, {old = true, completedCreation = false} = {}) {
  const canonical = [...documents.values()].find(doc => doc.type === 'background' && doc.flags?.[scope]?.background?.key === key);
  const background = copy(canonical); background._id = 'owned-background';
  background._stats = {compendiumSource: 'Compendium.Immortals-system.geral.Item.' + canonical._id};
  if (old) {
    background.flags[scope].backgroundRuleVersion = 1;
    background.system.advancement = Object.fromEntries(Object.entries(background.system.advancement)
      .filter(([, advance]) => !advance.configuration.currency && advance.type !== 'ItemChoice'));
  }
  const flags = completedCreation ? {[scope]: {creation2: {completed: true, background: background._stats.compendiumSource}}} : {};
  return new ActorBoundary({_id: 'actor', type: 'character', name: 'Lin', flags,
    system: {details: {level: 1}, cultivation: {rank: 1, stage: 1}, currency: {gp: 7, sp: 8, cp: 9},
      legacy2: {armas: {simpleM: 1, martialM: 1, simpleR: 1, natural: 1, improv: 1}}}, items: [background]});
}
async function complete(manager) {
  let guard = 0;
  while (manager.step && guard++ < 12) {
    if (manager.step.flow.advancement.type === 'ItemChoice') {
      manager.step.flow.selection = {selected: [manager.step.flow.advancement.configuration.pool[0].uuid]};
    }
    await NativeManager.DEFAULT_OPTIONS.actions.complete.call(manager, {}, {disabled: false, dataset: {action: 'complete'}});
    assert(!manager.step?.error, manager.step?.error?.message);
  }
  assert(guard < 12);
}

for (const background of backgroundDocuments().filter(doc => doc.type === 'background')) test(background.name + ' delivers its whole kit, exact quantities, choices and PO once through native progression', async () => {
  const actor = fixture(background.flags[scope].background.key), before = actor.toObject();
  const manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  assert.equal(actor.writes, 0); assert.deepEqual(actor.toObject(), before);
  await complete(manager);
  assert.equal(actor.writes, 1);
  assert.deepEqual(actor.system.currency, {gp: 7 + background.flags[scope].background.startingGold, sp: 8, cp: 9});
  const received = actor.items.get('owned-background');
  for (const advance of Object.values(received.system.advancement)) {
    if (advance.type === 'ItemChoice') { assert.equal(Object.keys(advance.value.added[0]).length, 1); continue; }
    for (const item of advance.configuration.items) {
      const given = Object.entries(advance.value.added).find(([, uuid]) => uuid === item.uuid);
      assert(given, item.uuid);
      if (documents.get(item.uuid).type !== 'feat') assert.equal(actor.items.get(given[0]).system.quantity, item.quantity ?? 1);
    }
  }
  assert.equal(await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager}), null);
  assert.equal(actor.writes, 1);
});

test('closing the native review discards its granted preview and repeated clicks share one window', async () => {
  const actor = fixture('ator'), before = actor.toObject();
  const [first, second] = await Promise.all([openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager}), openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager})]);
  assert.equal(first, second);
  await first.close({skipConfirmation: true});
  assert.equal(actor.writes, 0); assert.deepEqual(actor.toObject(), before);
  const retry = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  await complete(retry); assert.equal(actor.writes, 1);
});
test('repairing an old created character delivers equipment without crediting its old PO again', async () => {
  const actor = fixture('ator', {completedCreation: true}); actor.system.currency.gp = 0;
  const manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  await complete(manager);
  assert.equal(actor.system.currency.gp, 0); assert.equal(actor.items.size, 4);
});
test('a changed wallet or lost permission blocks committing a stale review', async () => {
  for (const mode of ['wallet', 'permission']) {
    const actor = fixture('ator'), manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
    if (mode === 'wallet') actor.system.currency.gp = 2; else actor.isOwner = false;
    const warningsBefore = messages.length;
    await complete(manager);
    assert.match(messages[warningsBefore], mode === 'wallet' ? /ficha mudou/ : /permissão/);
    assert.equal(actor.writes, 0);
    assert.equal(manager.rendered, false);
  }
});
test('newly acquiring an old or previously owned antecedent starts fresh grants without modifying the source', () => {
  const actor = fixture('ator'), background = actor.items.get('owned-background').toObject(), before = copy(background);
  const updated = backgroundAcquisitionData(background);
  assert(Object.values(updated.system.advancement).some(advance => advance.configuration.currency?.gp === 100));
  assert(Object.values(updated.system.advancement).every(advance => Object.keys(advance.value).length === 0));
  assert.deepEqual(background, before);
});

test('a missing required equipment reference keeps the review open without any real currency or item writes', async () => {
  const actor = fixture('ator', {old: false});
  const gear = Object.values(actor.items.get('owned-background').system.advancement).find(advance => advance.configuration.currency);
  gear.configuration.items[0].uuid = 'Compendium.Immortals-system.equipamentos.Item.missing';
  const manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  await NativeManager.DEFAULT_OPTIONS.actions.complete.call(manager, {}, {disabled: false, dataset: {action: 'complete'}});
  await NativeManager.DEFAULT_OPTIONS.actions.complete.call(manager, {}, {disabled: false, dataset: {action: 'complete'}});
  assert.match(manager.step.error.message, /entrega/);
  assert.equal(actor.writes, 0); assert.equal(actor.system.currency.gp, 7); assert.equal(actor.items.size, 1);
  await manager.close({skipConfirmation: true});
});

test('required weapon and instrument choices cannot complete an empty selection', async () => {
  for (const key of ['aprendiz-marcial', 'musico']) {
    const actor = fixture(key), manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
    while (manager.step.flow.advancement.type !== 'ItemChoice') {
      await NativeManager.DEFAULT_OPTIONS.actions.complete.call(manager, {}, {disabled: false, dataset: {action: 'complete'}});
    }
    await NativeManager.DEFAULT_OPTIONS.actions.complete.call(manager, {}, {disabled: false, dataset: {action: 'complete'}});
    assert.match(manager.step.error.message, /Escolha/);
    assert.equal(actor.writes, 0);
    await manager.close({skipConfirmation: true});
  }
});

test('a partially delivered grant adds only the outstanding equipment and preserves its paid coin receipt', async () => {
  const actor = fixture('ator', {old: false}), background = actor.items.get('owned-background');
  const feature = Object.values(background.system.advancement).find(advance => !advance.configuration.currency);
  feature.value = {added: {'sold-feature': feature.configuration.items[0].uuid}};
  const gear = Object.values(background.system.advancement).find(advance => advance.configuration.currency);
  gear.value = {added: {'sold-kit': gear.configuration.items[0].uuid}, currency: {gp: 100}};
  const manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  await complete(manager);
  assert.equal(actor.system.currency.gp, 7);
  assert.equal(actor.items.size, 2);
  assert.equal(actor.items.map(item => item.type).filter(type => type === 'equipment').length, 1);
  assert.equal(prepareBackgroundBenefits(actor, actor.items.get('owned-background')).pending, false);
});

test('newly acquired old antecedents complete through the native new-item factory as well as the repair action', async () => {
  const actor = fixture('ator'), source = backgroundAcquisitionData(actor.items.get('owned-background').toObject());
  actor.data.items = []; actor.reset();
  foundry.utils.deepClone = copy; foundry.utils.randomID = () => 'new-background';
  const manager = NativeManager.forNewItem(actor, source);
  await manager.render({force: true}); await complete(manager);
  assert.equal(actor.system.currency.gp, 107); assert.equal(actor.items.size, 4); assert.equal(actor.writes, 1);
});

test('recovered ownership receipts are saved even when the entire kit is already present, then survive selling it', async () => {
  const actor = fixture('ator');
  await complete(await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager}));
  const gear = Object.values(actor.items.get('owned-background').system.advancement).find(advance => advance.configuration.currency);
  const soldId = Object.keys(gear.value.added)[0];
  delete gear.value.added;
  const manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  assert(manager, 'a review is required to persist the recovered receipt');
  await complete(manager);
  assert.equal(actor.items.size, 4); assert.equal(actor.system.currency.gp, 107);
  actor.items.delete(soldId); actor.reset();
  assert.equal(await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager}), null);
  assert.equal(actor.items.size, 3); assert.equal(actor.writes, 2);
});

test('Next, Previous and Next preserve receipts of sold gear while completing a partially delivered antecedent', async () => {
  const actor = fixture('cacador-de-recompensas', {old: false}), background = actor.items.get('owned-background');
  const feature = Object.values(background.system.advancement).find(advance => advance.type === 'ItemGrant' && !advance.configuration.currency);
  feature.value = {added: {'old-feature': feature.configuration.items[0].uuid}};
  const gear = Object.values(background.system.advancement).find(advance => advance.configuration.currency);
  const soldUuid = gear.configuration.items[0].uuid;
  gear.value = {added: {'sold-gear': soldUuid}, currency: {gp: 60}};
  const manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  const press = action => NativeManager.DEFAULT_OPTIONS.actions[action].call(manager, {}, {disabled: false, dataset: {action}});
  await press('next'); await press('previous'); await press('next');
  assert.equal(manager.clone.items.get('owned-background').system.advancement[gear._id].value.added['sold-gear'], soldUuid);
  assert(!manager.clone.items.map(item => item.flags?.[scope]?.sourceId).includes(soldUuid));
  await complete(manager);
  assert.equal(actor.system.currency.gp, 7);
  assert(!actor.items.map(item => item.flags?.[scope]?.sourceId).includes(soldUuid));
});

test('an initial item choice rejects an item outside its explicit pool', async () => {
  const actor = fixture('musico'), manager = await openBackgroundBenefits(actor, 'owned-background', {Manager: NativeManager});
  while (manager.step.flow.advancement.type !== 'ItemChoice') {
    await NativeManager.DEFAULT_OPTIONS.actions.next.call(manager, {}, {disabled: false, dataset: {action: 'next'}});
  }
  const weapon = 'Compendium.Immortals-system.equipamentos.Item.dagger0000000000';
  await assert.rejects(manager.step.flow.advancement.apply(0, {selected: [weapon]}), /lista|disponíveis|permitid/i);
  assert.equal(actor.writes, 0);
  assert(!manager.clone.items.map(item => item.flags?.[scope]?.sourceId).includes(weapon));
  await manager.close({skipConfirmation: true});
});
