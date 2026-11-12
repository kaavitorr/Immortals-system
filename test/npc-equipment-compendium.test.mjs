import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const yaml = createRequire(import.meta.url)('js-yaml');
const root = new URL('../', import.meta.url);
const docs = () => readdirSync(new URL('packs/_source/equipamentos-pdn/', root)).filter(f => f.endsWith('.yml'))
  .map(f => yaml.load(readFileSync(new URL('packs/_source/equipamentos-pdn/' + f, root), 'utf8')));
const runtime = () => import('../module/systems/npc-equipment-compendium.mjs');
const catalogue = () => JSON.parse(readFileSync(new URL('json/npc-equipment-catalogue.json', root), 'utf8'));

test('complete PdN catalogue contains all 135 elemental limbs and all 9 elemental bites', () => {
  const items = docs();
  for (let n = 1; n <= 135; n++) assert(items.some(d => d._id === 'jjnem' + String(n).padStart(11, '0')), 'missing elemental limb ' + n);
  for (let n = 17; n <= 25; n++) assert(items.some(d => d._id === 'jjnat' + String(n).padStart(11, '0')), 'missing elemental bite ' + n);
  assert.equal(items.filter(d => d.type === 'weapon').length, 160);
  assert.equal(items.filter(d => d.type === 'equipment').length, 23);
});

test('catalogue seed matches canonical IDs, resolves every folder, and includes native effect icons', () => {
  const seed = catalogue(), source = docs();
  assert.equal(seed.length, source.length);
  assert.equal(new Set(seed.map(d => d._id)).size, source.length);
  const folders = new Set(seed.filter(d => d.type === 'Item').map(d => d._id));
  for (const document of seed) {
    assert(source.some(d => d._id === document._id));
    assert(!document.folder || folders.has(document.folder), document.name);
    assert(!('_key' in document));
    for (const effect of document.effects ?? []) if (effect.img.startsWith('systems/Immortals-system/')) {
      assert(existsSync(new URL(effect.img.slice('systems/Immortals-system/'.length), root)), effect.img);
    }
  }
});

function fixture({locked = true, fail = false} = {}) {
  const items = new Map(), folders = new Map(), calls = [];
  const pack = {collection: 'Immortals-system.equipamentos-pdn', documentName: 'Item', locked,
    folders, async getIndex() { return [...items.values()]; },
    async configure(update) { calls.push(['lock', update.locked]); this.locked = update.locked; }};
  const game = {user: {id: 'gm', isGM: true}, users: {activeGM: {id: 'gm'}}, packs: new Map([[pack.collection, pack]])};
  const Folder = {async createDocuments(rows, options) {
    assert.equal(options.pack, pack.collection); assert.equal(options.keepId, true);
    for (const row of rows) {assert(!row.folder || folders.has(row.folder), row.name); folders.set(row._id, row);}
    calls.push(['folders', rows.length]);
  }};
  const Item = {async createDocuments(rows, options) {
    assert.equal(options.pack, pack.collection); assert.equal(options.keepId, true);
    if (fail) throw Error('storage unavailable');
    for (const row of rows) {assert(!items.has(row._id), row.name); assert(!row.folder || folders.has(row.folder)); items.set(row._id, row);}
    calls.push(['items', rows.length]);
  }};
  Item.updateDocuments = async (rows, options) => {
    assert.equal(options.pack, pack.collection);
    for (const row of rows) {
      const target = items.get(row._id); assert(target);
      for (const [key, value] of Object.entries(row)) if (key !== '_id') {
        const parts = key.split('.'); let parent = target;
        for (const part of parts.slice(0, -1)) parent = parent[part] ??= {};
        parent[parts.at(-1)] = value;
      }
    }
    calls.push(['updates', rows.length]);
  };
  return {game, Item, Folder, items, folders, pack, calls, load: async () => catalogue()};
}

test('native publishing adds missing entries and refreshes only the artwork of existing equipment', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture();
  const custom = {_id: 'jjnat00000000004', name: 'Garras personalizadas', type: 'weapon', img: 'custom.webp'};
  f.items.set(custom._id, custom);
  const result = await ensureNpcEquipmentCompendium(f);
  assert.equal(result.created, 182); assert.equal(result.folders, 15);
  assert.equal(f.items.size, 183); assert.equal(f.folders.size, 15);
  assert.equal(f.items.get(custom._id), custom); assert.equal(custom.name, 'Garras personalizadas');
  assert.equal(custom.img, catalogue().find(d => d._id === custom._id).img);
  assert.equal(result.updated, 1); assert.equal(f.pack.locked, true);
  assert.deepEqual(f.calls.filter(c => c[0] === 'lock'), [['lock', false], ['lock', true]]);
});

