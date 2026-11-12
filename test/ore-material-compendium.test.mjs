import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {withCompendiumWrite} from '../module/systems/compendium-configuration.mjs';
const runtime = () => import('../module/systems/ore-material-compendium.mjs');
const catalogue = () => JSON.parse(readFileSync(new URL('../json/ore-material-catalogue.json', import.meta.url), 'utf8'));
const sample = [
  {_id: 'rootOreFolder001', type: 'Item', name: 'Minérios', folder: null},
  {_id: 'childOreFold0001', type: 'Item', name: 'Nível 1', folder: 'rootOreFolder001'},
  {_id: 'oreExample000001', type: 'loot', name: 'Minério', folder: 'childOreFold0001', system: {type: {value: 'material'}}}
];
function fixture({locked = true} = {}) {
  const items = new Map(), folders = new Map(), calls = [];
  const pack = {collection: 'Immortals-system.materiais', documentName: 'Item', locked, folders,
    async getIndex() {calls.push(['index']); return [...items.values()];},
    async configure(changes) {calls.push(['lock', changes.locked]); this.locked = changes.locked;}};
  const game = {user: {id: 'gm', isGM: true}, users: {activeGM: {id: 'gm'}}, packs: new Map([[pack.collection, pack]])};
  const Folder = {implementation: {async createDocuments(rows, options) {
    assert.equal(pack.locked, false); assert.deepEqual(options, {pack: pack.collection, keepId: true});
    for (const r of rows) {assert(!r.folder || folders.has(r.folder)); assert(!folders.has(r._id)); folders.set(r._id, structuredClone(r));}
    calls.push(['folders', rows.length]);
  }}};
  const Item = {implementation: {async createDocuments(rows, options) {
    assert.equal(pack.locked, false); assert.deepEqual(options, {pack: pack.collection, keepId: true});
    for (const r of rows) {assert(!items.has(r._id)); assert(!r.folder || folders.has(r.folder)); items.set(r._id, structuredClone(r));}
    calls.push(['items', rows.length]);
  }}};
  return {game, Item, Folder, pack, items, folders, calls, load: async () => structuredClone(sample)};
}

test('ore publishing creates parent-first folders and missing native material Items', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 1, folders: 2});
  assert.equal(f.pack.locked, true); assert.equal(f.items.size, 1); assert.equal(f.folders.size, 2);
  assert.deepEqual(f.calls.filter(c => c[0] === 'lock'), [['lock', false], ['lock', true]]);
});

test('ore publishing preserves existing customizations and unrelated ingredients', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  const custom = {...sample[2], name: 'Meu minério', img: 'meu.webp', system: {quantity: 45}};
  const herb = {_id: 'personalHerb001', name: 'Erva personalizada', type: 'loot'};
  f.items.set(custom._id, custom); f.items.set(herb._id, herb);
  for (const r of sample.filter(r => r.type === 'Item')) f.folders.set(r._id, r);
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 0, folders: 0});
  assert.equal(f.items.get(custom._id), custom); assert.equal(f.items.get(herb._id), herb);
  assert(!f.calls.some(c => c[0] === 'lock'));
});

test('repeated and simultaneous ore publishing is idempotent', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  await Promise.all([ensureOreMaterialCompendium(f), ensureOreMaterialCompendium(f)]);
  assert.equal(f.calls.filter(c => c[0] === 'items').length, 1);
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 0, folders: 0});
});

test('players and secondary GMs never read or write ore data', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  f.load = async () => {throw Error('forbidden');}; f.game.user.isGM = false;
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 0, folders: 0});
  f.game.user.isGM = true; f.game.user.id = 'secondary';
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 0, folders: 0});
  assert.equal(f.calls.length, 0);
});

test('ore creation failure restores the lock and retries without duplicate folders', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  const create = f.Item.implementation.createDocuments;
  f.Item.implementation.createDocuments = async () => {throw Error('storage unavailable');};
  await assert.rejects(ensureOreMaterialCompendium(f), /storage unavailable/);
  assert.equal(f.pack.locked, true); assert.equal(f.folders.size, 2);
  f.Item.implementation.createDocuments = create;
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 1, folders: 0});
  assert.equal(f.pack.locked, true);
});

test('ore publishing respects an already unlocked pack and aborts on missing parent', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture({locked: false});
  await ensureOreMaterialCompendium(f); assert.equal(f.pack.locked, false);
  assert(!f.calls.some(c => c[0] === 'lock'));
  const bad = fixture(); bad.load = async () => [sample[1], sample[2]];
  await assert.rejects(ensureOreMaterialCompendium(bad), /pasta superior/); assert.equal(bad.pack.locked, true);
});

test('ore publishing waits for another complete materials write before reading its lock', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  let release, started;
  const barrier = new Promise(resolve => {release = resolve;});
  const ready = new Promise(resolve => {started = resolve;});
  const first = withCompendiumWrite(f.pack, async () => {f.pack.locked = false; started(); await barrier; f.pack.locked = true;});
  await ready; const next = ensureOreMaterialCompendium(f);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(f.calls.length, 0);
  release(); await first; await next; assert.equal(f.pack.locked, true);
});

test('losing active GM authority after loading does not change the pack', async () => {
  const {ensureOreMaterialCompendium} = await runtime(), f = fixture();
  f.load = async () => {f.game.user.isGM = false; return sample;};
  assert.deepEqual(await ensureOreMaterialCompendium(f), {created: 0, folders: 0});
  assert(!f.calls.some(c => c[0] !== 'index'));
});

test('the ore stock contains exactly ten entries per level, eleven folders and unique native IDs', () => {
  const rows = catalogue();
  const items = rows.filter(r => r.type === 'loot'), folders = rows.filter(r => r.type === 'Item');
  assert.equal(items.length, 100); assert.equal(folders.length, 11);
  assert.equal(new Set(rows.map(r => r._id)).size, 111);
  assert.equal(new Set(items.map(r => r.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())).size, 100);
  const ids = new Set(folders.map(r => r._id));
  for (const r of rows) {assert(!('_key' in r)); assert(!r.folder || ids.has(r.folder));}
  for (let n = 1; n <= 10; n++) assert.equal(items.filter(r => r.flags['Immortals-system'].oreMaterial.level === n).length, 10);
  for (const item of items) {
    assert.equal(item.system.type.value, 'material');
    assert(item.system.description.value.length > 230); assert(item.img.endsWith('/' + item._id + '.webp'));
    assert.equal(item.system.quantity, 1); assert.deepEqual(item.effects, []);
  }
});
