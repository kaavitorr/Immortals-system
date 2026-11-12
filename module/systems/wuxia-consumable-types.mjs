const CONSUMABLE_TYPES=Object.freeze(['potion','scroll','food','ammo','poison','trinket','essenceCrystal','beastCore']);

/** Current Immortals categories, preserving an existing imported selection without offering it on new items. */
export function consumableTypeChoices(types={}, selected='') {
  const keys=[...CONSUMABLE_TYPES];
  if (typeof selected==='string' && selected && !keys.includes(selected)) keys.push(selected);
  return Object.fromEntries(keys.filter(key=>key===selected || Object.hasOwn(types,key))
    .map(key=>[key,Object.hasOwn(types,key)?types[key]:{label:key}]));
}
