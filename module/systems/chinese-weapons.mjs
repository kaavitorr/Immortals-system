/** Chinese weapon silhouettes; combat values remain editable until supplied by the author. */
export const CHINESE_WEAPONS_FOLDER_ID = 'iwChineseArms001';
export const CHINESE_WEAPONS = Object.freeze([
  {
    "id": "eb574f8c2097f5b9",
    "slug": "leque-de-ferro",
    "weaponType": "simpleM",
    "name": "Leque de Ferro (Tie Shan)",
    "description": "Leque dobrável com varetas de ferro e painéis claros.",
    "properties": []
  },
  {
    "id": "73becd0c57f0787a",
    "slug": "zhanmadao",
    "weaponType": "martialM",
    "name": "Zhanmadao",
    "description": "Grande sabre de lâmina longa e empunhadura para duas mãos.",
    "properties": [
      "two"
    ]
  },
  {
    "id": "97bf7c2bd49b47c2",
    "slug": "jian",
    "weaponType": "simpleM",
    "name": "Jian",
    "description": "Espada reta de dois gumes com guarda compacta.",
    "properties": []
  },
  {
    "id": "30f554ce1bf92d40",
    "slug": "dao",
    "weaponType": "simpleM",
    "name": "Dao",
    "description": "Sabre de um gume com lâmina curva.",
    "properties": []
  },
  {
    "id": "8aec730c7777981f",
    "slug": "guandao",
    "weaponType": "martialM",
    "name": "Guandao",
    "description": "Arma de haste com grande lâmina curva.",
    "properties": [
      "two"
    ]
  },
  {
    "id": "beedd8a495bcc6fe",
    "slug": "qiang",
    "weaponType": "martialM",
    "name": "Qiang",
    "description": "Lança de haste longa com ponta estreita e borla.",
    "properties": [
      "two"
    ]
  },
  {
    "id": "287cfd274553dbb4",
    "slug": "espadas-de-gancho",
    "weaponType": "simpleM",
    "name": "Espadas de Gancho (Shuang Gou)",
    "description": "Par de espadas com pontas em gancho e guardas crescentes.",
    "properties": []
  },
  {
    "id": "65f2e842ded9ca8b",
    "slug": "laminas-borboleta",
    "weaponType": "simpleM",
    "name": "Lâminas Borboleta (Hudiedao)",
    "description": "Par de espadas curtas de lâminas largas e guardas fechadas.",
    "properties": []
  },
  {
    "id": "f85714e20057dc2e",
    "slug": "bastao-de-tres-secoes",
    "weaponType": "simpleM",
    "name": "Bastão de Três Seções (Sanjiegun)",
    "description": "Bastão articulado formado por três seções unidas por correntes.",
    "properties": [
      "two"
    ]
  },
  {
    "id": "794a52cd148cbccb",
    "slug": "martelo-meteoro",
    "weaponType": "martialM",
    "name": "Martelo Meteoro (Liuxingchui)",
    "description": "Peso de metal preso a uma corda.",
    "properties": []
  }
].map(entry => Object.freeze({...entry, properties: Object.freeze(entry.properties)})));

/** Apply the authored category once to known catalogue weapons, preserving all other mechanics. */
export function prepareChineseWeaponCategoryUpdate(item) {
  const source=item?.toObject?.()??item;
  if(source?.type!=='weapon'||Number(source.flags?.['Immortals-system']?.weaponCategoryVersion)>=1)return null;
  const id=source._id??item?.id,entry=CHINESE_WEAPONS.find(weapon=>weapon.id===id);
  if(!entry)return null;
  const patch={_id:id,'flags.Immortals-system.weaponCategoryVersion':1};
  if(source.system?.type?.value!==entry.weaponType)patch['system.type.value']=entry.weaponType;
  return patch;
}

const emptyDamage = () => ({number: null, denomination: null, bonus: '', types: [],
  custom: {enabled: false, formula: ''}, modifiers: [], scaling: {mode: '', number: 1, formula: ''}});
const art = slug => 'systems/Immortals-system/assets/wuxia/armas-pintadas-v1/' + slug + '.webp';

/** Fresh native source documents: safe to publish once without rewriting existing equipment. */
export function chineseWeaponCompendiumDocuments() {
  const folder = {_id: CHINESE_WEAPONS_FOLDER_ID, _key: '!folders!' + CHINESE_WEAPONS_FOLDER_ID,
    name: 'Armas Chinesas', type: 'Item', folder: null, sorting: 'a', color: '#9d8764', sort: 0, flags: {}};
  const items = CHINESE_WEAPONS.map((entry, index) => {
    const image = art(entry.slug), activityId = entry.id;
    return {_id: entry.id, _key: '!items!' + entry.id, name: entry.name, type: 'weapon', img: image,
      folder: folder._id, sort: (index + 1) * 100000, ownership: {default: 0}, effects: [],
      flags: {'Immortals-system': {chineseWeapon: entry.slug, weaponArtworkVersion: 1, weaponCategoryVersion: 1, weaponConfigurationPending: true}},
      system: {identifier: entry.slug, description: {value: '<p>' + entry.description + '</p><p><strong>Configuração pendente:</strong> dano, tipo de dano, alcance, peso e preço serão definidos pelo Narrador.</p>', chat: ''},
        source: {custom: 'Immortals Legacy', rules: '2024', revision: 1}, quantity: 1,
        weight: {value: 0, units: 'kg'}, price: {value: 0, denomination: 'gp'}, identified: true,
        unidentified: {description: ''}, rarities: [], container: null, properties: [...entry.properties],
        equipped: false, attunement: '', attuned: false, uses: {max: '', spent: 0, recovery: []},
        type: {value: entry.weaponType, baseItem: ''}, ammunition: {type: ''},
        range: {units: 'm', value: null, long: null, reach: null},
        damage: {base: emptyDamage(), versatile: emptyDamage()},
        activities: {[activityId]: {_id: activityId, type: 'attack', name: 'Ataque', img: image, sort: 0,
          activation: {type: 'action', value: 2, condition: '', override: true},
          consumption: {targets: [{type: 'attribute', target: 'energy.generated', value: '2'}], scaling: {allowed: false, max: ''}, spellSlot: false},
          attack: {ability: '', bonus: '', flat: false, type: {value: 'melee', classification: 'weapon'}, critical: {threshold: null}},
          damage: {includeBase: true, parts: [], critical: {bonus: ''}}, description: {value: '', chatFlavor: ''},
          duration: {units: 'inst', concentration: false, override: false}, effects: [],
          range: {units: 'm', value: null, override: false, special: ''},
          target: {override: false, prompt: true, template: {type: '', units: 'm', contiguous: false, stationary: false}, affects: {type: 'creature', count: '1', choice: false}},
          uses: {max: '', spent: 0, recovery: []}}}}
    };
  });
  return [folder, ...items];
}