test('repeated and concurrent publishing cannot duplicate the catalogue', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture();
  const first = await Promise.all([ensureNpcEquipmentCompendium(f), ensureNpcEquipmentCompendium(f)]);
  assert.equal(first[0].created, 183); assert.equal(f.items.size, 183);
  assert.equal(f.calls.filter(c => c[0] === 'items').length, 1);
  assert.deepEqual(await ensureNpcEquipmentCompendium(f), {created: 0, folders: 0, updated: 0});
});

test('players and secondary GMs never read or write the catalogue', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture();
  f.load = async () => {throw Error('must not load');};
  f.game.user.isGM = false;
  assert.deepEqual(await ensureNpcEquipmentCompendium(f), {created: 0, folders: 0, updated: 0});
  f.game.user.isGM = true; f.game.user.id = 'secondary';
  assert.deepEqual(await ensureNpcEquipmentCompendium(f), {created: 0, folders: 0, updated: 0});
  assert.equal(f.calls.length, 0);
});

test('failed writes restore the locked state and a later retry remains possible', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture({fail: true});
  await assert.rejects(ensureNpcEquipmentCompendium(f), /storage unavailable/);
  assert.equal(f.pack.locked, true); assert.equal(f.items.size, 0);
  let retried = false;
  f.Item.createDocuments = async rows => {retried = true; for (const row of rows) f.items.set(row._id, row);};
  assert.equal((await ensureNpcEquipmentCompendium(f)).created, 183);
  assert(retried); assert.equal(f.pack.locked, true);
});

test('an already unlocked pack remains unlocked', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture({locked: false});
  await ensureNpcEquipmentCompendium(f);
  assert.equal(f.pack.locked, false); assert(!f.calls.some(c => c[0] === 'lock'));
});

test('every PdN weapon is Natural in source and in the catalogue used to fill installed packs',()=>{for(const rows of [docs(),catalogue()]){const weapons=rows.filter(d=>d.type==='weapon');assert.equal(weapons.length,160);for(const weapon of weapons)assert.equal(weapon.system.type.value,'natural',weapon.name);}});


test('painted PdN equipment artwork updates existing item and attack images without changing mechanics', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture();
  const source = catalogue().find(d => d._id === 'jjnat00000000017');
  const existing = structuredClone(source);
  existing.img = 'old-item.webp';
  for (const activity of Object.values(existing.system.activities)) activity.img = 'old-attack.webp';
  existing.name = 'Nome personalizado';
  const mechanics = structuredClone(existing);
  f.items.set(existing._id, existing);
  f.load = async () => [source];
  for (const folder of catalogue().filter(d => d.type === 'Item')) f.folders.set(folder._id, folder);
  const result = await ensureNpcEquipmentCompendium(f);
  assert.equal(result.updated, 1); assert.equal(result.created, 0);
  assert.equal(existing.img, source.img);
  for (const [id, activity] of Object.entries(existing.system.activities)) {
    assert.equal(activity.img, source.system.activities[id].img);
    mechanics.system.activities[id].img = activity.img;
  }
  mechanics.img = existing.img;
  assert.deepEqual(existing, mechanics);
  assert.equal(f.pack.locked, true);
  assert.deepEqual(await ensureNpcEquipmentCompendium(f), {created: 0, folders: 0, updated: 0});
});

test('artwork publishing leaves uncatalogued equipment and another Item type with the same ID untouched', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture();
  const source = catalogue().find(d => d.type === 'weapon');
  const other = {_id: source._id, type: 'feat', img: 'custom.webp'};
  const custom = {_id: 'customWeapon0001', type: 'weapon', img: 'personal.webp'};
  f.items.set(other._id, other); f.items.set(custom._id, custom);
  f.load = async () => [source];
  const result = await ensureNpcEquipmentCompendium(f);
  assert.equal(result.updated, 0); assert.equal(other.img, 'custom.webp'); assert.equal(custom.img, 'personal.webp');
  assert.equal(f.calls.length, 0);
});

test('failed artwork updates relock the pack and can be retried', async () => {
  const {ensureNpcEquipmentCompendium} = await runtime(), f = fixture();
  const source = catalogue().find(d => d.type === 'weapon');
  f.items.set(source._id, {...structuredClone(source), img: 'old.webp'});
  f.load = async () => [source];
  const update = f.Item.updateDocuments;
  f.Item.updateDocuments = async () => {throw Error('image update unavailable');};
  await assert.rejects(ensureNpcEquipmentCompendium(f), /image update unavailable/);
  assert.equal(f.pack.locked, true);
  f.Item.updateDocuments = update;
  assert.equal((await ensureNpcEquipmentCompendium(f)).updated, 1);
  assert.equal(f.items.get(source._id).img, source.img);
});
