import assert from 'node:assert/strict';
import {test} from 'node:test';
import {backgroundDocuments} from '../module/systems/wuxia-backgrounds.mjs';
import {backgroundAdvancementMigration} from '../module/systems/wuxia-species.mjs';
import {advancementCompletionError} from '../module/systems/advancement-grants.mjs';
let benefits = {};
try { benefits = await import('../module/systems/background-benefits.mjs'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

const scope = 'Immortals-system';
const originals = backgroundDocuments().filter(doc => doc.type === 'background');
const uuidOf = data => 'Compendium.Immortals-system.geral.Item.' + data._id;
function fixture(key = 'ator') {
  const canonical = originals.find(doc => doc.flags[scope].background.key === key);
  const background = structuredClone(canonical);
  background._id = 'owned-background';
  background._stats = {compendiumSource: uuidOf(canonical)};
  background.flags[scope].backgroundRuleVersion = 1;
  background.system.advancement = Object.fromEntries(Object.entries(background.system.advancement)
    .filter(([, advancement]) => !advancement.configuration.currency && advancement.type !== 'ItemChoice'));
  const actor = {type: 'character', isOwner: true, flags: {}, items: [background],
    system: {currency: {gp: 7, sp: 8, cp: 9}}};
  return {actor, background, canonical};
}
function prepare(actor, background) {
  assert.equal(typeof benefits.prepareBackgroundBenefits, 'function');
  return benefits.prepareBackgroundBenefits(actor, background);
}

test('an owned antecedent with its own ID receives the missing authored equipment progression', () => {
  const {background, canonical} = fixture();
  const patch = backgroundAdvancementMigration(background, canonical);
  assert(patch, 'owned copies must not be excluded by their actor-specific ID');
  const gear = Object.values(canonical.system.advancement).find(advancement => advancement.configuration.currency);
  assert.deepEqual(patch['system.advancement.' + gear._id], gear);
});

test('partially updated version-two antecedents still receive missing progression without replacing edits', () => {
  const {background, canonical} = fixture();
  background.flags[scope].backgroundRuleVersion = 2;
  background.system.description.value = 'Editado pelo Narrador';
  const patch = backgroundAdvancementMigration(background, canonical);
  assert(patch);
  assert.equal(patch['system.description.value'], undefined);
});

test('preparing an existing antecedent is read-only and exposes its exact pending equipment, coins and choices', () => {
  const {actor, background} = fixture('servo-do-jovem-mestre');
  const before = structuredClone(actor);
  const result = prepare(actor, background);
  assert(result.pending);
  assert.equal(result.currency.gp, 500);
  assert.equal(result.steps.filter(step => step.type === 'ItemChoice').length, 2);
  assert.deepEqual(actor, before);
});

test('old completed creation awards retain their money receipt even after the gold was spent', () => {
  const {actor, background, canonical} = fixture();
  actor.flags[scope] = {creation2: {completed: true, background: uuidOf(canonical)}};
  actor.system.currency.gp = 0;
  const result = prepare(actor, background);
  const gear = Object.values(result.background.system.advancement).find(advancement => advancement.configuration.currency);
  assert.deepEqual(gear.value.currency, {gp: 100});
  assert.deepEqual(result.currency, {});
  assert(result.pending, 'the equipment is still due');
  assert.equal(actor.system.currency.gp, 0);
});

test('native receipts are preserved for sold equipment and spent gold, without considering unrelated inventory copies received', () => {
  const {actor, canonical} = fixture();
  const background = structuredClone(canonical);
  background._id = 'owned-background';
  actor.items = [background];
  for (const advancement of Object.values(background.system.advancement)) {
    advancement.value = {added: Object.fromEntries(advancement.configuration.items.map((item, index) => ['sold-' + index, item.uuid]))};
    if (advancement.configuration.currency) advancement.value.currency = {gp: 100};
  }
  assert.equal(prepare(actor, background).pending, false);
  const gear = Object.values(background.system.advancement).find(advancement => advancement.configuration.currency);
  gear.value = {};
  actor.items.push({_id: 'bought-elsewhere', type: 'tool', _stats: {compendiumSource: gear.configuration.items[0].uuid}});
  assert(prepare(actor, background).pending);
});

test('already delivered items can recover missing receipts only through their native advancement ownership', () => {
  const {actor, canonical} = fixture();
  const background = structuredClone(canonical);
  background._id = 'owned-background';
  actor.items = [background];
  for (const advancement of Object.values(background.system.advancement)) {
    advancement.value = {};
    if (advancement.configuration.currency) advancement.value.currency = {gp: 100};
    for (const [index, item] of advancement.configuration.items.entries()) actor.items.push({
      _id: advancement._id + '-' + index, type: 'tool', flags: {[scope]: {
        sourceId: item.uuid, advancementOrigin: background._id + '.' + advancement._id
      }}
    });
  }
  const result = prepare(actor, background);
  assert.equal(result.pending, true, 'recovered receipts must be confirmed and saved');
  assert.deepEqual(result.currency, {});
  assert(Object.values(result.background.system.advancement).every(advancement => Object.keys(advancement.value.added).length));
});

test('custom grant edits survive recovery and unsupported backgrounds never get an authored kit', () => {
  const {actor, canonical} = fixture();
  const background = structuredClone(canonical);
  const gear = Object.values(background.system.advancement).find(advancement => advancement.configuration.currency);
  gear.configuration.currency = {gp: 250, sp: 3};
  gear.configuration.items = [];
  const result = prepare(actor, background);
  assert.deepEqual(result.currency, {gp: 250, sp: 3});
  assert.deepEqual(result.background.system.advancement[gear._id].configuration.items, []);
  assert.equal(prepare(actor, {_id: 'custom', type: 'background', system: {advancement: {}}}), null);
});

test('an incomplete fixed grant cannot silently finish after a missing item failed to resolve', () => {
  const flow = {level: 0, advancement: {type: 'ItemGrant',
    configuration: {items: [{uuid: 'Item.missing', optional: false}], currency: {gp: 100}},
    value: {added: {}, currency: {gp: 100}}}};
  assert.match(advancementCompletionError(flow), /entrega|equipamentos|itens/i);
  flow.advancement.value.added['delivered'] = 'Item.missing';
  assert.equal(advancementCompletionError(flow), null);
});
