import {weaponRefinementConfiguration} from '../../../systems/refined-equipment.mjs';
import {armor2Configuration} from '../../../systems/legacy2-armor.mjs';
const CATEGORY_ICONS = {
  weapon:"m4 20 3-3m-3-3 6 6M7 17 20 4h-5L7 12Z",
  equipment:"m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z",
  consumable:"M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8",
  tool:"m4 20 8-8m2-9a6 6 0 0 0-5 9l-6 6 3 3 6-6a6 6 0 0 0 9-5l-4 2-3-3 2-4Z",
  loot:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 9h6v6H9Z",
  container:"M5 8h14l2 12H3ZM8 8V6a4 4 0 0 1 8 0v2"
};
/** Keep native item rows and columns while making inventory categories permanent. */
export function prepareInventoryPresentation(context, {containerShortcuts = false} = {}) {
  const sections = (context.sections ?? []).filter(section => {
    const type = section.dataset?.["group-type"] ?? section.groups?.type;
    return section.id !== "contents" && !(containerShortcuts && type === "container");
  }).map(section => ({
    ...section, iwIconPath:CATEGORY_ICONS[section.dataset?.["group-type"] ?? section.groups?.type] ?? CATEGORY_ICONS.container,
    ...(!section.label ? {label:"Outros", hidden:true, iwFallback:true} : {})
  }));
  return {
    ...context, sections, keepEmpty:true, iwInventory:true,
    listControls: {
      ...context.listControls,
      grouping:(context.listControls?.grouping ?? []).filter(group => group.key === "type")
    }
  };
}

/** A compact inventory tag uses authored armor rarity without exposing unidentified details. */
export function armorInventoryRarity(item,{isGM=false}={}) {
  if(item?.limited===true||!(item?.type==='weapon'||item?.type==='equipment'&&item.system?.isArmor===true))return null;
  if(item.system.identified===false&&!isGM)return null;
  const config=item.type==='weapon'?weaponRefinementConfiguration(item):armor2Configuration(item),rarity=config.rarities[config.rarityLevel];
  return config.rarityLevel
    ? {level:config.rarityLevel,label:rarity.rank+' · '+rarity.quality,title:config.rarityLabel}
    : {level:0,label:'Raridade não definida',title:'Configure a raridade nos detalhes do equipamento.'};
}
