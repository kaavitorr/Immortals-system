/** Shared treasure levels. Crystal qualities use a separate table. */
export const TREASURE_RARITIES = Object.freeze([
  {value:0,rank:'',quality:'',label:'Não definida'},
  ...[[1,'Humano','Inferior'],[2,'Humano','Comum'],[3,'Humano','Superior'],
    [4,'Terra','Comum'],[5,'Céu','Inferior'],[6,'Céu','Superior'],
    [7,'Sagrado','Inferior'],[8,'Sagrado','Superior'],[9,'Divino','Única'],[10,'Supremo','Única']]
    .map(([value,rank,quality])=>({value,rank,quality,label:rank+' · '+quality+' — Nível '+value}))
].map(Object.freeze));
export const REFINED_RANKS = Object.freeze([
  ['Humano',4,0,1,1,null],['Terra',6,0,2,2,2],['Céu',8,0,3,4,3],
  ['Sagrado',10,0,4,6,5],['Divino',12,0,5,8,6],['Supremo',12,1,6,10,8]
].map(([rank,denomination,bonus,offensiveBurstLimitBonus,resistanceAll,ignoresCultivationRankAtMost])=>Object.freeze({
  rank,weapon:Object.freeze({denomination,bonus,formula:'1d'+denomination+(bonus?' + '+bonus:''),offensiveBurstLimitBonus}),
  armor:Object.freeze({resistanceAll,ignoresCultivationRankAtMost})
})));
export function treasureRarityLevel(value) {
  if(!['number','string'].includes(typeof value))return 0;
  const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=10?n:0;
}
export function refinedEquipmentProfile(value) {
  const level=treasureRarityLevel(value);if(!level)return null;
  const rarity=TREASURE_RARITIES[level],rank=REFINED_RANKS.find(entry=>entry.rank===rarity.rank);
  return {level,rarity,...rank};
}
export function weaponRefinementConfiguration(item) {
  const rarityLevel=treasureRarityLevel(item?.system?.refinement?.rarityLevel);
  return {rarityLevel,rarityLabel:TREASURE_RARITIES[rarityLevel].label,rarities:TREASURE_RARITIES,
    profile:refinedEquipmentProfile(rarityLevel)};
}
/** Prepared native damage only: clearing rarity restores the untouched source on the next preparation. */
export function prepareRefinedWeaponDamage(system) {
  const profile=refinedEquipmentProfile(system?.refinement?.rarityLevel);
  for(const key of ['base','versatile']) {
    const damage=system.damage?.[key];if(!damage)continue;
    const source=system._source?.damage?.[key]??damage;
    if(system._source?.damage?.[key]) {
      for(const property of ['number','denomination','bonus'])if(Object.hasOwn(source,property))damage[property]=source[property];
      if(source.custom&&damage.custom)Object.assign(damage.custom,source.custom);
    }
    if(!profile)continue;
    const bonus=String(source.bonus??'').trim();
    damage.number=1;damage.denomination=profile.weapon.denomination;
    damage.bonus=[bonus,profile.weapon.bonus||''].filter(value=>value!=='').join(' + ');
    if(damage.custom)damage.custom.enabled=false;
  }
}

const realmNames={2:'Formação de Núcleo',3:'Núcleo Rotativo',5:'Transformação Divina',6:'Lorde Divino',8:'Imperador Sagrado'};
export const REFINED_EQUIPMENT_ROWS=Object.freeze(REFINED_RANKS.map(profile=>Object.freeze({...profile,
  armorProtectionLabel:profile.armor.ignoresCultivationRankAtMost?'Ignora dano de '+realmNames[profile.armor.ignoresCultivationRankAtMost]+' ou menor.':'—'
})));
export function refinedEquipmentTableHTML(kind) {
  const weapon=kind==='weapon';
  return '<table><thead><tr><th>Rank</th><th>Base</th><th>Efeito adicional</th></tr></thead><tbody>'+REFINED_EQUIPMENT_ROWS.map(row=>
    '<tr><td>'+row.rank+'</td><td>'+(weapon?row.weapon.formula:'Resistência '+row.armor.resistanceAll+' — Todos')+'</td><td>'+
    (weapon?'Limite de Explosão Ofensiva +'+row.weapon.offensiveBurstLimitBonus+' PQ.':row.armorProtectionLabel)+'</td></tr>').join('')+'</tbody></table>';
}

/** Match the first equipped body armor used by native CR; spare armor and shields never stack. */
export function equippedRefinedArmor(actor) {
  const items=Array.from(actor?.itemTypes?.equipment??actor?.items?.contents??actor?.items?.values?.()??actor?.items??[]);
  const types=globalThis.CONFIG?.DND5E?.armorTypes??{light:1,medium:1,heavy:1,natural:1};
  const armor=items.find(item=>item?.type==='equipment'&&item.system?.equipped
    &&item.system.type?.value!=='shield'&&Object.hasOwn(types,item.system.type?.value));
  return armor?refinedEquipmentProfile(armor.system.armor?.rarityLevel):null;
}
